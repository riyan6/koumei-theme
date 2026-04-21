import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}天`
  if (hours > 0) return `${hours}小时`
  return `${minutes}分钟`
}

export function formatOsName(os: string): string {
  const s = os.toLowerCase()
  if (s.includes('debian')) return 'Debian'
  if (s.includes('ubuntu')) return 'Ubuntu'
  if (s.includes('centos')) return 'CentOS'
  if (s.includes('alpine')) return 'Alpine'
  if (s.includes('fedora')) return 'Fedora'
  if (s.includes('arch')) return 'Arch'
  if (s.includes('opensuse') || s.includes('suse')) return 'openSUSE'
  if (s.includes('rocky')) return 'Rocky'
  if (s.includes('almalinux') || s.includes('alma')) return 'AlmaLinux'
  if (s.includes('oracle')) return 'Oracle'
  if (s.includes('rhel') || s.includes('red hat')) return 'RHEL'
  if (s.includes('windows')) return 'Windows'
  if (s.includes('freebsd')) return 'FreeBSD'
  if (s.includes('openbsd')) return 'OpenBSD'
  if (s.includes('netbsd')) return 'NetBSD'
  if (s.includes('openwrt')) return 'OpenWrt'
  if (s.includes('gentoo')) return 'Gentoo'
  if (s.includes('nixos')) return 'NixOS'
  if (s.includes('void')) return 'Void'
  if (s.includes('kali')) return 'Kali'
  if (s.includes('raspbian')) return 'Raspbian'
  if (s.includes('armbian')) return 'Armbian'
  // fallback: first word
  return os.split(' ')[0]
}

export function formatPercent(used: number, total: number): number {
  if (total === 0) return 0
  return Math.round((used / total) * 10000) / 100
}

export function daysRemaining(expiredAt: string | null): number | null {
  if (!expiredAt) return null
  const exp = new Date(expiredAt)
  if (exp.getFullYear() <= 1) return null
  const now = new Date()
  const diff = exp.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function maskIp(ip: string): string {
  if (!ip) return '-'
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`
  }
  return ip
}
