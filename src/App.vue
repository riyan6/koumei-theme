<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import FilterBar from '@/components/FilterBar.vue'
import NodeGrid from '@/components/NodeGrid.vue'
import { useNodes } from '@/composables/useNodes'

const {
  filteredNodes,
  groups,
  selectedGroup,
  searchQuery,
  initializeData,
  disposeRealtime,
  setGroup,
  setSearch,
} = useNodes()

onMounted(() => {
  const saved = localStorage.getItem('appearance')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
  initializeData()
})

onUnmounted(() => {
  disposeRealtime()
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="flex min-h-screen flex-col">
      <main class="flex w-full flex-1 flex-col gap-4 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <div class="rounded-lg border border-border bg-card p-4">
          <FilterBar
            :groups="groups"
            :selected-group="selectedGroup"
            :search-query="searchQuery"
            @update:selected-group="setGroup"
            @update:search-query="setSearch"
          />
        </div>

        <NodeGrid :nodes="filteredNodes" />
      </main>

      <footer class="w-full px-4 pb-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        Powered by <a href="https://github.com/komari-monitor/komari" target="_blank" rel="noopener" class="font-medium text-foreground transition-colors hover:text-primary">Komari Monitor</a>.
      </footer>
    </div>
  </div>
</template>
