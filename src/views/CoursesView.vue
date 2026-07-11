<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api/client'

type Course = {
  id: number
  title: string
  price: string | number
  currency: string
  is_active: boolean
  delivery_payload?: { url?: string }
  description?: string
  payment_qr_media_asset_id?: number | null
  payment_qr?: { id: number; mime?: string } | null
}

const store = useAppStore()
const saved = ref(false)
const courses = ref<Course[]>([])
const error = ref('')
const qrBusyId = ref<number | null>(null)
const qrMsg = ref('')

const form = reactive({
  title: '',
  price: 49,
  currency: 'USD',
  deliveryUrl: '',
  description: '',
})

async function load() {
  const res = await api<{ data: Course[] }>('/courses')
  courses.value = res.data
}

async function save() {
  error.value = ''
  try {
    await api('/courses', {
      method: 'POST',
      body: {
        title: form.title,
        price: form.price,
        currency: form.currency,
        delivery_type: 'link',
        delivery_payload: {
          url: form.deliveryUrl,
          instructions: 'Usa este link para acceder al curso.',
        },
        description: form.description,
        is_active: true,
      },
    })
    form.title = ''
    form.deliveryUrl = ''
    form.description = ''
    await load()
    await store.refreshDashboardFlags()
    store.nextOnboarding()
    saved.value = true
    setTimeout(() => (saved.value = false), 2200)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo guardar'
  }
}

async function onQrSelected(course: Course, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  qrBusyId.value = course.id
  qrMsg.value = ''
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    await api(`/courses/${course.id}/payment-qr`, {
      method: 'POST',
      formData: fd,
    })
    qrMsg.value = `QR guardado en “${course.title}”.`
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo subir el QR'
  } finally {
    qrBusyId.value = null
    input.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <section class="ml-card tip ml-rise">
      <strong>Tip de Luna:</strong>
      <span>
        Sube la imagen de tu QR bancario en cada curso. Al cobrar, WhatsApp enviará esa foto al
        cliente.
      </span>
    </section>

    <div class="grid">
      <form class="ml-card form ml-rise" @submit.prevent="save">
        <h2>Crear curso</h2>
        <label>
          <span class="ml-label">Título</span>
          <input v-model="form.title" class="ml-input" placeholder="Nombre del curso" required />
        </label>
        <div class="row">
          <label>
            <span class="ml-label">Precio</span>
            <input v-model.number="form.price" class="ml-input" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span class="ml-label">Moneda</span>
            <select v-model="form.currency" class="ml-select">
              <option>USD</option>
              <option>BOB</option>
              <option>VES</option>
              <option>EUR</option>
            </select>
          </label>
        </div>
        <label>
          <span class="ml-label">Link de entrega</span>
          <input v-model="form.deliveryUrl" class="ml-input" placeholder="https://..." />
        </label>
        <label>
          <span class="ml-label">Descripción</span>
          <textarea
            v-model="form.description"
            class="ml-textarea"
            rows="4"
            placeholder="Qué incluye el curso"
          />
        </label>
        <button class="ml-btn ml-btn-primary" type="submit">Guardar curso</button>
        <p v-if="saved" class="ok">✓ Curso guardado.</p>
        <p v-if="error" class="err">{{ error }}</p>
        <p v-if="qrMsg" class="ok">{{ qrMsg }}</p>
      </form>

      <section class="ml-card list ml-rise ml-rise-delay-2">
        <h2>Tus cursos</h2>
        <article v-for="course in courses" :key="course.id" class="item">
          <div class="item-main">
            <strong>{{ course.title }}</strong>
            <p>{{ course.price }} {{ course.currency }}</p>
            <div class="qr-row">
              <label class="qr-upload">
                <span>{{ course.payment_qr_media_asset_id ? 'Cambiar QR' : 'Subir QR de cobro' }}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  :disabled="qrBusyId === course.id"
                  @change="onQrSelected(course, $event)"
                />
              </label>
              <span v-if="qrBusyId === course.id" class="muted">Subiendo…</span>
              <span v-else-if="course.payment_qr_media_asset_id" class="ml-badge ml-badge-ok">QR listo</span>
              <span v-else class="ml-badge ml-badge-warn">Sin QR</span>
            </div>
          </div>
          <span class="ml-badge ml-badge-ok">{{ course.is_active ? 'Activo' : 'Off' }}</span>
        </article>
        <p v-if="!courses.length" class="empty">Aún no hay cursos.</p>
      </section>
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
  grid-template-columns: 1.2fr 0.8fr;
  gap: 1rem;
}
.form,
.list {
  padding: 1.2rem;
}
.form {
  display: grid;
  gap: 0.85rem;
}
.form h2,
.list h2 {
  color: var(--ml-wine-deep);
}
.row {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 0.7rem;
}
.ok {
  color: #4f6a2e;
  font-weight: 600;
}
.err {
  color: var(--ml-wine);
  font-weight: 600;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.8rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--ml-line);
}
.item-main {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}
.item p,
.empty,
.muted {
  color: var(--ml-muted);
  font-size: 0.85rem;
}
.qr-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  margin-top: 0.25rem;
}
.qr-upload {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--ml-line);
  background: rgba(10, 52, 148, 0.08);
  color: var(--ml-sky);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}
.qr-upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
@media (max-width: 900px) {
  .grid,
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
