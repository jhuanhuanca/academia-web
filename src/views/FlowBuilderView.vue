<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api/client'

type NodeType =
  | 'start'
  | 'message'
  | 'buttons'
  | 'ai_reply'
  | 'send_payment_qr'
  | 'wait_payment'
  | 'deliver_course'
  | 'handoff'

interface FlowNode {
  id: string
  type: NodeType
  name: string
  x: number
  y: number
  config: Record<string, unknown>
}

interface FlowEdge {
  id: string
  from: string
  to: string
  trigger_type: string
  trigger_key: string
}

interface CourseOption {
  id: number
  title: string
}

interface FlowSummary {
  id: number
  name: string
  status: string
  is_default: boolean
  description?: string | null
}

type FlowTemplate = 'blank' | 'venta'

const LAST_FLOW_KEY = 'marketluna:lastFlowId'
const NODE_W = 158
const NODE_H = 62

const store = useAppStore()

const flows = ref<FlowSummary[]>([])
const flowId = ref<number | null>(null)
const flowName = ref('Flujo')
const flowStatus = ref('draft')
const flowDescription = ref('')
const courses = ref<CourseOption[]>([])

const nodes = ref<FlowNode[]>([])
const edges = ref<FlowEdge[]>([])
const selectedId = ref<string | null>(null)

const loadingFlow = ref(false)
const createModalOpen = ref(false)
const isDirty = ref(false)
let skipDirtyWatch = false

const newFlowForm = ref({
  name: '',
  description: '',
  is_default: false,
  template: 'venta' as FlowTemplate,
})

const saving = ref(false)
const saved = ref(false)
const saveError = ref('')
const published = ref(false)
const previewOpen = ref(true)
const previewBusy = ref(false)
const previewError = ref('')

const dragId = ref<string | null>(null)
const offset = ref({ x: 0, y: 0 })
const canvasRef = ref<HTMLElement | null>(null)
const zoom = ref(0.82)

const palette: { type: NodeType; label: string; hint: string }[] = [
  { type: 'message', label: 'Mensaje', hint: 'Texto fijo' },
  { type: 'buttons', label: 'Botones', hint: 'Menú interactivo' },
  { type: 'ai_reply', label: 'Luna IA', hint: 'Respuesta con knowledge' },
  { type: 'send_payment_qr', label: 'QR cobro', hint: 'Generar pago' },
  { type: 'wait_payment', label: 'Esperar pago', hint: 'Validar cobro' },
  { type: 'deliver_course', label: 'Entregar', hint: 'Enviar curso' },
  { type: 'handoff', label: 'Humano', hint: 'Derivar agente' },
]

const triggerTypeOptions = [
  { value: 'default', label: 'Default (siguiente)' },
  { value: 'button', label: 'Botón tocado' },
  { value: 'list', label: 'Lista (row)' },
  { value: 'ai_transition', label: 'Transición Luna' },
  { value: 'payment_paid', label: 'Pago confirmado' },
  { value: 'payment_expired', label: 'Pago expirado' },
  { value: 'payment_failed', label: 'Pago fallido' },
  { value: 'condition_true', label: 'Condición true' },
  { value: 'condition_false', label: 'Condición false' },
  { value: 'timeout', label: 'Timeout' },
]

const typeColor: Record<NodeType, string> = {
  start: 'var(--ml-ember)',
  message: 'var(--ml-wine)',
  buttons: 'var(--ml-sky)',
  ai_reply: '#069991',
  send_payment_qr: 'var(--ml-ember)',
  wait_payment: '#8a5a00',
  deliver_course: '#067a76',
  handoff: '#5c0500',
}

const selected = computed(() => nodes.value.find((n) => n.id === selectedId.value) || null)

const outgoingEdges = computed(() => {
  if (!selected.value) return []
  return edges.value.filter((e) => e.from === selected.value!.id)
})

const nodeOptions = computed(() =>
  nodes.value
    .filter((n) => n.id !== selectedId.value)
    .map((n) => ({ value: n.id, label: `${n.name} (${n.type})` })),
)

const canvasBounds = computed(() => {
  const pad = 40
  if (!nodes.value.length) {
    return { width: 560, height: 360 }
  }
  const maxX = Math.max(...nodes.value.map((n) => n.x + NODE_W)) + pad
  const maxY = Math.max(...nodes.value.map((n) => n.y + NODE_H)) + pad
  return {
    width: Math.max(480, maxX),
    height: Math.max(320, maxY),
  }
})

const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)

const previewMessages = ref([
  { from: 'luna', text: 'Preview del flujo. Guarda y publica para WhatsApp real.' },
])

const newEdge = ref({
  to: '',
  trigger_type: 'default',
  trigger_key: '',
})

function defaultConfig(type: NodeType, courseId?: number): Record<string, unknown> {
  switch (type) {
    case 'message':
      return { text: 'Escribe el mensaje de Luna…' }
    case 'buttons':
      return {
        text: '¿Qué te interesa?',
        footer: 'MarketLuna',
        buttons: [{ id: 'opt1', label: 'Opción 1' }],
      }
    case 'ai_reply':
      return {
        system_hint: 'Sé breve. Solo usa knowledge autorizado.',
        knowledge_tags: ['precios', 'contenido'],
        min_confidence: 0.65,
        fallback_transition: 'human',
      }
    case 'send_payment_qr':
      return {
        course_id: courseId ?? courses.value[0]?.id ?? null,
        provider: 'manual_qr',
        ttl_minutes: 60,
        caption: 'Escanea el QR para pagar.',
      }
    case 'wait_payment':
      return { timeout_minutes: 60 }
    case 'deliver_course':
      return {
        course_id: courseId ?? courses.value[0]?.id ?? null,
        success_text: '¡Pago confirmado! Aquí tienes tu acceso.',
      }
    case 'handoff':
      return { text: 'Te derivo con una persona del equipo.' }
    default:
      return {}
  }
}

