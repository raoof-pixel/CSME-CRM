import { useMemo, useState } from 'react'
import { useDb, personName, setStage, completeJourneyTouch, addContact, assignOwner, update, addContent, upsertDeal, uid, todayIso, addDays } from '../data/store'
import { useRoute } from '../app/router'
import { useUi } from '../app/uiState'
import { STAGES, phaseOf, stageIndex } from '../data/lifecycle'
import { lastContactDate, healthOf } from '../data/automations'
import { StagePill, Drawer, Field, Tabs, fmtDate, fmtDateLong, fmtMoney, Icons, Toast, useToast, Stat } from '../components/ui'
import { LogActivity } from '../components/LogActivity'
import { AddCompany } from './Pipeline'
import type { Brand, Stage, ContentType, Contact } from '../data/types'

export function Companies() {
  const db = useDb()
  const route = useRoute()
  const ui = useUi()
  const tab = route[1] ?? 'all'
  const [q, setQ] = useState('')
  const [stage, setStageF] = useState('all')
  const [owner, setOwner] = useState('all')
  const [health, setHealth] = useState('all')
  const [adding, setAdding] = useState(false)
  const [toast, say] = useToast()

  const rows = useMemo(() => db.companies
    .filter(c => !c.archived && (ui.brand === 'All' || c.brands.includes(ui.brand as Brand)))
    .filter(c => stage === 'all' || c.stage === stage)
    .filter(c => owner === 'all' || (owner === 'none' ? !c.ownerId : c.ownerId === owner))
    .filter(c => health === 'all' || healthOf(db, c.id) === health)
    .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.industry ?? '').toLowerCase().includes(q.toLowerCase()) || (c.city ?? '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [db, ui.brand, q, stage, owner, health])

  const contacts = useMemo(() => db.contacts.filter(ct => {
    const c = db.companies.find(x => x.id === ct.companyId)
    return c && !c.archived && (ui.brand === 'All' || c.brands.includes(ui.brand as Brand)) && (!q || ct.name.toLowerCase().includes(q.toLowerCase()) || c.name.toLowerCase().includes(q.toLowerCase()))
  }), [db, ui.brand, q])

  const sales = db.people.filter(p => ['Sales', 'Sales lead', 'Founder'].includes(p.role))

  return (
    <>
      <div className="page-head">
        <div><h1>Companies</h1><p>The one shared list. Open a company to see its whole history on one page: contacts, content, journey, deals and invoices.</p></div>
        <div className="page-actions"><button className="btn pri" onClick={() => setAdding(true)}><Icons.plus />Add company</button></div>
      </div>
      <Tabs base="companies" items={[{ key: 'all', label: 'Companies', count: rows.length }, { key: 'contacts', label: 'Contacts', count: contacts.length }]} />

      <div className="filters">
        <input className="grow" placeholder={tab === 'contacts' ? 'Search people or companies' : 'Search name, industry or city'} value={q} onChange={(e: any) => setQ(e.target.value)} />
        {tab !== 'contacts' && <>
          <select value={stage} onChange={(e: any) => setStageF(e.target.value)}><option value="all">Any stage</option>{[...STAGES, 'Not a fit'].map(s => <option key={s}>{s}</option>)}</select>
          <select value={owner} onChange={(e: any) => setOwner(e.target.value)}><option value="all">Any owner</option><option value="none">No owner</option>{sales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select value={health} onChange={(e: any) => setHealth(e.target.value)}><option value="all">Any health</option><option>Warm</option><option>Cooling</option><option>Cold</option></select>
        </>}
      </div>

      {tab === 'contacts' ? (
        <div className="card wrap">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Title</th><th>Company</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
            <tbody>
              {contacts.length === 0 && <tr><td colSpan={6} className="empty">No contacts yet. Add them from a company page.</td></tr>}
              {contacts.map(ct => {
                const c = db.companies.find(x => x.id === ct.companyId)!
                return <tr key={ct.id}><td><b>{ct.name}</b></td><td className="muted">{ct.title}</td><td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a></td><td>{ct.email ? <a href={`mailto:${ct.email}`}>{ct.email}</a> : '—'}</td><td>{ct.phone ?? '—'}</td><td>{ct.decisionMaker ? <span className="pill plain good">Decision-maker</span> : <span className="muted">Contact</span>}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card wrap">
          <table className="tbl">
            <thead><tr><th>Company</th><th>Stage</th><th>Owner</th><th>Contacts</th><th>Last contact</th><th>Health</th><th className="num">Won</th><th>Source</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="empty">No companies match.</td></tr>}
              {rows.map(c => {
                const won = db.deals.filter(d => d.companyId === c.id && d.stage === 'Won').reduce((s, d) => s + d.value, 0)
                const h = healthOf(db, c.id)
                const n = db.contacts.filter(ct => ct.companyId === c.id).length
                const last = lastContactDate(db, c.id)
                return (
                  <tr key={c.id}>
                    <td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a><div className="muted small">{c.industry}{c.city ? ` · ${c.city}` : ''}</div></td>
                    <td><StagePill stage={c.stage} /></td>
                    <td>{personName(c.ownerId)}</td>
                    <td className="muted">{n || '—'}</td>
                    <td className="muted">{last ? fmtDate(last) : 'Never'}</td>
                    <td><span className={`pill plain ${h === 'Warm' ? 'good' : h === 'Cooling' ? 'warn' : 'maple'}`}>{h}</span></td>
                    <td className="num">{won ? <span className="money">{fmtMoney(won)}</span> : <span className="muted">—</span>}</td>
                    <td className="muted small">{c.source}{c.leadList ? ` · ${c.leadList}` : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {adding && <AddCompany onClose={() => setAdding(false)} onSaved={(id) => { say('Company added'); window.location.hash = `#/company/${id}` }} />}
      <Toast msg={toast} />
    </>
  )
}

// ---------------- company page ----------------

export function CompanyPage({ id }: { id?: string }) {
  const db = useDb()
  const c = db.companies.find(x => x.id === id)
  const [log, setLog] = useState(false)
  const [drawer, setDrawer] = useState<'contact' | 'content' | 'deal' | 'edit' | null>(null)
  const [toast, say] = useToast()
  if (!c) return <div className="empty"><b>Company not found.</b><a href="#/companies">Back to companies</a></div>

  const contacts = db.contacts.filter(x => x.companyId === c.id)
  const acts = db.activities.filter(a => a.companyId === c.id).sort((a, b) => b.date.localeCompare(a.date))
  const content = db.content.filter(x => x.companyId === c.id)
  const deals = db.deals.filter(x => x.companyId === c.id)
  const invoices = db.invoices.filter(i => deals.some(d => d.id === i.dealId))
  const deliverables = db.deliverables.filter(i => deals.some(d => d.id === i.dealId))
  const won = deals.filter(d => d.stage === 'Won').reduce((s, d) => s + d.value, 0)
  const open = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0)
  const h = healthOf(db, c.id)
  const last = lastContactDate(db, c.id)
  const idx = stageIndex(c.stage)
  const sales = db.people.filter(p => ['Sales', 'Sales lead', 'Founder'].includes(p.role))
  const days = Math.max(0, Math.round((Date.now() - new Date(c.stageSince).getTime()) / 864e5))

  const nextTouch = c.journey.find(j => !j.doneDate)
  const todayS = todayIso()

  return (
    <>
      <div className="page-head">
        <div>
          <div className="inline small muted" style={{ marginBottom: 6 }}><a href="#/companies">Companies</a><span>/</span><span>{c.name}</span>{c.sample && <span className="tag">sample</span>}</div>
          <h1>{c.name}</h1>
          <p className="inline">
            <StagePill stage={c.stage} />
            <span className="muted">{days} days in stage</span>
            <span className={`pill plain ${h === 'Warm' ? 'good' : h === 'Cooling' ? 'warn' : 'maple'}`}>{h}</span>
            <span className="muted">{c.industry}{c.city ? ` · ${c.city}${c.province ? ', ' + c.province : ''}` : ''}</span>
            {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="inline small"><Icons.external className="ic" style={{ width: 14, height: 14 } as any} />{c.website.replace(/^https?:\/\//, '')}</a>}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setDrawer('contact')}>Add contact</button>
          <button className="btn" onClick={() => setDrawer('content')}>Book content</button>
          <button className="btn" onClick={() => setDrawer('deal')}>Start a deal</button>
          <button className="btn pri" onClick={() => setLog(true)}>Log a touch</button>
        </div>
      </div>

      {/* lifecycle rail */}
      <div className="card mb" style={{ padding: '14px 16px' }}>
        <div className="row-between mb" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 14 }}>Lifecycle</h2>
          <div className="inline small">
            <span className="muted">Owner</span>
            <select className="btn sm" value={c.ownerId ?? ''} onChange={(e: any) => { assignOwner(c.id, e.target.value || undefined); say('Owner updated') }}><option value="">Unassigned</option>{sales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            {c.stage !== 'Not a fit' && <button className="btn sm ghost" onClick={() => { if (confirm(`Mark ${c.name} as not a fit? It leaves the pipeline but keeps its history.`)) { setStage(c.id, 'Not a fit', 'Marked not a fit'); say('Marked not a fit') } }}>Not a fit</button>}
            {c.stage === 'Not a fit' && <button className="btn sm" onClick={() => { setStage(c.id, 'Validated', 'Brought back'); say('Back in the pipeline') }}>Bring back</button>}
          </div>
        </div>
        <div className="stagestrip" style={{ gap: 3 }}>
          {STAGES.map((s, i) => {
            const ph = phaseOf(s)!
            const reached = i <= idx && c.stage !== 'Not a fit'
            return <div key={s} className={`ph-${ph}`} style={{ padding: '6px 6px 4px', borderRadius: 6, background: reached ? `var(--${ph.toLowerCase()}-tint)` : 'var(--surface-2)', opacity: reached ? 1 : .55 }}>
              <div className="t" style={{ marginTop: 0, color: reached ? `var(--${ph.toLowerCase()})` : undefined }}>{s}</div>
              <div className="bar" style={{ marginTop: 6, opacity: reached ? 1 : .25 }} />
            </div>
          })}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          {c.stage === 'Nurturing' && nextTouch && <>Next journey touch: <b>{nextTouch.type}</b> due {fmtDate(nextTouch.dueDate)}.</>}
          {['Mined', 'Validated'].includes(c.stage) && 'Add a decision-maker contact to move to Enriched, then assign an owner.'}
          {c.stage === 'Assigned' && 'Log the first email, call or LinkedIn message to move to Contacted.'}
          {c.stage === 'Contacted' && 'Book a podcast, email interview or article to move to Content booked.'}
          {c.stage === 'Content booked' && 'When the piece is published, the 12-month journey starts automatically.'}
          {c.stage === 'Pitched' && 'A proposal is out. Mark the deal Won to create deliverables.'}
        </p>
      </div>

      <div className="grid side">
        <div className="stack" style={{ gap: 16 }}>
          {/* journey */}
          <div className="card">
            <div className="hd"><h2>12-month journey<span className="sub">{c.journey.length ? `${c.journey.filter(j => j.doneDate).length} of 12 done · started ${fmtDate(c.journeyStart)}` : 'starts when content is published'}</span></h2></div>
            <div className="bd">
              {c.journey.length === 0 ? (
                <p className="muted small">Twelve helpful touches, one a month, from email interview to awards nomination. They keep the relationship warm until the event pitch. Publish a podcast, interview or article and the plan is created.</p>
              ) : (
                <div className="journey">
                  {c.journey.map(j => {
                    const late = !j.doneDate && j.dueDate < todayS
                    const due = !j.doneDate && !late && j.dueDate <= addDays(todayS, 7)
                    return (
                      <div key={j.month} className={`jt ${j.doneDate ? 'done' : late ? 'late' : due ? 'due' : ''}`}>
                        <div className="m">M{j.month}</div>
                        <div className="ty">{j.type}</div>
                        <div className="d">{j.doneDate ? `Done ${fmtDate(j.doneDate)}` : fmtDate(j.dueDate)}</div>
                        {!j.doneDate && <button className="btn sm" onClick={() => { completeJourneyTouch(c.id, j.month); say(`Month ${j.month} logged`) }}>Done</button>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* deals */}
          <div className="card">
            <div className="hd"><h2>Deals<span className="sub">{fmtMoney(won)} won · {fmtMoney(open)} open</span></h2><button className="btn sm" onClick={() => setDrawer('deal')}>Start a deal</button></div>
            {deals.length === 0 ? <div className="empty small">No deals yet. When the relationship is warm, start one for a sponsorship, booth or media package.</div> : (
              <table className="tbl"><thead><tr><th>Deal</th><th>Stage</th><th className="num">Value</th><th>Owner</th><th>Next</th></tr></thead>
                <tbody>{deals.map(d => <tr key={d.id}><td><b>{d.title}</b><div className="muted small">{d.eventKey ? db.events.find(e => e.key === d.eventKey)?.name : d.brand}</div></td><td><span className={`pill plain ${d.stage === 'Won' ? 'good' : d.stage === 'Lost' ? 'none' : 'Grow'}`}>{d.stage}</span></td><td className="num money">{fmtMoney(d.value)}</td><td>{personName(d.ownerId)}</td><td className="small">{d.stage === 'Lost' ? <span className="muted">{d.lostReason}</span> : d.nextAction ? <>{d.nextAction}<div className="muted">{fmtDate(d.nextFollowUp)}</div></> : '—'}</td></tr>)}</tbody></table>
            )}
            {(invoices.length > 0 || deliverables.length > 0) && (
              <div className="bd" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="grid c2">
                  <div><h3 className="mb" style={{ marginBottom: 6 }}>Invoices</h3>{invoices.length === 0 ? <span className="muted small">None</span> : invoices.map(i => <div key={i.id} className="row-between small"><span>{i.number} · {i.status}</span><span className="money">{fmtMoney(i.amount - i.paid)} due</span></div>)}</div>
                  <div><h3 style={{ marginBottom: 6 }}>Deliverables</h3>{deliverables.length === 0 ? <span className="muted small">None</span> : deliverables.map(i => <div key={i.id} className="row-between small"><span>{i.what}</span><span className={`pill plain ${i.status === 'Delivered' ? 'good' : 'warn'}`}>{i.status}</span></div>)}</div>
                </div>
              </div>
            )}
          </div>

          {/* content */}
          <div className="card">
            <div className="hd"><h2>Content<span className="sub">podcasts, interviews, articles</span></h2><button className="btn sm" onClick={() => setDrawer('content')}>Book content</button></div>
            {content.length === 0 ? <div className="empty small">Nothing booked. A podcast or email interview is the fastest way to open a relationship.</div> : (
              <table className="tbl"><thead><tr><th>Piece</th><th>Type</th><th>Status</th><th>Brand</th><th>Date</th></tr></thead>
                <tbody>{content.map(ci => <tr key={ci.id}><td><b>{ci.liveUrl ? <a href={ci.liveUrl} target="_blank" rel="noreferrer">{ci.title}</a> : ci.title}</b></td><td className="muted">{ci.type}</td><td><span className={`pill plain ${ci.status === 'Published' ? 'good' : 'Engage'}`}>{ci.status}</span></td><td className="small">{ci.brand}</td><td className="muted small">{fmtDate(ci.publishDate ?? ci.recordingDate)}</td></tr>)}</tbody></table>
            )}
          </div>

          {/* timeline */}
          <div className="card">
            <div className="hd"><h2>History<span className="sub">{acts.length} entries · last contact {last ? fmtDateLong(last) : 'never'}</span></h2></div>
            <div className="bd">
              {acts.length === 0 ? <p className="muted small">Nothing logged yet.</p> : (
                <div className="timeline">{acts.map(a => <div key={a.id} className={`ev ${a.kind === 'System' ? 'sys' : ''}`}><div className="when">{fmtDate(a.date)}</div><div>{a.kind !== 'System' && <span className="k">{a.channel ?? a.kind}</span>}{a.summary}<span className="muted small"> · {personName(a.personId)}</span></div></div>)}</div>
              )}
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="hd"><h2>Contacts<span className="sub">{contacts.length}</span></h2><button className="btn sm" onClick={() => setDrawer('contact')}>Add</button></div>
            <div className="bd stack">
              {contacts.length === 0 && <p className="muted small">No people yet. Add the decision-maker to move this company to Enriched.</p>}
              {contacts.map(ct => <div key={ct.id} className="small"><b>{ct.name}</b> {ct.decisionMaker && <span className="pill plain good" style={{ height: 18, fontSize: 10.5 }}>Decision-maker</span>}<div className="muted">{ct.title}</div>{ct.email && <div><a href={`mailto:${ct.email}`}>{ct.email}</a></div>}{ct.phone && <div>{ct.phone}</div>}{ct.linkedin && <div><a href={ct.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></div>}</div>)}
            </div>
          </div>
          <div className="card">
            <div className="hd"><h2>Details</h2><button className="btn sm" onClick={() => setDrawer('edit')}>Edit</button></div>
            <div className="bd">
              <dl className="kv">
                <dt>Brands</dt><dd><div className="brandbar">{c.brands.map(b => <span key={b} className="on">{b}</span>)}</div></dd>
                <dt>Source</dt><dd>{c.source ?? '—'}{c.leadList ? ` · ${c.leadList}` : ''}</dd>
                <dt>Fit score</dt><dd>{c.score ?? '—'}</dd>
                <dt>Size</dt><dd>{c.size ?? '—'}</dd>
                <dt>LinkedIn</dt><dd>{c.linkedin ? <a href={c.linkedin} target="_blank" rel="noreferrer">Company page</a> : '—'}</dd>
                <dt>Added</dt><dd>{fmtDateLong(c.createdAt)}</dd>
                <dt>Tags</dt><dd>{c.tags.length ? c.tags.map(t => <span key={t} className="tag" style={{ marginRight: 4 }}>{t}</span>) : '—'}</dd>
              </dl>
            </div>
          </div>
          <div className="grid c2">
            <Stat label="Won" value={fmtMoney(won)} />
            <Stat label="Open" value={fmtMoney(open)} />
          </div>
        </div>
      </div>

      {log && <LogActivity companyId={c.id} onClose={() => setLog(false)} onSaved={() => say('Logged')} />}
      {drawer === 'contact' && <ContactDrawer companyId={c.id} onClose={() => setDrawer(null)} onSaved={() => say('Contact added')} />}
      {drawer === 'content' && <ContentDrawer companyId={c.id} onClose={() => setDrawer(null)} onSaved={() => say('Content booked')} />}
      {drawer === 'deal' && <DealDrawer companyId={c.id} onClose={() => setDrawer(null)} onSaved={() => say('Deal started')} />}
      {drawer === 'edit' && <EditCompany companyId={c.id} onClose={() => setDrawer(null)} onSaved={() => say('Saved')} />}
      <Toast msg={toast} />
    </>
  )
}

function ContactDrawer({ companyId, onClose, onSaved }: { companyId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Omit<Contact, 'id' | 'companyId'>>({ name: '', title: '', email: '', phone: '', linkedin: '', decisionMaker: true })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return (
    <Drawer title="Add a contact" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.name.trim()} onClick={() => { addContact({ companyId, ...f }); onSaved(); onClose() }}>Add contact</button></>}>
      <div className="form c2">
        <Field label="Full name"><input value={f.name} onChange={(e: any) => set('name', e.target.value)} autoFocus /></Field>
        <Field label="Title"><input value={f.title} onChange={(e: any) => set('title', e.target.value)} /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={(e: any) => set('email', e.target.value)} /></Field>
        <Field label="Phone or WhatsApp"><input value={f.phone} onChange={(e: any) => set('phone', e.target.value)} /></Field>
        <div className="full"><Field label="LinkedIn URL"><input value={f.linkedin} onChange={(e: any) => set('linkedin', e.target.value)} /></Field></div>
        <div className="full"><label className="inline small"><input type="checkbox" checked={f.decisionMaker} onChange={(e: any) => set('decisionMaker', e.target.checked)} /> This person can say yes to a sponsorship or media buy</label></div>
      </div>
    </Drawer>
  )
}

function ContentDrawer({ companyId, onClose, onSaved }: { companyId: string; onClose: () => void; onSaved: () => void }) {
  const db = useDb()
  const c = db.companies.find(x => x.id === companyId)!
  const contacts = db.contacts.filter(x => x.companyId === companyId)
  const [f, setF] = useState({ type: 'Podcast (Zoom)' as ContentType, title: '', brand: c.brands[0] ?? db.settings.defaultBrand, contactId: contacts[0]?.id ?? '', hostId: 'p-raoof', editorId: 'p-angana', recordingDate: '', status: 'Invited' as const })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const people = db.people
  return (
    <Drawer title={`Book content with ${c.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.title.trim()} onClick={() => { addContent({ companyId, contactId: f.contactId || undefined, brand: f.brand as Brand, type: f.type, title: f.title.trim(), status: f.status, hostId: f.hostId, editorId: f.editorId, recordingDate: f.recordingDate || undefined }); onSaved(); onClose() }}>Save</button></>}>
      <div className="form c2">
        <Field label="Type"><select value={f.type} onChange={(e: any) => set('type', e.target.value)}>{['Podcast (Zoom)', 'Podcast (In studio)', 'Email interview', 'Article', 'Expert quote'].map(t => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Brand"><select value={f.brand} onChange={(e: any) => set('brand', e.target.value)}>{db.settings.activeBrands.map(b => <option key={b}>{b}</option>)}</select></Field>
        <div className="full"><Field label="Working title"><input value={f.title} onChange={(e: any) => set('title', e.target.value)} autoFocus placeholder="e.g. How Lumina Labs automates bookkeeping for SMEs" /></Field></div>
        <Field label="Guest"><select value={f.contactId} onChange={(e: any) => set('contactId', e.target.value)}><option value="">Not chosen</option>{contacts.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}</select></Field>
        <Field label="Status now"><select value={f.status} onChange={(e: any) => set('status', e.target.value)}>{['Invited', 'Questions sent', 'Booked'].map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Host / interviewer"><select value={f.hostId} onChange={(e: any) => set('hostId', e.target.value)}>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Editor / writer"><select value={f.editorId} onChange={(e: any) => set('editorId', e.target.value)}>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Recording or interview date"><input type="date" value={f.recordingDate} onChange={(e: any) => set('recordingDate', e.target.value)} /></Field>
        <div className="full"><p className="note">Booked moves the company to Content booked. Marking it Published later starts the 12-month journey and moves the company to Nurturing.</p></div>
      </div>
    </Drawer>
  )
}

export function DealDrawer({ companyId, onClose, onSaved, dealId }: { companyId: string; onClose: () => void; onSaved: () => void; dealId?: string }) {
  const db = useDb()
  const c = db.companies.find(x => x.id === companyId)!
  const existing = dealId ? db.deals.find(d => d.id === dealId) : undefined
  const [f, setF] = useState({
    title: existing?.title ?? '', packageId: existing?.packageId ?? '', value: existing?.value ?? 0, stage: existing?.stage ?? 'Qualified', probability: existing?.probability ?? 30,
    ownerId: existing?.ownerId ?? c.ownerId ?? db.settings.currentUserId, nextAction: existing?.nextAction ?? '', nextFollowUp: existing?.nextFollowUp ?? addDays(todayIso(), 3), expectedClose: existing?.expectedClose ?? addDays(todayIso(), 30), lostReason: existing?.lostReason ?? '',
  })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const pick = (id: string) => {
    const pk = db.packages.find(p => p.id === id)
    setF({ ...f, packageId: id, value: pk ? pk.price : f.value, title: pk ? `${pk.eventKey ? db.events.find(e => e.key === pk.eventKey)?.name + ' ' : ''}${pk.name}` : f.title })
  }
  const save = () => {
    const pk = db.packages.find(p => p.id === f.packageId)
    upsertDeal({ id: existing?.id, companyId, title: f.title.trim() || pk?.name || 'Deal', packageId: f.packageId || undefined, eventKey: pk?.eventKey, brand: pk?.brand ?? (pk ? undefined : c.brands[0]), value: Number(f.value) || 0, stage: f.stage as any, probability: Number(f.probability), ownerId: f.ownerId, nextAction: f.nextAction || undefined, nextFollowUp: f.nextFollowUp || undefined, expectedClose: f.expectedClose || undefined, lostReason: f.lostReason || undefined })
    onSaved(); onClose()
  }
  const sales = db.people.filter(p => ['Sales', 'Sales lead', 'Founder'].includes(p.role))
  return (
    <Drawer title={existing ? `Edit deal: ${existing.title}` : `Start a deal with ${c.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={save}>{existing ? 'Save' : 'Create deal'}</button></>}>
      <div className="form c2">
        <div className="full"><Field label="Package (from the rate card)"><select value={f.packageId} onChange={(e: any) => pick(e.target.value)}><option value="">Custom</option>{db.packages.map(p => <option key={p.id} value={p.id}>{p.eventKey ? db.events.find(e => e.key === p.eventKey)?.name + ' · ' : p.brand + ' · '}{p.name} ({fmtMoney(p.price)})</option>)}</select></Field></div>
        <div className="full"><Field label="Deal title"><input value={f.title} onChange={(e: any) => set('title', e.target.value)} /></Field></div>
        <Field label="Value (CAD)"><input type="number" value={f.value} onChange={(e: any) => set('value', e.target.value)} /></Field>
        <Field label="Stage"><select value={f.stage} onChange={(e: any) => set('stage', e.target.value)}>{['Qualified', 'Proposal sent', 'Negotiating', 'Verbal yes', 'Won', 'Lost'].map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Probability %"><input type="number" min={0} max={100} value={f.probability} onChange={(e: any) => set('probability', e.target.value)} /></Field>
        <Field label="Owner"><select value={f.ownerId} onChange={(e: any) => set('ownerId', e.target.value)}>{sales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <div className="full"><Field label="Next action"><input value={f.nextAction} onChange={(e: any) => set('nextAction', e.target.value)} placeholder="e.g. Call to walk through the package" /></Field></div>
        <Field label="Next follow-up"><input type="date" value={f.nextFollowUp} onChange={(e: any) => set('nextFollowUp', e.target.value)} /></Field>
        <Field label="Expected close"><input type="date" value={f.expectedClose} onChange={(e: any) => set('expectedClose', e.target.value)} /></Field>
        {f.stage === 'Lost' && <div className="full"><Field label="Why we lost it"><input value={f.lostReason} onChange={(e: any) => set('lostReason', e.target.value)} /></Field></div>}
        <div className="full"><p className="note">Proposal sent moves the company to Pitched. Won creates one deliverable per item in the package.</p></div>
      </div>
    </Drawer>
  )
}

function EditCompany({ companyId, onClose, onSaved }: { companyId: string; onClose: () => void; onSaved: () => void }) {
  const db = useDb()
  const c = db.companies.find(x => x.id === companyId)!
  const [f, setF] = useState({ name: c.name, website: c.website ?? '', industry: c.industry ?? '', city: c.city ?? '', province: c.province ?? '', size: c.size ?? '', linkedin: c.linkedin ?? '', score: c.score ?? '', brands: [...c.brands], tags: c.tags.join(', ') })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const toggleBrand = (b: Brand) => set('brands', f.brands.includes(b) ? f.brands.filter(x => x !== b) : [...f.brands, b])
  const save = () => {
    update(d => { const x = d.companies.find(y => y.id === companyId)!; Object.assign(x, { name: f.name.trim() || x.name, website: f.website || undefined, industry: f.industry || undefined, city: f.city || undefined, province: f.province || undefined, size: f.size || undefined, linkedin: f.linkedin || undefined, score: f.score === '' ? undefined : Number(f.score), brands: f.brands.length ? f.brands : x.brands, tags: f.tags.split(',').map(s => s.trim()).filter(Boolean) }) })
    onSaved(); onClose()
  }
  return (
    <Drawer title="Edit company" onClose={onClose} footer={<><button className="btn" onClick={() => { if (confirm('Archive this company? It is hidden from lists but not deleted.')) { update(d => { d.companies.find(y => y.id === companyId)!.archived = true }); window.location.hash = '#/companies' } }}>Archive</button><span style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={save}>Save</button></>}>
      <div className="form c2">
        <div className="full"><Field label="Name"><input value={f.name} onChange={(e: any) => set('name', e.target.value)} /></Field></div>
        <Field label="Website"><input value={f.website} onChange={(e: any) => set('website', e.target.value)} /></Field>
        <Field label="Industry"><input value={f.industry} onChange={(e: any) => set('industry', e.target.value)} /></Field>
        <Field label="City"><input value={f.city} onChange={(e: any) => set('city', e.target.value)} /></Field>
        <Field label="Province"><input value={f.province} onChange={(e: any) => set('province', e.target.value)} /></Field>
        <Field label="Size"><select value={f.size} onChange={(e: any) => set('size', e.target.value)}><option value="">Unknown</option>{['1-10', '11-50', '51-200', '201-500', '500+'].map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Fit score (0-100)"><input type="number" value={f.score} onChange={(e: any) => set('score', e.target.value)} /></Field>
        <div className="full"><Field label="LinkedIn page"><input value={f.linkedin} onChange={(e: any) => set('linkedin', e.target.value)} /></Field></div>
        <div className="full"><Field label="Brands"><div className="brandbar" style={{ marginTop: 4 }}>{db.settings.activeBrands.map(b => <span key={b} role="button" tabIndex={0} className={f.brands.includes(b) ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => toggleBrand(b)}>{b}</span>)}</div></Field></div>
        <div className="full"><Field label="Tags (comma separated)"><input value={f.tags} onChange={(e: any) => set('tags', e.target.value)} /></Field></div>
      </div>
    </Drawer>
  )
}
