<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api/client'

type Item = {
  id: number
  title: string
  content: string
  tags: string[] | null
  is_active?: boolean
}

const store = useAppStore()
const saved = ref(false)
const items = ref<Item[]>([])
const error = ref('')
const editingId = ref<number | null>(null)
const busyId = ref<number | null>(null)

const form = reactive({
  title: '',
  content: '',
  tags: 'precios',
})

function resetForm() {
  form.title = ''
  form.content = ''
  form.tags = 'precios'
  editingId.value = null
}

async function load() {
  const res = await api<{ data: Item[] }>('/knowledge-items')
  items.value = res.data
}

async function addItem() {
  error.value = ''
  if (!form.title.trim() || !form.content.trim()) return
  busyId.value = editingId.value ?? 0
  try {
    if (editingId.value) {
      await api(`/knowledge-items/${editingId.value}`, {
        method: 'PUT',
        body: {
          title: form.title.trim(),
          content: form.content.trim(),
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          is_active: true,
        },
      })
    } else {
      await api('/knowledge-items', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          content: form.content.trim(),
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          is_active: true,
        },
      })
    }
    resetForm()
    await load()
    await store.refreshDashboardFlags()
    store.nextOnboarding()
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar'
  } finally {
    busyId.value = null
  }
}

function startEdit(item: Item) {
  editingId.value = item.id
  form.title = item.title
  form.content = item.content
  form.tags = (item.tags || []).join(', ')
  error.value = ''
}

async function removeItem(item: Item) {
  if (!window.confirm(`¿Eliminar “${item.title}”?`)) return
  busyId.value = item.id
  error.value = ''
  try {
    await api(`/knowledge-items/${item.id}`, { method: 'DELETE' })
    if (editingId.value === item.id) resetForm()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo eliminar'
  } finally {
    busyId.value = null
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
        <h2>{{ editingId ? 'Editar knowledge' : 'Nuevo knowledge' }}</h2>
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
        <div class="form-actions">
          <button class="ml-btn ml-btn-primary" type="submit" :disabled="busyId !== null">
            {{ editingId ? 'Guardar cambios' : 'Guardar en API' }}
          </button>
          <button
            v-if="editingId"
            class="ml-btn ghost"
            type="button"
            @click="resetForm"
          >
            Cancelar
          </button>
        </div>
        <p v-if="saved" class="ok">✓ Knowledge guardado.</p>
        <p v-if="error" class="err">{{ error }}</p>
      </form>

      <section class="ml-card list ml-rise ml-rise-delay-2">
        <h2>Biblioteca de Luna</h2>
        <article v-for="item in items" :key="item.id" class="item">
          <div class="item-head">
            <h3>{{ item.title }}</h3>
            <div class="item-actions">
              <button class="ml-btn ghost sm" type="button" @click="startEdit(item)">Editar</button>
              <button
                class="ml-btn danger sm"
                type="button"
                :disabled="busyId === item.id"
                @click="removeItem(item)"
              >
                Eliminar
              </button>
            </div>
          </div>
          <p>{{ item.content }}</p>
          <div class="tags">
            <span v-for="tag in item.tags || []" :key="tag" class="ml-chip">{{ tag }}</span>
          </div>
        </article>
        <p v-if="!items.length" class="empty">Aún no hay knowledge. Crea el primero.</p>
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
  margin: 0;
}
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.item {
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--ml-line);
}
.item-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}
.item-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
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
  color: #4f6a2e;
  font-weight: 600;
}
.err {
  color: var(--ml-wine);
  font-weight: 600;
}
.empty {
  color: var(--ml-muted);
}
.ml-btn.ghost {
  background: transparent;
  border: 1px solid var(--ml-line);
  color: var(--ml-ink);
}
.ml-btn.danger {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--ml-crimson) 45%, transparent);
  color: var(--ml-crimson);
}
.ml-btn.sm {
  padding: 0.28rem 0.65rem;
  font-size: 0.78rem;
  border-radius: 999px;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .item-head {
    flex-direction: column;
  }
}
</style>