function ensureNodeConfig(node: FlowNode) {
  const defaults = defaultConfig(node.type)
  for (const [k, v] of Object.entries(defaults)) {
    if (node.config[k] === undefined) node.config[k] = v
  }
}

function nodeCenter(id: string) {
  const n = nodes.value.find((x) => x.id === id)
  if (!n) return { x: 0, y: 0 }
  return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 }
}

function fitToView() {
  const el = canvasRef.value
  if (!el) return
  const vw = Math.max(200, el.clientWidth - 12)
  const vh = Math.max(200, el.clientHeight - 12)
  const { width, height } = canvasBounds.value
  zoom.value = Math.min(1, (vw / width) * 0.96, (vh / height) * 0.96)
}

function zoomIn() {
  zoom.value = Math.min(1.25, Math.round((zoom.value + 0.08) * 100) / 100)
}

function zoomOut() {
  zoom.value = Math.max(0.45, Math.round((zoom.value - 0.08) * 100) / 100)
}

function edgePath(edge: FlowEdge) {
  const a = nodeCenter(edge.from)
  const b = nodeCenter(edge.to)
  const mid = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`
}

function edgeLabel(edge: FlowEdge) {
  if (edge.trigger_key) return edge.trigger_key
  if (edge.trigger_type !== 'default') return edge.trigger_type
  return ''
}

function selectNode(id: string) {
  selectedId.value = id
  const node = nodes.value.find((n) => n.id === id)
  if (node) ensureNodeConfig(node)
}

function onPointerDown(event: PointerEvent, id: string) {
  if ((event.target as HTMLElement).closest('.node-action')) return
  const node = nodes.value.find((n) => n.id === id)
  const canvasEl = canvasRef.value
  if (!node || !canvasEl) return
  dragId.value = id
  selectNode(id)
  const canvasRect = canvasEl.getBoundingClientRect()
  const scrollLeft = canvasEl.scrollLeft
  const scrollTop = canvasEl.scrollTop
  const z = zoom.value
  offset.value = {
    x: event.clientX - canvasRect.left + scrollLeft - node.x * z,
    y: event.clientY - canvasRect.top + scrollTop - node.y * z,
  }
  ;(event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragId.value) return
  const node = nodes.value.find((n) => n.id === dragId.value)
  const canvasEl = canvasRef.value
  if (!node || !canvasEl) return
  const canvasRect = canvasEl.getBoundingClientRect()
  const scrollLeft = canvasEl.scrollLeft
  const scrollTop = canvasEl.scrollTop
  const z = zoom.value
  node.x = Math.max(8, (event.clientX - canvasRect.left + scrollLeft - offset.value.x) / z)
  node.y = Math.max(8, (event.clientY - canvasRect.top + scrollTop - offset.value.y) / z)
}

function onPointerUp() {
  dragId.value = null
}

function slugKey(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}`
}

function addNode(type: NodeType) {
  const id = slugKey(type)
  const node: FlowNode = {
    id,
    type,
    name: palette.find((p) => p.type === type)?.label || type,
    x: 200 + Math.random() * 200,
    y: 80 + Math.random() * 220,
    config: defaultConfig(type),
  }
  nodes.value.push(node)
  selectNode(id)
}

function deleteSelectedNode() {
  if (!selected.value || selected.value.type === 'start') return
  const id = selected.value.id
  nodes.value = nodes.value.filter((n) => n.id !== id)
  edges.value = edges.value.filter((e) => e.from !== id && e.to !== id)
  selectedId.value = nodes.value[0]?.id ?? null
}

function addButton() {
  if (!selected.value || selected.value.type !== 'buttons') return
  const buttons = (selected.value.config.buttons as { id: string; label: string }[]) || []
  const n = buttons.length + 1
  buttons.push({ id: `btn_${n}`, label: `Opción ${n}` })
  selected.value.config.buttons = buttons
}

function removeButton(index: number) {
  if (!selected.value || selected.value.type !== 'buttons') return
  const buttons = (selected.value.config.buttons as { id: string; label: string }[]) || []
  const removed = buttons.splice(index, 1)[0]
  selected.value.config.buttons = buttons
  if (removed?.id) {
    edges.value = edges.value.filter(
      (e) => !(e.from === selected.value!.id && e.trigger_key === removed.id),
    )
  }
}

function updateButton(index: number, field: 'id' | 'label', value: string) {
  if (!selected.value || selected.value.type !== 'buttons') return
  const buttons = (selected.value.config.buttons as { id: string; label: string }[]) || []
  if (!buttons[index]) return
  const oldId = buttons[index].id
  buttons[index][field] = value
  if (field === 'id' && oldId !== value) {
    edges.value.forEach((e) => {
      if (e.from === selected.value!.id && e.trigger_key === oldId) {
        e.trigger_key = value
      }
    })
  }
}

function addEdge() {
  if (!selected.value || !newEdge.value.to) return
  const from = selected.value.id
  const key = newEdge.value.trigger_key || ''
  edges.value = edges.value.filter(
    (e) =>
      !(
        e.from === from &&
        e.trigger_type === newEdge.value.trigger_type &&
        e.trigger_key === key
      ),
  )
  edges.value.push({
    id: slugKey('edge'),
    from,
    to: newEdge.value.to,
    trigger_type: newEdge.value.trigger_type,
    trigger_key: key,
  })
  newEdge.value = { to: '', trigger_type: 'default', trigger_key: '' }
}

