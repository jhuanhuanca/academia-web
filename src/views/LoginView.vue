<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ApiError } from '@/api/client'

const store = useAppStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Ingresa email y contraseña.'
    return
  }
  loading.value = true
  try {
    await store.login(email.value, password.value)
    router.push('/app')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo iniciar sesión. ¿API levantada?'
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
        <h1>Sign in</h1>
        <p>Bienvenido. Ingresa tus credenciales de LunaMarket.</p>
      </header>

      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="ml-label">Email</span>
          <input
            v-model="email"
            class="ml-input"
            type="email"
            autocomplete="username"
            placeholder="tu@email.com"
          />
        </label>
        <label class="field">
          <span class="ml-label">Password</span>
          <div class="password-wrap">
            <input
              v-model="password"
              class="ml-input password-input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
            />
            <button
              class="toggle-pass"
              type="button"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="ml-btn ml-btn-primary submit" type="submit" :disabled="loading">
          {{ loading ? 'Entrando…' : 'Sign in' }}
        </button>
      </form>

      <p class="switch">
        <RouterLink to="/forgot-password">¿Olvidaste tu contraseña?</RouterLink>
      </p>

      <p class="switch">
        ¿No tienes cuenta?
        <RouterLink to="/register">Sign up</RouterLink>
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
  z-index: 5;
}

.auth-card {
  width: min(420px, 100%);
  padding: 2rem 1.75rem 1.6rem;
  border-radius: 24px;
  background: var(--ml-card);
  border: 1px solid var(--ml-line);
  box-shadow: var(--ml-shadow);
}

.logo {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 1.1rem;
  box-shadow: 0 12px 28px rgba(0, 55, 84, 0.2);
}

header {
  text-align: center;
  margin-bottom: 1.4rem;
}

header h1 {
  font-size: 1.7rem;
  color: var(--ml-wine-deep);
  margin-bottom: 0.35rem;
}

header p {
  color: var(--ml-muted);
  font-size: 0.92rem;
}

.form {
  display: grid;
  gap: 0.95rem;
}

.password-wrap {
  position: relative;
}

.password-input {
  padding-right: 4.4rem;
}

.toggle-pass {
  position: absolute;
  right: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--ml-c4);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.submit {
  width: 100%;
  margin-top: 0.35rem;
}

.error {
  color: var(--ml-crimson);
  font-size: 0.88rem;
  margin: 0;
}

.switch {
  text-align: center;
  margin-top: 1.1rem;
  color: var(--ml-muted);
  font-size: 0.9rem;
}

.switch a {
  color: var(--ml-c5);
  font-weight: 700;
}
</style>
