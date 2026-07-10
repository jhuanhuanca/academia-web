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
  { label: 'Cursos entregados', value: '0', hint: 'automático', tone: 'aqua' },
])

const checklist = computed(() => [
  { ok: store.courseReady, label: 'Curso creado', to: '/app/cursos' },
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
        label: 'Cursos entregados',
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
    <section class="hero ml-card ml-rise">
      <div>
        <p class="eyebrow">Hola, {{ store.userName }}</p>
        <h2>Tu centro de control con Luna</h2>
        <p class="lead">
          Dashboard conectado a la API. Checklist y KPIs salen de
          <code>academia_chatbot</code>.
        </p>
        <div class="hero-actions">
          <button class="ml-btn ml-btn-primary" type="button" @click="router.push('/app/guia')">
            Abrir guía principiante
          </button>
          <button class="ml-btn ml-btn-secondary" type="button" @click="router.push('/app/flujos')">
            Ir al Flow Builder
          </button>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="ring"></div>
        <div class="luna">☽</div>
        <p>
          Luna
          <span class="ml-badge" :class="store.lunaStatus === 'ok' ? 'ml-badge-ok' : 'ml-badge-warn'">
            {{ store.lunaStatus === 'ok' ? 'online' : 'offline' }}
          </span>
        </p>
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
        <p class="tip">Tip de Luna: completa estos 4 pasos antes de hablar con clientes reales.</p>
      </article>

      <article class="ml-card panel ml-rise ml-rise-delay-2">
        <header>
          <h3>Atajos rápidos</h3>
        </header>
        <div class="shortcuts">
          <button class="shortcut" type="button" @click="router.push('/app/cursos')">
            <strong>Nuevo curso</strong>
            <span>Precio + link de entrega</span>
          </button>
          <button class="shortcut" type="button" @click="router.push('/app/knowledge')">
            <strong>Knowledge Luna</strong>
            <span>Qué sí puede decir</span>
          </button>
          <button class="shortcut" type="button" @click="router.push('/app/whatsapp')">
            <strong>WhatsApp</strong>
            <span>Estado de conexión</span>
          </button>
          <button class="shortcut" type="button" @click="router.push('/app/ventas')">
            <strong>Ventas</strong>
            <span>QR y entregas</span>
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
  grid-template-columns: 1.4fr 0.6fr;
  gap: 1rem;
  padding: 1.5rem;
  overflow: hidden;
  position: relative;
}
.eyebrow {
  color: var(--ml-ember);
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.hero h2 {
  font-size: clamp(1.5rem, 3vw, 2.1rem);
  color: var(--ml-wine-deep);
  margin: 0.35rem 0 0.6rem;
}
.lead {
  color: var(--ml-muted);
  max-width: 48ch;
  margin-bottom: 1.1rem;
}
.lead code {
  color: var(--ml-sky);
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.hero-visual {
  display: grid;
  place-items: center;
  align-content: center;
  position: relative;
}
.ring {
  position: absolute;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(14, 255, 249, 0.35), transparent 70%);
  animation: ml-pulse 3.5s ease infinite;
}
.luna {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 2rem;
  color: var(--ml-cream);
  background: linear-gradient(145deg, var(--ml-wine), var(--ml-ember));
  box-shadow: 0 16px 30px rgba(134, 8, 0, 0.28);
  animation: ml-float 4s ease-in-out infinite;
  z-index: 1;
}
.hero-visual p {
  margin-top: 0.6rem;
  font-weight: 700;
  color: var(--ml-wine);
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}
.kpi {
  padding: 1rem 1.1rem;
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
}
.kpi span {
  font-size: 0.75rem;
  font-weight: 600;
}
.tone-wine strong {
  color: var(--ml-wine);
}
.tone-ember strong {
  color: var(--ml-ember);
}
.tone-sky strong {
  color: var(--ml-sky);
}
.tone-aqua strong {
  color: #069991;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}
.panel {
  padding: 1.15rem;
}
.panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.9rem;
}
.panel h3 {
  color: var(--ml-wine-deep);
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.55rem;
}
li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  background: rgba(134, 8, 0, 0.08);
  color: var(--ml-muted);
}
.check.on {
  background: rgba(14, 255, 249, 0.25);
  color: #067a76;
}
li button {
  border: none;
  background: transparent;
  color: var(--ml-ink);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}
.tip {
  margin-top: 1rem;
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
  background: rgba(255, 251, 244, 0.7);
  border-radius: 14px;
  padding: 0.85rem;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}
.shortcut:hover {
  transform: translateY(-2px);
  border-color: rgba(8, 140, 255, 0.4);
}
.shortcut strong {
  display: block;
  color: var(--ml-wine);
  margin-bottom: 0.2rem;
}
.shortcut span {
  font-size: 0.78rem;
  color: var(--ml-muted);
}
@media (max-width: 900px) {
  .hero,
  .grid,
  .kpis,
  .shortcuts {
    grid-template-columns: 1fr;
  }
}
</style>
