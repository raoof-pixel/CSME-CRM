import { useSyncExternalStore } from 'react'
import type { Brand } from '../data/types'

// Per-browser UI preferences: brand filter and theme. Not business data.

type UiState = { brand: Brand | 'All'; theme: 'light' | 'dark' | 'system'; railOpen: boolean }
const KEY = 'csme-crm-ui'

function load(): UiState {
  try { const raw = localStorage.getItem(KEY); if (raw) return { railOpen: false, ...JSON.parse(raw) } } catch { /* ignore */ }
  return { brand: 'All', theme: 'system', railOpen: false }
}

let state = load()
const listeners = new Set<() => void>()

export function useUi() {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l) }, () => state)
}

export function setUi(patch: Partial<UiState>) {
  state = { ...state, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify({ brand: state.brand, theme: state.theme })) } catch { /* ignore */ }
  applyTheme()
  listeners.forEach(l => l())
}

export function applyTheme() {
  const t = state.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : state.theme
  document.documentElement.setAttribute('data-theme', t)
}
applyTheme()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
