import { ref, watch, computed } from 'vue'

export interface StockItem {
    euSize: string
    auSize: string
    code: string
    productId: string
    color: string
    name: string
    sku: string
    available?: boolean
    quantity?: number
}
interface ApiResponse { data: { total: number; list: StockItem[] } }

export function useInventory(q: Ref<string>, mode: Ref<'code' | 'barcode'> = ref('code')) {
    const items = ref<StockItem[]>([])
    const total = ref<number | null>(null)
    const productName = ref('')
    const pending = ref(false)
    const errorMsg = ref<string | null>(null)

    async function fetchNow() {
        const query = q.value?.trim()
        if (!query) { items.value = []; total.value = null; productName.value=''; return }
        pending.value = true; errorMsg.value = null
        try {
            const { data, error } = await useFetch<ApiResponse>('/api/inventory', {
                query: mode.value === 'barcode' ? { barcode: query } : { code: query },
                key: `inventory-${mode.value}-${query}`,
            })
            if (error.value) throw error.value
            const payload = data.value?.data
            items.value = payload?.list ?? []
            total.value = payload?.total ?? null
            productName.value = items.value[0]?.name ?? ''
        } catch (e: any) {
            console.error(e)
            errorMsg.value = '재고 조회 중 오류가 발생했습니다.'
            items.value = []; total.value = null; productName.value = ''
        } finally {
            pending.value = false
        }
    }

    // 사이즈/색상 유도값
    const sizes = computed(() => {
        const map = new Map<string, { eu: string; au: string; key: string }>()
        for (const it of items.value) if (!map.has(it.euSize)) map.set(it.euSize, { eu: it.euSize, au: it.auSize, key: it.euSize })
        return Array.from(map.values()).sort((a, b) => Number(a.eu) - Number(b.eu))
    })
    const colors = computed(() => {
        const set = new Set<string>()
        for (const it of items.value) {
            const c = (it.color ?? '').trim()
            if (c) set.add(c)
        }
        // A~Z 정렬 (대소문자 무시, 공백 제거)
        return Array.from(set).sort((a, b) =>
            a.localeCompare(b, 'en', { sensitivity: 'base' })
        )
    })
    const matrix = computed(() => {
        const m = new Map<string, Map<string, StockItem>>()
        for (const it of items.value) {
            if (!m.has(it.color)) m.set(it.color, new Map())
            m.get(it.color)!.set(it.euSize, it)
        }
        return m
    })

    watch([q, mode], fetchNow, { immediate: true })

    return { items, total, productName, sizes, colors, matrix, pending, errorMsg, fetchNow }
}
