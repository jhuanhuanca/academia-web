<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'
import DatePeriodFilter, { type Period } from '@/components/DatePeriodFilter.vue'

type Chat = {
  id: number
  status: string
  lead?: { name?: string | null; wa_name?: string | null; phone_e164?: string }
}

type Msg = {
  id: number
  direction: string
  body?: string | null
  type: string
}

const chats = ref<Chat[]>([])
const selectedId = ref<number | null>(null)
const messages = ref<Msg[]>([])
const selected = ref<Chat | null>(null)
const loading = ref(true)

const period = ref<Period>('today')
const date = ref('')
const month = ref('')

function queryParams() {
  const q = new URLSearchParams({ period: period.value })
  if (period.value === 'day' && date.value) q.set('date', date.value)
  if (period.value === 'month' && month.value) q.set('month', month.value)
  return q.toString()
}

async function loadChats() {
  loading.value = true
  selectedId.value = null
  selected.value = null
  messages.value = []
  try {
    const res = await api<{ data: Chat[] }>(`/conversations?${queryParams()}`)
    chats.value = res.data
    if (res.data[0]) {
      await openChat(res.data[0])
    }
  } finally {
    loading.value = false
  }
}

async function openChat(chat: Chat) {
  selectedId.value = chat.id
  selected.value = chat
  const res = await api<{ data: { messages: Msg[]; conversation: Chat } }>(
    `/conversations/${chat.id}`,
  )
  messages.value = res.data.messages
  selected.value = res.data.conversation
}

onMounted(loadChats)
</script>

<template>
  <div class="page">
    <aside class="ml-card list ml-rise">
      <h2>Conversaciones</h2>
      <DatePeriodFilter
        v-model:period="period"
        v-model:date="date"
        v-model:month="month"
        @change="loadChats"
      />
      <p v-if="loading" class="empty">Cargando…</p>
      <p v-else-if="!chats.length" class="empty">No hay chats en este período.</p>
      <button
        v-for="chat in chats"
        :key="chat.id"
        class="chat"
        type="button"
        :class="{ active: chat.id === selectedId }"
        @click="openChat(chat)"
      >
        <strong>{{ chat.lead?.name || chat.lead?.wa_name || chat.lead?.phone_e164 || 'Lead' }}</strong>
        <span>{{ chat.lead?.phone_e164 }}</span>
        <em>{{ chat.status }}</em>
      </button>
    </aside>

    <section class="ml-card thread ml-rise ml-rise-delay-2">
      <header>
        <div>
          <h2>
            {{
              selected?.lead?.name ||
              selected?.lead?.wa_name ||
              selected?.lead?.phone_e164 ||
              'Inbox'
            }}
          </h2>
          <p>Mensajes reales guardados por la API</p>
        </div>
        <span v-if="selected" class="ml-badge ml-badge-warn">{{ selected.status }}</span>
      </header>
      <div class="messages">
        <div
          v-for="m in messages"
          :key="m.id"
          class="bubble"
          :class="m.direction === 'inbound' ? 'user' : 'luna'"
        >
          {{ m.body || `[${m.type}]` }}
        </div>
        <p v-if="!messages.length" class="empty">Sin mensajes</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  gap: 1rem;
  min-height: 70vh;
}
.list,
.thread {
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
  align-content: start;
}
.list h2,
.thread h2 {
  color: var(--ml-wine-deep);
  margin: 0;
}
.chat {
  display: grid;
  gap: 0.15rem;
  text-align: left;
  border: 1px solid var(--ml-line);
  background: var(--ml-input-bg);
  color: var(--ml-ink);
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  font: inherit;
}
.chat.active {
  border-color: var(--ml-aqua);
  box-shadow: 0 0 0 1px var(--ml-aqua);
}
.chat span,
.chat em,
.empty,
header p {
  color: var(--ml-muted);
  font-size: 0.82rem;
  font-style: normal;
}
.thread header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}
.messages {
  display: grid;
  gap: 0.55rem;
  max-height: 60vh;
  overflow: auto;
  padding-right: 0.25rem;
}
.bubble {
  max-width: 85%;
  padding: 0.65rem 0.85rem;
  border-radius: 14px;
  white-space: pre-wrap;
  color: var(--ml-ink);
}
.bubble.user {
  justify-self: start;
  background: var(--ml-input-bg);
  border: 1px solid var(--ml-line);
}
.bubble.luna {
  justify-self: end;
  background: rgba(0, 198, 171, 0.14);
  border: 1px solid rgba(0, 198, 171, 0.28);
}
@media (max-width: 860px) {
  .page {
    grid-template-columns: 1fr;
  }
}
</style>
