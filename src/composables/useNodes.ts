import { ref, computed } from 'vue'
import type { Node, NodeStatus, NodeWithStatus, PublicInfo } from '@/types/node'
import { mockNodes, mockNodeStatuses, mockPublicInfo } from '@/mock/data'

const nodes = ref<Node[]>([])
const statuses = ref<Record<string, NodeStatus>>({})
const publicInfo = ref<PublicInfo | null>(null)
const searchQuery = ref('')
const selectedGroup = ref<string>(localStorage.getItem('nodeSelectedGroup') || '')
const viewMode = ref<'grid' | 'table'>(
  // 中文说明：默认展示恢复为四列网格模式，更符合常规节点概览的浏览习惯。
  (localStorage.getItem('nodeViewMode') as 'grid' | 'table') || 'table',
)

type ApiResponse<T> = {
  status: string
  message: string
  data: T
}

type RpcResponse<T> = {
  jsonrpc: string
  id: number | string | null
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

const STATUS_POLL_INTERVAL = 2000

let requestTimer: ReturnType<typeof setInterval> | null = null

export function useNodes() {
  function loadMockData() {
    nodes.value = mockNodes
    statuses.value = mockNodeStatuses
    publicInfo.value = mockPublicInfo
  }

  // 中文说明：Komari 的公开接口有统一包裹结构，这里做一层轻量解析，避免业务层重复判断。
  async function fetchApiData<T>(url: string): Promise<T> {
    const response = await fetch(url, { credentials: 'include' })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    const result = await response.json() as ApiResponse<T>

    if (result.status !== 'success') {
      throw new Error(result.message || 'Request failed')
    }

    return result.data
  }

  // 中文说明：RPC2 是 Komari 文档里推荐优先使用的接口，这里统一封装 JSON-RPC 请求，减少页面层耦合。
  async function fetchRpcResult<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch('/api/rpc2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    })

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`)
    }

    const result = await response.json() as RpcResponse<T>

    if (result.error) {
      throw new Error(result.error.message || 'RPC request failed')
    }

    if (result.result === undefined) {
      throw new Error('RPC response missing result')
    }

    return result.result
  }

  function stopStatusPolling() {
    if (requestTimer) {
      clearInterval(requestTimer)
      requestTimer = null
    }
  }

  function applyLatestStatuses(latestStatuses: Record<string, NodeStatus>) {
    const nextStatuses: Record<string, NodeStatus> = { ...latestStatuses }

    // 中文说明：若某些节点暂时没有最新状态，则补一个离线占位，避免界面空指针或排序异常。
    for (const node of nodes.value) {
      if (!nextStatuses[node.uuid]) {
        nextStatuses[node.uuid] = {
          client: node.uuid,
          time: new Date().toISOString(),
          cpu: 0,
          gpu: 0,
          ram: 0,
          ram_total: node.mem_total,
          swap: 0,
          swap_total: node.swap_total,
          load: 0,
          load5: 0,
          load15: 0,
          temp: 0,
          disk: 0,
          disk_total: node.disk_total,
          net_in: 0,
          net_out: 0,
          net_total_up: 0,
          net_total_down: 0,
          process: 0,
          connections: 0,
          connections_udp: 0,
          uptime: 0,
          online: false,
        }
      }
    }

    statuses.value = nextStatuses
  }

  async function refreshLatestStatuses() {
    const latestStatuses = await fetchRpcResult<Record<string, NodeStatus>>('common:getNodesLatestStatus')
    applyLatestStatuses(latestStatuses)
  }

  function startStatusPolling() {
    stopStatusPolling()

    // 中文说明：最新状态改为轮询 RPC2 接口，规避本地调试时跨域和 WebSocket 代理的不稳定因素。
    requestTimer = setInterval(() => {
      refreshLatestStatuses().catch((error) => {
        console.warn('Failed to refresh latest statuses:', error)
      })
    }, STATUS_POLL_INTERVAL)
  }

  async function initializeData() {
    try {
      const [publicData, nodeData] = await Promise.all([
        fetchApiData<PublicInfo>('/api/public'),
        fetchApiData<Node[]>('/api/nodes'),
      ])

      publicInfo.value = publicData
      nodes.value = nodeData
      statuses.value = {}
    } catch (error) {
      console.warn('Failed to load Komari APIs, fallback to mock data:', error)
      stopStatusPolling()
      loadMockData()
      return
    }

    try {
      await refreshLatestStatuses()
    } catch (error) {
      console.warn('Failed to load latest statuses, will continue polling:', error)
    }

    startStatusPolling()
  }

  function disposeRealtime() {
    stopStatusPolling()
  }

  const groups = computed<string[]>(() => {
    const set = new Set<string>()
    for (const node of nodes.value) {
      if (node.group) set.add(node.group)
    }
    return Array.from(set).sort()
  })

  const nodesWithStatus = computed<NodeWithStatus[]>(() => {
    return nodes.value
      .filter((n) => !n.hidden)
      .map((node) => ({
        node,
        status: statuses.value[node.uuid] ?? null,
        online: statuses.value[node.uuid]?.online ?? false,
      }))
      .sort((a, b) => b.node.weight - a.node.weight)
  })

  const filteredNodes = computed<NodeWithStatus[]>(() => {
    let result = nodesWithStatus.value

    if (selectedGroup.value) {
      result = result.filter((n) => n.node.group === selectedGroup.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter(
        (n) =>
          n.node.name.toLowerCase().includes(q) ||
          n.node.group.toLowerCase().includes(q) ||
          n.node.region.includes(q) ||
          n.node.tags.toLowerCase().includes(q),
      )
    }

    return result
  })

  const onlineCount = computed(() => filteredNodes.value.filter((n) => n.online).length)
  const totalCount = computed(() => filteredNodes.value.length)

  const totalRegions = computed(() => {
    const regions = new Set<string>()
    for (const n of nodesWithStatus.value) {
      if (n.online && n.node.region) regions.add(n.node.region)
    }
    return regions.size
  })

  const totalTraffic = computed(() => {
    let up = 0
    let down = 0
    for (const n of nodesWithStatus.value) {
      if (n.status && n.online) {
        up += n.status.net_total_up
        down += n.status.net_total_down
      }
    }
    return { up, down }
  })

  const totalSpeed = computed(() => {
    let up = 0
    let down = 0
    for (const n of nodesWithStatus.value) {
      if (n.status && n.online) {
        up += n.status.net_out
        down += n.status.net_in
      }
    }
    return { up, down }
  })

  function setGroup(group: string) {
    selectedGroup.value = group
    localStorage.setItem('nodeSelectedGroup', group)
  }

  function setViewMode(mode: 'grid' | 'table') {
    viewMode.value = mode
    localStorage.setItem('nodeViewMode', mode)
  }

  function setSearch(query: string) {
    searchQuery.value = query
  }

  return {
    nodes,
    statuses,
    publicInfo,
    searchQuery,
    selectedGroup,
    viewMode,
    groups,
    nodesWithStatus,
    filteredNodes,
    onlineCount,
    totalCount,
    totalRegions,
    totalTraffic,
    totalSpeed,
    loadMockData,
    initializeData,
    disposeRealtime,
    setGroup,
    setViewMode,
    setSearch,
  }
}
