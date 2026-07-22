<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import DatePeriodFilter, { type Period } from '@/components/DatePeriodFilter.vue'

type Chat = {
  id: number
  status: string
  assigned_user_id?: number | null
  assigned_user?: { id: number; name?: string | null; email?: string | null } | null
  lead?: { name?: string | null; wa_name?: string | null; phone_e164?: string }
  updated_at?: string
}

type Msg = {
  id: number
  direction: string
  body?: string | null
  type: string
  created_at?: string
  payload?: {
    agent_reply?: boolean
    agent_name?: string
  } | null
}

const chats = ref<Chat[]>([])
const selectedId = ref<number | null>(null)
const messages = ref<Msg[]>([])
const selected = ref<Chat | null>(null)
const botPaused = ref(false)
const loading = ref(true)
const sending = ref(false)
const draft = ref('')
const error = ref('')
const info = ref('')
const threadEl = ref<HTMLElement | null>(null)

const period = ref<Period>('today')
const date = ref('')
const month = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null

const statusLabel = computed(() => {
  const s = selected.value?.status || ''
  const map: Record<string, string> = {
    open: 'Abierta',
    waiting_input: 'Esperando cliente',
    waiting_payment: 'Esperando pago',
    handed_off: 'Con humano',
    closed: 'Cerrada',
  }
  return map[s] || s || '—'
})

const statusBadgeClass = computed(() => {
  if (selected.value?.status === 'handed_off' || botPaused.value) return 'ml-badge-ok'
  if (selected.value?.status === 'waiting_payment') return 'ml-badge-warn'
  return 'ml-badge-warn'
})

function queryParams() {
  const q = new URLSearchParams({ period: period.value })
  if (period.value === 'day' && date.value) q.set('date', date.value)
  if (period.value === 'month' && month.value) q.set('month', month.value)
  return q.toString()
}

function formatTime(value?: string) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

async function scrollThread() {
  await nextTick()
  if (threadEl.value) {
    threadEl.value.scrollTop = threadEl.value.scrollHeight
  }
}

async function loadChats(keepSelection = false) {
  const prevId = keepSelection ? selectedId.value : null
  loading.value = true
  error.value = ''
  try {
    const res = await api<{ data: Chat[] }>(`/conversations?${queryParams()}`)
    chats.value = res.data
    const target =
      (prevId && res.data.find((c) => c.id === prevId)) ||
      res.data[0] ||
      null
    if (target) {
      await openChat(target, false)
    } else {
      selectedId.value = null
      selected.value = null
      messages.value = []
      botPaused.value = false
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar los chats'
  } finally {
    loading.value = false
  }
}

async function openChat(chat: Chat, clearFlash = true) {
  selectedId.value = chat.id
  selected.value = chat
  if (clearFlash) {
    error.value = ''
    info.value = ''
  }
  try {
    const res = await api<{
      data: { messages: Msg[]; conversation: Chat; bot_paused?: boolean }
    }>(`/conversations/${chat.id}`)
    messages.value = res.data.messages
    selected.value = res.data.conversation
    botPaused.value = Boolean(res.data.bot_paused) || res.data.conversation.status === 'handed_off'
    // refrescar fila en lista
    const idx = chats.value.findIndex((c) => c.id === chat.id)
    if (idx >= 0) chats.value[idx] = { ...chats.value[idx], ...res.data.conversation }
    await scrollThread()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo abrir el chat'
  }
}

async function sendReply() {
  if (!selected.value || !draft.value.trim() || sending.value) return
  sending.value = true
  error.value = ''
  info.value = ''
  const text = draft.value.trim()
  try {
    const res = await api<{
      data: { message: Msg; conversation: Chat; bot_paused?: boolean }
      message?: string
    }>(`/conversations/${selected.value.id}/reply`, {
      method: 'POST',
      body: { text, take_over: true },
    })
    draft.value = ''
    messages.value = [...messages.value, res.data.message]
    selected.value = res.data.conversation
    botPaused.value = true
    info.value = res.message || 'Mensaje enviado. Bot en pausa.'
    await scrollThread()
    await loadChats(true)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo enviar'
  } finally {
    sending.value = false
  }
}

async function takeChat() {
  if (!selected.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    const res = await api<{ data: { conversation: Chat }; message?: string }>(
      `/conversations/${selected.value.id}/take`,
      { method: 'POST' },
    )
    selected.value = res.data.conversation
    botPaused.value = true
    info.value = res.message || 'Chat tomado.'
    await loadChats(true)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo tomar el chat'
  } finally {
    sending.value = false
  }
}

async function releaseChat() {
  if (!selected.value || sending.value) return
  if (!window.confirm('¿Devolver este chat al bot? El asistente volverá a responder.')) return
  sending.value = true
  error.value = ''
  try {
    const res = await api<{ data: { conversation: Chat }; message?: string }>(
      `/conversations/${selected.value.id}/release`,
      { method: 'POST' },
    )
    selected.value = res.data.conversation
    botPaused.value = false
    info.value = res.message || 'Chat devuelto al bot.'
    await loadChats(true)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo devolver el chat'
  } finally {
    sending.value = false
  }
}

function onComposerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void sendReply()
  }
}

function isAgentMsg(m: Msg) {
  return Boolean(m.payload?.agent_reply)
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (selectedId.value && !sending.value) {
      void openChat({ id: selectedId.value } as Chat, false)
    }
  }, 8000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch([period, date, month], () => {
  // DatePeriodFilter emite change; esto es respaldo
})

