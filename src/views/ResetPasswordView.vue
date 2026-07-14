<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const token = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

onMounted(() => {
  email.value = String(route.query.email || '')
  token.value = String(route.query.token || '')
  if (!email.value || !token.value) {
    error.value = 'Enlace incompleto. Solicita de nuevo la recuperación.'
  }
})

async function onSubmit() {
  error.value = ''
  success.value = ''
  if (password.value !== passwordConfirmation.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  loading.value = true
  try {
    const res = await api<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: {
        email: email.value,
        token: token.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    })
    success.value = res.message
    setTimeout(() => router.push('/login'), 1500)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo actualizar la contraseña.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <button
      class="theme-toggle floating-theme"
      type="button"
      :aria-label="store.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
      @click="store.toggleTheme()"
    >
      {{ store.theme === 'dark' ? '☀' : '☾' }}
    </button>

    <section class="auth-card ml-rise">
      <img class="logo" src="/brand/lunamarket-logo.png" alt="LunaMarket" width="72" height="72" />
      <header>
        <h1>Nueva contraseña</h1>
        <p>Elige una clave nueva para {{ email || 'tu cuenta' }}.</p>
      </header>

      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="ml-label">Nueva contraseña</span>
          <div class="password-wrap">
            <input
              v-model="password"
              class="ml-input password-input"
              :type="showPassword ? 'text' : 'password'"
              minlength="8"
              required
            />
            <button class="toggle-pass" type="button" @click="showPassword = !showPassword">
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
        </label>
        <label class="field">
          <span class="ml-label">Confirmar</span>
          <input
            v-model="passwordConfirmation"
            class="ml-input"
            :type="showPassword ? 'text' : 'password'"
            minlength="8"
            required
          />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="ok">{{ success }}</p>
        <button class="ml-btn ml-btn-primary submit" type="submit" :disabled="loading || !token">
          {{ loading ? 'Guardando…' : 'Actualizar contraseña' }}
        </button>
      </form>

      <p class="switch">
        <RouterLink to="/login">Ir al login</RouterLink>
      </p>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: var(--ml-bg);
}
.floating-theme {
  position: fixed;
  top: 1rem;
  right: 1rem;
}
.auth-card {
  width: min(420px, 100%);
  padding: 1.6rem;
  display: grid;
  gap: 1rem;
  background: var(--ml-card);
  border: 1px solid var(--ml-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--ml-shadow-soft);
}
.logo {
  justify-self: center;
  border-radius: 16px;
}
header h1 {
  margin: 0;
  color: var(--ml-wine-deep);
  font-size: 1.55rem;
}
header p,
.switch {
  color: var(--ml-muted);
  margin: 0.35rem 0 0;
}
.form {
  display: grid;
  gap: 0.8rem;
}
.field {
  display: grid;
  gap: 0.3rem;
}
.password-wrap {
  position: relative;
}
.password-input {
  padding-right: 5rem;
}
.toggle-pass {
  position: absolute;
  right: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--ml-sky);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
}
.submit {
  width: 100%;
}
.error {
  color: var(--ml-crimson);
  margin: 0;
}
.ok {
  color: #4f6a2e;
  margin: 0;
}
</style>
