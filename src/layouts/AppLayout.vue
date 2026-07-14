<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import LunaGuide from '@/components/LunaGuide.vue'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const search = ref('')

const nav = [
  { to: '/app', label: 'Dashboard', icon: '◈', exact: true },
  { to: '/app/guia', label: 'Guía Luna', icon: '☽' },
  { to: '/app/cursos', label: 'Productos', icon: '▣' },
  { to: '/app/knowledge', label: 'Knowledge', icon: '✎' },
  { to: '/app/flujos', label: 'Flow Builder', icon: '⟐' },
  { to: '/app/whatsapp', label: 'WhatsApp', icon: '✆' },
  { to: '/app/conversaciones', label: 'Chats', icon: '⌀' },
  { to: '/app/ventas', label: 'Ventas', icon: '◉' },
  { to: '/app/equipo', label: 'Equipo', icon: '♟' },
  { to: '/app/ajustes', label: 'Ajustes', icon: '⚙' },
]

const pageTitle = computed(() => {
  const item = nav.find((n) => (n.exact ? route.path === n.to : route.path.startsWith(n.to)))
  return item?.label ?? 'LunaMarket'
})

const pageHint = computed(() => {
  const map: Record<string, string> = {
    '/app': 'Resumen de ventas, WhatsApp y automatizaciones.',
    '/app/cursos': 'Catálogo de productos que el bot ofrece.',
    '/app/flujos': 'Diseña el recorrido de venta por WhatsApp.',
    '/app/whatsapp': 'Conexión e instancia de mensajería.',
    '/app/conversaciones': 'Inbox filtrado por día o mes.',
    '/app/ventas': 'Pagos pendientes y entregas del período.',
    '/app/equipo': 'Vendedores y usuarios de tu negocio.',
    '/app/ajustes': 'Preferencias de tu negocio.',
  }
  const hit = Object.keys(map).find((k) => (k === '/app' ? route.path === k : route.path.startsWith(k)))
  return hit ? map[hit] : 'Panel de control LunaMarket.'
})

function isActive(item: (typeof nav)[number]) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}

function closeMenu() {
  menuOpen.value = false
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function logout() {
  closeMenu()
  store.logout()
  router.push('/login')
}

function onSearchSubmit() {
  const q = search.value.trim().toLowerCase()
  if (!q) return
  const match = nav.find((n) => n.label.toLowerCase().includes(q))
  if (match) router.push(match.to)
}

watch(
  () => route.fullPath,
  () => closeMenu(),
)
</script>

<template>
  <div class="shell" :class="{ 'menu-open': menuOpen }">
    <button
      v-if="menuOpen"
      class="nav-backdrop"
      type="button"
      aria-label="Cerrar menú"
      @click="closeMenu"
    />

    <aside class="sidebar" :class="{ open: menuOpen }">
      <div class="brand">
        <img class="brand-logo" src="/brand/lunamarket-logo.png" alt="LunaMarket" width="44" height="44" />
        <div>
          <strong>Luna<span>Market</span></strong>
          <small>WhatsApp Sales</small>
        </div>
        <button class="close-menu" type="button" aria-label="Cerrar" @click="closeMenu">×</button>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item) }"
          @click="closeMenu"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-promo">
        <p>Controla ventas y catálogo con facilidad.</p>
        <button class="ml-btn ml-btn-primary promo-btn" type="button" @click="store.reopenGuide()">
          Guía rápida
        </button>
      </div>

      <button class="logout" type="button" @click="logout">Salir</button>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="menu-toggle"
            type="button"
            :aria-expanded="menuOpen"
            aria-label="Abrir menú"
            @click="toggleMenu"
          >
            <span /><span /><span />
          </button>
          <form class="search" @submit.prevent="onSearchSubmit">
            <span class="search-icon" aria-hidden="true">⌕</span>
            <input
              v-model="search"
              type="search"
              placeholder="Buscar productos, flujos, chats…"
              aria-label="Buscar"
            />
          </form>
        </div>

        <div class="top-actions">
          <button
            class="theme-toggle"
            type="button"
            :title="store.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
            :aria-label="store.theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            @click="store.toggleTheme()"
          >
            {{ store.theme === 'dark' ? '☀' : '☾' }}
          </button>
          <div class="user-chip">
            <span class="avatar">{{ store.userName.slice(0, 1).toUpperCase() }}</span>
            <div class="user-meta">
              <strong>{{ store.userName }}</strong>
              <small>{{ store.user?.role || 'owner' }}</small>
            </div>
          </div>
        </div>
      </header>

      <div class="page-head">
        <div>
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageHint }}</p>
        </div>
      </div>

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
  grid-template-columns: 268px 1fr;
  background: var(--ml-bg);
}

