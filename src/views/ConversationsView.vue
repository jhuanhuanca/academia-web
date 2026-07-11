<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'

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

async function loadChats() {
  loading.value = true
  try {
    const res = await api<{ data: Chat[] }>('/conversations')
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
      <p v-if="loading" class="empty">Cargando…</p>
      <p v-else-if="!chats.length" class="empty">Aún no hay chats. Simula uno en WhatsApp.</p>
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
  grid-template-columns: 320px 1fr;
  gap: 1rem;
  min-height: 560px;
}
.list,
.thread {
  padding: 1rem;
}
.list {
  display: grid;
  align-content: start;
  gap: 0.55rem;
}
.list h2,
.thread h2 {
  color: var(--ml-wine-deep);
}
.chat {
  text-align: left;
  border: 1px solid var(--ml-line);
  background: rgba(255, 251, 244, 0.75);
  border-radius: 14px;
  padding: 0.75rem;
  display: grid;
  gap: 0.15rem;
  cursor: pointer;
}
.chat.active {
  border-color: rgba(10, 52, 148, 0.45);
  box-shadow: 0 0 0 2px rgba(127, 154, 82, 0.2);
}
.chat span {
  color: var(--ml-muted);
  font-size: 0.85rem;
}
.chat em {
  font-style: normal;
  font-size: 0.72rem;
  color: var(--ml-sky);
  font-weight: 600;
}
.thread {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.8rem;
}
header {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
}
header p,
.empty {
  color: var(--ml-muted);
  font-size: 0.85rem;
}
.messages {
  display: grid;
  gap: 0.55rem;
  align-content: start;
  padding: 0.5rem;
  border-radius: 16px;
  background: rgba(10, 52, 148, 0.03);
  overflow: auto;
}
.bubble {
  max-width: 75%;
  padding: 0.7rem 0.9rem;
  border-radius: 16px;
  font-size: 0.92rem;
}
.bubble.luna {
  background: linear-gradient(135deg, rgba(10, 52, 148, 0.12), rgba(127, 154, 82, 0.2));
  justify-self: start;
}
.bubble.user {
  background: linear-gradient(135deg, var(--ml-wine), var(--ml-ember));
  color: var(--ml-cream);
  justify-self: end;
}
@media (max-width: 900px) {
  .page {
    grid-template-columns: 1fr;
  }
}
</style>