function connectButtonTo(buttonId: string, targetId: string) {
  if (!selected.value || !targetId) return
  edges.value = edges.value.filter(
    (e) => !(e.from === selected.value!.id && e.trigger_key === buttonId && e.trigger_type === 'button'),
  )
  edges.value.push({
    id: slugKey('edge'),
    from: selected.value.id,
    to: targetId,
    trigger_type: 'button',
    trigger_key: buttonId,
  })
}

function removeEdge(edgeId: string) {
  edges.value = edges.value.filter((e) => e.id !== edgeId)
}

function getButtonTarget(buttonId: string): string {
  const edge = edges.value.find(
    (e) => e.from === selectedId.value && e.trigger_type === 'button' && e.trigger_key === buttonId,
  )
  return edge?.to || ''
}

function getNodeButtons(node: FlowNode) {
  return (node.config.buttons as { id: string; label: string }[]) || []
}

function onButtonLabelInput(index: number, event: Event) {
  updateButton(index, 'label', (event.target as HTMLInputElement).value)
}

function onButtonIdInput(index: number, event: Event) {
  updateButton(index, 'id', (event.target as HTMLInputElement).value)
}

function onButtonTargetChange(buttonId: string, event: Event) {
  connectButtonTo(buttonId, (event.target as HTMLSelectElement).value)
}

function onTagsInput(event: Event) {
  if (!selected.value) return
  selected.value.config.knowledge_tags = stringToTags((event.target as HTMLInputElement).value)
}

function nodePreviewText(node: FlowNode) {
  const text = node.config.text
  if (!text || typeof text !== 'string') return ''
  return text.length > 36 ? `${text.slice(0, 36)}…` : text
}

async function afterGraphLoaded() {
  await nextTick()
  fitToView()
}

function tagsToString(tags: unknown): string {
  if (Array.isArray(tags)) return tags.join(', ')
  return ''
}

function stringToTags(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function buildSavePayload() {
  const start = nodes.value.find((n) => n.type === 'start')
  return {
    start_node_key: start?.id ?? null,
    nodes: nodes.value.map((n) => ({
      node_key: n.id,
      type: n.type,
      name: n.name,
      config: n.config,
      position_x: Math.round(n.x),
      position_y: Math.round(n.y),
    })),
    edges: edges.value.map((e) => ({
      from_node_key: e.from,
      to_node_key: e.to,
      trigger_type: e.trigger_type,
      trigger_key: e.trigger_key || '',
      priority: 0,
    })),
  }
}

function starterGraph(template: FlowTemplate): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (template === 'blank') {
    return {
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Inicio',
          x: 80,
          y: 200,
          config: {},
        },
      ],
      edges: [],
    }
  }

  return {
    nodes: [
      { id: 'start', type: 'start', name: 'Inicio', x: 60, y: 200, config: {} },
      {
        id: 'welcome',
        type: 'message',
        name: 'Bienvenida',
        x: 280,
        y: 200,
        config: {
          text: '¡Hola! Soy Luna, tu asistente de ventas. ¿En qué te ayudo hoy?',
        },
      },
      {
        id: 'menu',
        type: 'buttons',
        name: 'Menú principal',
        x: 520,
        y: 200,
        config: {
          text: 'Elige una opción:',
          footer: 'MarketLuna',
          buttons: [
            { id: 'buy', label: 'Comprar curso' },
            { id: 'price', label: 'Ver precio' },
            { id: 'human', label: 'Hablar con humano' },
          ],
        },
      },
      {
        id: 'ai_price',
        type: 'ai_reply',
        name: 'Luna precios',
        x: 780,
        y: 80,
        config: defaultConfig('ai_reply'),
      },
      {
        id: 'handoff',
        type: 'handoff',
        name: 'Agente humano',
        x: 780,
        y: 320,
        config: defaultConfig('handoff'),
      },
    ],
    edges: [
      { id: 'e_start_welcome', from: 'start', to: 'welcome', trigger_type: 'default', trigger_key: '' },
      { id: 'e_welcome_menu', from: 'welcome', to: 'menu', trigger_type: 'default', trigger_key: '' },
      { id: 'e_menu_price', from: 'menu', to: 'ai_price', trigger_type: 'button', trigger_key: 'price' },
      { id: 'e_menu_human', from: 'menu', to: 'handoff', trigger_type: 'button', trigger_key: 'human' },
    ],
  }
}

function applyGraphLocally(graphNodes: FlowNode[], graphEdges: FlowEdge[]) {
  skipDirtyWatch = true
  nodes.value = graphNodes
  edges.value = graphEdges
  selectedId.value = graphNodes.find((n) => n.type === 'start')?.id ?? graphNodes[0]?.id ?? null
  isDirty.value = false
  skipDirtyWatch = false
}

function openCreateModal() {
  const n = flows.value.length + 1
  newFlowForm.value = {
    name: `Flujo ${n}`,
    description: '',
    is_default: flows.value.length === 0,
    template: 'venta',
  }
  createModalOpen.value = true
}

function closeCreateModal() {
  createModalOpen.value = false
}

async function loadCourses() {
  try {
    const res = await api<{ data: CourseOption[] }>('/courses')
    courses.value = res.data.map((c) => ({ id: c.id, title: c.title }))
  } catch {
    courses.value = []
  }
}

