<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const route = useRoute()

const CONTACT_EMAIL = 'synkaisoft@gmail.com'

type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'faq'; items: { q: string; a: string }[] }

type Doc = {
  title: string
  updated: string
  sections: { heading: string; blocks: Block[] }[]
}

const docs: Record<string, Doc> = {
  'privacy-policy': {
    title: 'Política de Privacidad',
    updated: '16 de julio de 2026',
    sections: [
      {
        heading: 'Política de Privacidad',
        blocks: [
          { type: 'p', text: 'Bienvenido a LunaMarket.' },
          {
            type: 'p',
            text: 'En LunaMarket nos comprometemos a proteger la privacidad de nuestros usuarios y de los clientes que interactúan con nuestros servicios mediante WhatsApp Business Platform.',
          },
        ],
      },
      {
        heading: '1. Información que recopilamos',
        blocks: [
          { type: 'p', text: 'Podemos recopilar la siguiente información:' },
          {
            type: 'ul',
            items: [
              'Nombre del usuario.',
              'Dirección de correo electrónico.',
              'Número de teléfono.',
              'Información de la empresa.',
              'Mensajes enviados y recibidos mediante WhatsApp Business Platform.',
              'Información técnica como dirección IP, navegador, sistema operativo y registros de actividad.',
              'Datos necesarios para mejorar nuestros servicios basados en inteligencia artificial.',
            ],
          },
        ],
      },
      {
        heading: '2. Uso de la información',
        blocks: [
          { type: 'p', text: 'La información recopilada se utiliza para:' },
          {
            type: 'ul',
            items: [
              'Proporcionar nuestros servicios.',
              'Automatizar respuestas mediante inteligencia artificial.',
              'Gestionar conversaciones con clientes.',
              'Mejorar la calidad del servicio.',
              'Brindar soporte técnico.',
              'Cumplir obligaciones legales.',
              'Detectar fraudes y actividades no autorizadas.',
            ],
          },
        ],
      },
      {
        heading: '3. Integraciones con terceros',
        blocks: [
          { type: 'p', text: 'Nuestro servicio puede utilizar plataformas de terceros, incluyendo:' },
          {
            type: 'ul',
            items: [
              'Meta WhatsApp Business Platform',
              'OpenAI u otros proveedores de inteligencia artificial',
              'Servicios de almacenamiento en la nube',
              'Procesadores de pago',
            ],
          },
          {
            type: 'p',
            text: 'Cada proveedor administra sus propios datos conforme a sus políticas de privacidad.',
          },
        ],
      },
      {
        heading: '4. Seguridad',
        blocks: [
          {
            type: 'p',
            text: 'Aplicamos medidas técnicas y organizativas para proteger la información contra acceso no autorizado, pérdida o alteración.',
          },
        ],
      },
      {
        heading: '5. Conservación de datos',
        blocks: [
          {
            type: 'p',
            text: 'Conservamos la información únicamente durante el tiempo necesario para prestar nuestros servicios o cumplir obligaciones legales.',
          },
        ],
      },
      {
        heading: '6. Derechos del usuario',
        blocks: [
          { type: 'p', text: 'Los usuarios pueden solicitar:' },
          {
            type: 'ul',
            items: [
              'Acceso a sus datos.',
              'Corrección de información.',
              'Eliminación de datos.',
              'Restricción del tratamiento.',
              'Exportación de su información cuando sea aplicable.',
            ],
          },
        ],
      },
      {
        heading: '7. Eliminación de datos',
        blocks: [
          {
            type: 'p',
            text: 'Los usuarios pueden solicitar la eliminación de su información contactándonos mediante nuestros canales oficiales.',
          },
        ],
      },
      {
        heading: '8. Cambios',
        blocks: [
          {
            type: 'p',
            text: 'Podremos actualizar esta política cuando sea necesario. Las modificaciones serán publicadas en esta página.',
          },
        ],
      },
      {
        heading: '9. Contacto',
        blocks: [{ type: 'p', text: `Correo electrónico: ${CONTACT_EMAIL}` }],
      },
    ],
  },
  'terms-of-service': {
    title: 'Términos y Condiciones',
    updated: '16 de julio de 2026',
    sections: [
      {
        heading: 'Términos del Servicio',
        blocks: [{ type: 'p', text: 'Al utilizar LunaMarket, aceptas los siguientes términos.' }],
      },
      {
        heading: 'Servicio',
        blocks: [
          {
            type: 'p',
            text: 'LunaMarket proporciona herramientas para automatizar conversaciones mediante WhatsApp Business Platform e inteligencia artificial.',
          },
        ],
      },
      {
        heading: 'Responsabilidad del usuario',
        blocks: [
          { type: 'p', text: 'El usuario se compromete a:' },
          {
            type: 'ul',
            items: [
              'Cumplir las políticas de Meta.',
              'No utilizar el servicio para spam.',
              'No enviar contenido ilegal.',
              'No realizar actividades fraudulentas.',
              'Obtener el consentimiento cuando la legislación lo requiera.',
            ],
          },
        ],
      },
      {
        heading: 'Propiedad intelectual',
        blocks: [{ type: 'p', text: 'Todo el software, diseños y contenido pertenecen a LunaMarket.' }],
      },
      {
        heading: 'Disponibilidad',
        blocks: [
          {
            type: 'p',
            text: 'No garantizamos disponibilidad continua del servicio, aunque trabajamos para mantener una alta disponibilidad.',
          },
        ],
      },
      {
        heading: 'Suspensión',
        blocks: [
          {
            type: 'p',
            text: 'Podremos suspender cuentas que incumplan estos términos o las políticas de Meta.',
          },
        ],
      },
      {
        heading: 'Limitación de responsabilidad',
        blocks: [
          { type: 'p', text: 'No somos responsables por daños indirectos derivados del uso del servicio.' },
        ],
      },
      {
        heading: 'Modificaciones',
        blocks: [{ type: 'p', text: 'Podremos modificar estos términos cuando sea necesario.' }],
      },
      {
        heading: 'Legislación aplicable',
        blocks: [
          {
            type: 'p',
            text: 'Estos términos se regirán por la legislación aplicable del país donde opere la empresa propietaria del servicio.',
          },
        ],
      },
      {
        heading: 'Contacto',
        blocks: [{ type: 'p', text: `Correo electrónico: ${CONTACT_EMAIL}` }],
      },
    ],
  },
  'data-deletion': {
    title: 'Eliminación de Datos',
    updated: '16 de julio de 2026',
    sections: [
      {
        heading: 'Solicitud de Eliminación de Datos',
        blocks: [
          {
            type: 'p',
            text: 'Los usuarios pueden solicitar la eliminación de su información personal enviando una solicitud a:',
          },
          { type: 'p', text: CONTACT_EMAIL },
          { type: 'p', text: 'La solicitud debe incluir:' },
          {
            type: 'ul',
            items: ['Nombre.', 'Correo electrónico registrado.', 'Número de teléfono asociado.'],
          },
          {
            type: 'p',
            text: 'Una vez verificada la identidad, eliminaremos la información correspondiente dentro de un plazo razonable, salvo que debamos conservar ciertos datos por obligaciones legales.',
          },
        ],
      },
      {
        heading: 'Preguntas frecuentes',
        blocks: [
          {
            type: 'faq',
            items: [
              {
                q: '¿Qué datos se eliminan?',
                a: 'Conversaciones almacenadas. Información de perfil. Configuraciones. Historial relacionado con la cuenta.',
              },
              {
                q: '¿Qué datos podrían conservarse?',
                a: 'Únicamente aquellos requeridos por obligaciones legales o fiscales.',
              },
            ],
          },
        ],
      },
      {
        heading: 'Contacto',
        blocks: [{ type: 'p', text: `Correo electrónico: ${CONTACT_EMAIL}` }],
      },
    ],
  },
}

