import { useMemo, useState } from 'react'
import type { Section, Field, Page } from '../data/schema'
import { useDb, personName, addRecord, updateRecord, deleteRecord, importRecords, todayIso } from '../data/store'
import type { GenericRecord } from '../data/types'
import { Drawer, Field as FieldWrap, fmtMoney, fmtDate, Icons, Empty } from './ui'
import { parseCsv, toCsv, download } from '../data/csv'

// ---------- value rendering ----------
function Cell({ f, v, db }: { f: Field; v: unknown; db: ReturnType<typeof useDb> }) {
  if (v === undefined || v === null || v === '') return <span className="muted">—</span>
  switch (f.type) {
    case 'money': return <span className="money">{fmtMoney(Number(v))}</span>
    case 'percent': return <>{Number(v)}%</>
    case 'date': return <>{fmtDate(String(v))}</>
    case 'datetime': return <>{new Date(String(v)).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
    case 'person': return <>{personName(String(v))}</>
    case 'company': { const c = db.companies.find(x => x.id === v); return c ? <a className="lnk" href={`#/company/${c.id}`}>{c.name}</a> : <>{String(v)}</> }
    case 'bool': return <>{v ? 'Yes' : 'No'}</>
    case 'url': return <a href={String(v)} target="_blank" rel="noreferrer">Open</a>
    case 'email': return <a href={`mailto:${v}`}>{String(v)}</a>
    case 'select': {
      const s = String(v)
      const tone = /done|paid|published|confirmed|won|approved|live|signed|received|resolved/i.test(s) ? 'good' : /overdue|lost|declined|blocked|critical|missing|churned|rejected/i.test(s) ? 'maple' : /progress|pending|waiting|editing|review|at risk|partial/i.test(s) ? 'warn' : 'none'
      return <span className={`pill plain ${tone}`}>{s}</span>
    }
    default: return <>{String(v)}</>
  }
}

function Input({ f, value, onChange, db }: { f: Field; value: unknown; onChange: (v: unknown) => void; db: ReturnType<typeof useDb> }) {
  const v = value === undefined || value === null ? '' : value
  switch (f.type) {
    case 'textarea': return <textarea value={String(v)} onChange={(e: any) => onChange(e.target.value)} />
    case 'number': case 'money': case 'percent': return <input type="number" value={v as any} onChange={(e: any) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
    case 'date': return <input type="date" value={String(v)} onChange={(e: any) => onChange(e.target.value || undefined)} />
    case 'datetime': return <input type="datetime-local" value={String(v).slice(0, 16)} onChange={(e: any) => onChange(e.target.value || undefined)} />
    case 'select': return <select value={String(v)} onChange={(e: any) => onChange(e.target.value || undefined)}><option value="">—</option>{(f.options ?? []).map(o => <option key={o}>{o}</option>)}</select>
    case 'person': return <select value={String(v)} onChange={(e: any) => onChange(e.target.value || undefined)}><option value="">—</option>{db.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    case 'company': return <select value={String(v)} onChange={(e: any) => onChange(e.target.value || undefined)}><option value="">—</option>{[...db.companies].filter(c => !c.archived).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    case 'bool': return <label className="inline small" style={{ height: 36 }}><input type="checkbox" checked={!!v} onChange={(e: any) => onChange(e.target.checked)} /> Yes</label>
    case 'url': return <input type="url" value={String(v)} placeholder="https://" onChange={(e: any) => onChange(e.target.value || undefined)} />
    case 'email': return <input type="email" value={String(v)} onChange={(e: any) => onChange(e.target.value || undefined)} />
    default: return <input value={String(v)} onChange={(e: any) => onChange(e.target.value)} />
  }
}

// ---------- the list ----------
export function GenericList({ section, unit, title, embedded }: { section: Section; unit: string; title?: string; embedded?: boolean }) {
  const db = useDb()
  const fields = section.fields ?? []
  const collection = section.collection!
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<GenericRecord | 'new' | null>(null)
  const [importing, setImporting] = useState(false)

  // records scoped to this unit; sections that fix a field value (e.g. role) also filter by it
  const fixed = fields.filter(f => f.hideInTable && f.type === 'select' && f.options?.length === 1)
  const rows = useMemo(() => (db.records[collection] ?? []).filter(r => !r.deletedAt && r.unit === unit && fixed.every(f => r[f.key] === f.options![0] || r[f.key] === undefined))
    .filter(r => !q || fields.some(f => String(r[f.key] ?? '').toLowerCase().includes(q.toLowerCase())) || db.companies.find(c => c.id === r.company)?.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db, collection, unit, q])

  const visible = fields.filter(f => !f.hideInTable)
  const singular = section.singular ?? 'row'
  const csvCols = fields.map(f => f.key)
  const template = () => download(`${section.key}-template.csv`, toCsv([Object.fromEntries(fields.map(f => [f.key, f.type === 'select' ? (f.options ?? [])[0] ?? '' : f.type === 'date' ? todayIso() : '']))], csvCols), 'text/csv')
  const exportCsv = () => download(`${unit || 'all'}-${section.key}.csv`, toCsv(rows.map(r => ({ ...r, company: db.companies.find(c => c.id === r.company)?.name ?? r.company })), csvCols), 'text/csv')

  return (
    <>
      <div className={embedded ? '' : 'card'}>
        <div className="hd">
          <h2>{title ?? section.label}<span className="sub">{rows.length}</span></h2>
          <div className="inline">
            <input className="btn sm" style={{ width: 180, fontWeight: 500 }} placeholder="Filter this list" value={q} onChange={(e: any) => setQ(e.target.value)} />
            <button className="btn sm ghost" onClick={template} title="Download a blank CSV with the right columns"><Icons.download />Template</button>
            <button className="btn sm ghost" onClick={() => setImporting(true)}><Icons.upload />Upload sheet</button>
            {rows.length > 0 && <button className="btn sm ghost" onClick={exportCsv}>Export</button>}
            <button className="btn sm pri" onClick={() => setEditing('new')}><Icons.plus />Add {singular}</button>
          </div>
        </div>
        {section.description && <div className="bd small muted" style={{ paddingBottom: 0 }}>{section.description}</div>}
        {rows.length === 0 ? <Empty title={`No ${singular}s yet.`} hint={`Add one, or upload a sheet using the template.`} /> : (
          <div className="wrap"><table className="tbl">
            <thead><tr>{visible.map(f => <th key={f.key} className={['money', 'number', 'percent'].includes(f.type ?? '') ? 'num' : ''}>{f.label}</th>)}<th className="act"></th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.id}>{visible.map(f => <td key={f.key} className={['money', 'number', 'percent'].includes(f.type ?? '') ? 'num' : ''}><Cell f={f} v={r[f.key]} db={db} /></td>)}<td className="act"><button className="btn sm ghost" onClick={() => setEditing(r)}>Edit</button></td></tr>)}</tbody>
          </table></div>
        )}
      </div>
      {editing && <RecordDrawer section={section} unit={unit} record={editing === 'new' ? null : editing} fixed={fixed} onClose={() => setEditing(null)} />}
      {importing && <ImportDrawer section={section} unit={unit} fixed={fixed} onClose={() => setImporting(false)} />}
    </>
  )
}

function RecordDrawer({ section, unit, record, fixed, onClose }: { section: Section; unit: string; record: GenericRecord | null; fixed: Field[]; onClose: () => void }) {
  const db = useDb()
  const fields = section.fields ?? []
  const [f, setF] = useState<Record<string, unknown>>(record ? { ...record } : Object.fromEntries(fixed.map(x => [x.key, x.options![0]])))
  const required = fields.filter(x => x.required)
  const ok = required.every(x => f[x.key] !== undefined && String(f[x.key]).trim() !== '')
  const save = () => {
    const data: Record<string, unknown> = {}
    fields.forEach(x => { data[x.key] = f[x.key] })
    if (record) updateRecord(section.collection!, record.id, data); else addRecord(section.collection!, unit, data)
    onClose()
  }
  const singular = section.singular ?? 'row'
  return (
    <Drawer title={record ? `Edit ${singular}` : `Add ${singular}`} onClose={onClose} footer={<>
      {record && <button className="btn" onClick={() => { if (confirm('Move this to the recycle bin?')) { deleteRecord(section.collection!, record.id); onClose() } }}>Delete</button>}
      <span style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!ok} onClick={save}>Save</button></>}>
      <div className="form c2">
        {fields.filter(x => !fixed.includes(x)).map(x => (
          <div key={x.key} className={x.wide || x.type === 'textarea' ? 'full' : ''}>
            <FieldWrap label={x.label + (x.required ? ' *' : '')}><Input f={x} value={f[x.key]} onChange={v => setF({ ...f, [x.key]: v })} db={db} /></FieldWrap>
          </div>
        ))}
      </div>
    </Drawer>
  )
}