async function loadFlowList() {
  const res = await api<{ data: FlowSummary[] }>('/flows')
  flows.value = res.data
}

async function loadFlowGraph(id: number) {
  loadingFlow.value = true
  saveError.value = ''
  try {
    const graph = await api<{
      data: {
        flow: { id: number; name: string; status: string; description?: string | null }
        nodes: Array<{
          id: number
          node_key: string
          type: NodeType
          name: string
          config: Record<string, unknown>
          position_x: number
          position_y: number
        }>
        edges: Array<{
          id: number
          from_node_id: number
          to_node_id: number
          trigger_type: string
          trigger_key: string
        }>
      }
    }>(`/flows/${id}`)

    const idByKey = new Map<number, string>()
    const graphNodes = graph.data.nodes.map((n) => {
      idByKey.set(n.id, n.node_key)
      return {
        id: n.node_key,
        type: n.type,
        name: n.name,
        x: n.position_x ?? 40,
        y: n.position_y ?? 40,
        config: n.config ?? {},
      }
    })

    const graphEdges = graph.data.edges.map((e) => ({
      id: `e${e.id}`,
      from: idByKey.get(e.from_node_id) || '',
      to: idByKey.get(e.to_node_id) || '',
      trigger_type: e.trigger_type,
      trigger_key: e.trigger_key || '',
    }))

    flowId.value = id
    flowName.value = graph.data.flow.name
    flowStatus.value = graph.data.flow.status
    flowDescription.value = graph.data.flow.description || ''
    applyGraphLocally(graphNodes, graphEdges)
    sessionStorage.setItem(LAST_FLOW_KEY, String(id))
    previewMessages.value = [
      { from: 'luna', text: `Editando "${graph.data.flow.name}". Guarda y publica para WhatsApp.` },
    ]
    await afterGraphLoaded()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo cargar el flujo'
  } finally {
    loadingFlow.value = false
  }
}

async function initFlows() {
  await loadFlowList()
  if (flows.value.length === 0) {
    openCreateModal()
    return
  }

  const lastId = Number(sessionStorage.getItem(LAST_FLOW_KEY))
  const target =
    flows.value.find((f) => f.id === lastId) ||
    flows.value.find((f) => f.is_default) ||
    flows.value[0]

  if (target) await loadFlowGraph(target.id)
}

async function switchFlow(id: number) {
  if (id === flowId.value) return
  if (isDirty.value && !window.confirm('Tienes cambios sin guardar. ¿Cambiar de flujo igualmente?')) {
    return
  }
  await loadFlowGraph(id)
}

function onFlowSelectChange(event: Event) {
  const id = Number((event.target as HTMLSelectElement).value)
  if (!id) return
  void switchFlow(id)
}

async function createFlow() {
  const name = newFlowForm.value.name.trim()
  if (!name) {
    saveError.value = 'El nombre del flujo es obligatorio'
    return
  }

  saving.value = true
  saveError.value = ''
  try {
    const created = await api<{ data: FlowSummary }>('/flows', {
      method: 'POST',
      body: {
        name,
        description: newFlowForm.value.description.trim() || null,
        is_default: newFlowForm.value.is_default,
      },
    })

    const template = starterGraph(newFlowForm.value.template)
    flowId.value = created.data.id
    flowName.value = created.data.name
    flowStatus.value = created.data.status
    flowDescription.value = created.data.description || ''
    applyGraphLocally(template.nodes, template.edges)

    await api(`/flows/${created.data.id}/graph`, {
      method: 'PUT',
      body: buildSavePayload(),
    })

    await loadFlowList()
    sessionStorage.setItem(LAST_FLOW_KEY, String(created.data.id))
    createModalOpen.value = false
    saved.value = true
    setTimeout(() => (saved.value = false), 2500)
    await afterGraphLoaded()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo crear el flujo'
  } finally {
    saving.value = false
  }
}

async function renameFlow() {
  if (!flowId.value) return
  const name = flowName.value.trim()
  if (!name) return

  const current = flows.value.find((f) => f.id === flowId.value)
  if (current?.name === name) return

  try {
    await api(`/flows/${flowId.value}`, {
      method: 'PUT',
      body: { name },
    })
    await loadFlowList()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo renombrar'
  }
}

