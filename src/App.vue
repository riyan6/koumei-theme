<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import NodeGrid from '@/components/NodeGrid.vue'
import { useInstanceRoute } from '@/composables/useInstanceRoute'
import { useThemeMode, type ThemeMode } from '@/composables/useThemeMode'
import { useNodes } from '@/composables/useNodes'
import { formatBytes, formatSpeed } from '@/lib/utils'

// 中文说明：主题模式固定提供 light、dark、auto 三档，导航下拉菜单直接复用这份配置。
const themeOptions: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'auto', label: '跟随系统' },
  { mode: 'dark', label: '深色' },
  { mode: 'light', label: '浅色' },
]

// 中文说明：全局主题切换统一由 composable 托管，页面层只负责渲染按钮和响应交互。
const { themeMode, setThemeMode } = useThemeMode()
const { activeNodeUuid, goToHome, goToNode } = useInstanceRoute()
const hasScrolled = ref(false)

// 中文说明：首页中部直接复用现有节点数据结构，先实现分组切换和基础卡片展示。
const {
  groups,
  nodesWithStatus,
  selectedGroup,
  filteredNodes,
  onlineCount,
  publicInfo,
  totalCount,
  totalSpeed,
  totalTraffic,
  initializeData,
  disposeRealtime,
  setGroup,
  isLoading,
} = useNodes()

// 中文说明：列表页保持分组过滤，详情页则直接基于全量节点查找，避免刷新后因过滤条件找不到节点。
const displayNodes = computed(() =>
  activeNodeUuid.value ? nodesWithStatus.value : filteredNodes.value,
)

watch([activeNodeUuid, nodesWithStatus], ([currentUuid, currentNodes]) => {
  // 中文说明：若地址里的详情 UUID 已不存在，并且节点数据已经加载完成，则自动回退到列表页。
  if (!currentUuid || currentNodes.length === 0) {
    return
  }

  const matchedNode = currentNodes.some(item => item.node.uuid === currentUuid)
  if (!matchedNode) {
    goToHome()
  }
})

function updateNavbarDivider() {
  // 中文说明：页面只要离开顶部，就给导航补上一条底部分割线，增强层次感。
  hasScrolled.value = window.scrollY > 8
}

onMounted(() => {
  // 中文说明：页面加载时初始化节点数据，接口失败时会自动回退到 mock 数据。
  initializeData()
  // 中文说明：挂载时立刻同步一次滚动状态，并监听后续滚动变化。
  updateNavbarDivider()
  window.addEventListener('scroll', updateNavbarDivider, { passive: true })
})

onUnmounted(() => {
  // 中文说明：页面离开时清理轮询，避免重复请求。
  disposeRealtime()
  // 中文说明：移除滚动监听，避免组件销毁后仍然持有回调。
  window.removeEventListener('scroll', updateNavbarDivider)
})
</script>

