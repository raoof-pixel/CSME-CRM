import { useEffect, useState } from 'react'
import type { Stage, Brand } from '../data/types'
import { phaseOf, PHASES, STAGES } from '../data/lifecycle'
import { useRoute } from '../app/router'

export const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('en-CA')
export const fmtDate = (iso?: string) => iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '—'
export const fmtDateLong = (iso?: string) => iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
export const initials = (name: string) => name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

// ---- icons (inline, 18px stroke icons) ----
const I = (d: string) => (props: { className?: string }) => (
  <svg className={props.className ?? 'ic'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
export const Icons = {
  today: I('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 15l2 2 4-4'),
  founder: I('M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.4 6.7 19.1l1-5.8L3.5 9.2l5.9-.9z'),
  pipeline: I('M4 5h16M4 12h12M4 19h7M18 10l3 2-3 2M13 17l3 2-3 2'),
  companies: I('M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1'),
  content: I('M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM19 11a7 7 0 0 1-14 0M12 18v3M8 21h8'),
  events: I('M4 4h16v6H4zM4 10v10h16V10M9 14h6M12 4V2'),
  sell: I('M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20'),
  team: I('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'),
  admin: I('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'),
  search: I('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3'),
  bell: I('M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0'),
  help: I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h0'),
  chat: I('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
  spark: I('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z'),
  sun: I('M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'),
  moon: I('M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'),
  menu: I('M3 6h18M3 12h18M3 18h18'),
  x: I('M18 6L6 18M6 6l12 12'),
  plus: I('M12 5v14M5 12h14'),
  check: I('M20 6L9 17l-5-5'),
  arrow: I('M5 12h14M12 5l7 7-7 7'),
  external: I('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3'),
  download: I('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'),
  upload: I('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'),
}

// ---- lifecycle visuals ----
export function StagePill({ stage }: { stage: Stage }) {
  const ph = phaseOf(stage)
  return <span className={`pill ${ph ?? 'none'}`}>{stage}</span>
}

export function StageStrip({ counts, active, base = '#/pipeline' }: { counts: Record<string, number>; active?: Stage; base?: string }) {
  return (
    <div>
      <div className="phaselbls"><span className="f">Find</span><span className="e">Engage</span><span className="g">Grow</span></div>
      <div className="stagestrip">
        {STAGES.map(s => {
          const ph = phaseOf(s)!
          const view = (Object.entries(PHASES) as [string, Stage[]][]).find(([, st]) => st.includes(s))
          void view
          return (
            <a key={s} href={`${base}/stage/${encodeURIComponent(s)}`} className={`ph-${ph} ${active === s ? 'on' : ''}`} title={`${counts[s] ?? 0} in ${s}`}>
              <div className="n">{counts[s] ?? 0}</div>
              <div className="t">{s}</div>
              <div className="bar" />
            </a>
          )
        })}
      </div>
    </div>
  )
}

export function BrandBar({ brands, active }: { brands: Brand[]; active?: Brand | 'All' }) {
  return <div className="brandbar">{brands.map(b => <span key={b} className={active === b ? 'on' : ''}>{b}</span>)}</div>
}

// ---- drawer ----
export function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: any; footer?: any }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e: any) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="drawer" role="dialog" aria-label={title}>
        <div className="dh"><h2>{title}</h2><button className="iconbtn" onClick={onClose} aria-label="Close"><Icons.x /></button></div>
        <div className="db">{children}</div>
        {footer && <div className="df">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: any }) {
  return <div className="field"><label>{label}</label>{children}</div>
}

export function Tabs({ items, base }: { items: Array<{ key: string; label: string; count?: number }>; base: string }) {
  const route = useRoute()
  const current = route[1] ?? items[0].key
  return (
    <nav className="tabs" aria-label="Sections">
      {items.map(t => (
        <a key={t.key} href={`#/${base}/${t.key}`} className={current === t.key ? 'on' : ''}>
          {t.label}{t.count !== undefined && <span className="n">{t.count}</span>}
        </a>
      ))}
    </nav>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: any }) {
  return <div className="empty"><b>{title}</b>{hint && <div>{hint}</div>}{action && <div className="mt">{action}</div>}</div>
}

export function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'warn' | 'good' }) {
  return <div className={`card stat ${tone ?? ''}`}><div className="l">{label}</div><div className="v">{value}</div>{sub && <div className="s">{sub}</div>}</div>
}

export function useToast(): [string | null, (m: string) => void] {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2200); return () => clearTimeout(t) }, [msg])
  return [msg, setMsg]
}

export function Toast({ msg }: { msg: string | null }) {
  return msg ? <div className="toast" role="status">{msg}</div> : null
}