onMounted(async () => {
  await loadChats()
  startPolling()
})

onUnmounted(stopPolling)
</script>

<template>
  <div class="page">
    <aside class="ml-card list ml-rise">
      <h2>Conversaciones</h2>
      <DatePeriodFilter
        v-model:period="period"
        v-model:date="date"
        v-model:month="month"
        @change="loadChats(false)"
      />
      <p v-if="loading" class="empty">Cargando…</p>
      <p v-else-if="!chats.length" class="empty">No hay chats en este período.</p>
      <button
        v-for="chat in chats"
        :key="chat.id"
        class="chat"
        type="button"
        :class="{ active: chat.id === selectedId, human: chat.status === 'handed_off' }"
        @click="openChat(chat)"
      >
        <strong>{{ chat.lead?.name || chat.lead?.wa_name || chat.lead?.phone_e164 || 'Lead' }}</strong>
        <span>{{ chat.lead?.phone_e164 }}</span>
        <em>{{ chat.status === 'handed_off' ? 'Con humano' : chat.status }}</em>
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
          <p>
            {{ selected?.lead?.phone_e164 || 'Selecciona un chat' }}
            <template v-if="selected?.assigned_user?.name">
              · Atendido por {{ selected.assigned_user.name }}
            </template>
          </p>
        </div>
        <div v-if="selected" class="header-actions">
          <span class="ml-badge" :class="statusBadgeClass">{{ statusLabel }}</span>
          <button
            v-if="!botPaused"
            class="ml-btn ghost sm"
            type="button"
            :disabled="sending"
            @click="takeChat"
          >
            Tomar chat
          </button>
          <button
            v-else
            class="ml-btn ghost sm"
            type="button"
            :disabled="sending"
            @click="releaseChat"
          >
            Devolver al bot
          </button>
        </div>
      </header>

      <p v-if="botPaused && selected" class="pause-banner">
        Bot en pausa. Tú respondes como humano. Los mensajes del cliente llegan aquí sin respuesta automática.
      </p>

      <div ref="threadEl" class="messages">
        <div
          v-for="m in messages"
          :key="m.id"
          class="bubble"
          :class="[
            m.direction === 'inbound' ? 'user' : 'luna',
            { agent: isAgentMsg(m) },
          ]"
        >
          <span v-if="isAgentMsg(m)" class="agent-tag">
            {{ m.payload?.agent_name || 'Agente' }}
          </span>
          <p>{{ m.body || `[${m.type}]` }}</p>
          <time v-if="m.created_at">{{ formatTime(m.created_at) }}</time>
        </div>
        <p v-if="!messages.length" class="empty">Sin mensajes</p>
      </div>

      <p v-if="error" class="err">{{ error }}</p>
      <p v-else-if="info" class="ok">{{ info }}</p>

      <form v-if="selected" class="composer" @submit.prevent="sendReply">
        <textarea
          v-model="draft"
          class="ml-textarea"
          rows="2"
          placeholder="Escribe tu respuesta al cliente… (Enter para enviar)"
          :disabled="sending"
          @keydown="onComposerKeydown"
        />
        <div class="composer-actions">
          <span class="hint">
            Al enviar, el bot se pausa automáticamente en este chat.
          </span>
          <button class="ml-btn ml-btn-primary" type="submit" :disabled="sending || !draft.trim()">
            {{ sending ? 'Enviando…' : 'Enviar' }}
          </button>
        </div>
      </form>
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
.thread {
  grid-template-rows: auto auto 1fr auto auto;
  min-height: 70vh;
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
.chat.human {
  border-color: color-mix(in srgb, var(--ml-olive) 50%, var(--ml-line));
}
.chat span,
.chat em,
.empty,
header p,
.hint {
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
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  justify-content: flex-end;
}
.pause-banner {
  margin: 0;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: rgba(0, 198, 171, 0.12);
  border: 1px solid rgba(0, 198, 171, 0.28);
  color: var(--ml-ink);
  font-size: 0.85rem;
}
.messages {
  display: grid;
  gap: 0.55rem;
  max-height: 48vh;
  min-height: 240px;
  overflow: auto;
  padding-right: 0.25rem;
  align-content: start;
}
.bubble {
  max-width: 85%;
  padding: 0.65rem 0.85rem;
  border-radius: 14px;
  color: var(--ml-ink);
  display: grid;
  gap: 0.2rem;
}
.bubble p {
  margin: 0;
  white-space: pre-wrap;
}
.bubble time {
  font-size: 0.72rem;
  color: var(--ml-muted);
  justify-self: end;
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
.bubble.agent {
  background: rgba(0, 55, 84, 0.12);
  border-color: rgba(0, 55, 84, 0.28);
}
.agent-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ml-c4);
}
.composer {
  display: grid;
  gap: 0.55rem;
  border-top: 1px solid var(--ml-line);
  padding-top: 0.75rem;
}
.composer-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}
.ml-btn.ghost {
  background: transparent;
  border: 1px solid var(--ml-line);
  color: var(--ml-ink);
}
.ml-btn.sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  border-radius: 999px;
}
.err {
  color: var(--ml-crimson);
  margin: 0;
  font-size: 0.88rem;
}
.ok {
  color: var(--ml-olive);
  margin: 0;
  font-size: 0.88rem;
}
@media (max-width: 860px) {
  .page {
    grid-template-columns: 1fr;
  }
  .messages {
    max-height: 40vh;
  }
}
</style>
