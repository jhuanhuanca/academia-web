<script setup lang="ts">
import { reactive } from 'vue'

const form = reactive({
  brand: 'LunaMarket',
  iaName: 'Luna',
  provider: 'manual_qr',
  timezone: 'America/Caracas',
})
</script>

<template>
  <div class="page">
    <form class="ml-card form ml-rise" @submit.prevent>
      <h2>Ajustes de plataforma</h2>
      <label>
        <span class="ml-label">Nombre plataforma</span>
        <input v-model="form.brand" class="ml-input" />
      </label>
      <label>
        <span class="ml-label">Nombre de la IA</span>
        <input v-model="form.iaName" class="ml-input" />
      </label>
      <label>
        <span class="ml-label">Pasarela / QR</span>
        <select v-model="form.provider" class="ml-select">
          <option value="manual_qr">manual_qr</option>
          <option value="mercadopago">Mercado Pago (próximo)</option>
        </select>
      </label>
      <label>
        <span class="ml-label">Timezone</span>
        <input v-model="form.timezone" class="ml-input" />
      </label>
      <button class="ml-btn ml-btn-primary" type="button">Guardar (visual)</button>
      <p class="note">Los secretos de API y Evolution se conectan en el siguiente paso de integración.</p>
    </form>
  </div>
</template>

<style scoped>
.page {
  max-width: 560px;
}
.form {
  padding: 1.2rem;
  display: grid;
  gap: 0.85rem;
}
h2 {
  color: var(--ml-wine-deep);
}
.note {
  color: var(--ml-muted);
  font-size: 0.85rem;
}
</style>
