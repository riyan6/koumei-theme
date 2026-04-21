<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface PingTask { id: number; name: string; interval: number; loss: number }
interface PingRecord { task_id: number; time: string; value: number }

const props = defineProps<{ uuid: string }>()

const COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC']
const HOUR_OPTIONS = [
  { label: '1h', value: 1 },
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: '1d', value: 24 },
]

const hours = ref(24)
const pingTasks = ref<PingTask[]>([])
const pingRecords = ref<PingRecord[]>([])
const loading = ref(false)
const error = ref(false)
const visibility = ref<Record<number, boolean>>({})
const smoothEnabled = ref(false)
const EWMA_ALPHA = 0.15  // smoothing factor: lower = smoother

// EWMA smoothing
function ewma(values: number[]): number[] {
  if (!values.length) return []
  const out: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    out.push(EWMA_ALPHA * values[i] + (1 - EWMA_ALPHA) * out[i - 1])
  }
  return out
}

async function load() {
  loading.value = true
  error.value = false
  try {
    const res = await fetch(`/api/records/ping?uuid=${props.uuid}&hours=${hours.value}`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    const tasks: PingTask[] = json.data?.tasks ?? []
    pingTasks.value = tasks
    pingRecords.value = json.data?.records ?? []
    for (const t of tasks) {
      if (visibility.value[t.id] === undefined) visibility.value[t.id] = true
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.uuid, () => { visibility.value = {}; load() }, { immediate: true })
watch(hours, load)

function toggleTask(id: number) {
  visibility.value[id] = !visibility.value[id]
}

// ── Chart geometry ──────────────────────────────────────────
const CHART_W = 1000
const CHART_H = 300
const PAD_L = 52
const PAD_B = 28
const PAD_T = 16
const PAD_R = 16
const W = CHART_W - PAD_L - PAD_R
const H = CHART_H - PAD_T - PAD_B

interface PointData { x: number; y: number; time: string; value: number; taskId: number }

interface TaskSeries {
  task: PingTask
  color: string
  visible: boolean
  avg: number
  loss: number
  polyline: string
  points: PointData[]
}

const vMax = computed(() => {
  const all = pingRecords.value.filter(r => r.value > 0)
  return all.length ? Math.max(...all.map(r => r.value)) * 1.1 : 100
})

const tRange = computed(() => {
  const times = pingRecords.value.map(r => new Date(r.time).getTime())
  if (!times.length) return { tMin: 0, tMax: 1, range: 1 }
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  return { tMin, tMax, range: tMax - tMin || 1 }
})

const series = computed<TaskSeries[]>(() => {
  if (!pingTasks.value.length) return []
  const { tMin, range } = tRange.value
  const vm = vMax.value

  return pingTasks.value.map((task, i) => {
    const recs = pingRecords.value
      .filter(r => r.task_id === task.id)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    const validRecs = recs.filter(r => r.value > 0)
    const avg = validRecs.length ? validRecs.reduce((s, r) => s + r.value, 0) / validRecs.length : 0

    const rawValues = validRecs.map(r => r.value)
    const displayValues = smoothEnabled.value ? ewma(rawValues) : rawValues

    const points: PointData[] = validRecs.map((r, idx) => {
      const x = PAD_L + ((new Date(r.time).getTime() - tMin) / range) * W
      const y = PAD_T + H - (displayValues[idx] / vm) * H
      return { x, y, time: r.time, value: r.value, taskId: task.id }
    })

    return {
      task,
      color: COLORS[i % COLORS.length],
      visible: visibility.value[task.id] ?? true,
      avg,
      loss: task.loss,
      polyline: points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      points,
    }
  })
})

const yLabels = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD_T + H - f * H,
    label: f === 0 ? '0' : `${Math.round(f * vMax.value)}`,
  }))
)

const xLabels = computed(() => {
  const { tMin, range } = tRange.value
  if (!pingRecords.value.length) return []
  const count = 6
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = tMin + (i / count) * range
    const d = new Date(t)
    return {
      x: PAD_L + (i / count) * W,
      label: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    }
  })
})

// ── Tooltip (HTML overlay) ───────────────────────────────────
interface TooltipState {
  // position as % of container width/height for the HTML overlay
  leftPx: number
  items: { color: string; name: string; value: number }[]
  timeLabel: string
  // SVG x for the crosshair line
  svgX: number
  flip: boolean  // show tooltip to the left of cursor
}

const tooltip = ref<TooltipState | null>(null)
const wrapEl = ref<HTMLDivElement | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)

function onMouseMove(e: MouseEvent) {
  if (!svgEl.value || !wrapEl.value || !series.value.length) return

  // Use SVG's own coordinate transform to handle any aspect ratio mode correctly
  const pt = svgEl.value.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const ctm = svgEl.value.getScreenCTM()
  if (!ctm) return
  const svgPt = pt.matrixTransform(ctm.inverse())
  const mx = svgPt.x

  if (mx < PAD_L || mx > PAD_L + W) { tooltip.value = null; return }

  const { tMin, range } = tRange.value
  const ratio = (mx - PAD_L) / W
  const targetT = tMin + ratio * range

  const items: { color: string; name: string; value: number; pt: PointData }[] = []
  for (const s of series.value) {
    if (!s.visible || !s.points.length) continue
    let best = s.points[0]
    let bestDist = Math.abs(new Date(best.time).getTime() - targetT)
    for (const p of s.points) {
      const d = Math.abs(new Date(p.time).getTime() - targetT)
      if (d < bestDist) { bestDist = d; best = p }
    }
    items.push({ color: s.color, name: s.task.name, value: best.value, pt: best })
  }

  if (!items.length) { tooltip.value = null; return }

  const refTime = items[0].pt.time
  const timeLabel = new Date(refTime).toLocaleString('zh-CN', {
    hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })

  const wrapRect = wrapEl.value.getBoundingClientRect()
  const leftPx = e.clientX - wrapRect.left
  const flip = leftPx > wrapRect.width * 0.65

  tooltip.value = {
    leftPx,
    svgX: mx,
    items: items.map(i => ({ color: i.color, name: i.name, value: i.value })),
    timeLabel,
    flip,
  }
}

