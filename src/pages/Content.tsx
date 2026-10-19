import { useMemo, useState } from 'react'
import { useDb, personName, setContentStatus, update } from '../data/store'
import { useRoute } from '../app/router'
import { useUi } from '../app/uiState'
import { Tabs, fmtDate, Toast, useToast, Drawer, Field, Stat } from '../components/ui'
import type { ContentStatus, Brand, ContentItem } from '../data/types'

const FLOW: ContentStatus[] = ['Invited', 'Questions sent', 'Booked', 'Recorded', 'Editing', 'Sent to client', 'Approved', 'Published']
const next = (s: ContentStatus): ContentStatus | null => { const i = FLOW.indexOf(s); return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null }

const THEMES = [
  ['January', 'Special focus: the year ahead'], ['February', 'Small business leadership'], ['March', 'Women entrepreneurship'],
  ['April', 'E-commerce in Canada'], ['May', 'Retail and mental health'], ['June', 'Banking, finance and funding'],
  ['July', 'Success for startups'], ['August', 'Business growth and scaling'], ['September', 'Innovation and technology'],
  ['October', 'Small Business Month'], ['November', 'Manufacturing and digital health'], ['December', 'Economic and social development'],
]

export function Content(props: { tab?: string; title?: string } = {}) {
  const db = useDb()
  const route = useRoute()
  const ui = useUi()
  const tab = props.tab ?? route[1] ?? 'podcasts'
  const [toast, say] = useToast()
  const [editing, setEditing] = useState<ContentItem | null>(null)

  const items = useMemo(() => db.content.filter(ci => ui.brand === 'All' || ci.brand === ui.brand), [db, ui.brand])
  const podcasts = items.filter(ci => ci.type.startsWith('Podcast') || ci.type === 'Email interview')
  const articles = items.filter(ci => ci.type === 'Article' || ci.type === 'Expert quote')
  const inProd = items.filter(ci => ['Recorded', 'Editing', 'Sent to client', 'Approved'].includes(ci.status))
  const publishedThisMonth = items.filter(ci => ci.status === 'Published' && (ci.publishDate ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7))

  const advance = (ci: ContentItem) => {
    const n = next(ci.status); if (!n) return
    setContentStatus(ci.id, n)
    say(n === 'Published' ? 'Published. The company is now Nurturing and its journey has started.' : `Moved to ${n}`)
  }

  const Table = ({ list }: { list: ContentItem[] }) => (
    <div className="card wrap">
      <table className="tbl">
        <thead><tr><th>Piece</th><th>Company</th><th>Type</th><th>Brand</th><th>Host / writer</th><th>Date</th><th>Status</th><th className="act">Next step</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={8} className="empty">Nothing here. Book content from a company page.</td></tr>}
          {list.sort((a, b) => FLOW.indexOf(a.status) - FLOW.indexOf(b.status)).map(ci => {
            const c = db.companies.find(x => x.id === ci.companyId)
            const n = next(ci.status)
            return (
              <tr key={ci.id}>
                <td><b>{ci.liveUrl ? <a href={ci.liveUrl} target="_blank" rel="noreferrer">{ci.title}</a> : ci.title}</b>{ci.notes && <div className="muted small">{ci.notes}</div>}</td>
                <td>{c ? <a className="lnk" href={`#/company/${c.id}`}>{c.name}</a> : '—'}</td>
                <td className="muted">{ci.type}</td>
                <td className="small">{ci.brand}</td>
                <td className="small">{personName(ci.hostId)}{ci.editorId && ci.editorId !== ci.hostId ? ` / ${personName(ci.editorId)}` : ''}</td>
                <td className="muted small">{ci.status === 'Published' ? `Live ${fmtDate(ci.publishDate)}` : ci.recordingDate ? `Rec ${fmtDate(ci.recordingDate)}` : '—'}</td>
                <td><span className={`pill plain ${ci.status === 'Published' ? 'good' : 'Engage'}`}>{ci.status}</span></td>
                <td className="act">
                  <button className="btn sm ghost" onClick={() => setEditing(ci)}>Edit</button>{' '}
                  {n && <button className={`btn sm ${n === 'Published' ? 'pri' : ''}`} onClick={() => advance(ci)}>{n === 'Published' ? 'Publish' : `→ ${n}`}</button>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div className="page-head">
        <div><h1>{props.title ?? 'Content Studio'}</h1><p>Podcasts, interviews and articles, from invite to published. Publishing is the moment a lead becomes a relationship: it starts the 12-month journey.</p></div>
      </div>
      <div className="grid c4 mb">
        <Stat label="In production" value={inProd.length} sub="recorded, editing or with the client" />
        <Stat label="Booked, not recorded" value={items.filter(ci => ['Booked', 'Questions sent'].includes(ci.status)).length} />
        <Stat label="Published this month" value={publishedThisMonth.length} />
        <Stat label="Invites out" value={items.filter(ci => ci.status === 'Invited').length} sub="waiting on a yes" />
      </div>
      {!props.tab && <Tabs base="content" items={[{ key: 'podcasts', label: 'Podcasts and interviews', count: podcasts.length }, { key: 'articles', label: 'Articles and quotes', count: articles.length }, { key: 'calendar', label: 'Editorial calendar' }]} />}

      {tab === 'podcasts' && <Table list={podcasts} />}
      {tab === 'articles' && <Table list={articles} />}
      {tab === 'calendar' && (
        <div className="grid c3">
          {THEMES.map(([m, t], i) => {
            const now = new Date().getMonth()
            const state = i === now ? 'Selling now' : i === (now + 1) % 12 ? 'Last chance' : i < now ? 'Closed' : 'Open'
            return (
              <div key={m} className="card" style={{ padding: 16, opacity: state === 'Closed' ? .55 : 1 }}>
                <div className="row-between"><h3>{m}</h3><span className={`pill plain ${state === 'Selling now' ? 'maple' : state === 'Last chance' ? 'warn' : 'none'}`}>{state}</span></div>
                <p className="small" style={{ marginTop: 6 }}>{t}</p>
                <p className="muted small" style={{ marginTop: 8 }}>Pitch: sponsored article, expert quote, or a podcast tied to the theme.</p>
              </div>
            )
          })}
        </div>
      )}

      {editing && <EditContent item={editing} onClose={() => setEditing(null)} onSaved={() => say('Saved')} />}
      <Toast msg={toast} />
    </>
  )
}

function EditContent({ item, onClose, onSaved }: { item: ContentItem; onClose: () => void; onSaved: () => void }) {
  const db = useDb()
  const [f, setF] = useState({ ...item })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const save = () => { update(d => { const x = d.content.find(y => y.id === item.id); if (x) Object.assign(x, f) }); if (f.status !== item.status) setContentStatus(item.id, f.status); onSaved(); onClose() }
  return (
    <Drawer title="Edit content" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={save}>Save</button></>}>
      <div className="form c2">
        <div className="full"><Field label="Title"><input value={f.title} onChange={(e: any) => set('title', e.target.value)} /></Field></div>
        <Field label="Status"><select value={f.status} onChange={(e: any) => set('status', e.target.value)}>{FLOW.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Brand"><select value={f.brand} onChange={(e: any) => set('brand', e.target.value as Brand)}>{db.settings.activeBrands.map(b => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Host"><select value={f.hostId ?? ''} onChange={(e: any) => set('hostId', e.target.value || undefined)}><option value="">—</option>{db.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Editor / writer"><select value={f.editorId ?? ''} onChange={(e: any) => set('editorId', e.target.value || undefined)}><option value="">—</option>{db.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Recording date"><input type="date" value={f.recordingDate ?? ''} onChange={(e: any) => set('recordingDate', e.target.value || undefined)} /></Field>
        <Field label="Publish date"><input type="date" value={f.publishDate ?? ''} onChange={(e: any) => set('publishDate', e.target.value || undefined)} /></Field>
        <div className="full"><Field label="Live link"><input value={f.liveUrl ?? ''} onChange={(e: any) => set('liveUrl', e.target.value || undefined)} placeholder="https://" /></Field></div>
        <div className="full"><Field label="Notes"><textarea value={f.notes ?? ''} onChange={(e: any) => set('notes', e.target.value || undefined)} /></Field></div>
      </div>
    </Drawer>
  )
}