const doc = computed(() => docs[String(route.name)] ?? docs['privacy-policy'])
</script>

<template>
  <div class="legal-page">
    <button
      class="theme-toggle floating-theme"
      type="button"
      :aria-label="store.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
      @click="store.toggleTheme()"
    >
      {{ store.theme === 'dark' ? '☀' : '☾' }}
    </button>

    <article class="legal-card ml-rise">
      <div class="legal-top">
        <RouterLink class="back" to="/login">← Volver al login</RouterLink>
        <img class="logo" src="/brand/lunamarket-logo.png" alt="LunaMarket" width="48" height="48" />
      </div>

      <header>
        <h1>{{ doc.title }}</h1>
        <p>Última actualización: {{ doc.updated }}</p>
      </header>

      <nav class="legal-nav" aria-label="Documentos legales">
        <RouterLink to="/privacy-policy">Privacidad</RouterLink>
        <RouterLink to="/terms-of-service">Términos</RouterLink>
        <RouterLink to="/data-deletion">Eliminación de datos</RouterLink>
      </nav>

      <section v-for="(section, i) in doc.sections" :key="i" class="block">
        <h2>{{ section.heading }}</h2>
        <div v-for="(block, bi) in section.blocks" :key="bi" class="block-item">
          <p v-if="block.type === 'p'">{{ block.text }}</p>
          <ul v-else-if="block.type === 'ul'">
            <li v-for="(item, ii) in block.items" :key="ii">{{ item }}</li>
          </ul>
          <div v-else-if="block.type === 'faq'" class="faq">
            <div v-for="(item, fi) in block.items" :key="fi" class="faq-item">
              <h3>{{ item.q }}</h3>
              <p>{{ item.a }}</p>
            </div>
          </div>
        </div>
      </section>

      <p class="footer-mail">
        Contacto:
        <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
      </p>
    </article>
  </div>
