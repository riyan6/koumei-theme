<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import NodeGrid from '@/components/NodeGrid.vue'
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

// 中文说明：首页中部直接复用现有节点数据结构，先实现分组切换和基础卡片展示。
const {
  groups,
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
} = useNodes()

onMounted(() => {
  // 中文说明：页面加载时初始化节点数据，接口失败时会自动回退到 mock 数据。
  initializeData()
})

onUnmounted(() => {
  // 中文说明：页面离开时清理轮询，避免重复请求。
  disposeRealtime()
})
</script>

<template>
  <!-- 中文说明：首页先搭建基础框架，当前仅展示导航栏效果。 -->
  <div class="min-h-screen bg-background text-foreground">
    <header class="fixed inset-x-0 top-0 z-40 bg-[color-mix(in_srgb,var(--theme-surface-page)_92%,transparent)] backdrop-blur-sm">
      <!-- 中文说明：导航内容使用统一容器宽度，确保不会超过 1440px。 -->
      <div class="site-container">
        <div class="flex h-[82px] flex-wrap items-center justify-between gap-4">
          <a
            href="#"
            class="inline-flex items-center gap-3 font-heading-en text-h3 text-foreground transition-opacity duration-200 hover:opacity-70"
          >
            <!-- 中文说明：导航品牌位优先使用 public 下的 logo.svg，和标题文本一起作为统一入口。 -->
            <img
              src="/logo.svg"
              alt="Koumei logo"
              class="h-8 w-8 shrink-0 object-contain"
            >
            <span>Koumei</span>
          </a>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <!-- 中文说明：主题切换改成导航样式的 hover 菜单，和当前页面头部语言保持一致。 -->
            <nav aria-label="主导航">
              <ul class="text-ui flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-foreground">
                <li>
                  <span class="font-body-zh text-[var(--theme-text-secondary)]">服务器数量</span>
                  <span class="font-body-en ml-2 text-[var(--theme-text-primary)]">{{ totalCount }}</span>
                </li>
                <li>
                  <span class="font-body-zh text-[var(--theme-text-secondary)]">在线数量</span>
                  <span class="font-body-en ml-2 text-[var(--theme-text-primary)]">{{ onlineCount }}</span>
                </li>
                <li>
                  <span class="font-body-zh text-[var(--theme-text-secondary)]">流量概览</span>
                  <span class="font-body-en ml-2 text-[var(--theme-text-primary)]">
                    ↑ {{ formatBytes(totalTraffic.up, 1) }} ↓ {{ formatBytes(totalTraffic.down, 1) }}
                  </span>
                </li>
                <li class="group/theme relative pb-3 -mb-3">
                  <button
                    type="button"
                    class="font-body-zh inline-flex items-center gap-1.5 text-[var(--theme-text-primary)] transition-opacity duration-200 hover:opacity-70"
                    aria-label="模式菜单"
                  >
                    <span>模式</span>
                    <ChevronDown class="h-4 w-4" />
                  </button>

                  <div
                    class="pointer-events-none absolute top-full right-0 z-30 min-w-[13rem] pt-2 opacity-0 transition-opacity duration-150 group-hover/theme:pointer-events-auto group-hover/theme:opacity-100 group-focus-within/theme:pointer-events-auto group-focus-within/theme:opacity-100"
                  >
                    <div class="rounded-[1.5rem] border border-[var(--theme-divider)] bg-[var(--theme-surface-overlay)] p-3 shadow-[var(--surface-elevated-shadow)]">
                      <button
                        v-for="option in themeOptions"
                        :key="option.mode"
                        type="button"
                        class="flex w-full items-center justify-between rounded-[1rem] px-4 py-3 text-left transition-colors duration-200 hover:bg-[var(--theme-surface-panel-muted)]"
                        @click="setThemeMode(option.mode)"
                      >
                        <span class="font-body-zh text-ui text-[var(--theme-text-primary)]">{{ option.label }}</span>
                        <Check
                          v-if="themeMode === option.mode"
                          class="h-4 w-4 text-[var(--theme-text-primary)]"
                        />
                      </button>
                    </div>
                  </div>
                </li>
                <li>
                  <a
                    href="/admin"
                    class="font-body-zh inline-flex min-h-10 items-center justify-center rounded-[0.9rem] bg-[var(--theme-button-primary-bg)] px-5 py-2 text-[var(--theme-button-primary-fg)] transition-opacity duration-200 hover:opacity-90"
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

    <main class="site-container pt-[82px]">
      <!-- 中文说明：主体区域先实现分组切换和服务器卡片，后续再继续丰富节点信息。 -->
      <section class="flex min-h-[calc(100vh-82px)] flex-col gap-8 py-10">
        <div class="flex flex-wrap items-center justify-between gap-4">
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
              ↑ {{ formatSpeed(totalSpeed.up) }} ↓ {{ formatSpeed(totalSpeed.down) }}
            </span>
          </div>
        </div>

        <!-- 中文说明：节点卡片统一收敛到 NodeGrid 组件，避免页面层直接堆叠展示细节。 -->
        <NodeGrid :nodes="filteredNodes" />
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
  </div>
</template>
