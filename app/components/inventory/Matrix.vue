<template>
  <div class="overflow-auto" v-if="sizes.length && colors.length">
    <table class="min-w-[800px] w-full border-separate border-spacing-0">
      <thead>
      <tr>
        <th class="sticky left-0 z-10 bg-gray-50 border-b px-3 py-2 text-left w-44">Color/Size</th>
        <th v-for="s in sizes" :key="s.key" class="bg-gray-50 border-b px-3 py-2 text-center">
          <div class="font-medium">{{ s.eu }}</div>
          <div class="text-xs text-gray-500">({{ s.au }})</div>
        </th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="c in colors" :key="c" class="odd:bg-white even:bg-gray-50">
        <th class="sticky left-0 z-10 bg-inherit border-b px-3 py-2 text-left font-medium">{{ c }}</th>
        <td v-for="s in sizes" :key="c + '_' + s.key" class="border-b px-2 py-2 text-center">
          <div
              class="h-9 rounded-md border inline-flex items-center justify-center text-xs select-text w-10"
              :class="cellClass(c, s.eu)"
          >
            {{ qty(c, s.eu) }}
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="text-sm text-gray-500">데이터가 없습니다.</div>
</template>

<script setup lang="ts">
import type {StockItem} from '~/composables/useInventory'

const props = defineProps<{
  sizes: { eu: string; au: string; key: string }[]
  colors: string[]
  matrix: Map<string, Map<string, StockItem>>
  counts: Map<string, number>
}>()

function normColor(v: string) {
  return (v ?? '').trim().toUpperCase()
}

function normSize(v: string) {
  return String(v ?? '').trim()
}

function qty(color: string, eu: string) {
  // 1) counts 우선
  const key = `${normColor(color)}|${normSize(eu)}`
  const fromCounts = props.counts.get(key)
  if (typeof fromCounts === 'number') return fromCounts

  // 2) matrix에서 단일 레코드 조회
  const it = props.matrix.get(color)?.get(eu)
  if (!it) return 0
  if (typeof it.quantity === 'number') return it.quantity

  // 3) quantity가 없다면 “레코드 존재 = 1개” 기본값
  return 1
}

function cellClass(color: string, eu: string) {
  const n = qty(color, eu)
  if (n <= 0) return 'bg-gray-100 text-gray-400'  // 옵션없음/0
  // 품절/가용 여부 필드가 따로 있으면 여기서 분기
  return 'bg-green-50 ring-1 ring-green-500'
}
</script>
