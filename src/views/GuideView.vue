<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const router = useRouter()

function go(index: number) {
  store.setOnboarding(index)
  router.push(store.steps[index].route)
}
</script>

<template>
  <div class="guide-page">
    <section class="intro ml-card ml-rise">
      <div class="moon" aria-hidden="true">☽</div>
      <div>
        <p class="eyebrow">Guía para principiantes</p>
        <h2>Configura LunaMarket en 7 pasos</h2>
        <p>
          No necesitas saber de APIs todavía. Sigue los mensajes de Luna: cada paso desbloquea el
          siguiente hasta publicar tu primera automatización de ventas.
        </p>
      </div>
    </section>

    <ol class="steps">
      <li
        v-for="(step, index) in store.steps"
        :key="step.id"
        class="step ml-card ml-rise"
        :class="{ current: index === store.onboardingIndex, done: index < store.onboardingIndex }"
      >
        <div class="num">{{ index + 1 }}</div>
        <div class="body">
          <h3>{{ step.title }}</h3>
          <p>{{ step.tip }}</p>
          <button class="ml-btn ml-btn-secondary" type="button" @click="go(index)">
            {{ step.cta }}
          </button>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.guide-page {
  display: grid;
  gap: 1rem;
}

.intro {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1.3rem;
}

.moon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  color: var(--ml-cream);
  background: linear-gradient(135deg, var(--ml-sky), var(--ml-aqua));
  flex-shrink: 0;
}

.eyebrow {
  color: var(--ml-ember);
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.intro h2 {
  color: var(--ml-wine-deep);
  margin: 0.25rem 0 0.45rem;
}

.intro p {
  color: var(--ml-muted);
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.step {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid transparent;
}

.step.current {
  border-color: rgba(10, 52, 148, 0.45);
  box-shadow: 0 12px 30px rgba(10, 52, 148, 0.12);
}

.step.done .num {
  background: rgba(127, 154, 82, 0.25);
  color: #4f6a2e;
}

.num {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--ml-cream);
  background: linear-gradient(135deg, var(--ml-wine), var(--ml-ember));
}

.body h3 {
  color: var(--ml-wine);
  margin-bottom: 0.3rem;
}

.body p {
  color: var(--ml-muted);
  margin-bottom: 0.75rem;
}
</style>