function onMouseLeave() {
  tooltip.value = null
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 图例 + 时间范围 -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-3">
        <button
          v-for="s in series"
          :key="s.task.id"
          type="button"
          class="flex items-center gap-1.5 text-sm transition-opacity"
          :class="s.visible ? 'opacity-100' : 'opacity-35'"
          @click="toggleTask(s.task.id)"
        >
          <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: s.color }" />
          <span class="text-muted-foreground" :class="!s.visible ? 'line-through' : ''">{{ s.task.name }}</span>
          <span class="font-medium text-foreground">{{ s.avg.toFixed(1) }} ms</span>
          <span class="text-xs text-muted-foreground">丢包 {{ s.loss.toFixed(1) }}%</span>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <!-- 平滑开关 -->
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          :class="smoothEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'"
          @click="smoothEnabled = !smoothEnabled"
        >
          <span
            class="inline-block h-3.5 w-6 rounded-full transition-colors"
            :class="smoothEnabled ? 'bg-primary-foreground/30' : 'bg-muted-foreground/30'"
          >
            <span
              class="block h-3 w-3 translate-y-px rounded-full bg-current shadow transition-transform"
              :class="smoothEnabled ? 'translate-x-3' : 'translate-x-px'"
            />
          </span>
          平滑
        </button>

        <!-- 时间范围 -->
        <div class="flex items-center gap-1 rounded-md bg-muted p-1">
          <button
            v-for="opt in HOUR_OPTIONS"
            :key="opt.value"
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-colors"
            :class="hours === opt.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="hours = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 加载 / 错误 / 无数据 -->
    <div
      v-if="loading || error || !series.length"
      class="flex h-[336px] items-center justify-center rounded-md border border-border bg-muted/10 text-sm text-muted-foreground"
      :class="!loading && !error && !series.length ? 'border-dashed' : ''"
    >
      <span v-if="loading">加载中…</span>
      <span v-else-if="error">延迟数据加载失败</span>
      <span v-else>暂无延迟数据</span>
    </div>

    <!-- 图表 -->
    <div
      v-else
      ref="wrapEl"
      class="relative w-full overflow-hidden rounded-md border border-border bg-muted/10"
    >
      <svg
        ref="svgEl"
        :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
        preserveAspectRatio="xMidYMid meet"
        class="h-[336px] w-full cursor-crosshair"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
      >
        <!-- 参考线 + Y 标签 -->
        <g v-for="lbl in yLabels" :key="lbl.y">
          <line
            :x1="PAD_L" :y1="lbl.y" :x2="CHART_W - PAD_R" :y2="lbl.y"
            stroke="currentColor" stroke-opacity="0.1" stroke-width="1"
          />
          <text :x="PAD_L - 4" :y="lbl.y + 4" text-anchor="end" font-size="11" fill="currentColor" opacity="0.45">
            {{ lbl.label }}
          </text>
        </g>

        <!-- X 轴标签 -->
        <text
          v-for="lbl in xLabels" :key="lbl.x"
          :x="lbl.x" :y="CHART_H - 4"
          text-anchor="middle" font-size="11" fill="currentColor" opacity="0.45"
        >{{ lbl.label }}</text>

        <!-- 折线 -->
        <polyline
          v-for="s in series" :key="s.task.id"
          :points="s.polyline"
          :stroke="s.color"
          :stroke-width="s.visible ? 1.8 : 0"
          fill="none"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- 竖线 crosshair -->
        <line
          v-if="tooltip"
          :x1="tooltip.svgX" y1="0"
          :x2="tooltip.svgX" :y2="CHART_H - PAD_B"
          stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4 3"
        />
      </svg>

      <!-- HTML tooltip overlay -->
      <div
        v-if="tooltip"
        class="pointer-events-none absolute top-2 z-10 min-w-[140px] rounded-md border border-border bg-popover px-3 py-2 shadow-md"
        :style="tooltip.flip
          ? { right: `calc(100% - ${tooltip.leftPx}px + 8px)` }
          : { left: `${tooltip.leftPx + 8}px` }"
      >
        <p class="mb-1 text-xs text-muted-foreground">{{ tooltip.timeLabel }}</p>
        <div v-for="item in tooltip.items" :key="item.name" class="flex items-center gap-1.5 text-sm">
          <span class="inline-block h-2 w-2 shrink-0 rounded-full" :style="{ background: item.color }" />
          <span class="text-muted-foreground">{{ item.name }}</span>
          <span class="ml-auto pl-3 font-medium tabular-nums text-foreground">{{ item.value.toFixed(1) }} ms</span>
        </div>
      </div>
    </div>
  </div>
</template>
