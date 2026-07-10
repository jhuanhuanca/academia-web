<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api/client'

type Instance = {
  id: number
  name: string
  evolution_instance: string
  status: string
  phone_e164?: string | null
  integration: string
  meta?: { last_qr?: { base64?: string } }
}

const store = useAppStore()
const busy = ref(false)
const instances = ref<Instance[]>([])
const current = ref<Instance | null>(null)
const evolutionHealth = ref<'ok' | 'down' | 'unknown'>('unknown')
const error = ref('')
const info = ref('')
const simPhone = ref('+584120000000')
const simText = ref('hola')
const simResult = ref('')

const demoReceiptBase64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const qrSrc = computed(() => {
  const b64 = current.value?.meta?.last_qr?.base64
  if (!b64) return ''
  return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`
})

async function load() {
  error.value = ''
  try {
    const health = await api<{ data: { status?: string } }>('/whatsapp/health')
    evolutionHealth.value = health.data?.status === 'ok' ? 'ok' : 'down'
  } catch {
    evolutionHealth.value = 'down'
  }

  const res = await api<{ data: Instance[] }>('/whatsapp-instances')
  instances.value = res.data
  current.value = res.data[0] || null
}

async function connectReal() {
  if (!current.value) return
  busy.value = true
  error.value = ''
  info.value = ''
  try {
    const res = await api<{ data: Instance; qr?: { base64?: string }; message?: string }>(
      `/whatsapp-instances/${current.value.id}/connect`,
      { method: 'POST' },
    )
    current.value = res.data
    if (res.qr?.base64) {
      current.value = {
        ...res.data,
        meta: { last_qr: { base64: res.qr.base64 } },
      }
    }
    info.value = 'Solicitud enviada a Evolution. Escanea el QR si aparece.'
    await store.refreshDashboardFlags()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Evolution no disponible'
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

async function connectDemo() {
  if (!current.value) return
  busy.value = true
  try {
    const res = await api<{ data: Instance }>(
      `/whatsapp-instances/${current.value.id}/connect-demo`,
      { method: 'POST' },
    )
    current.value = res.data
    await store.refreshDashboardFlags()
    store.nextOnboarding()
    info.value = 'Demo marcada como open (sin Evolution).'
  } finally {
    busy.value = false
  }
}

async function simulate(body?: {
  text?: string
  button_id?: string
  type?: string
  receipt_base64?: string
}) {
  if (!current.value) return
  busy.value = true
  simResult.value = ''
  try {
    const res = await api<{ data: unknown }>(
      `/whatsapp-instances/${current.value.id}/simulate-inbound`,
      {
        method: 'POST',
        body: {
          phone: simPhone.value,
          text: body?.text ?? simText.value,
          button_id: body?.button_id,
          type: body?.type,
          receipt_base64: body?.receipt_base64,
          wa_name: 'Lead Demo',
        },
      },
    )
    simResult.value = JSON.stringify(res.data, null, 2)
    info.value = 'Mensaje simulado procesado.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Fallo simulación'
  } finally {
    busy.value = false
  }
}

async function simulatePurchaseFlow() {
  await simulate({ text: 'hola' })
  await simulate({ button_id: 'buy' })
  await simulate({ type: 'image', text: '[comprobante]', receipt_base64: demoReceiptBase64 })
  info.value = 'Flujo completo simulado: menú → compra → comprobante. Revisa Ventas y tu email.'
}

onMounted(load)
</script>

<template>
  <div class="page">
    <section class="ml-card tip ml-rise">
      <strong>WhatsApp / Evolution:</strong>
      <span
        >Conecta una instancia Baileys, configura el webhook hacia la API y deja que Luna responda el
        flujo.</span
      >
    </section>

    <div class="grid">
      <article class="ml-card panel ml-rise">
        <h2>Instancia</h2>
        <p v-if="current" class="meta">
          {{ current.name }} · <code>{{ current.evolution_instance }}</code>
        </p>
        <div class="status-row">
          <span
            class="ml-badge"
            :class="current?.status === 'open' ? 'ml-badge-ok' : 'ml-badge-warn'"
          >
            {{ current?.status || '—' }}
          </span>
          <span
            class="ml-badge"
            :class="evolutionHealth === 'ok' ? 'ml-badge-ok' : 'ml-badge-warn'"
          >
            Evolution {{ evolutionHealth }}
          </span>
        </div>

        <div class="qr" aria-label="QR WhatsApp">
          <img v-if="qrSrc" :src="qrSrc" alt="QR Evolution" />
          <div v-else class="qr-inner">
            <span>{{ current?.status === 'open' ? 'WA OK' : 'SIN QR' }}</span>
          </div>
        </div>

        <div class="actions">
          <button class="ml-btn ml-btn-primary" type="button" :disabled="busy || !current" @click="connectReal">
            Conectar Evolution (QR)
          </button>
          <button class="ml-btn ml-btn-secondary" type="button" :disabled="busy || !current" @click="refresh">
            Refrescar estado
          </button>
          <button class="ml-btn ml-btn-ghost" type="button" :disabled="busy || !current" @click="connectDemo">
            Solo demo local
          </button>
        </div>
        <p v-if="info" class="ok">{{ info }}</p>
        <p v-if="error" class="err">{{ error }}</p>
      </article>

      <article class="ml-card panel ml-rise ml-rise-delay-2">
        <h2>Probar flujo (sin celular)</h2>
        <p class="note">
          Simula un mensaje entrante. La API crea lead + conversation y avanza el flujo (Luna /
          botones / QR texto).
        </p>
        <label>
          <span class="ml-label">Teléfono</span>
          <input v-model="simPhone" class="ml-input" />
        </label>
        <label>
          <span class="ml-label">Mensaje</span>
          <input v-model="simText" class="ml-input" />
        </label>
        <button class="ml-btn ml-btn-sky" type="button" :disabled="busy || !current" @click="simulate()">
          Simular inbound
        </button>
        <button class="ml-btn ml-btn-secondary" type="button" :disabled="busy || !current" @click="simulatePurchaseFlow">
          Simular compra + comprobante
        </button>
        <pre v-if="simResult" class="result">{{ simResult }}</pre>

        <h3>Checklist Evolution</h3>
        <ol>
          <li>Levantar Evolution (:8080) con Docker</li>
          <li>Misma <code>AUTHENTICATION_API_KEY</code> que <code>EVOLUTION_API_KEY</code></li>
          <li>Webhook → <code>/api/webhooks/evolution</code></li>
          <li>Escanear QR · escribir al número</li>
        </ol>
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
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.panel {
  padding: 1.2rem;
  display: grid;
  gap: 0.85rem;
  align-content: start;
}
.panel h2,
.panel h3 {
  color: var(--ml-wine-deep);
}
.meta,
.note {
  color: var(--ml-muted);
  font-size: 0.9rem;
}
code {
  color: var(--ml-sky);
  font-weight: 600;
}
.status-row,
.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.qr {
  width: 240px;
  height: 240px;
  border-radius: 18px;
  padding: 12px;
  background: linear-gradient(135deg, var(--ml-wine), var(--ml-ember));
}
.qr img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
  background: #fffbf4;
}
.qr-inner {
  height: 100%;
  border-radius: 12px;
  background: repeating-linear-gradient(0deg, #fffbf4 0 8px, #ead7c8 8px 16px);
  display: grid;
  place-items: center;
  font-weight: 800;
  color: var(--ml-wine);
}
.ok {
  color: #067a76;
  font-weight: 600;
}
.err {
  color: var(--ml-wine);
  font-weight: 600;
}
.result {
  max-height: 180px;
  overflow: auto;
  background: rgba(134, 8, 0, 0.04);
  border-radius: 12px;
  padding: 0.75rem;
  font-size: 0.75rem;
}
ol {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
  color: var(--ml-ink);
  font-size: 0.88rem;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
