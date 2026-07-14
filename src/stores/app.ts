import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api/client'

export type OnboardingStepId =
  | 'welcome'
  | 'course'
  | 'knowledge'
  | 'whatsapp'
  | 'flow'
  | 'test'
  | 'done'

export interface OnboardingStep {
  id: OnboardingStepId
  title: string
  tip: string
  route: string
  cta: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  tenant_id: number
  tenant?: {
    id: number
    name: string
    slug: string
  }
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Conoce a Luna',
    tip: 'Luna es tu IA de ventas. Solo responde con la información que tú le des.',
    route: '/app/guia',
    cta: 'Empezar guía',
  },
  {
    id: 'course',
    title: 'Crea tu primer producto',
    tip: 'Define título, precio y el link de entrega que el bot enviará tras el pago.',
    route: '/app/cursos',
    cta: 'Ir a productos',
  },
  {
    id: 'knowledge',
    title: 'Alimenta el knowledge',
    tip: 'Escribe FAQs: precio, contenido y soporte. Luna no inventará nada fuera de esto.',
    route: '/app/knowledge',
    cta: 'Agregar knowledge',
  },
  {
    id: 'whatsapp',
    title: 'Conecta WhatsApp',
    tip: 'Vincula tu número. Luego te mostraremos el QR de Evolution.',
    route: '/app/whatsapp',
    cta: 'Conectar WhatsApp',
  },
  {
    id: 'flow',
    title: 'Arma tu automatización',
    tip: 'Como n8n: une mensajes y botones. Cada botón decide el siguiente paso.',
    route: '/app/flujos',
    cta: 'Abrir Flow Builder',
  },
  {
    id: 'test',
    title: 'Prueba el flujo',
    tip: 'Simula la conversación con Luna usando knowledge real de la API.',
    route: '/app/flujos',
    cta: 'Probar preview',
  },
  {
    id: 'done',
    title: 'Listo para vender',
    tip: 'Publica el flujo y observa conversaciones y ventas en el dashboard.',
    route: '/app',
    cta: 'Ver dashboard',
  },
]

export type ThemeMode = 'light' | 'dark'

function resolveInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('ml_theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
}

export const useAppStore = defineStore('app', () => {
  const token = ref<string | null>(localStorage.getItem('ml_token'))
  const user = ref<AuthUser | null>(
    localStorage.getItem('ml_user_json')
      ? (JSON.parse(localStorage.getItem('ml_user_json') as string) as AuthUser)
      : null,
  )
  const isAuthenticated = computed(() => Boolean(token.value))
  const userName = computed(() => user.value?.name || 'Admin LunaMarket')
  const theme = ref<ThemeMode>(resolveInitialTheme())
  applyTheme(theme.value)

  const onboardingIndex = ref(Number(localStorage.getItem('ml_onboarding') || 0))
  const guideOpen = ref(localStorage.getItem('ml_guide_dismissed') !== '1')
  const guideMinimized = ref(false)

  const courseReady = ref(false)
  const knowledgeReady = ref(false)
  const whatsappReady = ref(false)
  const flowReady = ref(false)
  const lunaStatus = ref<'ok' | 'down' | 'unknown'>('unknown')

  const steps = ONBOARDING_STEPS
  const currentStep = computed(() => steps[Math.min(onboardingIndex.value, steps.length - 1)])
  const progress = computed(() => Math.round((onboardingIndex.value / (steps.length - 1)) * 100))

  function persistAuth(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem('ml_token', nextToken)
    localStorage.setItem('ml_user_json', JSON.stringify(nextUser))
    localStorage.setItem('ml_auth', '1')
    localStorage.setItem('ml_user', nextUser.name)
  }

  async function login(email: string, password: string) {
    const data = await api<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password, device_name: 'marketluna-web' },
      token: null,
    })
    persistAuth(data.token, data.user)
    await refreshDashboardFlags()
  }

  async function register(payload: {
    name: string
    email: string
    password: string
    password_confirmation: string
    business_name?: string
  }) {
    const data = await api<{
      pending_approval?: boolean
      message?: string
      token?: string
      user?: AuthUser
    }>('/auth/register', {
      method: 'POST',
      body: { ...payload, device_name: 'marketluna-web' },
      token: null,
    })

    // Registro pendiente: no inicia sesión hasta que el admin apruebe
    if (data.pending_approval || !data.token || !data.user) {
      return {
        pendingApproval: true as const,
        message:
          data.message ||
          'Registro recibido. Espera la aprobación del administrador para iniciar sesión.',
      }
    }

    localStorage.setItem('ml_onboarding', '0')
    localStorage.removeItem('ml_guide_dismissed')
    onboardingIndex.value = 0
    guideOpen.value = true
    persistAuth(data.token, data.user)
    await refreshDashboardFlags()
    return { pendingApproval: false as const, message: data.message || '' }
  }

  async function logout() {
    try {
      if (token.value) {
        await api('/auth/logout', { method: 'POST' })
      }
    } catch {
      // ignore
    }
    token.value = null
    user.value = null
    localStorage.removeItem('ml_token')
    localStorage.removeItem('ml_user_json')
    localStorage.removeItem('ml_auth')
  }

  async function refreshDashboardFlags() {
    if (!token.value) return
    try {
      const data = await api<{
        checklist: { course: boolean; knowledge: boolean; whatsapp: boolean; flow: boolean }
        luna: { status?: string }
      }>('/dashboard')
      courseReady.value = data.checklist.course
      knowledgeReady.value = data.checklist.knowledge
      whatsappReady.value = data.checklist.whatsapp
      flowReady.value = data.checklist.flow
      lunaStatus.value = data.luna?.status === 'ok' ? 'ok' : 'down'
    } catch {
      lunaStatus.value = 'down'
    }
  }

  function setOnboarding(index: number) {
    onboardingIndex.value = Math.max(0, Math.min(index, steps.length - 1))
    localStorage.setItem('ml_onboarding', String(onboardingIndex.value))
  }

  function nextOnboarding() {
    setOnboarding(onboardingIndex.value + 1)
  }

  function dismissGuide() {
    guideOpen.value = false
    localStorage.setItem('ml_guide_dismissed', '1')
  }

  function reopenGuide() {
    guideOpen.value = true
    guideMinimized.value = false
    localStorage.removeItem('ml_guide_dismissed')
  }

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    localStorage.setItem('ml_theme', mode)
    applyTheme(mode)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    token,
    user,
    isAuthenticated,
    userName,
    theme,
    onboardingIndex,
    guideOpen,
    guideMinimized,
    courseReady,
    knowledgeReady,
    whatsappReady,
    flowReady,
    lunaStatus,
    steps,
    currentStep,
    progress,
    login,
    register,
    logout,
    refreshDashboardFlags,
    setOnboarding,
    nextOnboarding,
    dismissGuide,
    reopenGuide,
    setTheme,
    toggleTheme,
  }
})
