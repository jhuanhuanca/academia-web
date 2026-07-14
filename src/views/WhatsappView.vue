<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api/client'

type Instance = {
  id: number
  name: string
  status: string
  phone_e164?: string | null
  integration: string
  meta_phone_number_id?: string | null
  meta_waba_id?: string | null
  has_meta_token?: boolean
  webhook_url?: string
}

type ChatMsg = {
  id: string | number
  direction: 'inbound' | 'outbound' | string
  type: string
  body?: string | null
  created_at?: string
  status?: string
  preview_url?: string
  payload?: {
    buttons?: Array<{ id?: string; label?: string; display?: string }>
    footer?: string
    preview?: boolean
  } | null
}

/** Comprobante mínimo válido (PNG 1×1) para completar el flujo de pago. */
const SAMPLE_RECEIPT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6aAAAAAElFTkSuQmCC'

const store = useAppStore()
const busy = ref(false)
const sending = ref(false)
const instances = ref<Instance[]>([])
const current = ref<Instance | null>(null)
const providerHealth = ref<'ok' | 'down' | 'unknown' | 'unconfigured'>('unknown')
const error = ref('')
const info = ref('')

const metaPhoneId = ref('')
const metaWabaId = ref('')
const metaToken = ref('')

const customerPhone = ref('+584120000000')
const draft = ref('')
const messages = ref<ChatMsg[]>([])
const threadEl = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const businessName = computed(() => store.user?.tenant?.name || 'LunaMarket')
const botLabel = computed(() => 'Asistente')
const webhookHost = computed(() => {
  const url = current.value?.webhook_url || ''
  try {
    return url ? new URL(url).host : 'tu API'
  } catch {
    return 'tu API'
  }
})

const statusLabel = computed(() => {
  if (current.value?.status === 'open' && providerHealth.value === 'ok') return 'Conectado'
  if (providerHealth.value === 'unconfigured') return 'Sin configurar'
  if (current.value?.status === 'connecting') return 'Conectando…'
  return 'Desconectado'
})

async function ensureMetaIntegration(inst: Instance) {
  if (inst.integration === 'meta_cloud') return inst
  const res = await api<{ data: Instance }>(`/whatsapp-instances/${inst.id}`, {
    method: 'PATCH',
    body: { integration: 'meta_cloud' },
  })
  return res.data
}

async function scrollThread() {
  await nextTick()
  if (threadEl.value) {
    threadEl.value.scrollTop = threadEl.value.scrollHeight
  }
}

function applyThread(list: ChatMsg[]) {
  messages.value = list
  void scrollThread()
}

async function load() {
  error.value = ''
  try {
    const health = await api<{ data: { status?: string } }>('/whatsapp/health')
    const st = health.data?.status
    providerHealth.value =
      st === 'ok' || st === 'down' || st === 'unconfigured' ? st : 'down'
  } catch {
    providerHealth.value = 'down'
  }

  const res = await api<{ data: Instance[] }>('/whatsapp-instances')
  instances.value = res.data
  let first = res.data[0] || null
  if (first) {
    try {
      first = await ensureMetaIntegration(first)
    } catch {
      /* keep */
    }
  }
  current.value = first
}

watch(current, (inst) => {
  if (!inst) return
  metaPhoneId.value = inst.meta_phone_number_id || ''
  metaWabaId.value = inst.meta_waba_id || ''
})

async function connectCloud() {
  if (!current.value) return
  busy.value = true
  error.value = ''
  info.value = ''
  try {
    const res = await api<{ data: Instance; message?: string }>(
      `/whatsapp-instances/${current.value.id}/connect`,
      {
        method: 'POST',
        body: {
          meta_phone_number_id: metaPhoneId.value || undefined,
          meta_waba_id: metaWabaId.value || undefined,
          meta_access_token: metaToken.value || undefined,
        },
      },
    )
    current.value = res.data
    info.value = res.message || 'WhatsApp conectado.'
    metaToken.value = ''
    await store.refreshDashboardFlags()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo conectar WhatsApp'
  } finally {
    busy.value = false
  }
}

async function refresh() {
  if (!current.value) return
  busy.value = true
  try {
    const res = await api<{ data: Instance }>(`/whatsapp-instances/${current.value.id}/refresh`)
    current.value = res.data
    await store.refreshDashboardFlags()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo refrescar'
  } finally {
    busy.value = false
  }
}

