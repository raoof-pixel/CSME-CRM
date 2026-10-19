import { useMemo, useState } from 'react'
import { useDb, personName, assignOwner, addCompany, importCompanies } from '../data/store'
import { useRoute } from '../app/router'
import { useUi } from '../app/uiState'
import { PIPELINE_VIEWS, STAGES } from '../data/lifecycle'
import { lastContactDate, healthOf } from '../data/automations'
import { StageStrip, StagePill, Drawer, Field, fmtDate, fmtMoney, Icons, Toast, useToast } from '../components/ui'
import { parseCsv, download, COMPANY_TEMPLATE } from '../data/csv'
import type { Stage, Brand, Company } from '../data/types'

export function Pipeline() {
  const db = useDb()
  const route = useRoute()
  const ui = useUi()
  const [owner, setOwner] = useState('all')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [toast, say] = useToast()

  const singleStage = route[1] === 'stage' ? decodeURIComponent(route[2] ?? '') as Stage : undefined
  const viewKey = singleStage ? undefined : (route[1] ?? 'leads')
  const view = PIPELINE_VIEWS.find(v => v.key === viewKey) ?? PIPELINE_VIEWS[0]
  const stages: Stage[] = singleStage ? [singleStage] : [...view.stages]

  const scoped = useMemo(() => db.companies.filter(c => !c.archived && (ui.brand === 'All' || c.brands.includes(ui.brand as Brand))), [db, ui.brand])
  const counts = useMemo(() => { const m: Record<string, number> = {}; scoped.forEach(c => { m[c.stage] = (m[c.stage] ?? 0) + 1 }); return m }, [scoped])

  const rows = useMemo(() => scoped
    .filter(c => stages.includes(c.stage))
    .filter(c => owner === 'all' || (owner === 'none' ? !c.ownerId : c.ownerId === owner))
    .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.industry ?? '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage) || a.stageSince.localeCompare(b.stageSince)), [scoped, stages, owner, q])

  const sales = db.people.filter(p => p.role === 'Sales' || p.role === 'Sales lead' || p.role === 'Founder')
  const dealsFor = (c: Company) => db.deals.filter(d => d.companyId === c.id && !['Lost'].includes(d.stage))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pipeline</h1>
          <p>One board for every company, from first lead to delivered sponsor. The stage changes when you log an action, not when you edit a dropdown.</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setImporting(true)}><Icons.upload />Import a list</button>
          <button className="btn pri" onClick={() => setAdding(true)}><Icons.plus />Add company</button>
        </div>
      </div>

      <div className="mb"><StageStrip counts={counts} active={singleStage} /></div>

      <nav className="tabs" aria-label="Pipeline views">
        {PIPELINE_VIEWS.map(v => {
          const n = scoped.filter(c => (v.stages as readonly Stage[]).includes(c.stage)).length
          return <a key={v.key} href={`#/pipeline/${v.key}`} className={!singleStage && view.key === v.key ? 'on' : ''}>{v.label}<span className="n">{n}</span></a>
        })}
        {singleStage && <a href="#" className="on" onClick={(e: any) => e.preventDefault()}>{singleStage}<span className="n">{rows.length}</span></a>}
      </nav>

      <p className="muted small mb">{singleStage ? `Companies currently in ${singleStage}.` : view.hint}</p>

      <div className="filters">
        <input className="grow" placeholder="Filter by name or industry" value={q} onChange={(e: any) => setQ(e.target.value)} />
        <select value={owner} onChange={(e: any) => setOwner(e.target.value)}>
          <option value="all">Everyone</option>
          <option value="none">No owner</option>
          {sales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="card wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Company</th><th>Stage</th><th>Days in stage</th><th>Owner</th>
              {view.key === 'leads' && !singleStage && <th>Score</th>}
              {(view.key === 'nurture' || singleStage === 'Nurturing') && <th>Journey</th>}
              {(view.key === 'deals' || view.key === 'nurture') && <th className="num">Open deals</th>}
              <th>Last contact</th><th>Health</th><th>Brands</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="empty">Nothing here for this filter.</td></tr>}
            {rows.map(c => {
              const days = Math.max(0, Math.round((Date.now() - new Date(c.stageSince).getTime()) / 864e5))
              const limit = db.settings.stageLimits[c.stage]
              const last = lastContactDate(db, c.id)
              const h = healthOf(db, c.id)
              const done = c.journey.filter(j => j.doneDate).length
              const deals = dealsFor(c)
              return (
                <tr key={c.id}>
                  <td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a><div className="muted small">{c.industry}{c.city ? ` · ${c.city}` : ''}</div></td>
                  <td><StagePill stage={c.stage} /></td>
                  <td className={limit && days > limit ? 'money' : ''} style={limit && days > limit ? { color: 'var(--warn)' } : undefined}>{days}{limit && days > limit ? ` (limit ${limit})` : ''}</td>
                  <td>
                    <select className="btn sm" style={{ paddingRight: 24 }} value={c.ownerId ?? ''} onChange={(e: any) => { assignOwner(c.id, e.target.value || undefined); say(e.target.value ? `Assigned to ${personName(e.target.value)}` : 'Owner removed') }} aria-label="Owner">
                      <option value="">Unassigned</option>
                      {sales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  {view.key === 'leads' && !singleStage && <td>{c.score ?? '—'}</td>}
                  {(view.key === 'nurture' || singleStage === 'Nurturing') && <td style={{ minWidth: 120 }}><div className="progress"><i style={{ width: `${(done / 12) * 100}%` }} /></div><div className="muted small">{done} of 12 touches</div></td>}
                  {(view.key === 'deals' || view.key === 'nurture') && <td className="num">{deals.length ? <span className="money">{fmtMoney(deals.reduce((s, d) => s + d.value, 0))}</span> : <span className="muted">—</span>}</td>}
                  <td className="muted">{last ? fmtDate(last) : 'Never'}</td>
                  <td><span className={`pill plain ${h === 'Warm' ? 'good' : h === 'Cooling' ? 'warn' : 'maple'}`}>{h}</span></td>
                  <td><div className="brandbar">{c.brands.slice(0, 2).map(b => <span key={b}>{b}</span>)}{c.brands.length > 2 && <span>+{c.brands.length - 2}</span>}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {adding && <AddCompany onClose={() => setAdding(false)} onSaved={() => say('Company added as Mined')} />}
      {importing && <ImportList onClose={() => setImporting(false)} onDone={(n, s) => say(`${n} added, ${s} skipped as duplicates or blank`)} />}
      <Toast msg={toast} />
    </>
  )
}

export function AddCompany({ onClose, onSaved }: { onClose: () => void; onSaved?: (id: string) => void }) {
  const db = useDb()
  const [f, setF] = useState({ name: '', website: '', industry: '', city: '', brand: db.settings.defaultBrand as string, ownerId: '', source: 'Added by hand' })
  const set = (k: string, v: string) => setF({ ...f, [k]: v })
  const save = () => {
    if (!f.name.trim()) return
    const id = addCompany({ name: f.name.trim(), website: f.website || undefined, industry: f.industry || undefined, city: f.city || undefined, brands: [f.brand as Brand], ownerId: f.ownerId || undefined, source: f.source, stage: f.ownerId ? 'Assigned' : 'Mined' })
    onSaved?.(id); onClose()
  }
  const sales = db.people.filter(p => ['Sales', 'Sales lead', 'Founder'].includes(p.role))
  return (
    <Drawer title="Add a company" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.name.trim()} onClick={save}>Add company</button></>}>
      <div className="form c2">
        <div className="full"><Field label="Company name"><input value={f.name} onChange={(e: any) => set('name', e.target.value)} autoFocus /></Field></div>
        <Field label="Website"><input value={f.website} onChange={(e: any) => set('website', e.target.value)} placeholder="https://" /></Field>
        <Field label="Industry"><input value={f.industry} onChange={(e: any) => set('industry', e.target.value)} /></Field>
        <Field label="City"><input value={f.city} onChange={(e: any) => set('city', e.target.value)} /></Field>
        <Field label="Brand"><select value={f.brand} onChange={(e: any) => set('brand', e.target.value)}>{db.settings.activeBrands.map(b => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Owner"><select value={f.ownerId} onChange={(e: any) => set('ownerId', e.target.value)}><option value="">Assign later</option>{sales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Source"><select value={f.source} onChange={(e: any) => set('source', e.target.value)}>{['Added by hand', 'LinkedIn scan', 'News alert', 'Referral', 'Event attendee', 'Inbound'].map(s => <option key={s}>{s}</option>)}</select></Field>
        <div className="full"><p className="note">Duplicates are checked by name on import. For one company, search first; the search box at the top finds it in two letters.</p></div>
      </div>
    </Drawer>
  )
}

function ImportList({ onClose, onDone }: { onClose: () => void; onDone: (added: number, skipped: number) => void }) {
  const db = useDb()
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [list, setList] = useState('New prospects')
  const [brand, setBrand] = useState<string>(db.settings.defaultBrand)
  const [ownerId, setOwnerId] = useState('')
  const sales = db.people.filter(p => ['Sales', 'Sales lead', 'Founder'].includes(p.role))
  const onFile = (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader(); r.onload = () => setRows(parseCsv(String(r.result))); r.readAsText(file)
  }
  const run = () => { const res = importCompanies(rows, { leadList: list, ownerId: ownerId || undefined, brands: [brand as Brand] }); onDone(res.added, res.skipped); onClose() }
  return (
    <Drawer title="Import a lead list" onClose={onClose} footer={<><button className="btn" onClick={() => download('lead-list-template.csv', COMPANY_TEMPLATE, 'text/csv')}><Icons.download />Template</button><span style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!rows.length} onClick={run}>Import {rows.length || ''} rows</button></>}>
      <div className="form">
        <Field label="CSV file (columns: company, website, industry, city, province, contact, title, email, phone, linkedin)"><input type="file" accept=".csv,text/csv" onChange={onFile} /></Field>
        <Field label="List name (the batch it came from)"><input value={list} onChange={(e: any) => setList(e.target.value)} /></Field>
        <Field label="Brand"><select value={brand} onChange={(e: any) => setBrand(e.target.value)}>{db.settings.activeBrands.map(b => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Who works this list"><select value={ownerId} onChange={(e: any) => setOwnerId(e.target.value)}><option value="">Assign later (stays in Mined)</option>{sales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        {rows.length > 0 && <p className="note">{rows.length} rows read. Companies already in the CRM (same name) are skipped, so a list can be re-imported safely.</p>}
      </div>
    </Drawer>
  )
}
