<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import LunaGuide from '@/components/LunaGuide.vue'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const nav = [
  { to: '/app', label: 'Dashboard', icon: '◈', exact: true },
  { to: '/app/guia', label: 'Guía Luna', icon: '☽' },
  { to: '/app/cursos', label: 'Cursos', icon: '▣' },
  { to: '/app/knowledge', label: 'Knowledge', icon: '✎' },
  { to: '/app/flujos', label: 'Flow Builder', icon: '⟐' },
  { to: '/app/whatsapp', label: 'WhatsApp', icon: '✆' },
  { to: '/app/conversaciones', label: 'Chats', icon: '⌀' },
  { to: '/app/ventas', label: 'Ventas', icon: '◉' },
  { to: '/app/ajustes', label: 'Ajustes', icon: '⚙' },
]

const pageTitle = computed(() => {
  const item = nav.find((n) => (n.exact ? route.path === n.to : route.path.startsWith(n.to)))
  return item?.label ?? 'MarketLuna'
})

function isActive(item: (typeof nav)[number]) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}

function logout() {
  store.logout()
  router.push('/login')
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <span class="moon"></span>
        </div>
        <div>
          <strong>MarketLuna</strong>
          <small>IA Luna · ventas WA</small>
        </div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-foot">
        <div class="luna-pill">
          <span class="dot"></span>
          Luna · API conectada
        </div>
        <button class="ml-btn ml-btn-ghost logout" type="button" @click="logout">Salir</button>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div>
          <p class="eyebrow">MarketLuna</p>
          <h1>{{ pageTitle }}</h1>
        </div>
        <div class="top-actions">
          <button class="ml-btn ml-btn-secondary" type="button" @click="store.reopenGuide()">
            Guía Luna
          </button>
          <div class="user-chip">
            <span class="avatar">{{ store.userName.slice(0, 1).toUpperCase() }}</span>
            <div>
              <strong>{{ store.userName }}</strong>
              <small>owner</small>
            </div>
          </div>
        </div>
      </header>

      <main class="content">
        <RouterView />
      </main>
    </div>

    <LunaGuide />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 1.4rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  background:
    linear-gradient(180deg, rgba(134, 8, 0, 0.96), rgba(92, 5, 0, 0.98)),
    radial-gradient(circle at 20% 10%, rgba(14, 255, 249, 0.18), transparent 45%);
  color: var(--ml-cream);
  border-right: 1px solid rgba(255, 251, 244, 0.08);
}

.brand {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(145deg, var(--ml-aqua), var(--ml-sky));
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(14, 255, 249, 0.25);
}

.moon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ml-cream);
  box-shadow: 6px -3px 0 0 rgba(134, 8, 0, 0.85);
}

.brand strong {
  display: block;
  font-family: var(--font-display);
  font-size: 1.1rem;
}

.brand small {
  opacity: 0.72;
  font-size: 0.72rem;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  overflow: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.72rem 0.85rem;
  border-radius: 12px;
  color: rgba(255, 251, 244, 0.78);
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.nav-item:hover {
  background: rgba(255, 251, 244, 0.08);
  color: var(--ml-cream);
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(14, 255, 249, 0.22), rgba(8, 140, 255, 0.18));
  color: var(--ml-cream);
  box-shadow: inset 0 0 0 1px rgba(14, 255, 249, 0.25);
}

.nav-icon {
  width: 1.4rem;
  text-align: center;
  opacity: 0.9;
}

.sidebar-foot {
  display: grid;
  gap: 0.6rem;
}

.luna-pill {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  padding: 0.65rem 0.8rem;
  border-radius: 999px;
  background: rgba(14, 255, 249, 0.12);
  border: 1px solid rgba(14, 255, 249, 0.22);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ml-aqua);
  animation: ml-pulse 1.8s ease infinite;
}

.logout {
  color: rgba(255, 251, 244, 0.8);
  justify-content: flex-start;
}

.main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.6rem 0.5rem;
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ml-ember);
}

.topbar h1 {
  font-size: clamp(1.4rem, 2vw, 1.9rem);
  color: var(--ml-wine-deep);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.4rem 0.75rem 0.4rem 0.4rem;
  border-radius: 999px;
  background: rgba(255, 251, 244, 0.8);
  border: 1px solid var(--ml-line);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--ml-cream);
  background: linear-gradient(135deg, var(--ml-wine), var(--ml-ember));
}

.user-chip strong {
  display: block;
  font-size: 0.85rem;
}

.user-chip small {
  color: var(--ml-muted);
  font-size: 0.72rem;
}

.content {
  padding: 1rem 1.6rem 2rem;
}

@media (max-width: 960px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: relative;
    height: auto;
    border-right: none;
  }

  .nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
