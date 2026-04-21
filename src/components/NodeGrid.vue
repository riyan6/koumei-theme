<script setup lang="ts">
import NodeTable from '@/components/NodeTable.vue'
import type { NodeWithStatus } from '@/types/node'

defineProps<{
  nodes: NodeWithStatus[]
}>()
</script>

<template>
  <div
    v-if="nodes.length === 0"
    class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
  >
    没有找到匹配的节点，试着切换分组或搜索关键词。
  </div>
  <NodeTable v-else :nodes="nodes" />
</template>
