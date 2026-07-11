<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { api, API_URL } from '@/api/client'

type ReceiptMedia = {
  id: number
  mime: string
}

type Payment = {
  id: number
  status: string
  receipt_media_asset_id?: number | null
  receipt_submitted_at?: string | null
  receipt_media?: ReceiptMedia | null
}

type Sale = {
  id: number
  uuid: string
  amount: string | number
  currency: string
  status: string
  lead?: { name?: string | null; phone_e164?: string }
  course?: { title?: string }
  payments?: Payment[]
}

const sales = ref<Sale[]>([])
const loading = ref(true)
const confirmingId = ref<number | null>(null)
const error = ref('')
const success = ref('')
const receiptUrls = ref<Record<number, string>>({})
const blobUrls: string[] = []

function latestPayment(sale: Sale): Payment | null {
  return sale.payments?.[0] ?? null
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending_payment: 'Pago pendiente',
    awaiting_confirmation: 'Comprobante recibido',
    paid: 'Pagado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }
  return map[status] || status
}

function statusClass(status: string) {
  if (['delivered', 'paid'].includes(status)) return 'ml-badge-ok'
  if (['awaiting_confirmation'].includes(status)) return 'ml-badge-sky'
  return 'ml-badge-warn'
}

async function loadReceiptPreview(mediaId: number) {
  if (receiptUrls.value[mediaId]) return
  const token = localStorage.getItem('ml_token')
  const res = await fetch(`${API_URL}/media-assets/${mediaId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  blobUrls.push(url)
  receiptUrls.value[mediaId] = url
}

async function loadSales() {
  loading.value = true
  error.value = ''
  try {
    const res = await api<{ data: Sale[] }>('/sales')
    sales.value = res.data
    for (const sale of res.data) {
      const mediaId = latestPayment(sale)?.receipt_media?.id
      if (mediaId) await loadReceiptPreview(mediaId)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar ventas'
  } finally {
    loading.value = false
  }
}

async function confirmSale(sale: Sale) {
  confirmingId.value = sale.id
  error.value = ''
  success.value = ''
  try {
    await api(`/sales/${sale.id}/confirm-payment`, { method: 'POST' })
    success.value = `Pago confirmado. El curso fue enviado a ${sale.lead?.phone_e164 || 'el cliente'}.`
    await loadSales()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo confirmar'
  } finally {
    confirmingId.value = null
  }
}

onMounted(loadSales)

onBeforeUnmount(() => {
  blobUrls.forEach((url) => URL.revokeObjectURL(url))
})
</script>

<template>
  <div class="page">
    <section class="ml-card tip ml-rise">
      <strong>Confirmación de pagos:</strong>
      <span>Cuando el cliente envía el comprobante por WhatsApp, aparece aquí. Confirma para entregar el curso automáticamente.</span>
    </section>

    <p v-if="success" class="ok">{{ success }}</p>
    <p v-if="error" class="err">{{ error }}</p>

    <section class="ml-card table-wrap ml-rise ml-rise-delay-1">
      <header>
        <h2>Ventas</h2>
        <button class="ml-btn ml-btn-ghost" type="button" @click="loadSales">Actualizar</button>
      </header>
      <p v-if="loading">Cargando…</p>
      <p v-else-if="!sales.length" class="empty">Sin ventas todavía. Simula una compra desde WhatsApp.</p>
      <div v-else class="sales-list">
        <article v-for="sale in sales" :key="sale.id" class="sale-card">
          <div class="sale-head">
            <div>
              <strong>{{ sale.course?.title || 'Curso' }}</strong>
              <p>{{ sale.lead?.name || sale.lead?.phone_e164 || 'Lead' }} · {{ sale.amount }} {{ sale.currency }}</p>
            </div>
            <span class="ml-badge" :class="statusClass(sale.status)">{{ statusLabel(sale.status) }}</span>
          </div>

          <div v-if="latestPayment(sale)?.receipt_media?.id" class="receipt-box">
            <img
              :src="receiptUrls[latestPayment(sale)!.receipt_media!.id]"
              alt="Comprobante de pago"
              class="receipt-img"
            />
            <p class="meta">Comprobante recibido {{ latestPayment(sale)?.receipt_submitted_at || '' }}</p>
          </div>

          <div class="actions">
            <button
              v-if="sale.status === 'awaiting_confirmation'"
              class="ml-btn ml-btn-primary"
              type="button"
              :disabled="confirmingId === sale.id"
              @click="confirmSale(sale)"
            >
              {{ confirmingId === sale.id ? 'Confirmando…' : 'Confirmar pago y entregar' }}
            </button>
            <span v-else-if="sale.status === 'delivered'" class="done">Curso entregado por WhatsApp</span>
          </div>
        </article>
      </div>
    </section>
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
.table-wrap {
  padding: 1.1rem;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.9rem;
}
h2 {
  color: var(--ml-wine-deep);
}
.empty {
  color: var(--ml-muted);
}
.sales-list {
  display: grid;
  gap: 0.85rem;
}
.sale-card {
  border: 1px solid var(--ml-line);
  border-radius: 14px;
  padding: 0.9rem;
  background: rgba(255, 251, 244, 0.7);
}
.sale-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}
.sale-head p {
  color: var(--ml-muted);
  font-size: 0.85rem;
  margin-top: 0.2rem;
}
.receipt-box {
  margin-top: 0.75rem;
}
.receipt-img {
  max-width: 220px;
  max-height: 220px;
  border-radius: 10px;
  border: 1px solid var(--ml-line);
}
.meta {
  font-size: 0.78rem;
  color: var(--ml-muted);
  margin-top: 0.35rem;
}
.actions {
  margin-top: 0.75rem;
}
.done {
  color: #4f6a2e;
  font-weight: 600;
  font-size: 0.85rem;
}
.ok {
  color: #4f6a2e;
  font-weight: 600;
}
.err {
  color: var(--ml-wine);
  font-weight: 600;
}
.ml-badge-sky {
  background: rgba(10, 52, 148, 0.12);
  color: var(--ml-sky);
}
</style>
