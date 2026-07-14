<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ApiError } from '@/api/client'

const store = useAppStore()
const router = useRouter()

const name = ref('')
const businessName = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

async function onSubmit() {
  error.value = ''
  success.value = ''
  if (!name.value || !email.value || !password.value) {
    error.value = 'Completa nombre, email y contraseña.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (password.value !== passwordConfirmation.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  loading.value = true
  try {
    const result = await store.register({
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
      business_name: businessName.value || name.value,
    })
    if (result.pendingApproval) {
      success.value = result.message
      password.value = ''
      passwordConfirmation.value = ''
      return
    }
    router.push('/app/whatsapp')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo crear la cuenta. ¿API levantada?'
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
        <h1>Sign up</h1>
        <p>Crea tu espacio LunaMarket para vender por WhatsApp.</p>
      </header>

      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="ml-label">Tu nombre</span>
          <input v-model="name" class="ml-input" type="text" required placeholder="Juan Pérez" />
        </label>
        <label class="field">
          <span class="ml-label">Negocio</span>
          <input
            v-model="businessName"
            class="ml-input"
            type="text"
            placeholder="Nombre de tu negocio"
          />
        </label>
        <label class="field">
          <span class="ml-label">Email</span>
          <input v-model="email" class="ml-input" type="email" required placeholder="tu@email.com" />
        </label>
        <label class="field">
          <span class="ml-label">Password</span>
          <div class="password-wrap">
            <input
              v-model="password"
              class="ml-input password-input"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="Mínimo 8 caracteres"
            />
            <button class="toggle-pass" type="button" @click="showPassword = !showPassword">
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
        </label>
        <label class="field">
          <span class="ml-label">Confirmar password</span>
          <input
            v-model="passwordConfirmation"
            class="ml-input"
            type="password"
            required
            placeholder="Repite la contraseña"
          />
        </label>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="ok">{{ success }}</p>

        <button class="ml-btn ml-btn-primary submit" type="submit" :disabled="loading">
          {{ loading ? 'Creando…' : 'Crear cuenta' }}
        </button>
      </form>

      <p class="switch">
        ¿Ya tienes cuenta?
        <RouterLink to="/login">Sign in</RouterLink>
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
  width: min(440px, 100%);
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
}

header {
  text-align: center;
  margin-bottom: 1.25rem;
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
  gap: 0.85rem;
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
  margin-top: 0.25rem;
}

.error {
  color: var(--ml-crimson);
  font-size: 0.88rem;
  margin: 0;
}

.ok {
  color: var(--ml-c4);
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