async function sendChatMessage(text?: string, buttonId?: string) {
  if (!current.value) return
  const body = (text ?? draft.value).trim()
  if (!body && !buttonId) return

  sending.value = true
  error.value = ''
  draft.value = ''

  const display = body || buttonId || ''
  messages.value = [
    ...messages.value,
    {
      id: `local-${Date.now()}`,
      direction: 'inbound',
      type: buttonId ? 'button_reply' : 'text',
      body: display,
      created_at: new Date().toISOString(),
    },
  ]
  await scrollThread()

  try {
    const res = await api<{ data: unknown; messages?: ChatMsg[] }>(
      `/whatsapp-instances/${current.value.id}/simulate-inbound`,
      {
        method: 'POST',
        body: {
          phone: customerPhone.value,
          text: body || buttonId,
          button_id: buttonId,
          type: buttonId ? 'button_reply' : 'text',
          wa_name: 'Cliente',
        },
      },
    )
    if (Array.isArray(res.messages) && res.messages.length) {
      applyThread(res.messages)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo enviar el mensaje'
  } finally {
    sending.value = false
  }
}

async function sendReceipt(base64: string, previewUrl?: string) {
  if (!current.value) return

  sending.value = true
  error.value = ''

  messages.value = [
    ...messages.value,
    {
      id: `local-receipt-${Date.now()}`,
      direction: 'inbound',
      type: 'image',
      body: '📎 Comprobante de pago',
      preview_url: previewUrl || base64,
      created_at: new Date().toISOString(),
    },
  ]
  await scrollThread()

  try {
    const res = await api<{ data: unknown; messages?: ChatMsg[] }>(
      `/whatsapp-instances/${current.value.id}/simulate-inbound`,
      {
        method: 'POST',
        body: {
          phone: customerPhone.value,
          text: '[comprobante]',
          type: 'image',
          receipt_base64: base64,
          wa_name: 'Cliente',
        },
      },
    )
    if (Array.isArray(res.messages) && res.messages.length) {
      applyThread(res.messages)
    }
    info.value = 'Comprobante enviado. Revisa Ventas para confirmar el pago.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo enviar el comprobante'
  } finally {
    sending.value = false
  }
}

function openReceiptPicker() {
  fileInput.value?.click()
}

async function onReceiptFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = 'El comprobante debe ser una imagen (JPG, PNG, etc.).'
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    error.value = 'La imagen supera 8 MB.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result || '')
    if (!result.startsWith('data:')) {
      error.value = 'No se pudo leer la imagen.'
      return
    }
    void sendReceipt(result, result)
  }
  reader.onerror = () => {
    error.value = 'No se pudo leer la imagen.'
  }
  reader.readAsDataURL(file)
}

function sendSampleReceipt() {
  void sendReceipt(SAMPLE_RECEIPT)
}

function onComposerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void sendChatMessage()
  }
}

