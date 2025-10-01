import {redpayPost} from "~~/server/utils/redpay";

/**
 * 요청 형식:
 *  - /api/inventory?code=OB360
 *  - /api/inventory?barcode=9341517118088: 아직 지원 X
 */
type ProductsResp = {
    data?: { total?: number; list?: any[] }
    errorCode?: string
    message?: string
}

// 필요 시 여기만 바꿔요
const PAGE_KEY = 'page'       // 예: 'pageNo'
const SIZE_KEY = 'pageSize'   // 예: 'size' | 'limit'

export default defineEventHandler(async (event) => {
    const q = getQuery(event)
    const code = (q.code as string | undefined)?.trim()
    const barcode = (q.barcode as string | undefined)?.trim()
    const pageSize = Number(q.pageSize ?? 50)
    const maxPages = Number(q.maxPages ?? 20) // 안전 가드

    if (!code && !barcode) {
        throw createError({ statusCode: 400, statusMessage: 'code 또는 barcode를 지정하세요.' })
    }

    const baseBody: Record<string, any> = code ? { code } : { barcode }

    let page = 1
    let total = Infinity
    const all: any[] = []

    while (page <= maxPages && all.length < total) {
        const body = { ...baseBody, [PAGE_KEY]: page, [SIZE_KEY]: pageSize }

        const resp = await redpayPost<ProductsResp>(event, '/products', body)
        if (resp.errorCode && resp.errorCode !== '0') {
            throw createError({ statusCode: 502, statusMessage: `products 호출 실패 (${resp.errorCode})`, data: resp })
        }

        const list = resp.data?.list ?? []
        if (page === 1) {
            // 첫 응답의 total을 신뢰. 없으면 list 길이로 추정
            total = typeof resp.data?.total === 'number' ? resp.data!.total! : list.length
        }

        all.push(...list)

        // 더 가져올 게 없으면 종료
        if (list.length < pageSize) break
        page++
    }

    return {
        errorCode: '0',
        message: 'success',
        data: { total: all.length, list: all }, // 필요 시 원래 total도 함께 내려주려면 total 포함
    }
})
