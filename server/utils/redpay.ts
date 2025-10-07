import { ofetch } from 'ofetch'

type TokenResp = {
    data: { expiredTime: number; token: string }
    errorCode: string
    message: string
}

const TOKEN_SKEW_MS = 60_000 // 만료 60초 전이면 갱신

let cachedToken: { value: string; exp: number } | null = null
let issuing: Promise<string> | null = null

export async function getRedpayToken(event: any): Promise<string> {
    const config = useRuntimeConfig(event)
    const now = Date.now()

    if (!config.redpayBase || !config.redpayKey || !config.redpaySecret) {
        throw createError({ statusCode: 500, statusMessage: 'Missing REDPAY_* runtimeConfig' })
    }

    if (cachedToken && cachedToken.exp - TOKEN_SKEW_MS > now) {
        return cachedToken.value
    }
    if (issuing) return issuing

    issuing = (async () => {
        const url = `${config.redpayBase}/token`
        const body = { key: config.redpayKey, secret: config.redpaySecret }

        const resp = await ofetch<TokenResp>(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        })

        if (resp.errorCode !== '0' || !resp.data?.token) {
            throw createError({ statusCode: 502, statusMessage: 'Token issue failed', data: resp })
        }

        cachedToken = { value: resp.data.token, exp: resp.data.expiredTime }
        return cachedToken.value
    })()

    try {
        return await issuing
    } finally {
        issuing = null
    }
}

/** api_key 헤더 붙여서 POST 호출. 401/403이면 한 번 토큰 재발급 후 재시도 */
export async function redpayPost<T>(event: any, path: string, body: any): Promise<T> {
    const config = useRuntimeConfig(event)
    if (!config.redpayBase) {
        throw createError({ statusCode: 500, statusMessage: 'Missing redpayBase' })
    }

    async function doCall(token: string): Promise<T> {
        return await ofetch<T>(`${config.redpayBase}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api_key': token,
            },
            body,
        })
    }

    let token = await getRedpayToken(event)
    try {
        return await doCall(token)
    } catch (e: any) {
        const status = e?.response?.status
        if (status === 401 || status === 403) {
            cachedToken = null // 캐시 무효화
            token = await getRedpayToken(event)
            return await doCall(token)
        }
        throw e
    }
}
