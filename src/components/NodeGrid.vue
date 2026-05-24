<script setup lang="ts">
import { computed } from 'vue'
import { Minimize2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import NodeDetail from '@/components/NodeDetail.vue'
import PingChart from '@/components/PingChart.vue'
import { formatBytes, formatPercent, formatSpeed, getFlagUrl } from '@/lib/utils'
import type { NodeWithStatus } from '@/types/node'

const props = defineProps<{
  nodes: NodeWithStatus[]
  activeNodeUuid?: string | null
}>()

const emit = defineEmits<{
  (event: 'close-node'): void
  (event: 'open-node', uuid: string): void
}>()

// 中文说明：当前展开节点完全交给地址状态控制，这样刷新后也能直接恢复详情页。
const expandedNode = computed<NodeWithStatus | null>(() => {
  if (!props.activeNodeUuid) {
    return null
  }

  return props.nodes.find(item => item.node.uuid === props.activeNodeUuid) ?? null
})

// 中文说明：统一限制进度条百分比范围，避免接口异常时撑破布局。
function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100)
}

// 中文说明：CPU 接口本身已返回百分比，这里仅做容错裁剪。
function cpuPercent(item: NodeWithStatus): number {
  return clampPercent(item.status?.cpu ?? 0)
}

// 中文说明：内存占用需要基于已用和总量换算成百分比。
function memoryPercent(item: NodeWithStatus): number {
  return clampPercent(formatPercent(item.status?.ram ?? 0, item.status?.ram_total ?? item.node.mem_total))
}

// 中文说明：磁盘占用同样根据已用和总量计算百分比。
function diskPercent(item: NodeWithStatus): number {
  return clampPercent(formatPercent(item.status?.disk ?? 0, item.status?.disk_total ?? item.node.disk_total))
}

// 中文说明：月流量进度按上下行累计总和相加后，对比节点的套餐流量限制。
function trafficPercent(item: NodeWithStatus): number {
  const totalUsed = (item.status?.net_total_up ?? 0) + (item.status?.net_total_down ?? 0)
  if (!item.node.traffic_limit || item.node.traffic_limit <= 0) {
    return 0
  }
  return clampPercent(formatPercent(totalUsed, item.node.traffic_limit))
}

// 中文说明：统一拼装流量已用文案，便于月流量模块和无上限场景复用。
function trafficUsageText(item: NodeWithStatus): string {
  const totalUsed = (item.status?.net_total_up ?? 0) + (item.status?.net_total_down ?? 0)
  if (!item.node.traffic_limit || item.node.traffic_limit <= 0) {
    return `${formatBytes(totalUsed, 0)}/∞`
  }
  return `${formatBytes(totalUsed, 0)}/${formatBytes(item.node.traffic_limit, 0)}`
}

// 中文说明：标签字段以分号分隔，转换成数组后便于循环渲染 Badge。
function nodeTags(item: NodeWithStatus): string[] {
  return item.node.tags
    .split(';')
    .map(tag => tag.trim())
    .filter(Boolean)
}

// 中文说明：在线状态文案和样式集中管理，避免模板里散落判断逻辑。
function statusMeta(item: NodeWithStatus) {
  return item.online
    ? {
        className: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.12)]',
        label: '在线',
        textClassName: 'text-emerald-700',
        pillClassName: 'bg-emerald-50 text-emerald-700',
      }
    : {
        className: 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]',
        label: '离线',
        textClassName: 'text-rose-700',
        pillClassName: 'bg-rose-50 text-rose-700',
      }
}

// 中文说明：统一生成进度条颜色，负载高时给出更明显提示。
function progressClass(value: number): string {
  if (value >= 90) return '[&_[data-slot=progress-indicator]]:bg-rose-500'
  if (value >= 70) return '[&_[data-slot=progress-indicator]]:bg-amber-500'
  return '[&_[data-slot=progress-indicator]]:bg-emerald-500'
}

