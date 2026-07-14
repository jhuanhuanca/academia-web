<script setup lang="ts">
import { computed, watch } from 'vue'

export type Period = 'today' | 'day' | 'month'

const period = defineModel<Period>('period', { default: 'today' })
const date = defineModel<string>('date', { default: '' })
const month = defineModel<string>('month', { default: '' })

const emit = defineEmits<{ change: [] }>()

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const monthStr = today.toISOString().slice(0, 7)

if (!date.value) date.value = todayStr
if (!month.value) month.value = monthStr

const label = computed(() => {
  if (period.value === 'day') return `Día ${date.value}`
  if (period.value === 'month') return `Mes ${month.value}`
  return 'Hoy'
})

function setPeriod(p: Period) {
  period.value = p
  emit('change')
}

watch([date, month], () => {
  if (period.value !== 'today') emit('change')
})
</script>

<template>
  <div class="filters">
    <div class="tabs" role="tablist">
      <button
        type="button"
        class="tab"
        :class="{ active: period === 'today' }"
        @click="setPeriod('today')"
      >
        Hoy
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: period === 'day' }"
        @click="setPeriod('day')"
      >
        Día
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: period === 'month' }"
        @click="setPeriod('month')"
      >
        Mes
      </button>
    </div>

    <label v-if="period === 'day'" class="pick">
      <span class="ml-label">Fecha</span>
      <input v-model="date" class="ml-input" type="date" @change="emit('change')" />
    </label>

    <label v-if="period === 'month'" class="pick">
      <span class="ml-label">Mes</span>
      <input v-model="month" class="ml-input" type="month" @change="emit('change')" />
    </label>

    <p class="hint">Mostrando: <strong>{{ label }}</strong></p>
  </div>
</template>

<style scoped>
.filters {
  display: grid;
  gap: 0.65rem;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.tab {
  border: 1px solid var(--ml-line);
  background: var(--ml-input-bg);
  color: var(--ml-ink);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
}
.tab.active {
  background: var(--ml-wine);
  border-color: var(--ml-wine);
  color: #e8f7f5;
}
.pick {
  display: grid;
  gap: 0.25rem;
  max-width: 220px;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ml-muted);
}
.hint strong {
  color: var(--ml-ink);
}
</style>