async function saveDraft() {
  if (!flowId.value) return
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    await api(`/flows/${flowId.value}/graph`, {
      method: 'PUT',
      body: buildSavePayload(),
    })
    flowStatus.value = 'draft'
    isDirty.value = false
    saved.value = true
    await loadFlowList()
    setTimeout(() => (saved.value = false), 2500)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function publish() {
  if (!flowId.value) return
  saving.value = true
  saveError.value = ''
  try {
    await api(`/flows/${flowId.value}/graph`, {
      method: 'PUT',
      body: buildSavePayload(),
    })
    await api(`/flows/${flowId.value}/publish`, { method: 'POST' })
    flowStatus.value = 'published'
    isDirty.value = false
    published.value = true
    await loadFlowList()
    await store.refreshDashboardFlags()
    store.nextOnboarding()
    setTimeout(() => (published.value = false), 2500)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Error al publicar'
  } finally {
    saving.value = false
  }
}

async function askLuna(message: string) {
  if (!flowId.value) return
  previewBusy.value = true
  previewError.value = ''
  previewMessages.value.push({ from: 'user', text: message })
  try {
    const res = await api<{
      data: { luna: { reply_text: string } }
    }>(`/flows/${flowId.value}/preview`, {
      method: 'POST',
      body: { message },
    })
    previewMessages.value.push({ from: 'luna', text: res.data.luna.reply_text })
  } catch (e) {
    previewError.value = e instanceof Error ? e.message : 'Luna no respondió'
    previewMessages.value.push({ from: 'luna', text: 'No pude consultar Luna ahora.' })
  } finally {
    previewBusy.value = false
  }
}

function simulateButton(label: string) {
  if (label.toLowerCase().includes('precio')) {
    void askLuna('¿Cuánto cuesta el curso?')
    return
  }
  previewMessages.value.push({ from: 'user', text: label })
  previewMessages.value.push({ from: 'luna', text: 'Respuesta simulada del flujo.' })
}

onMounted(async () => {
  await loadCourses()
  await initFlows()
})

watch(
  [nodes, edges],
  () => {
    if (!skipDirtyWatch && flowId.value) isDirty.value = true
  },
  { deep: true },
)
</script>

<template>
  <div class="builder">
  <aside class="ml-card palette ml-rise">
    <h2>Nodos</h2>
    <p class="hint">Clic para agregar al lienzo. Luego configura en el inspector →</p>
    <button
      v-for="item in palette"
      :key="item.type"
      class="palette-item"
      type="button"
      @click="addNode(item.type)"
    >
      <strong>{{ item.label }}</strong>
      <span>{{ item.hint }}</span>
    </button>
    <p class="hint tip-box">El nodo <strong>start</strong> ya existe y no se puede borrar.</p>
  </aside>

  <section class="canvas-wrap ml-card ml-rise ml-rise-delay-1">
    <header class="toolbar">
      <div class="toolbar-main">
        <div class="flow-bar">
          <label class="flow-select-wrap">
            <span class="ml-label">Flujo activo</span>
            <select
              class="ml-select"
              :value="flowId ?? ''"
              :disabled="loadingFlow || !flows.length"
              @change="onFlowSelectChange"
            >
              <option v-if="!flows.length" value="">Sin flujos</option>
              <option v-for="f in flows" :key="f.id" :value="f.id">
                {{ f.name }} · {{ f.status }}{{ f.is_default ? ' ★' : '' }}
              </option>
            </select>
          </label>
          <button class="ml-btn ml-btn-sky" type="button" @click="openCreateModal">+ Nuevo flujo</button>
        </div>
        <div class="title-row">
          <input
            v-model="flowName"
            class="ml-input flow-name"
            placeholder="Nombre del flujo"
            @blur="renameFlow"
          />
          <span class="ml-badge" :class="flowStatus === 'published' ? 'ml-badge-ok' : 'ml-badge-warn'">
            {{ flowStatus }}
          </span>
          <span v-if="isDirty" class="ml-badge dirty-badge">sin guardar</span>
        </div>
        <p class="toolbar-hint">
          Arrastra nodos · Inspector a la derecha
          <template v-if="loadingFlow"> · Cargando…</template>
        </p>
      </div>
      <div class="toolbar-actions">
        <div class="zoom-controls">
          <button class="ml-btn ml-btn-ghost zoom-btn" type="button" title="Alejar" @click="zoomOut">−</button>
          <span class="zoom-label">{{ zoomLabel }}</span>
          <button class="ml-btn ml-btn-ghost zoom-btn" type="button" title="Acercar" @click="zoomIn">+</button>
          <button class="ml-btn ml-btn-ghost zoom-fit" type="button" @click="fitToView">Ajustar</button>
        </div>
        <button class="ml-btn ml-btn-secondary btn-compact" type="button" :disabled="saving || !flowId" @click="saveDraft">
          {{ saving ? 'Guardando…' : 'Guardar' }}
        </button>
        <button class="ml-btn ml-btn-secondary btn-compact" type="button" @click="previewOpen = !previewOpen">
          {{ previewOpen ? 'Ocultar' : 'Preview' }}
        </button>
        <button class="ml-btn ml-btn-primary btn-compact" type="button" :disabled="saving || !flowId" @click="publish">
          Publicar
        </button>
      </div>
    </header>

    <div
      ref="canvasRef"
      class="canvas"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @click.self="selectedId = null"
    >
      <div
        class="canvas-scaler"
        :style="{
          width: `${canvasBounds.width * zoom}px`,
          height: `${canvasBounds.height * zoom}px`,
        }"
      >
        <div
          class="canvas-stage"
          :style="{
            width: `${canvasBounds.width}px`,
            height: `${canvasBounds.height}px`,
            transform: `scale(${zoom})`,
          }"
        >
        <svg
          class="edges"
          :width="canvasBounds.width"
          :height="canvasBounds.height"
          aria-hidden="true"
        >
          <g v-for="edge in edges" :key="edge.id">
            <path :d="edgePath(edge)" class="edge" />
            <text
              v-if="edgeLabel(edge)"
              :x="(nodeCenter(edge.from).x + nodeCenter(edge.to).x) / 2"
              :y="(nodeCenter(edge.from).y + nodeCenter(edge.to).y) / 2 - 4"
              class="edge-label"
            >
              {{ edgeLabel(edge) }}
            </text>
          </g>
        </svg>

        <article
          v-for="node in nodes"
          :key="node.id"
          class="node"
          :class="{ selected: node.id === selectedId }"
          :style="{
            transform: `translate(${node.x}px, ${node.y}px)`,
            borderColor: typeColor[node.type],
          }"
          @pointerdown="onPointerDown($event, node.id)"
          @click.stop="selectNode(node.id)"
        >
          <span class="dot" :style="{ background: typeColor[node.type] }"></span>
          <strong>{{ node.name }}</strong>
          <small>{{ node.type }}</small>
          <div v-if="node.type === 'buttons'" class="mini-btns">
            <span v-for="b in getNodeButtons(node)" :key="b.id">
              {{ b.label }}
            </span>
          </div>
          <p v-if="nodePreviewText(node)" class="mini-text">{{ nodePreviewText(node) }}</p>
        </article>
        </div>
      </div>
    </div>

    <p v-if="saved" class="status-ok">✓ Borrador guardado en la API</p>
    <p v-if="published" class="status-ok">✓ Flujo publicado — WhatsApp usará esta versión</p>
    <p v-if="saveError" class="status-err">{{ saveError }}</p>
  </section>

  <div v-if="createModalOpen" class="modal-backdrop" @click.self="closeCreateModal">
    <section class="ml-card modal">
      <header class="modal-head">
        <h2>Crear flujo</h2>
        <button class="ml-btn ml-btn-ghost" type="button" @click="closeCreateModal">×</button>
      </header>
      <p class="hint">Define el nombre y elige una plantilla inicial. Luego podrás editarlo en el lienzo.</p>

      <label>
        <span class="ml-label">Nombre</span>
        <input v-model="newFlowForm.name" class="ml-input" placeholder="Ej: Venta curso verano" />
      </label>

      <label>
        <span class="ml-label">Descripción (opcional)</span>
        <input v-model="newFlowForm.description" class="ml-input" placeholder="Para qué sirve este flujo" />
      </label>

      <label>
        <span class="ml-label">Plantilla inicial</span>
        <select v-model="newFlowForm.template" class="ml-select">
          <option value="venta">Venta básica (bienvenida + menú + Luna)</option>
          <option value="blank">En blanco (solo nodo start)</option>
        </select>
      </label>

      <label class="check-row">
        <input v-model="newFlowForm.is_default" type="checkbox" />
        <span>Usar como flujo por defecto en WhatsApp</span>
      </label>

      <div class="modal-actions">
        <button class="ml-btn ml-btn-secondary" type="button" @click="closeCreateModal">Cancelar</button>
        <button class="ml-btn ml-btn-primary" type="button" :disabled="saving" @click="createFlow">
          {{ saving ? 'Creando…' : 'Crear y abrir' }}
        </button>
      </div>
    </section>
  </div>

  <aside class="side ml-rise ml-rise-delay-2">
    <section v-if="selected" class="ml-card inspector">
      <header class="inspector-head">
        <h2>Inspector</h2>
        <button
          v-if="selected.type !== 'start'"
          class="ml-btn ml-btn-ghost node-action delete-btn"
          type="button"
          @click="deleteSelectedNode"
        >
          Eliminar
        </button>
      </header>
      <p class="meta">{{ selected.type }} · {{ selected.id }}</p>

      <label>
        <span class="ml-label">Nombre del nodo</span>
        <input v-model="selected.name" class="ml-input" />
      </label>

      <!-- MESSAGE / HANDOFF -->
      <label v-if="['message', 'handoff'].includes(selected.type)">
        <span class="ml-label">Texto del mensaje</span>
        <textarea v-model="selected.config.text" class="ml-textarea" rows="4" />
      </label>

      <!-- BUTTONS -->
      <template v-if="selected.type === 'buttons'">
        <label>
          <span class="ml-label">Texto del menú</span>
          <textarea v-model="selected.config.text" class="ml-textarea" rows="3" />
        </label>
        <label>
          <span class="ml-label">Footer</span>
          <input v-model="selected.config.footer" class="ml-input" />
        </label>
        <div class="buttons-edit">
          <div class="row-head">
            <span class="ml-label">Botones</span>
            <button class="ml-btn ml-btn-ghost node-action" type="button" @click="addButton">+ Botón</button>
          </div>
          <div v-for="(b, i) in getNodeButtons(selected)" :key="b.id" class="button-card">
            <input
              class="ml-input"
              placeholder="Etiqueta visible"
              :value="b.label"
              @input="onButtonLabelInput(i, $event)"
            />
            <input
              class="ml-input mono"
              placeholder="id (trigger)"
              :value="b.id"
              @input="onButtonIdInput(i, $event)"
            />
            <label class="inline-label">
              <span>Conectar a →</span>
              <select
                class="ml-select"
                :value="getButtonTarget(b.id)"
                @change="onButtonTargetChange(b.id, $event)"
              >
                <option value="">— elegir nodo —</option>
                <option v-for="opt in nodeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <button class="ml-btn ml-btn-ghost node-action" type="button" @click="removeButton(i)">
              Quitar
            </button>
          </div>
        </div>
      </template>

      <!-- AI REPLY -->
      <template v-if="selected.type === 'ai_reply'">
        <label>
          <span class="ml-label">Hint para Luna</span>
          <textarea v-model="selected.config.system_hint" class="ml-textarea" rows="2" />
        </label>
        <label>
          <span class="ml-label">Tags knowledge (coma)</span>
          <input
            class="ml-input"
            :value="tagsToString(selected.config.knowledge_tags)"
            @input="onTagsInput"
          />
        </label>
        <label>
          <span class="ml-label">Confianza mínima</span>
          <input v-model.number="selected.config.min_confidence" class="ml-input" type="number" min="0" max="1" step="0.05" />
        </label>
        <label>
          <span class="ml-label">Fallback si Luna duda</span>
          <input v-model="selected.config.fallback_transition" class="ml-input" placeholder="human" />
        </label>
      </template>

      <!-- PAYMENT QR -->
      <template v-if="selected.type === 'send_payment_qr'">
        <label>
          <span class="ml-label">Curso a cobrar</span>
          <select v-model="selected.config.course_id" class="ml-select">
            <option :value="null">— seleccionar —</option>
            <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </label>
        <label>
          <span class="ml-label">Caption del QR</span>
          <textarea v-model="selected.config.caption" class="ml-textarea" rows="2" />
        </label>
        <label>
          <span class="ml-label">TTL minutos</span>
          <input v-model.number="selected.config.ttl_minutes" class="ml-input" type="number" min="5" />
        </label>
      </template>

      <!-- WAIT PAYMENT -->
      <template v-if="selected.type === 'wait_payment'">
        <label>
          <span class="ml-label">Timeout (minutos)</span>
          <input v-model.number="selected.config.timeout_minutes" class="ml-input" type="number" min="5" />
        </label>
        <p class="hint">Conecta salidas: <code>payment_paid</code>, <code>payment_expired</code>, <code>payment_failed</code></p>
      </template>

      <!-- DELIVER -->
      <template v-if="selected.type === 'deliver_course'">
        <label>
          <span class="ml-label">Curso a entregar</span>
          <select v-model="selected.config.course_id" class="ml-select">
            <option :value="null">— seleccionar —</option>
            <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </label>
        <label>
          <span class="ml-label">Mensaje de éxito</span>
          <textarea v-model="selected.config.success_text" class="ml-textarea" rows="2" />
        </label>
      </template>

      <!-- EDGES -->
      <div class="edges-panel">
        <h3>Conexiones salientes</h3>
        <ul v-if="outgoingEdges.length" class="edge-list">
          <li v-for="edge in outgoingEdges" :key="edge.id">
            <span>
              <code>{{ edge.trigger_type }}</code>
              <template v-if="edge.trigger_key"> / {{ edge.trigger_key }}</template>
              → <strong>{{ edge.to }}</strong>
            </span>
            <button class="ml-btn ml-btn-ghost node-action" type="button" @click="removeEdge(edge.id)">×</button>
          </li>
        </ul>
        <p v-else class="hint">Sin conexiones. Agrega una abajo.</p>

        <div class="add-edge">
          <label>
            <span class="ml-label">Ir al nodo</span>
            <select v-model="newEdge.to" class="ml-select">
              <option value="">— destino —</option>
              <option v-for="opt in nodeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </label>
          <label>
            <span class="ml-label">Tipo trigger</span>
            <select v-model="newEdge.trigger_type" class="ml-select">
              <option v-for="t in triggerTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </label>
          <label>
            <span class="ml-label">Trigger key (botón / transición)</span>
            <input v-model="newEdge.trigger_key" class="ml-input" placeholder="buy, price, human…" />
          </label>
          <button class="ml-btn ml-btn-sky node-action" type="button" @click="addEdge">+ Agregar conexión</button>
        </div>
      </div>
    </section>

    <p v-else class="ml-card inspector empty-inspector">Selecciona un nodo en el lienzo para configurarlo.</p>

    <section v-if="previewOpen" class="ml-card preview">
      <h2>Preview Luna</h2>
      <div class="msgs">
        <div v-for="(m, i) in previewMessages" :key="i" class="bubble" :class="m.from">{{ m.text }}</div>
      </div>
      <div class="preview-actions">
        <button class="ml-btn ml-btn-sky" type="button" :disabled="previewBusy" @click="simulateButton('Ver precio')">
          Probar precio
        </button>
        <p v-if="previewError" class="status-err">{{ previewError }}</p>
      </div>
    </section>
  </aside>
  </div>