function ImportDrawer({ section, unit, fixed, onClose }: { section: Section; unit: string; fixed: Field[]; onClose: () => void }) {
  const db = useDb()
  const fields = section.fields ?? []
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const onFile = (e: any) => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => setRows(parseCsv(String(r.result))); r.readAsText(file) }
  const run = () => {
    const mapped = rows.map(row => {
      const out: Record<string, unknown> = Object.fromEntries(fixed.map(x => [x.key, x.options![0]]))
      fields.forEach(f => {
        const raw = row[f.key.toLowerCase()] ?? row[f.label.toLowerCase()]
        if (raw === undefined || raw === '') return
        if (f.type === 'company') { const c = db.companies.find(x => x.name.toLowerCase() === raw.toLowerCase()); out[f.key] = c ? c.id : raw }
        else if (f.type === 'person') { const p = db.people.find(x => x.name.toLowerCase() === raw.toLowerCase()); out[f.key] = p ? p.id : raw }
        else if (['number', 'money', 'percent'].includes(f.type ?? '')) out[f.key] = Number(raw.replace(/[^0-9.-]/g, ''))
        else if (f.type === 'bool') out[f.key] = /^(y|yes|true|1)$/i.test(raw)
        else out[f.key] = raw
      })
      return out
    })
    importRecords(section.collection!, unit, mapped); onClose()
  }
  return (
    <Drawer title={`Upload ${section.label}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!rows.length} onClick={run}>Import {rows.length || ''} rows</button></>}>
      <div className="form">
        <FieldWrap label="CSV file. The first row must be column headers that match the template."><input type="file" accept=".csv,text/csv" onChange={onFile} /></FieldWrap>
        <p className="note">Columns: {fields.map(f => f.key).join(', ')}. Company and person columns are matched by name.</p>
        {rows.length > 0 && <p className="small">{rows.length} rows read.</p>}
      </div>
    </Drawer>
  )
}

// ---------- Tabs page: a page whose tabs are sections ----------
export function TabsPage({ page, tab, renderCustom }: { page: Page; tab?: string; renderCustom: (key: string, section: Section, page: Page) => any }) {
  const sections = page.sections ?? []
  const current = sections.find(s => s.key === tab) ?? sections[0]
  return (
    <>
      <div className="page-head"><div><h1>{page.label}</h1>{page.description && <p>{page.description}</p>}</div></div>
      {sections.length > 1 && (
        <nav className="tabs" aria-label="Sections">{sections.map(s => <a key={s.key} href={`#/${page.key}/${s.key}`} className={current.key === s.key ? 'on' : ''}>{s.label}</a>)}</nav>
      )}
      {current.kind === 'list' ? <GenericList section={current} unit="" /> : renderCustom(current.custom ?? current.kind ?? '', current, page)}
    </>
  )
}