<template>
  <!-- 中文说明：首页先搭建基础框架，当前仅展示导航栏效果。 -->
  <div class="min-h-screen bg-background text-foreground">
    <header
      :class="[
        'fixed inset-x-0 top-0 z-40 bg-[color-mix(in_srgb,var(--theme-surface-page)_92%,transparent)] backdrop-blur-sm transition-[border-color] duration-200',
        hasScrolled
          ? 'border-b border-[var(--theme-border-tertiary)]'
          : 'border-b border-transparent',
      ]"
    >
      <!-- 中文说明：导航内容使用统一容器宽度，确保不会超过 1440px。 -->
      <div class="site-container">
        <div class="flex h-16 items-center justify-between gap-4">
          <a
            href="/"
            class="inline-flex items-center gap-3 font-heading-en text-h2 text-foreground transition-opacity duration-200 hover:opacity-70"
            @click.prevent="goToHome"
          >
            <!-- 中文说明：导航品牌位优先使用 public 下的 logo.svg，和标题文本一起作为统一入口。 -->
            <img
              src="/logo.svg"
              alt="Koumei logo"
              class="h-8 w-8 shrink-0 object-contain"
            >
            <span>Koumei</span>
          </a>

          <div class="flex items-center justify-end gap-3">
            <!-- 中文说明：移动端导航只保留管理按钮，避免统计项和菜单换行后撑高固定头部。 -->
            <a
              href="/admin"
              class="font-body-zh inline-flex min-h-10 items-center justify-center rounded-[0.9rem] bg-[var(--theme-button-primary-bg)] px-5 py-2 text-[var(--theme-button-primary-fg)] transition-[transform,opacity] duration-200 ease-out hover:scale-[1.03] hover:opacity-90 md:hidden"
            >
              管理
            </a>

            <!-- 中文说明：完整导航仅在中等及以上视口展示，移动端隐藏以保持头部稳定高度。 -->
            <nav
              aria-label="主导航"
              class="hidden md:block"
            >
              <ul class="text-[12px] flex items-center justify-end gap-x-4 text-foreground font-body-zh">
                <li class="flex items-center gap-1.5">
                  <span class="text-[var(--theme-text-secondary)]">服务器数量</span>
                  <span class="font-ui-mixed font-semibold text-[13px] text-[var(--theme-accent-clay-primary)]">{{ totalCount }}</span>
                </li>
                <li class="h-3 w-px bg-[var(--theme-divider-soft)]" />
                <li class="flex items-center gap-1.5">
                  <span class="text-[var(--theme-text-secondary)]">在线数量</span>
                  <span class="font-ui-mixed font-semibold text-[13px] text-[var(--theme-accent-clay-primary)]">{{ onlineCount }}</span>
                </li>
                <li class="h-3 w-px bg-[var(--theme-divider-soft)]" />
                <li class="flex items-center gap-1.5">
                  <span class="text-[var(--theme-text-secondary)]">流量概览</span>
                  <span class="font-ui-mixed font-semibold text-[13px] text-[var(--theme-text-primary)] tabular-nums">
                    <span class="text-[var(--theme-accent-clay-primary)] mr-0.5 font-bold">↑</span>{{ formatBytes(totalTraffic.up, 1) }}
                    <span class="mx-1 text-[var(--theme-divider-subtle)]">/</span>
                    <span class="text-[var(--theme-accent-clay-primary)] mr-0.5 font-bold">↓</span>{{ formatBytes(totalTraffic.down, 1) }}
                  </span>
                </li>
                <li class="h-3 w-px bg-[var(--theme-divider-soft)]" />
                <li class="group/theme relative pb-3 -mb-3 flex items-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-[var(--theme-text-primary)] transition-opacity duration-200 hover:opacity-70 font-medium"
                    aria-label="模式菜单"
                  >
                    <span>模式</span>
                    <ChevronDown class="h-3.5 w-3.5" />
                  </button>

                  <div
                    class="pointer-events-none absolute top-full right-0 z-30 min-w-[11rem] pt-2 opacity-0 transition-opacity duration-150 group-hover/theme:pointer-events-auto group-hover/theme:opacity-100 group-focus-within/theme:pointer-events-auto group-focus-within/theme:opacity-100"
                  >
                    <div class="rounded-[1.25rem] border border-[var(--theme-divider-subtle)] bg-[var(--theme-surface-overlay)] p-2 shadow-[var(--surface-elevated-shadow)]">
                      <button
                        v-for="option in themeOptions"
                        :key="option.mode"
                        type="button"
                        class="flex w-full items-center justify-between rounded-[0.85rem] px-3.5 py-2.5 text-left transition-colors duration-200 hover:bg-[var(--theme-surface-panel-muted)]"
                        @click="setThemeMode(option.mode)"
                      >
                        <span class="text-[12px] text-[var(--theme-text-primary)]">{{ option.label }}</span>
                        <Check
                          v-if="themeMode === option.mode"
                          class="h-3.5 w-3.5 text-[var(--theme-text-primary)]"
                        />
                      </button>
                    </div>
                  </div>
                </li>
                <li class="h-3 w-px bg-[var(--theme-divider-soft)]" />
                <li>
                  <!-- 中文说明：管理按钮增加轻微缩放动效，悬停时更有反馈，移开后平滑恢复。 -->
                  <a
                    href="/admin"
                    class="font-body-zh inline-flex min-h-9 items-center justify-center rounded-[0.85rem] bg-[var(--theme-button-primary-bg)] px-4.5 py-1.5 text-[12px] text-[var(--theme-button-primary-fg)] transition-[transform,opacity] duration-200 ease-out hover:scale-[1.03] hover:opacity-90"
                  >
                    管理
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </header>

    <main class="site-container pt-16">
      <!-- 中文说明：主体区域先实现分组切换和服务器卡片，后续再继续丰富节点信息。 -->
      <section class="flex min-h-[calc(100vh-4rem)] flex-col gap-8 py-10">
        <Transition name="toolbar-switch">
          <div
            v-if="!activeNodeUuid"
            class="flex flex-wrap items-center justify-between gap-4"
          >
            <!-- 中文说明：分组切换改成整块 tabs 结构，选中和未选中态按主题色统一处理。 -->
            <div
              class="inline-flex self-start flex-wrap items-center gap-1 rounded-[1.1rem] bg-[var(--theme-control-surface)] p-1"
              role="tablist"
              aria-label="节点分组"
            >
              <button
                type="button"
                role="tab"
                :aria-selected="selectedGroup === ''"
                :class="[
                  'font-ui-mixed text-ui rounded-[0.85rem] px-5 py-2 text-center whitespace-nowrap transition-all duration-200',
                  selectedGroup === ''
                    ? 'bg-[var(--theme-control-active-surface)] text-[var(--theme-text-primary)] shadow-[var(--theme-control-active-shadow)]'
                    : 'bg-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]',
                ]"
                @click="setGroup('')"
              >
                全部
              </button>

              <button
                v-for="group in groups"
                :key="group"
                type="button"
                role="tab"
                :aria-selected="selectedGroup === group"
                :class="[
                  'font-ui-mixed text-ui rounded-[0.85rem] px-5 py-2 text-center whitespace-nowrap transition-all duration-200',
                  selectedGroup === group
                    ? 'bg-[var(--theme-control-active-surface)] text-[var(--theme-text-primary)] shadow-[var(--theme-control-active-shadow)]'
                    : 'bg-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]',
                ]"
                @click="setGroup(group)"
              >
                {{ group }}
              </button>
            </div>

            <!-- 中文说明：实时网速放在分组行右侧，避免顶部导航随轮询抖动。 -->
            <div class="text-ui flex items-center gap-3 text-[var(--theme-text-secondary)]">
              <span class="font-body-zh">网络速率</span>
              <span class="font-body-en text-[var(--theme-text-primary)]">
                <span class="text-[var(--theme-accent-clay-primary)] font-bold">↑</span> {{ formatSpeed(totalSpeed.up) }} <span class="text-[var(--theme-accent-clay-primary)] font-bold">↓</span> {{ formatSpeed(totalSpeed.down) }}
              </span>
            </div>
          </div>
        </Transition>

        <!-- 中文说明：节点卡片统一收敛到 NodeGrid 组件，避免页面层直接堆叠展示细节。 -->
        <NodeGrid
          :nodes="displayNodes"
          :active-node-uuid="activeNodeUuid"
          @open-node="goToNode"
          @close-node="goToHome"
        />
      </section>
    </main>

    <!-- 中文说明：页脚使用深色背景承载仓库来源信息，保持页面收尾清晰。 -->
    <footer class="mt-12 bg-[var(--footer-background)]">
      <div class="site-container py-6">
        <div class="flex flex-wrap items-center justify-between gap-3 text-[var(--footer-foreground)]">
          <p class="font-body-en text-ui">
            Powered by
            <a
              href="https://github.com/komari-monitor/komari"
              target="_blank"
              rel="noreferrer"
              class="text-[var(--color-clay)] transition-opacity duration-200 hover:opacity-80"
            >
              Komari Monitor
            </a>.
          </p>
          <p
            v-if="publicInfo?.description"
            class="font-body-en text-ui text-right"
          >
            {{ publicInfo.description }}
          </p>
        </div>
      </div>
    </footer>

    <!-- Premium Loading Overlay -->
    <Transition name="loading-fade">
      <div
        v-if="isLoading"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      >
        <div class="flex flex-col items-center gap-6 text-center">
          <!-- Koumei Logo with pulse and rotating spinner container -->
          <div class="relative flex h-20 w-20 items-center justify-center">
            <!-- Glow background effect -->
            <div class="absolute inset-0 animate-ping rounded-full bg-[var(--theme-accent-clay-primary)] opacity-10"></div>
            <!-- Outer spinning gradient border -->
            <div class="absolute inset-0 rounded-full border-2 border-t-[var(--theme-accent-clay-primary)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            
            <img
              src="/logo.svg"
              alt="Loading logo"
              class="h-10 w-10 animate-pulse"
            >
          </div>
          <div class="flex flex-col items-center gap-2">
            <h3 class="font-heading-en text-lg text-foreground font-semibold animate-pulse">
              Koumei Monitor
            </h3>
            <p class="font-body-zh text-sm text-[var(--theme-text-secondary)] flex items-center gap-2 justify-center">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              正在连接服务器并拉取节点数据...
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toolbar-switch-enter-active,
.toolbar-switch-leave-active {
  overflow: hidden;
  transition:
    max-height 220ms var(--ease-out-power2),
    opacity 180ms ease,
    transform 220ms var(--ease-out-power2),
    margin 220ms var(--ease-out-power2);
}

.toolbar-switch-enter-from,
.toolbar-switch-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
  margin-bottom: -0.5rem;
}

.toolbar-switch-enter-to,
.toolbar-switch-leave-from {
  max-height: 8rem;
  opacity: 1;
  transform: translateY(0);
  margin-bottom: 0;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 300ms ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
