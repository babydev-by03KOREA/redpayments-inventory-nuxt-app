type TokenResp = {
    data: { expiredTime: number; token: string }
    errorCode: string
    message: string
}

const TOKEN_SKEW_MS = 60_000 // 만료 60초 전이면 갱신

// 전역 캐시 (Nitro 런타임 동안 유지)
let cachedToken: { value: string; exp: number } | null = null
let issuing: Promise<string> | null = null

export async function getRedpayToken(event: any): Promise<string> {
    const config = useRuntimeConfig(event)
    const now = Date.now()

    if (cachedToken && cachedToken.exp - TOKEN_SKEW_MS > now) {
        return cachedToken.value
    }
    // 동시 갱신 방지
    if (issuing) return issuing

    issuing = (async () => {
        const url = `${config.redpayBase}/token`
        const body = { key: config.redpayKey, secret: config.redpaySecret }

        const resp = await $fetch<TokenResp>(url, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' }
        })

        if (resp.errorCode !== '0' || !resp.data?.token) {
            throw createError({ statusCode: 502, statusMessage: 'Token issue failed', data: resp })
        }

        cachedToken = { value: resp.data.token, exp: resp.data.expiredTime }
        return cachedToken.value
    })()

    try {
        const token = await issuing
        return token
    } finally {
        issuing = null
    }
}

/** api_key 헤더 붙여서 POST 호출. 401/만료 추정 시 한 번 자동 재발급 후 재시도 */
export async function redpayPost<T>(event: any, path: string, body: any): Promise<T> {
    const config = useRuntimeConfig(event)
    async function doCall(token: string) {
        return await $fetch<T>(`${config.redpayBase}${path}`, {
            method: 'POST',
            body,
            headers: {
                'Content-Type': 'application/json',
                'api_key': token
            }
        })
    }

    let token = await getRedpayToken(event)
    try {
        return await doCall(token)
    } catch (e: any) {
        // 만료/권한 오류로 추정되면 한 번 갱신 후 재시도
        const status = e?.response?.status
        if (status === 401 || status === 403) {
            // 강제 갱신
            const config = useRuntimeConfig(event)
            // 캐시 무효화
            // @ts-ignore
            cachedToken = null
            token = await getRedpayToken(event)
            return await doCall(token)
        }
        throw e
    }
}
