<script setup lang="ts">
import { computed } from 'vue'
import { formatBytes, formatSpeed, formatPercent, formatUptime } from '@/lib/utils'
import PingChart from '@/components/PingChart.vue'
import type { NodeWithStatus } from '@/types/node'

const props = defineProps<{ data: NodeWithStatus }>()

const s = computed(() => props.data.status)
const n = computed(() => props.data.node)

const rows = computed(() => {
  const st = s.value
  const nd = n.value
  if (!st) return []

  const diskPct = formatPercent(st.disk, st.disk_total ?? nd.disk_total)
  const ramPct = formatPercent(st.ram, st.ram_total ?? nd.mem_total)
  const swapPct = formatPercent(st.swap, st.swap_total ?? nd.swap_total)

  return [
    { label: '系统', value: `${nd.os}${nd.arch ? ` [${nd.arch}]` : ''}` },
    { label: 'CPU', value: `${nd.cpu_name} · ${nd.cpu_cores} 核 (${st.cpu.toFixed(2)}%)` },
    { label: '硬盘', value: `${formatBytes(st.disk, 2)} / ${formatBytes(st.disk_total ?? nd.disk_total, 2)} (${diskPct.toFixed(2)}%)` },
    { label: '内存', value: `${formatBytes(st.ram, 2)} / ${formatBytes(st.ram_total ?? nd.mem_total, 2)} (${ramPct.toFixed(2)}%)` },
    { label: '交换', value: `${formatBytes(st.swap, 2)} / ${formatBytes(st.swap_total ?? nd.swap_total, 2)} (${swapPct.toFixed(2)}%)` },
    { label: '流量', value: `IN ${formatBytes(st.net_total_down, 2)} / OUT ${formatBytes(st.net_total_up, 2)}` },
    { label: '网速', value: `↑ ${formatSpeed(st.net_out)} · ↓ ${formatSpeed(st.net_in)}` },
    { label: '负载', value: `${st.load.toFixed(2)} / ${st.load5.toFixed(2)} / ${st.load15.toFixed(2)}` },
    { label: '进程数', value: String(st.process) },
    { label: '连接数', value: `TCP ${st.connections} / UDP ${st.connections_udp}` },
    { label: '活动', value: new Date(st.time).toLocaleString('zh-CN', { hour12: false }) },
    ...(st.uptime != null ? [{ label: '在线', value: formatUptime(st.uptime) }] : []),
    ...(nd.virtualization ? [{ label: '虚拟化', value: `${nd.virtualization.toUpperCase()} · ${nd.arch}` }] : []),
  ]
})
</script>

<template>
  <div class="flex flex-col gap-4 p-5">
    <!-- 详细信息 -->
    <div class="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <div v-for="row in rows" :key="row.label" class="flex gap-1.5 text-sm">
        <span class="shrink-0 text-muted-foreground">{{ row.label }}：</span>
        <span class="truncate text-foreground">{{ row.value }}</span>
      </div>
    </div>

    <div class="border-t border-border" />

    <!-- 延迟图表 -->
    <PingChart :uuid="data.node.uuid" />
  </div>
</template>