</template>

<style scoped>
.legal-page {
  min-height: 100vh;
  padding: 1.5rem;
  background: var(--ml-bg);
}

.floating-theme {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 5;
}

.legal-card {
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 2rem 1.75rem 2.2rem;
  border-radius: 24px;
  background: var(--ml-card);
  border: 1px solid var(--ml-line);
  box-shadow: var(--ml-shadow);
}

.legal-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.back {
  color: var(--ml-c5);
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
}

.logo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

header {
  margin-bottom: 1rem;
}

header h1 {
  font-size: 1.65rem;
  color: var(--ml-wine-deep);
  margin: 0 0 0.35rem;
}

header p {
  margin: 0;
  color: var(--ml-muted);
  font-size: 0.9rem;
}

.legal-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.1rem;
  margin-bottom: 1.6rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--ml-line);
}

.legal-nav a {
  color: var(--ml-muted);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
}

.legal-nav a.router-link-active {
  color: var(--ml-c5);
}

.block {
  margin-bottom: 1.35rem;
}

.block h2 {
  font-size: 1.05rem;
  color: var(--ml-wine-deep);
  margin: 0 0 0.55rem;
}

.block p,
.block li {
  color: var(--ml-ink);
  font-size: 0.94rem;
  line-height: 1.6;
}

.block p {
  margin: 0 0 0.55rem;
}

.block ul {
  margin: 0.35rem 0 0.75rem;
  padding-left: 1.2rem;
}

.block li {
  margin-bottom: 0.28rem;
}

.faq-item {
  margin-bottom: 0.85rem;
}

.faq-item h3 {
  font-size: 0.95rem;
  margin: 0 0 0.25rem;
  color: var(--ml-wine-deep);
}

.footer-mail {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--ml-line);
  color: var(--ml-muted);
  font-size: 0.9rem;
}

.footer-mail a {
  color: var(--ml-c5);
  font-weight: 700;
}
</style>
