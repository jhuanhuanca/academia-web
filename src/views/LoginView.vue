<script setup lang="ts">
import { computed, ref } from 'vue'
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

const moonStyle = computed(() => ({
  animation: 'ml-float 4.5s ease-in-out infinite',
}))

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
  <div class="login">
    <section class="hero ml-rise">
      <div class="orbit" aria-hidden="true"></div>
      <div class="moon" :style="moonStyle" aria-hidden="true">
        <span class="glow"></span>
        <span class="face"></span>
      </div>
      <p class="tag">MarketLuna</p>
      <h1>
        Vende con
        <span class="accent">Luna</span>
      </h1>
      <p class="lead">
        Tu asistente de ventas por WhatsApp. Tú programas el flujo. Luna solo habla con lo que le
        enseñaste.
      </p>
      <ul class="perks">
        <li>Flujos tipo n8n con mensajes y botones</li>
        <li>QR de cobro y entrega de curso</li>
        <li>Guía paso a paso para principiantes</li>
      </ul>
    </section>

    <section class="panel ml-card ml-rise ml-rise-delay-2">
      <header>
        <h2>Entrar a MarketLuna</h2>
        <p>Accede con tu cuenta de administrador</p>
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
          <span class="ml-label">Contraseña</span>
          <div class="password-wrap">
            <input
              v-model="password"
              class="ml-input password-input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Tu contraseña"
            />
            <button
              class="toggle-pass"
              type="button"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="ml-btn ml-btn-primary submit" type="submit" :disabled="loading">
          {{ loading ? 'Entrando…' : 'Entrar al dashboard' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 2rem;
  align-items: center;
  padding: clamp(1.5rem, 4vw, 3.5rem);
}

.hero {
  position: relative;
  padding: 1rem 0.5rem;
  max-width: 560px;
}

.orbit {
  position: absolute;
  inset: -10% auto auto -8%;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(10, 52, 148, 0.28), transparent 65%);
  filter: blur(4px);
  animation: ml-pulse 5s ease infinite;
  pointer-events: none;
}

.moon {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 1.5rem;
  border-radius: 50%;
  background: linear-gradient(145deg, #f7f8fc, #d9e0f5);
  box-shadow:
    0 20px 50px rgba(10, 52, 148, 0.28),
    inset -18px -10px 0 rgba(10, 52, 148, 0.08);
}

.glow {
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(137, 20, 104, 0.35), transparent 60%);
  z-index: -1;
}

.face {
  position: absolute;
  right: 18px;
  top: 22px;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, transparent 42%, rgba(6, 31, 92, 0.55) 43%);
}

.tag {
  display: inline-block;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.78rem;
  color: var(--ml-magenta);
  margin-bottom: 0.8rem;
}

.hero h1 {
  font-size: clamp(2.6rem, 6vw, 4.2rem);
  line-height: 0.98;
  color: var(--ml-wine-deep);
  margin-bottom: 1rem;
}

.accent {
  background: linear-gradient(120deg, var(--ml-blue), var(--ml-magenta), var(--ml-gold));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: ml-shimmer 4s linear infinite;
}

.lead {
  font-size: 1.05rem;
  color: var(--ml-muted);
  max-width: 38ch;
  margin-bottom: 1.4rem;
}

.perks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.55rem;
}

.perks li {
  position: relative;
  padding-left: 1.3rem;
  color: var(--ml-ink);
  font-weight: 500;
}

.perks li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.45rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ml-blue), var(--ml-magenta));
}

.panel {
  padding: 2rem;
  max-width: 440px;
  width: 100%;
  justify-self: end;
}

.panel header h2 {
  font-size: 1.55rem;
  color: var(--ml-wine);
  margin-bottom: 0.35rem;
}

.panel header p {
  color: var(--ml-muted);
  font-size: 0.92rem;
  margin-bottom: 1.4rem;
}

.form {
  display: grid;
  gap: 1rem;
}

.password-wrap {
  position: relative;
  display: grid;
}

.password-input {
  padding-right: 4.5rem;
}

.toggle-pass {
  position: absolute;
  right: 0.45rem;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--ml-sky);
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
}

.toggle-pass:hover {
  background: rgba(10, 52, 148, 0.1);
}

.submit {
  width: 100%;
  margin-top: 0.35rem;
}

.error {
  color: var(--ml-wine);
  font-size: 0.85rem;
  font-weight: 600;
}

@media (max-width: 900px) {
  .login {
    grid-template-columns: 1fr;
    padding-top: 2rem;
  }

  .panel {
    justify-self: stretch;
  }
}
</style>
