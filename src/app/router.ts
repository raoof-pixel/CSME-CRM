import { useSyncExternalStore } from 'react'

// Hash router: #/pipeline/nurture → ['pipeline', 'nurture']. Works on GitHub Pages with no server config.

function read(): string[] {
  const h = window.location.hash.replace(/^#\/?/, '')
  return h ? h.split('/').map(decodeURIComponent) : ['today']
}

let current = read()
const listeners = new Set<() => void>()
window.addEventListener('hashchange', () => { current = read(); listeners.forEach(l => l()) })

export function useRoute(): string[] {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l) }, () => current)
}

export function go(path: string) {
  window.location.hash = path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`
}