</template>

<style scoped>
.builder {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr) 268px;
  gap: 0.65rem;
  min-height: 0;
  max-width: 100%;
  overflow: hidden;
}
.palette,
.inspector,
.preview,
.empty-inspector {
  padding: 0.75rem;
}
.palette {
  display: grid;
  align-content: start;
  gap: 0.4rem;
}
.palette h2,
.inspector h2,
.preview h2,
.toolbar h2 {
  color: var(--ml-wine-deep);
  font-size: 0.95rem;
}
.hint {
  color: var(--ml-muted);
  font-size: 0.72rem;
  line-height: 1.35;
}
.tip-box {
  padding: 0.4rem;
  border-radius: 8px;
  background: rgba(134, 8, 0, 0.05);
}
.palette-item {
  text-align: left;
  border: 1px solid var(--ml-line);
  background: rgba(255, 251, 244, 0.8);
  border-radius: 10px;
  padding: 0.5rem 0.55rem;
  cursor: pointer;
}
.palette-item:hover {
  border-color: rgba(8, 140, 255, 0.45);
}
.palette-item strong {
  display: block;
  color: var(--ml-wine);
  font-size: 0.8rem;
}
.palette-item span {
  font-size: 0.68rem;
  color: var(--ml-muted);
}
.canvas-wrap {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 0.55rem;
  align-items: flex-start;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--ml-line);
  flex-wrap: wrap;
}
.toolbar-main {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  flex: 1;
}
.flow-bar {
  display: flex;
  gap: 0.4rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.flow-select-wrap {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
  max-width: 260px;
}
.flow-select-wrap .ml-select {
  font-size: 0.78rem;
  padding: 0.35rem 0.45rem;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.flow-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ml-wine-deep);
  max-width: 220px;
  padding: 0.35rem 0.5rem;
}
.dirty-badge {
  background: rgba(179, 62, 0, 0.12);
  color: var(--ml-ember);
  font-size: 0.68rem;
}
.toolbar-hint {
  color: var(--ml-muted);
  font-size: 0.72rem;
}
.toolbar p {
  color: var(--ml-muted);
  font-size: 0.72rem;
}
.toolbar-actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
}
.zoom-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.25rem;
  border-radius: 10px;
  border: 1px solid var(--ml-line);
  background: rgba(255, 251, 244, 0.75);
}
.zoom-btn {
  min-width: 1.6rem;
  padding: 0.2rem 0.35rem;
  font-size: 0.9rem;
  line-height: 1;
}
.zoom-label {
  min-width: 2.4rem;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ml-muted);
}
.zoom-fit {
  font-size: 0.72rem;
  padding: 0.25rem 0.45rem;
}
.btn-compact {
  font-size: 0.78rem;
  padding: 0.4rem 0.65rem;
}
.canvas {
  position: relative;
  min-height: 420px;
  height: calc(100vh - 220px);
  max-height: 620px;
  width: 100%;
  max-width: 100%;
  overflow: auto;
  background-image:
    linear-gradient(rgba(134, 8, 0, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(134, 8, 0, 0.04) 1px, transparent 1px);
  background-size: 22px 22px;
}
.canvas-stage {
  position: relative;
  transform-origin: top left;
}
.canvas-scaler {
  position: relative;
}
.edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
.edge {
  fill: none;
  stroke: #088cff;
  stroke-width: 2;
  opacity: 0.75;
}
.edge-label {
  fill: var(--ml-wine);
  font-size: 9px;
  font-weight: 700;
  text-anchor: middle;
}
.node {
  position: absolute;
  top: 0;
  left: 0;
  width: 158px;
  padding: 0.45rem 0.5rem;
  border-radius: 12px;
  background: rgba(255, 251, 244, 0.96);
  border: 1.5px solid var(--ml-line);
  box-shadow: var(--ml-shadow-soft);
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.node.selected {
  box-shadow: 0 0 0 2px rgba(14, 255, 249, 0.35), var(--ml-shadow);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 0.25rem;
}
.node strong {
  font-size: 0.78rem;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.node small {
  display: block;
  color: var(--ml-muted);
  font-size: 0.64rem;
}
.mini-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-top: 0.3rem;
}
.mini-btns span {
  font-size: 0.58rem;
  font-weight: 600;
  padding: 0.1rem 0.3rem;
  border-radius: 999px;
  background: rgba(8, 140, 255, 0.12);
  color: var(--ml-sky);
}
.mini-text {
  margin-top: 0.25rem;
  font-size: 0.62rem;
  color: var(--ml-muted);
  line-height: 1.25;
}
.status-ok {
  padding: 0.45rem 0.75rem;
  color: #067a76;
  font-weight: 600;
  font-size: 0.78rem;
}
.status-err {
  padding: 0.45rem 0.75rem;
  color: var(--ml-wine);
  font-weight: 600;
  font-size: 0.78rem;
}
.side {
  display: grid;
  gap: 0.55rem;
  align-content: start;
  min-width: 0;
}
.inspector {
  display: grid;
  gap: 0.5rem;
  max-height: calc(100vh - 200px);
  overflow: auto;
}
.inspector-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.delete-btn {
  color: var(--ml-wine);
  font-size: 0.8rem;
}
.meta {
  color: var(--ml-muted);
  font-size: 0.75rem;
}
.buttons-edit {
  display: grid;
  gap: 0.5rem;
}
.row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.button-card {
  display: grid;
  gap: 0.35rem;
  padding: 0.6rem;
  border: 1px solid var(--ml-line);
  border-radius: 12px;
  background: rgba(255, 251, 244, 0.7);
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
}
.inline-label span {
  display: block;
  font-size: 0.75rem;
  color: var(--ml-muted);
  margin-bottom: 0.2rem;
}
.edges-panel {
  margin-top: 0.5rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--ml-line);
}
.edges-panel h3 {
  font-size: 0.9rem;
  color: var(--ml-wine);
  margin-bottom: 0.45rem;
}
.edge-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.6rem;
  display: grid;
  gap: 0.35rem;
}
.edge-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  padding: 0.35rem 0.45rem;
  border-radius: 8px;
  background: rgba(8, 140, 255, 0.06);
}
.add-edge {
  display: grid;
  gap: 0.45rem;
}
.preview {
  display: grid;
  gap: 0.55rem;
}
.msgs {
  display: grid;
  gap: 0.4rem;
  max-height: 180px;
  overflow: auto;
  padding: 0.4rem;
  border-radius: 10px;
  background: rgba(134, 8, 0, 0.03);
}
.bubble {
  max-width: 95%;
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  font-size: 0.8rem;
}
.bubble.luna {
  justify-self: start;
  background: rgba(8, 140, 255, 0.12);
}
.bubble.user {
  justify-self: end;
  background: linear-gradient(135deg, var(--ml-wine), var(--ml-ember));
  color: var(--ml-cream);
}
.empty-inspector {
  color: var(--ml-muted);
  font-size: 0.9rem;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(92, 5, 0, 0.35);
  display: grid;
  place-items: center;
  padding: 1rem;
}
.modal {
  width: min(460px, 100%);
  padding: 1.1rem;
  display: grid;
  gap: 0.75rem;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-head h2 {
  color: var(--ml-wine-deep);
  font-size: 1.1rem;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: var(--ml-muted);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  margin-top: 0.25rem;
}
@media (max-width: 1100px) {
  .builder {
    grid-template-columns: 1fr;
  }

  .canvas {
    height: 52vh;
    max-height: none;
  }
}
</style>
