<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api/client'

type Item = {
  id: number
  title: string
  content: string
  tags: string[] | null
}

const store = useAppStore()
const saved = ref(false)
const items = ref<Item[]>([])
const error = ref('')

const form = reactive({
  title: '',
  content: '',
  tags: 'precios',
})

async function load() {
  const res = await api<{ data: Item[] }>('/knowledge-items')
  items.value = res.data
}

async function addItem() {
  error.value = ''
  if (!form.title.trim() || !form.content.trim()) return
  try {
    await api('/knowledge-items', {
      method: 'POST',
      body: {
        title: form.title.trim(),
        content: form.content.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        is_active: true,
      },
    })
    form.title = ''
    form.content = ''
    await load()
    await store.refreshDashboardFlags()
    store.nextOnboarding()
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar'
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <section class="ml-card tip ml-rise">
      <strong>Regla de Luna:</strong>
      <span>Este knowledge vive en la API y es lo único que Luna puede usar.</span>
    </section>

    <div class="grid">
      <form class="ml-card form ml-rise" @submit.prevent="addItem">
        <h2>Nuevo knowledge</h2>
        <label>
          <span class="ml-label">Título</span>
          <input v-model="form.title" class="ml-input" placeholder="Ej. Precio del curso" />
        </label>
        <label>
          <span class="ml-label">Contenido autorizado</span>
          <textarea v-model="form.content" class="ml-textarea" rows="5" />
        </label>
        <label>
          <span class="ml-label">Tags</span>
          <input v-model="form.tags" class="ml-input" />
        </label>
        <button class="ml-btn ml-btn-primary" type="submit">Guardar en API</button>
        <p v-if="saved" class="ok">✓ Knowledge guardado.</p>
        <p v-if="error" class="err">{{ error }}</p>
      </form>

      <section class="ml-card list ml-rise ml-rise-delay-2">
        <h2>Biblioteca de Luna</h2>
        <article v-for="item in items" :key="item.id" class="item">
          <h3>{{ item.title }}</h3>
          <p>{{ item.content }}</p>
          <div class="tags">
            <span v-for="tag in item.tags || []" :key="tag" class="ml-chip">{{ tag }}</span>
          </div>
        </article>
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
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.form,
.list {
  padding: 1.2rem;
  display: grid;
  gap: 0.85rem;
  align-content: start;
}
.form h2,
.list h2,
.item h3 {
  color: var(--ml-wine-deep);
}
.item {
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--ml-line);
}
.item p {
  color: var(--ml-muted);
  margin: 0.35rem 0 0.55rem;
  font-size: 0.9rem;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.ok {
  color: #067a76;
  font-weight: 600;
}
.err {
  color: var(--ml-wine);
  font-weight: 600;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