function formatTime(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function isImageMsg(m: ChatMsg) {
  return m.type === 'image' || Boolean(m.preview_url)
}

function messageButtons(m: ChatMsg) {
  const list = m.payload?.buttons
  if (!Array.isArray(list) || !list.length) return []
  return list
    .map((b) => ({
      id: String(b.id || ''),
      label: String(b.label || b.display || b.id || 'Opción'),
    }))
    .filter((b) => b.id)
}

function tapButton(btn: { id: string; label: string }) {
  void sendChatMessage(btn.label, btn.id)
}

onMounted(load)
</script>

<template>
  <div class="page">
    <section class="ml-card tip ml-rise">
      <strong>WhatsApp Business</strong>
      <span>Conecta el número oficial de Meta y conversa con tu asistente desde esta vista.</span>
    </section>

    <div class="grid">
      <article class="ml-card panel ml-rise">
        <h2>Conexión</h2>
        <p v-if="current" class="meta">
          {{ current.name }}
          <template v-if="current.phone_e164"> · {{ current.phone_e164 }}</template>
        </p>

        <div class="status-row">
          <span
            class="ml-badge"
            :class="current?.status === 'open' && providerHealth === 'ok' ? 'ml-badge-ok' : 'ml-badge-warn'"
          >
            {{ statusLabel }}
          </span>
        </div>

        <div class="meta-form">
          <label>
            <span class="ml-label">Phone Number ID</span>
            <input v-model="metaPhoneId" class="ml-input" placeholder="ID del número en Meta" />
          </label>
          <label>
            <span class="ml-label">WABA ID (opcional)</span>
            <input v-model="metaWabaId" class="ml-input" placeholder="WhatsApp Business Account ID" />
          </label>
          <label>
            <span class="ml-label">Access Token</span>
            <input
              v-model="metaToken"
              class="ml-input"
              type="password"
              :placeholder="
                current?.has_meta_token ? 'Token guardado · deja vacío para no cambiar' : 'Token de acceso'
              "
            />
          </label>
          <p class="note">
            En Meta Developer configura el webhook hacia tu API
            (<strong>({{ webhookHost }})</strong>
            y suscribe el campo <strong>messages</strong>.
          </p>
        </div>

        <div class="actions">
          <button
            class="ml-btn ml-btn-primary"
            type="button"
            :disabled="busy || !current"
            @click="connectCloud"
          >
            Activar WhatsApp
          </button>
          <button class="ml-btn ml-btn-secondary" type="button" :disabled="busy || !current" @click="refresh">
            Refrescar
          </button>
        </div>
        <p v-if="info" class="ok">{{ info }}</p>
        <p v-if="error" class="err">{{ error }}</p>
      </article>

      <!-- Vista estilo WhatsApp Business -->
      <article class="wa-shell ml-rise ml-rise-delay-2" aria-label="Chat WhatsApp Business">
        <header class="wa-top">
          <div class="wa-avatar" aria-hidden="true">{{ businessName.slice(0, 1).toUpperCase() }}</div>
          <div class="wa-top-text">
            <strong>{{ businessName }}</strong>
            <span>{{ botLabel }} · en línea</span>
          </div>
        </header>

        <div class="wa-toolbar">
          <label>
            <span>Cliente</span>
            <input v-model="customerPhone" class="wa-phone" type="tel" />
          </label>
        </div>

        <div ref="threadEl" class="wa-thread">
          <div v-if="!messages.length" class="wa-empty">
            <p>
              Escribe como un cliente. Cuando el bot pida el pago, adjunta el
              <strong>comprobante</strong> para completar la venta.
            </p>
          </div>

          <div
            v-for="m in messages"
            :key="m.id"
            class="wa-row"
            :class="m.direction === 'inbound' ? 'from-customer' : 'from-bot'"
          >
            <div class="wa-bubble" :class="{ 'has-media': isImageMsg(m) }">
              <img
                v-if="m.preview_url"
                :src="m.preview_url"
                alt="Comprobante"
                class="wa-media"
              />
              <p v-if="isImageMsg(m) && !m.preview_url" class="wa-media-fallback">🖼 Comprobante</p>
              <p v-if="m.body && !isImageMsg(m)">{{ m.body }}</p>
              <p v-else-if="m.body && m.preview_url" class="wa-caption">{{ m.body }}</p>
              <p v-else-if="!m.body && !isImageMsg(m) && m.type !== 'buttons'">[{{ m.type }}]</p>

              <div v-if="messageButtons(m).length" class="wa-quick-replies">
                <button
                  v-for="btn in messageButtons(m)"
                  :key="btn.id"
                  type="button"
                  class="wa-reply-btn"
                  :disabled="sending"
                  @click="tapButton(btn)"
                >
                  {{ btn.label }}
                </button>
              </div>

              <time>{{ formatTime(m.created_at) }}</time>
            </div>
          </div>
        </div>

        <div class="wa-actions-bar">
          <button
            class="wa-chip"
            type="button"
            :disabled="sending || !current"
            @click="openReceiptPicker"
          >
            📎 Subir comprobante
          </button>
          <button
            class="wa-chip ghost"
            type="button"
            :disabled="sending || !current"
            @click="sendSampleReceipt"
          >
            Comprobante rápido
          </button>
          <input
            ref="fileInput"
            class="sr-only"
            type="file"
            accept="image/*"
            @change="onReceiptFile"
          />
        </div>

        <form class="wa-composer" @submit.prevent="sendChatMessage()">
          <input
            v-model="draft"
            class="wa-input"
            type="text"
            placeholder="Escribe un mensaje"
            :disabled="sending || !current"
            @keydown="onComposerKeydown"
          />
          <button class="wa-send" type="submit" :disabled="sending || !draft.trim() || !current">
            {{ sending ? '…' : 'Enviar' }}
          </button>
        </form>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 1rem;
}
.tip {
  padding: 0.9rem 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  color: var(--ml-muted);
}
.tip strong {
  color: var(--ml-wine);
}
.grid {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.15fr);
  gap: 1rem;
  align-items: start;
}
.panel {
  padding: 1.2rem;
  display: grid;
  gap: 0.85rem;
  align-content: start;
}
.panel h2 {
  color: var(--ml-wine-deep);
  margin: 0;
}
.meta,
.note {
  color: var(--ml-muted);
  font-size: 0.9rem;
  margin: 0;
}
.meta-form {
  display: grid;
  gap: 0.65rem;
}
.status-row,
.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ok {
  color: var(--ml-olive);
  margin: 0;
}
.err {
  color: var(--ml-crimson);
  margin: 0;
}

