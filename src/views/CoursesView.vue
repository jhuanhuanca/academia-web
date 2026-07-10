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
}

const store = useAppStore()
const saved = ref(false)
const courses = ref<Course[]>([])
const error = ref('')

const form = reactive({
  title: 'Curso Demo de Ventas',
  price: 49,
  currency: 'USD',
  deliveryUrl: 'https://ejemplo.com/curso-demo',
  description: 'Curso para vender por WhatsApp con guiones y cierre.',
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
    await load()
    await store.refreshDashboardFlags()
    store.nextOnboarding()
    saved.value = true
    setTimeout(() => (saved.value = false), 2200)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo guardar'
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <section class="ml-card tip ml-rise">
      <strong>Tip de Luna:</strong>
      <span>Los cursos se guardan en la API (MySQL). El precio alimenta el QR y la entrega.</span>
    </section>

    <div class="grid">
      <form class="ml-card form ml-rise" @submit.prevent="save">
        <h2>Crear curso</h2>
        <label>
          <span class="ml-label">Título</span>
          <input v-model="form.title" class="ml-input" />
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
              <option>VES</option>
              <option>EUR</option>
            </select>
          </label>
        </div>
        <label>
          <span class="ml-label">Link de entrega</span>
          <input v-model="form.deliveryUrl" class="ml-input" />
        </label>
        <label>
          <span class="ml-label">Descripción</span>
          <textarea v-model="form.description" class="ml-textarea" rows="4" />
        </label>
        <button class="ml-btn ml-btn-primary" type="submit">Guardar en API</button>
        <p v-if="saved" class="ok">✓ Curso guardado.</p>
        <p v-if="error" class="err">{{ error }}</p>
      </form>

      <section class="ml-card list ml-rise ml-rise-delay-2">
        <h2>Tus cursos</h2>
        <article v-for="course in courses" :key="course.id" class="item">
          <div>
            <strong>{{ course.title }}</strong>
            <p>{{ course.price }} {{ course.currency }}</p>
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
  color: #067a76;
  font-weight: 600;
}
.err {
  color: var(--ml-wine);
  font-weight: 600;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--ml-line);
}
.item p,
.empty {
  color: var(--ml-muted);
  font-size: 0.85rem;
}
@media (max-width: 900px) {
  .grid,
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
