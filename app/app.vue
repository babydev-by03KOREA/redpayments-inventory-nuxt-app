<template>
  <div class="min-h-screen bg-gray-50">
    <header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <h1 class="font-semibold">재고 조회</h1>

        <select v-model="mode" class="border rounded-lg px-2 py-1 text-sm">
          <option value="code">상품코드</option>
<!--          <option value="barcode">바코드</option>-->
        </select>

        <form class="ml-auto flex gap-2" @submit.prevent="submit">
          <input
              v-model.trim="q"
              type="text"
              :placeholder="mode === 'code' ? '예: OB360' : 'EAN/UPC 바코드'"
              class="border rounded-xl px-3 py-2 w-56 focus:outline-none focus:ring"
          />
          <button class="rounded-xl px-4 py-2 border bg-white shadow-sm hover:shadow" :disabled="pending">
            {{ pending ? '조회 중…' : '조회' }}
          </button>
        </form>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <p v-if="productName" class="text-sm text-gray-600">
        <span class="font-medium">상품명:</span> {{ productName }}
        <template v-if="total != null">
          <span class="ml-3 font-medium">총 갯수:</span> {{ total }}
        </template>
      </p>

      <div v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</div>
      <div v-if="pending" class="text-sm text-gray-500">불러오는 중…</div>

      <InventoryMatrix v-if="!pending" :sizes="sizes" :colors="colors" :matrix="matrix" :counts="counts" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import InventoryMatrix from '~/components/inventory/Matrix.vue'
import { useInventory } from '~/composables/useInventory'

const route = useRoute()
const router = useRouter()

// URL ?q=, ?mode= 로 상태 공유
const q = ref<string>((route.query.q as string) || '')
const mode = ref<'code' | 'barcode'>((route.query.mode as any) || 'code')
watch([q, mode], ([qv, mv]) => {
  const query = { ...(qv ? { q: qv } : {}), ...(mv !== 'code' ? { mode: mv } : {}) }
  router.replace({ query })
})

const { items, total, productName, sizes, colors, matrix, pending, errorMsg, fetchNow } = useInventory(q, mode)

function submit() { fetchNow() }

const counts = computed(() => {
  const m = new Map<string, number>()
  for (const it of items.value) {
    const color = (it.color ?? '').trim().toUpperCase()
    const size = String(it.euSize ?? '').trim()
    if (!color || !size) continue
    const key = `${color}|${size}`
    const add = typeof it.quantity === 'number' ? it.quantity : 1
    m.set(key, (m.get(key) ?? 0) + add)
  }
  return m
})
</script>