/* —— WhatsApp Business shell —— */
.wa-shell {
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  min-height: 560px;
  max-height: 720px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: #0b141a;
  box-shadow: var(--ml-shadow-soft);
}
.wa-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #1f2c34;
  color: #e9edef;
}
.wa-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  background: linear-gradient(145deg, #00a884, #025c4c);
  color: #fff;
}
.wa-top-text {
  display: grid;
  gap: 0.1rem;
}
.wa-top-text strong {
  font-size: 0.98rem;
}
.wa-top-text span {
  font-size: 0.78rem;
  color: #8696a0;
}
.wa-toolbar {
  padding: 0.45rem 0.85rem;
  background: #111b21;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.wa-toolbar label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #8696a0;
}
.wa-phone {
  flex: 1;
  border: 0;
  border-radius: 8px;
  background: #2a3942;
  color: #e9edef;
  padding: 0.4rem 0.65rem;
  font: inherit;
  font-size: 0.85rem;
}
.wa-thread {
  overflow: auto;
  padding: 1rem 0.85rem 1.2rem;
  background:
    linear-gradient(rgba(11, 20, 26, 0.88), rgba(11, 20, 26, 0.92)),
    radial-gradient(circle at 20% 20%, rgba(0, 168, 132, 0.08), transparent 40%),
    #0b141a;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.wa-empty {
  margin: auto;
  max-width: 280px;
  text-align: center;
  color: #8696a0;
  font-size: 0.88rem;
  line-height: 1.45;
  padding: 1rem;
  background: rgba(17, 27, 33, 0.85);
  border-radius: 12px;
}
.wa-row {
  display: flex;
}
.wa-row.from-customer {
  justify-content: flex-end;
}
.wa-row.from-bot {
  justify-content: flex-start;
}
.wa-bubble {
  max-width: min(78%, 360px);
  padding: 0.45rem 0.55rem 0.3rem;
  border-radius: 10px;
  box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.18);
}
.wa-bubble p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.92rem;
  line-height: 1.35;
  color: #e9edef;
}
.wa-bubble time {
  display: block;
  text-align: right;
  font-size: 0.68rem;
  color: #8696a0;
  margin-top: 0.2rem;
}
.from-customer .wa-bubble {
  background: #005c4b;
  border-top-right-radius: 3px;
}
.from-bot .wa-bubble {
  background: #202c33;
  border-top-left-radius: 3px;
}
.wa-bubble.has-media {
  padding: 0.35rem;
}
.wa-media {
  display: block;
  width: 100%;
  max-width: 220px;
  border-radius: 8px;
  margin-bottom: 0.25rem;
  background: #111;
}
.wa-media-fallback,
.wa-caption {
  font-size: 0.82rem !important;
  color: #d1e3dc !important;
  margin: 0.15rem 0.2rem 0 !important;
}
.wa-quick-replies {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.55rem;
}
.wa-reply-btn {
  width: 100%;
  border: 1px solid rgba(0, 168, 132, 0.55);
  background: rgba(0, 168, 132, 0.12);
  color: #25d366;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}
.wa-reply-btn:hover:not(:disabled) {
  background: rgba(0, 168, 132, 0.22);
}
.wa-reply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.wa-actions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem 0;
  background: #1f2c34;
}
.wa-chip {
  border: 0;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  background: #2a3942;
  color: #e9edef;
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}
.wa-chip.ghost {
  background: transparent;
  border: 1px solid #3b4a54;
  color: #aebac1;
}
.wa-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.wa-composer {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.55rem 0.7rem;
  background: #1f2c34;
}
.wa-input {
  flex: 1;
  border: 0;
  border-radius: 22px;
  background: #2a3942;
  color: #e9edef;
  padding: 0.7rem 1rem;
  font: inherit;
  font-size: 0.92rem;
}
.wa-input::placeholder {
  color: #8696a0;
}
.wa-send {
  border: 0;
  border-radius: 50%;
  width: 46px;
  height: 46px;
  background: #00a884;
  color: #061410;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}
.wa-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .wa-shell {
    min-height: 480px;
  }
}
</style>