.nav-backdrop,
.close-menu,
.menu-toggle {
  display: none;
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 1.25rem 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  background: var(--ml-sidebar);
  color: var(--ml-sidebar-text);
  border-radius: 0 28px 28px 0;
  z-index: 40;
}

.brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.35rem 0.45rem;
}

.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
}

.brand strong {
  display: block;
  font-family: var(--font-display);
  font-size: 1.05rem;
}

.brand strong span {
  color: var(--ml-c5);
}

.brand small {
  opacity: 0.7;
  font-size: 0.72rem;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  overflow: auto;
  padding-right: 0.15rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.78rem 0.9rem;
  border-radius: 16px;
  color: var(--ml-sidebar-muted);
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--ml-sidebar-text);
}

.nav-item.active {
  background: var(--ml-sidebar-active);
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(0, 198, 171, 0.35);
}

.nav-icon {
  width: 1.35rem;
  text-align: center;
}

.sidebar-promo {
  margin-top: auto;
  padding: 1rem;
  border-radius: 18px;
  background: rgba(0, 198, 171, 0.12);
  border: 1px solid rgba(0, 198, 171, 0.22);
}

.sidebar-promo p {
  font-size: 0.82rem;
  color: var(--ml-sidebar-text);
  margin-bottom: 0.75rem;
  opacity: 0.9;
}

.promo-btn {
  width: 100%;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
}

.logout {
  border: 0;
  background: transparent;
  color: var(--ml-sidebar-muted);
  text-align: left;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  border-radius: 12px;
}

.logout:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
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
  padding: 1rem 1.5rem 0.4rem;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--ml-topbar);
  backdrop-filter: blur(10px);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.search {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: min(520px, 100%);
  padding: 0.55rem 1rem;
  border-radius: 999px;
  background: var(--ml-card);
  border: 1px solid var(--ml-line);
  box-shadow: var(--ml-shadow-soft);
}

.search-icon {
  opacity: 0.55;
}

.search input {
  border: 0;
  outline: 0;
  background: transparent;
  width: 100%;
  color: var(--ml-ink);
}

.search input::placeholder {
  color: var(--ml-muted);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0.7rem 0.3rem 0.3rem;
  border-radius: 999px;
  background: var(--ml-card);
  border: 1px solid var(--ml-line);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #05323a;
  background: linear-gradient(135deg, var(--ml-c4), var(--ml-c5));
  flex-shrink: 0;
}

.user-chip strong {
  display: block;
  font-size: 0.82rem;
}

.user-chip small {
  color: var(--ml-muted);
  font-size: 0.7rem;
}

.page-head {
  padding: 0.35rem 1.5rem 0.6rem;
}

.page-head h1 {
  font-size: clamp(1.45rem, 2vw, 1.9rem);
  color: var(--ml-wine-deep);
}

.page-head p {
  color: var(--ml-muted);
  font-size: 0.92rem;
  margin-top: 0.2rem;
}

.content {
  padding: 0.4rem 1.5rem 2rem;
}

@media (max-width: 960px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .menu-toggle {
    display: grid;
    gap: 5px;
    width: 42px;
    height: 42px;
    padding: 11px 10px;
    border: 1px solid var(--ml-line);
    border-radius: 14px;
    background: var(--ml-card);
    flex-shrink: 0;
  }

  .menu-toggle span {
    display: block;
    height: 2px;
    border-radius: 2px;
    background: var(--ml-ink);
  }

  .nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 45;
    border: 0;
    background: rgba(0, 20, 30, 0.55);
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: min(300px, 88vw);
    height: 100dvh;
    transform: translateX(-105%);
    transition: transform 0.22s ease;
    border-radius: 0 24px 24px 0;
    box-shadow: 12px 0 40px rgba(0, 0, 0, 0.35);
    z-index: 50;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .close-menu {
    display: grid;
    place-items: center;
    margin-left: auto;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 1.4rem;
  }

  .topbar {
    padding: 0.85rem 1rem;
  }

  .search {
    display: none;
  }

  .user-meta {
    display: none;
  }

  .page-head,
  .content {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
