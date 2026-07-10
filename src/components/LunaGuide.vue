<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const router = useRouter()

function goStep() {
  const step = store.currentStep
  store.guideMinimized = false
  router.push(step.route)
}

function next() {
  store.nextOnboarding()
}
</script>

<template>
  <div v-if="store.guideOpen" class="guide" :class="{ mini: store.guideMinimized }">
    <button
      class="toggle"
      type="button"
      :aria-label="store.guideMinimized ? 'Expandir guía' : 'Minimizar guía'"
      @click="store.guideMinimized = !store.guideMinimized"
    >
      {{ store.guideMinimized ? '☽' : '—' }}
    </button>

    <template v-if="!store.guideMinimized">
      <header>
        <div class="avatar" aria-hidden="true">☽</div>
        <div>
          <strong>Luna te guía</strong>
          <p>Paso {{ store.onboardingIndex + 1 }} de {{ store.steps.length }}</p>
        </div>
        <button class="close" type="button" aria-label="Cerrar guía" @click="store.dismissGuide()">
          ×
        </button>
      </header>

      <div class="bar">
        <span :style="{ width: store.progress + '%' }"></span>
      </div>

      <div class="bubble ml-rise">
        <h3>{{ store.currentStep.title }}</h3>
        <p>{{ store.currentStep.tip }}</p>
      </div>

      <div class="actions">
        <button class="ml-btn ml-btn-sky" type="button" @click="goStep">
          {{ store.currentStep.cta }}
        </button>
        <button class="ml-btn ml-btn-ghost" type="button" @click="next">Siguiente tip</button>
      </div>
    </template>
    <template v-else>
      <button class="mini-open" type="button" @click="store.guideMinimized = false">
        Luna · guía
      </button>
    </template>
  </div>
</template>

<style scoped>
.guide {
  position: fixed;
  right: 1.2rem;
  bottom: 1.2rem;
  width: min(340px, calc(100vw - 2rem));
  z-index: 40;
  padding: 1rem;
  border-radius: 22px;
  background:
    linear-gradient(160deg, rgba(255, 251, 244, 0.95), rgba(255, 236, 214, 0.92)),
    radial-gradient(circle at 100% 0%, rgba(14, 255, 249, 0.2), transparent 50%);
  border: 1px solid rgba(134, 8, 0, 0.1);
  box-shadow: var(--ml-shadow);
}

.guide.mini {
  width: auto;
  padding: 0.5rem;
  border-radius: 999px;
}

.toggle,
.close {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--ml-muted);
  font-size: 1.1rem;
}

.toggle {
  position: absolute;
  top: 0.55rem;
  right: 2.2rem;
}

.close {
  margin-left: auto;
  font-size: 1.3rem;
}

header {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-right: 1.5rem;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--ml-wine), var(--ml-ember));
  color: var(--ml-cream);
  box-shadow: 0 8px 18px rgba(134, 8, 0, 0.25);
}

header strong {
  display: block;
  color: var(--ml-wine);
}

header p {
  font-size: 0.75rem;
  color: var(--ml-muted);
}

.bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(134, 8, 0, 0.08);
  overflow: hidden;
  margin-bottom: 0.9rem;
}

.bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--ml-sky), var(--ml-aqua));
  transition: width 0.3s ease;
}

.bubble {
  padding: 0.85rem;
  border-radius: 16px;
  background: rgba(255, 251, 244, 0.9);
  border: 1px solid var(--ml-line);
  margin-bottom: 0.9rem;
}

.bubble h3 {
  font-size: 1rem;
  color: var(--ml-wine-deep);
  margin-bottom: 0.35rem;
}

.bubble p {
  font-size: 0.88rem;
  color: var(--ml-muted);
}

.actions {
  display: grid;
  gap: 0.4rem;
}

.mini-open {
  border: none;
  background: transparent;
  color: var(--ml-wine);
  font-weight: 700;
  cursor: pointer;
  padding: 0.35rem 0.8rem;
}
</style>
