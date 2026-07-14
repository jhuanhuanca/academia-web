<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { api } from '@/api/client'

const store = useAppStore()
const router = useRouter()
const loading = ref(true)
const kpis = ref([
  { label: 'Conversaciones', value: '0', hint: 'total', tone: 'wine' },
  { label: 'Pagos pendientes', value: '0', hint: 'QR activos', tone: 'ember' },
  { label: 'Ventas pagadas', value: '0', hint: 'pagadas', tone: 'sky' },
  { label: 'Entregas', value: '0', hint: 'automático', tone: 'aqua' },
])

const checklist = computed(() => [
  { ok: store.courseReady, label: 'Producto creado', to: '/app/cursos' },
  { ok: store.knowledgeReady, label: 'Knowledge para Luna', to: '/app/knowledge' },
  { ok: store.whatsappReady, label: 'WhatsApp conectado', to: '/app/whatsapp' },
  { ok: store.flowReady, label: 'Flujo publicado', to: '/app/flujos' },
])

onMounted(async () => {
  try {
    const data = await api<{
      kpis: {
        conversations: number
        pending_payments: number
        paid_sales: number
        delivered: number
      }
      checklist: { course: boolean; knowledge: boolean; whatsapp: boolean; flow: boolean }
      luna: { status?: string }
    }>('/dashboard')

    store.courseReady = data.checklist.course
    store.knowledgeReady = data.checklist.knowledge
    store.whatsappReady = data.checklist.whatsapp
    store.flowReady = data.checklist.flow
    store.lunaStatus = data.luna?.status === 'ok' ? 'ok' : 'down'

    kpis.value = [
      { label: 'Conversaciones', value: String(data.kpis.conversations), hint: 'total', tone: 'wine' },
      {
        label: 'Pagos pendientes',
        value: String(data.kpis.pending_payments),
        hint: 'QR activos',
        tone: 'ember',
      },
      { label: 'Ventas pagadas', value: String(data.kpis.paid_sales), hint: 'pagadas', tone: 'sky' },
      {
        label: 'Entregas',
        value: String(data.kpis.delivered),
        hint: 'automático',
        tone: 'aqua',
      },
    ]
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dash">
    <section class="hero ml-rise">
      <div class="hero-copy">
        <p class="eyebrow">Welcome back</p>
        <h2>Hola, {{ store.userName }}</h2>
        <p class="lead">
          Controla productos, flujos y ventas WhatsApp desde un solo panel.
        </p>
        <div class="hero-actions">
          <button class="ml-btn ml-btn-primary" type="button" @click="router.push('/app/flujos')">
            Abrir Flow Builder
          </button>
          <button class="ml-btn ghost-light" type="button" @click="router.push('/app/whatsapp')">
            WhatsApp
          </button>
        </div>
        <div class="status-pill">
          Luna
          <span class="ml-badge" :class="store.lunaStatus === 'ok' ? 'ml-badge-ok' : 'ml-badge-warn'">
            {{ store.lunaStatus === 'ok' ? 'online' : 'offline' }}
          </span>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <img src="/brand/lunamarket-logo.png" alt="" width="140" height="140" />
      </div>
    </section>

    <p v-if="loading" class="loading">Cargando dashboard…</p>

    <section class="kpis">
      <article
        v-for="(kpi, i) in kpis"
        :key="kpi.label"
        class="kpi ml-card ml-rise"
        :class="[`tone-${kpi.tone}`, `ml-rise-delay-${i + 1}`]"
      >
        <p>{{ kpi.label }}</p>
        <strong>{{ kpi.value }}</strong>
        <span>{{ kpi.hint }}</span>
      </article>
    </section>

    <section class="grid">
      <article class="ml-card panel ml-rise">
        <header>
          <h3>Checklist de arranque</h3>
          <span class="ml-badge">{{ store.progress }}%</span>
        </header>
        <ul>
          <li v-for="item in checklist" :key="item.label">
            <span class="check" :class="{ on: item.ok }">{{ item.ok ? '✓' : '○' }}</span>
            <button type="button" @click="router.push(item.to)">{{ item.label }}</button>
          </li>
        </ul>
        <p class="tip">Tip: completa estos 4 pasos antes de hablar con clientes reales.</p>
      </article>

      <article class="ml-card panel ml-rise ml-rise-delay-2">
        <header>
          <h3>Atajos rápidos</h3>
        </header>
        <div class="shortcuts">
          <button class="shortcut" type="button" @click="router.push('/app/cursos')">
            <strong>Productos</strong>
            <span>Catálogo y precios</span>
          </button>
          <button class="shortcut" type="button" @click="router.push('/app/knowledge')">
            <strong>Knowledge</strong>
            <span>Qué puede decir Luna</span>
          </button>
          <button class="shortcut" type="button" @click="router.push('/app/whatsapp')">
            <strong>WhatsApp</strong>
            <span>Estado de conexión</span>
          </button>
          <button class="shortcut" type="button" @click="router.push('/app/ventas')">
            <strong>Ventas</strong>
            <span>Pagos y entregas</span>
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.dash {
  display: grid;
  gap: 1.1rem;
}
.loading {
  color: var(--ml-muted);
}
.hero {
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: 1rem;
  padding: 1.6rem 1.5rem;
  overflow: hidden;
  position: relative;
  border-radius: var(--radius-xl);
  background: var(--ml-hero);
  color: #e8f7f5;
  box-shadow: var(--ml-shadow);
}
.eyebrow {
  color: rgba(232, 247, 245, 0.75);
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.hero h2 {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  color: #fff;
  margin: 0.35rem 0 0.55rem;
}
.lead {
  color: rgba(232, 247, 245, 0.82);
  max-width: 46ch;
  margin-bottom: 1.1rem;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.ghost-light {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.22);
}
.status-pill {
  margin-top: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.85rem;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.18);
  font-weight: 600;
  font-size: 0.88rem;
}
.hero-visual {
  display: grid;
  place-items: center;
}
.hero-visual img {
  width: min(150px, 42vw);
  height: auto;
  border-radius: 50%;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
  animation: ml-float 4.5s ease-in-out infinite;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}
.kpi {
  padding: 1.1rem 1.15rem;
  border-radius: 22px;
}
.kpi p {
  font-size: 0.8rem;
  color: var(--ml-muted);
}
.kpi strong {
  display: block;
  font-family: var(--font-display);
  font-size: 1.9rem;
  margin: 0.2rem 0;
  color: var(--ml-wine-deep);
}
.kpi span {
  font-size: 0.75rem;
  color: var(--ml-muted);
}
.tone-wine strong {
  color: var(--ml-c3);
}
.tone-ember strong,
.tone-sky strong,
.tone-aqua strong {
  color: var(--ml-c5);
}
html[data-theme='dark'] .tone-wine strong {
  color: var(--ml-c5);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.95rem;
}
.panel {
  padding: 1.15rem 1.2rem;
  border-radius: 22px;
}
.panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.85rem;
}
.panel h3 {
  font-size: 1.05rem;
  color: var(--ml-wine-deep);
}
.panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.45rem;
}
.panel li {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}
.check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  background: var(--ml-input-bg);
  border: 1px solid var(--ml-line);
  color: var(--ml-muted);
}
.check.on {
  background: rgba(0, 198, 171, 0.18);
  color: var(--ml-c4);
  border-color: transparent;
}
.panel li button {
  border: 0;
  background: transparent;
  color: var(--ml-ink);
  cursor: pointer;
  padding: 0.35rem 0;
  font-weight: 500;
  text-align: left;
}
.tip {
  margin-top: 0.9rem;
  font-size: 0.82rem;
  color: var(--ml-muted);
}
.shortcuts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.shortcut {
  text-align: left;
  border: 1px solid var(--ml-line);
  background: var(--ml-input-bg);
  border-radius: 16px;
  padding: 0.9rem;
  cursor: pointer;
  color: var(--ml-ink);
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}
.shortcut:hover {
  border-color: var(--ml-c5);
  transform: translateY(-1px);
}
.shortcut strong {
  display: block;
  margin-bottom: 0.2rem;
}
.shortcut span {
  font-size: 0.78rem;
  color: var(--ml-muted);
}
@media (max-width: 960px) {
  .hero,
  .grid,
  .kpis {
    grid-template-columns: 1fr;
  }
  .hero-visual {
    display: none;
  }
  .shortcuts {
    grid-template-columns: 1fr;
  }
}
</style>
