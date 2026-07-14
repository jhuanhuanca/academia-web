<script setup lang="ts">
import { ref } from 'vue'
import { api, ApiError } from '@/api/client'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function onSubmit() {
  error.value = ''
  success.value = ''
  if (!email.value) {
    error.value = 'Ingresa tu email registrado.'
    return
  }
  loading.value = true
  try {
    const res = await api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
    success.value = res.message
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo enviar el correo.'
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
        <h1>Recuperar contraseña</h1>
        <p>Te enviamos un enlace al email registrado para crear una nueva clave.</p>
      </header>

      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="ml-label">Email</span>
          <input v-model="email" class="ml-input" type="email" autocomplete="username" required />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="ok">{{ success }}</p>
        <button class="ml-btn ml-btn-primary submit" type="submit" :disabled="loading">
          {{ loading ? 'Enviando…' : 'Enviar enlace' }}
        </button>
      </form>

      <p class="switch">
        <RouterLink to="/login">Volver al login</RouterLink>
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