// 中文说明：点击卡片时切换到单卡详情模式，让首页像展开了一个二级页面。
function expandNode(uuid: string): void {
  emit('open-node', uuid)
}

// 中文说明：点击缩小按钮后恢复原来的网格布局。
function collapseNode(): void {
  emit('close-node')
}

// 中文说明：将标签数据做成可复用的计算结果，减少模板内重复执行函数。
const tagsMap = computed(() =>
  Object.fromEntries(props.nodes.map(item => [item.node.uuid, nodeTags(item)])),
)

// 中文说明：旗帜地址预先计算，模板里只负责渲染，避免重复拼接 URL。
const flagUrlMap = computed(() =>
  Object.fromEntries(props.nodes.map(item => [item.node.uuid, getFlagUrl(item.node.region)])),
)
</script>

<template>
  <div
    v-if="nodes.length === 0"
    class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
  >
    没有找到匹配的节点，试着切换分组或搜索关键词。
  </div>

  <Transition
    v-else
    name="node-detail-switch"
    mode="out-in"
  >
    <article
      v-if="expandedNode"
      :key="expandedNode.node.uuid"
      class="overflow-hidden rounded-[2rem] border border-[var(--theme-divider)] bg-[var(--theme-surface-panel)]"
    >
      <div class="border-b border-[var(--theme-divider-soft)] px-5 py-5 md:px-7 md:py-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div class="flex shrink-0 items-center justify-center self-center">
              <img
                v-if="flagUrlMap[expandedNode.node.uuid]"
                :src="flagUrlMap[expandedNode.node.uuid]"
                :alt="`${expandedNode.node.region} flag`"
                class="h-6 w-8 rounded-[4px] object-cover"
                loading="lazy"
              >
              <span
                v-else
                class="font-heading-en text-subheading text-[var(--theme-text-primary)]"
              >
                {{ expandedNode.node.region || '--' }}
              </span>
            </div>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="font-heading-en text-h2 text-[var(--theme-text-primary)]">
                  {{ expandedNode.node.name }}
                </h2>
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-[0.75rem] font-medium"
                  :class="statusMeta(expandedNode).pillClassName"
                >
                  {{ statusMeta(expandedNode).label }}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--theme-divider)] bg-[var(--theme-surface-panel-subtle)] text-[var(--theme-text-secondary)] transition-all duration-200 hover:-translate-y-0.5 hover:text-[var(--theme-text-primary)]"
            aria-label="缩小服务器详情"
            @click="collapseNode"
          >
            <Minimize2 class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="border-b border-[var(--theme-divider-soft)] p-5 md:p-6">
        <div class="mb-4">
          <h3 class="font-body-zh text-subheading text-[var(--theme-text-primary)]">资源监控</h3>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-[1.5rem] border border-[var(--theme-divider)] bg-[var(--theme-surface-panel-subtle)] p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">CPU 使用率</span>
              <span class="font-heading-en text-subheading text-[var(--theme-text-primary)]">
                {{ cpuPercent(expandedNode).toFixed(1) }}%
              </span>
            </div>
            <Progress
              :model-value="cpuPercent(expandedNode)"
              class="mt-3 h-2 bg-[var(--theme-progress-track)]"
              :class="progressClass(cpuPercent(expandedNode))"
            />
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center justify-between gap-3">
                <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">CPU 型号</span>
                <span
                  class="font-body-zh text-caption min-w-0 max-w-[12rem] truncate text-right text-[var(--theme-text-primary)]"
                  :title="expandedNode.node.cpu_name"
                >
                  {{ expandedNode.node.cpu_name }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">核心数量</span>
                <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                  {{ expandedNode.node.cpu_cores }} 核
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-[1.5rem] border border-[var(--theme-divider)] bg-[var(--theme-surface-panel-subtle)] p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">内存占用</span>
              <span class="font-heading-en text-subheading text-[var(--theme-text-primary)]">
                {{ memoryPercent(expandedNode).toFixed(1) }}%
              </span>
            </div>
            <Progress
              :model-value="memoryPercent(expandedNode)"
              class="mt-3 h-2 bg-[var(--theme-progress-track)]"
              :class="progressClass(memoryPercent(expandedNode))"
            />
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center justify-between gap-3">
                <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">已用内存</span>
                <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                  {{ formatBytes(expandedNode.status?.ram ?? 0, 2) }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">总内存</span>
                <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                  {{ formatBytes(expandedNode.status?.ram_total ?? expandedNode.node.mem_total, 2) }}
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-[1.5rem] border border-[var(--theme-divider)] bg-[var(--theme-surface-panel-subtle)] p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">磁盘占用</span>
              <span class="font-heading-en text-subheading text-[var(--theme-text-primary)]">
                {{ diskPercent(expandedNode).toFixed(1) }}%
              </span>
            </div>
            <Progress
              :model-value="diskPercent(expandedNode)"
              class="mt-3 h-2 bg-[var(--theme-progress-track)]"
              :class="progressClass(diskPercent(expandedNode))"
            />
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center justify-between gap-3">
                <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">已用磁盘</span>
                <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                  {{ formatBytes(expandedNode.status?.disk ?? 0, 2) }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">总磁盘</span>
                <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                  {{ formatBytes(expandedNode.status?.disk_total ?? expandedNode.node.disk_total, 2) }}
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-[1.5rem] border border-[var(--theme-divider)] bg-[var(--theme-surface-panel-subtle)] p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">网络流量</span>
              <span class="font-heading-en text-subheading text-[var(--theme-text-primary)]">
                {{ trafficPercent(expandedNode).toFixed(1) }}%
              </span>
            </div>
            <Progress
              :model-value="trafficPercent(expandedNode)"
              class="mt-3 h-2 bg-[var(--theme-progress-track)]"
              :class="progressClass(trafficPercent(expandedNode))"
            />
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center justify-between gap-3">
                <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">实时上行</span>
                <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                  {{ formatSpeed(expandedNode.status?.net_out ?? 0) }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">实时下行</span>
                <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                  {{ formatSpeed(expandedNode.status?.net_in ?? 0) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-5 md:p-6">
        <div class="grid grid-cols-1 gap-5">
          <NodeDetail :data="expandedNode" />
          <PingChart :uuid="expandedNode.node.uuid" />
        </div>
      </div>
    </article>

    <div
      v-else
      key="grid"
      class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
    >
      <article
        v-for="item in nodes"
        :key="item.node.uuid"
        class="flex min-h-[18.5rem] cursor-pointer flex-col rounded-[var(--br-24)] bg-[var(--theme-surface-panel)] p-4 text-[var(--theme-text-primary)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[var(--surface-elevated-shadow)]"
        style="border: 0.5px solid var(--theme-divider);"
        @click="expandNode(item.node.uuid)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex min-w-0 items-center gap-2.5">
            <img
              v-if="flagUrlMap[item.node.uuid]"
              :src="flagUrlMap[item.node.uuid]"
              :alt="`${item.node.region} flag`"
              class="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
              loading="lazy"
            >
            <h2 class="font-heading-en text-subheading line-clamp-1 text-[var(--theme-text-primary)]">
              {{ item.node.name }}
            </h2>
          </div>
          <span
            class="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
            :class="statusMeta(item).className"
          />
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2.5">
          <div class="space-y-1.5">
            <div class="font-body-zh text-caption flex items-center justify-between gap-3 text-[var(--theme-text-secondary)]">
              <span>CPU</span>
              <span class="tabular-nums">{{ cpuPercent(item).toFixed(1) }}%</span>
            </div>
            <Progress
              :model-value="cpuPercent(item)"
              class="h-1.5 bg-[var(--theme-progress-track)]"
              :class="progressClass(cpuPercent(item))"
            />
          </div>

          <div class="space-y-1.5">
            <div class="font-body-zh text-caption flex items-center justify-between gap-3 text-[var(--theme-text-secondary)]">
              <span>内存</span>
              <span class="tabular-nums">{{ memoryPercent(item).toFixed(1) }}%</span>
            </div>
            <Progress
              :model-value="memoryPercent(item)"
              class="h-1.5 bg-[var(--theme-progress-track)]"
              :class="progressClass(memoryPercent(item))"
            />
          </div>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2.5">
          <div class="space-y-1.5">
            <div class="font-body-zh text-caption flex items-center justify-between gap-3 text-[var(--theme-text-secondary)]">
              <span>磁盘</span>
              <span class="tabular-nums">{{ diskPercent(item).toFixed(1) }}%</span>
            </div>
            <Progress
              :model-value="diskPercent(item)"
              class="h-1.5 bg-[var(--theme-progress-track)]"
              :class="progressClass(diskPercent(item))"
            />
          </div>

          <div class="space-y-1.5">
            <div class="font-body-zh text-caption flex items-center justify-between gap-3 text-[var(--theme-text-secondary)]">
              <span>流量</span>
              <span class="tabular-nums text-[0.7rem] leading-none text-[var(--theme-text-tertiary)]">{{ trafficUsageText(item) }}</span>
            </div>
            <Progress
              :model-value="trafficPercent(item)"
              class="h-1.5 bg-[var(--theme-progress-track)]"
              :class="progressClass(trafficPercent(item))"
            />
          </div>
        </div>

        <!-- 中文说明：后三行信息改为纯文本列表，去掉卡片嵌套背景，减少视觉体积。 -->
        <div class="mt-3 space-y-1.5 border-t border-[var(--theme-divider-soft)] pt-2.5">
          <div class="grid grid-cols-2 gap-x-4">
            <div class="flex items-center justify-between gap-2 py-0.5">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">实时上传</span>
              <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                {{ formatSpeed(item.status?.net_out ?? 0) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 py-0.5">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">实时下载</span>
              <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                {{ formatSpeed(item.status?.net_in ?? 0) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-4">
            <div class="flex items-center justify-between gap-2 py-0.5">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">流量上传</span>
              <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                {{ formatBytes(item.status?.net_total_up ?? 0, 1) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 py-0.5">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">流量下载</span>
              <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                {{ formatBytes(item.status?.net_total_down ?? 0, 1) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-4">
            <div class="flex items-center justify-between gap-2 py-0.5">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">连接数</span>
              <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                TCP {{ item.status?.connections ?? 0 }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 py-0.5">
              <span class="font-body-zh text-caption text-[var(--theme-text-tertiary)]">进程数</span>
              <span class="font-heading-en text-caption text-[var(--theme-text-primary)]">
                {{ item.status?.process ?? 0 }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-auto border-t border-[var(--theme-divider-soft)] pt-3">
          <div class="flex flex-wrap gap-2">
            <Badge
              v-for="tag in tagsMap[item.node.uuid]"
              :key="tag"
              variant="outline"
              class="font-body-zh text-label rounded-full border-[var(--theme-chip-border)] bg-transparent px-2 py-0.5 text-[var(--theme-chip-text)]"
            >
              {{ tag }}
            </Badge>
            <span
              v-if="tagsMap[item.node.uuid]?.length === 0"
              class="font-body-zh text-caption text-[var(--theme-text-tertiary)]"
            >
              无标签
            </span>
          </div>
        </div>
      </article>
    </div>
  </Transition>
</template>

<style scoped>
.node-detail-switch-enter-active,
.node-detail-switch-leave-active {
  transition: opacity 260ms var(--ease-out-power2), transform 320ms var(--ease-out-power2);
}

.node-detail-switch-enter-from,
.node-detail-switch-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.985);
}

.node-detail-switch-enter-to,
.node-detail-switch-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
