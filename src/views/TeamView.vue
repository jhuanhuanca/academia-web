<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import { useAppStore } from '@/stores/app'
import { ApiError } from '@/api/client'

type Member = {
  id: number
  name: string
  email: string
  role: string
  role_label: string
  is_active: boolean
  last_login_at?: string | null
}

const store = useAppStore()
const members = ref<Member[]>([])
const loading = ref(true)
const error = ref('')
const success = ref('')
const busy = ref(false)

const name = ref('')
const email = ref('')
const password = ref('')
const role = ref<'agent' | 'admin'>('agent')

const canManage = computed(() => ['owner', 'admin'].includes(store.user?.role || ''))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api<{ data: Member[] }>('/team-members')
    members.value = res.data
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar el equipo'
  } finally {
    loading.value = false
  }
}

async function createMember() {
  if (!canManage.value) return
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await api('/team-members', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        password: password.value,
        role: role.value,
      },
    })
    success.value = 'Vendedor / usuario creado.'
    name.value = ''
    email.value = ''
    password.value = ''
    role.value = 'agent'
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo crear'
  } finally {
    busy.value = false
  }
}

async function toggleActive(m: Member) {
  if (!canManage.value || m.role === 'owner') return
  busy.value = true
  error.value = ''
  try {
    await api(`/team-members/${m.id}`, {
      method: 'PATCH',
      body: { is_active: !m.is_active },
    })
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo actualizar'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <section class="ml-card tip ml-rise">
      <strong>Equipo / vendedores:</strong>
      <span>
        Aquí ves los usuarios de tu negocio (tenant). El rol
        <em>Vendedor</em> (<code>agent</code>) es para tu equipo de ventas.
      </span>
    </section>

    <p v-if="success" class="ok">{{ success }}</p>
    <p v-if="error" class="err">{{ error }}</p>

    <div class="grid">
      <section class="ml-card panel ml-rise">
        <h2>Miembros</h2>
        <p v-if="loading" class="muted">Cargando…</p>
        <p v-else-if="!members.length" class="muted">Aún no hay usuarios.</p>
        <ul v-else class="list">
          <li v-for="m in members" :key="m.id">
            <div>
              <strong>{{ m.name }}</strong>
              <span>{{ m.email }}</span>
              <em>{{ m.role_label }} · {{ m.is_active ? 'activo' : 'inactivo' }}</em>
            </div>
            <button
              v-if="canManage && m.role !== 'owner'"
              class="ml-btn ml-btn-secondary"
              type="button"
              :disabled="busy"
              @click="toggleActive(m)"
            >
              {{ m.is_active ? 'Desactivar' : 'Activar' }}
            </button>
          </li>
        </ul>
      </section>

      <section v-if="canManage" class="ml-card panel ml-rise ml-rise-delay-2">
        <h2>Agregar vendedor</h2>
        <form class="form" @submit.prevent="createMember">
          <label>
            <span class="ml-label">Nombre</span>
            <input v-model="name" class="ml-input" required />
          </label>
          <label>
            <span class="ml-label">Email</span>
            <input v-model="email" class="ml-input" type="email" required />
          </label>
          <label>
            <span class="ml-label">Contraseña temporal</span>
            <input v-model="password" class="ml-input" type="password" minlength="8" required />
          </label>
          <label>
            <span class="ml-label">Rol</span>
            <select v-model="role" class="ml-select">
              <option value="agent">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <button class="ml-btn ml-btn-primary" type="submit" :disabled="busy">
            {{ busy ? 'Guardando…' : 'Crear' }}
          </button>
        </form>
      </section>

      <section v-else class="ml-card panel ml-rise ml-rise-delay-2">
        <h2>Permisos</h2>
        <p class="muted">Solo el dueño o un administrador puede agregar vendedores.</p>
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
  grid-template-columns: 1.2fr 1fr;
  gap: 1rem;
}
.panel {
  padding: 1.1rem;
  display: grid;
  gap: 0.85rem;
  align-content: start;
}
h2 {
  margin: 0;
  color: var(--ml-wine-deep);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}
.list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid var(--ml-line);
  border-radius: 12px;
  padding: 0.75rem;
  background: var(--ml-input-bg);
}
.list li div {
  display: grid;
  gap: 0.1rem;
}
.list span,
.list em,
.muted {
  color: var(--ml-muted);
  font-size: 0.85rem;
  font-style: normal;
}
.form {
  display: grid;
  gap: 0.7rem;
}
.ok {
  color: #4f6a2e;
  font-weight: 600;
}
.err {
  color: var(--ml-crimson);
  font-weight: 600;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
