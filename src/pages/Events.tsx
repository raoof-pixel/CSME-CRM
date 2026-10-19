import { useMemo, useState } from 'react'
import { useDb, personName, update, uid, daysUntil, addDays, todayIso } from '../data/store'
import { useRoute } from '../app/router'
import { Stat, fmtMoney, fmtDate, fmtDateLong, Drawer, Field, Toast, useToast, StagePill } from '../components/ui'
import { DealDrawer } from './Companies'
import type { EventKey, Event, Speaker, EventTask } from '../data/types'

const SECTIONS = [
  { key: 'overview', label: 'Overview' }, { key: 'sales', label: 'Sales' }, { key: 'program', label: 'Program' },
  { key: 'logistics', label: 'Logistics' }, { key: 'money', label: 'Money' }, { key: 'settings', label: 'Settings' },
]

export function Events() {
  const db = useDb()
  const route = useRoute()
  const evKey = (route[1] as EventKey) || db.events[0].key
  const ev = db.events.find(e => e.key === evKey) ?? db.events[0]
  const section = route[2] ?? 'overview'
  const [toast, say] = useToast()
  const [dealFor, setDealFor] = useState<string | null>(null)
  const [speakerDrawer, setSpeakerDrawer] = useState(false)
  const [taskDrawer, setTaskDrawer] = useState(false)

  const deals = db.deals.filter(d => d.eventKey === ev.key)
  const won = deals.filter(d => d.stage === 'Won')
  const open = deals.filter(d => !['Won', 'Lost'].includes(d.stage))
  const wonValue = won.reduce((s, d) => s + d.value, 0)
  const openValue = open.reduce((s, d) => s + d.value, 0)
  const packages = db.packages.filter(p => p.eventKey === ev.key)
  const booths = won.filter(d => db.packages.find(p => p.id === d.packageId)?.kind === 'Exhibitor').length
  const speakers = db.speakers.filter(s => s.eventKey === ev.key)
  const tasks = db.eventTasks.filter(t => t.eventKey === ev.key)
  const invoices = db.invoices.filter(i => deals.some(d => d.id === i.dealId))
  const days = daysUntil(ev.date)

  // Who to pitch: warm companies with no deal for this event yet
  const targets = useMemo(() => db.companies
    .filter(c => ['Nurturing', 'Won', 'Delivered', 'Published'].includes(c.stage) && !deals.some(d => d.companyId === c.id))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), [db, deals])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Events</h1>
          <p>Each event is a view over the same companies and deals. Sponsors come from Nurture; nothing is re-entered.</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Events" style={{ marginBottom: 8 }}>
        {db.events.map(e => <a key={e.key} href={`#/events/${e.key}`} className={e.key === ev.key ? 'on' : ''}>{e.name}<span className="n">{Math.max(0, daysUntil(e.date))}d</span></a>)}
      </nav>
      <nav className="tabs" aria-label="Sections">
        {SECTIONS.map(s => <a key={s.key} href={`#/events/${ev.key}/${s.key}`} className={section === s.key ? 'on' : ''}>{s.label}</a>)}
      </nav>

      {section === 'overview' && (
        <>
          <div className="grid c4 mb">
            <Stat label="Days to go" value={days < 0 ? 'Done' : days} sub={`${fmtDateLong(ev.date)} · ${ev.city}`} />
            <Stat label="Sponsorship sold" value={fmtMoney(wonValue)} sub={`${Math.round((wonValue / ev.sponsorshipTarget) * 100)}% of ${fmtMoney(ev.sponsorshipTarget)}`} tone={wonValue >= ev.sponsorshipTarget * .5 ? 'good' : undefined} />
            <Stat label="Open pipeline" value={fmtMoney(openValue)} sub={`${open.length} ${open.length === 1 ? "deal" : "deals"}`} />
            {ev.kind === 'Awards' ? <Stat label="Speakers / judges" value={speakers.length} /> : <Stat label="Booths sold" value={`${booths} / ${ev.exhibitorTarget}`} />}
          </div>
          <div className="grid c2">
            <div className="card">
              <div className="hd"><h2>Progress to target</h2></div>
              <div className="bd stack">
                <div><div className="row-between small"><b>Sponsorship</b><span className="money">{fmtMoney(wonValue)} / {fmtMoney(ev.sponsorshipTarget)}</span></div><div className="progress mt" style={{ marginTop: 6 }}><i style={{ width: `${Math.min(100, (wonValue / ev.sponsorshipTarget) * 100)}%` }} /></div></div>
                {ev.exhibitorTarget > 0 && <div><div className="row-between small"><b>Exhibitor booths</b><span>{booths} / {ev.exhibitorTarget}</span></div><div className="progress engage" style={{ marginTop: 6 }}><i style={{ width: `${Math.min(100, (booths / ev.exhibitorTarget) * 100)}%` }} /></div></div>}
                <div><div className="row-between small"><b>Speakers confirmed</b><span>{speakers.filter(s => s.status === 'Confirmed').length} / {speakers.length}</span></div></div>
                <div><div className="row-between small"><b>Logistics done</b><span>{tasks.filter(t => t.done).length} / {tasks.length}</span></div></div>
              </div>
            </div>
            <div className="card">
              <div className="hd"><h2>Who to pitch next<span className="sub">warm companies with no {ev.kind.toLowerCase()} deal</span></h2><a className="btn sm" href={`#/events/${ev.key}/sales`}>All targets</a></div>
              {targets.length === 0 ? <div className="empty small">Everyone warm already has a deal for this event.</div> : (
                <table className="tbl"><tbody>{targets.slice(0, 6).map(c => <tr key={c.id}><td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a><div className="muted small">{personName(c.ownerId)}</div></td><td><StagePill stage={c.stage} /></td><td className="act"><button className="btn sm" onClick={() => setDealFor(c.id)}>Start a deal</button></td></tr>)}</tbody></table>
              )}
            </div>
          </div>
        </>
      )}

      {section === 'sales' && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="hd"><h2>Deals for {ev.name}<span className="sub">{fmtMoney(wonValue)} won · {fmtMoney(openValue)} open</span></h2></div>
            <div className="wrap"><table className="tbl">
              <thead><tr><th>Company</th><th>Package</th><th>Stage</th><th className="num">Value</th><th>Owner</th><th>Next</th></tr></thead>
              <tbody>
                {deals.length === 0 && <tr><td colSpan={6} className="empty">No deals yet. Start one from the target list below.</td></tr>}
                {deals.map(d => { const c = db.companies.find(x => x.id === d.companyId); return <tr key={d.id}><td><a className="lnk" href={`#/company/${d.companyId}`}>{c?.name}</a></td><td>{d.title}</td><td><span className={`pill plain ${d.stage === 'Won' ? 'good' : d.stage === 'Lost' ? 'none' : 'Grow'}`}>{d.stage}</span></td><td className="num money">{fmtMoney(d.value)}</td><td>{personName(d.ownerId)}</td><td className="small">{d.nextAction ?? '—'}{d.nextFollowUp && <div className="muted">{fmtDate(d.nextFollowUp)}</div>}</td></tr> })}
              </tbody>
            </table></div>
          </div>
          <div className="grid c2">
            <div className="card">
              <div className="hd"><h2>Target list<span className="sub">{targets.length} warm, not yet pitched</span></h2></div>
              <div className="wrap"><table className="tbl"><thead><tr><th>Company</th><th>Owner</th><th>Score</th><th></th></tr></thead><tbody>
                {targets.map(c => <tr key={c.id}><td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a><div className="muted small">{c.industry}</div></td><td className="small">{personName(c.ownerId)}</td><td>{c.score ?? '—'}</td><td className="act"><button className="btn sm" onClick={() => setDealFor(c.id)}>Start a deal</button></td></tr>)}
              </tbody></table></div>
            </div>
            <div className="card">
              <div className="hd"><h2>Packages<span className="sub">edit in Sell → Rate card</span></h2></div>
              <table className="tbl"><thead><tr><th>Package</th><th>Includes</th><th className="num">Price</th><th className="num">Sold</th></tr></thead><tbody>
                {packages.map(p => <tr key={p.id}><td><b>{p.name}</b><div className="muted small">{p.kind}</div></td><td className="small">{p.includes}</td><td className="num money">{fmtMoney(p.price)}</td><td className="num">{won.filter(d => d.packageId === p.id).length}</td></tr>)}
              </tbody></table>
            </div>
          </div>
        </div>
      )}

      {section === 'program' && (
        <div className="card">
          <div className="hd"><h2>{ev.kind === 'Awards' ? 'Judges and presenters' : 'Speakers'}<span className="sub">{speakers.filter(s => s.status === 'Confirmed').length} confirmed</span></h2><button className="btn sm pri" onClick={() => setSpeakerDrawer(true)}>Add</button></div>
          <div className="wrap"><table className="tbl"><thead><tr><th>Name</th><th>Company</th><th>Topic</th><th>Slot</th><th>Status</th><th></th></tr></thead><tbody>
            {speakers.length === 0 && <tr><td colSpan={6} className="empty">Nobody yet. Podcast guests make great speakers; invite them from here.</td></tr>}
            {speakers.map(s => { const c = db.companies.find(x => x.id === s.companyId); return <tr key={s.id}><td><b>{s.name}</b></td><td>{c ? <a className="lnk" href={`#/company/${c.id}`}>{c.name}</a> : '—'}</td><td>{s.topic}</td><td className="muted">{s.slot ?? '—'}</td><td><span className={`pill plain ${s.status === 'Confirmed' ? 'good' : s.status === 'Declined' ? 'none' : 'warn'}`}>{s.status}</span></td><td className="act">{s.status === 'Invited' && <><button className="btn sm" onClick={() => { update(d => { d.speakers.find(x => x.id === s.id)!.status = 'Confirmed' }); say('Confirmed') }}>Confirm</button> <button className="btn sm ghost" onClick={() => update(d => { d.speakers.find(x => x.id === s.id)!.status = 'Declined' })}>Declined</button></>}</td></tr> })}
          </tbody></table></div>
        </div>
      )}

      {section === 'logistics' && (
        <div className="card">
          <div className="hd"><h2>Logistics<span className="sub">{tasks.filter(t => t.done).length} of {tasks.length} done</span></h2><button className="btn sm pri" onClick={() => setTaskDrawer(true)}>Add task</button></div>
          <div className="wrap"><table className="tbl"><thead><tr><th></th><th>Task</th><th>Group</th><th>Owner</th><th>Due</th></tr></thead><tbody>
            {tasks.length === 0 && <tr><td colSpan={5} className="empty">No tasks yet.</td></tr>}
            {[...tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due)).map(t => <tr key={t.id} style={{ opacity: t.done ? .55 : 1 }}><td><input type="checkbox" checked={t.done} onChange={() => update(d => { const x = d.eventTasks.find(y => y.id === t.id)!; x.done = !x.done })} aria-label="Done" /></td><td><b>{t.title}</b></td><td><span className="tag">{t.group}</span></td><td>{personName(t.ownerId)}</td><td className={!t.done && t.due < todayIso() ? 'money' : 'muted'} style={!t.done && t.due < todayIso() ? { color: 'var(--warn)' } : undefined}>{fmtDate(t.due)}</td></tr>)}
          </tbody></table></div>
        </div>
      )}

      {section === 'money' && (
        <div className="grid c2">
          <div className="card"><div className="hd"><h2>Invoices</h2></div>
            <table className="tbl"><thead><tr><th>Invoice</th><th>Company</th><th className="num">Amount</th><th className="num">Outstanding</th><th>Status</th></tr></thead><tbody>
              {invoices.length === 0 && <tr><td colSpan={5} className="empty">No invoices for this event yet.</td></tr>}
              {invoices.map(i => { const d = db.deals.find(x => x.id === i.dealId); const c = d && db.companies.find(x => x.id === d.companyId); return <tr key={i.id}><td><b>{i.number}</b><div className="muted small">due {fmtDate(i.due)}</div></td><td>{c?.name}</td><td className="num money">{fmtMoney(i.amount)}</td><td className="num money">{fmtMoney(i.amount - i.paid)}</td><td><span className={`pill plain ${i.status === 'Paid' ? 'good' : i.status === 'Overdue' ? 'maple' : 'warn'}`}>{i.status}</span></td></tr> })}
            </tbody></table>
          </div>
          <div className="card"><div className="hd"><h2>Revenue by package</h2></div>
            <table className="tbl"><tbody>
              {packages.map(p => { const v = won.filter(d => d.packageId === p.id).reduce((s, d) => s + d.value, 0); return <tr key={p.id}><td>{p.name}</td><td className="num money">{fmtMoney(v)}</td></tr> })}
              <tr><td><b>Total won</b></td><td className="num money">{fmtMoney(wonValue)}</td></tr>
              <tr><td className="muted">Collected</td><td className="num money">{fmtMoney(invoices.reduce((s, i) => s + i.paid, 0))}</td></tr>
            </tbody></table>
          </div>
        </div>
      )}

      {section === 'settings' && <EventSettings ev={ev} onSaved={() => say('Event saved')} />}

      {dealFor && <DealDrawer companyId={dealFor} onClose={() => setDealFor(null)} onSaved={() => say('Deal started')} />}
      {speakerDrawer && <SpeakerDrawer evKey={ev.key} onClose={() => setSpeakerDrawer(false)} onSaved={() => say('Added')} />}
      {taskDrawer && <EventTaskDrawer evKey={ev.key} onClose={() => setTaskDrawer(false)} onSaved={() => say('Task added')} />}
      <Toast msg={toast} />
    </>
  )
}

function EventSettings({ ev, onSaved }: { ev: Event; onSaved: () => void }) {
  const [f, setF] = useState({ ...ev })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="hd"><h2>Event settings</h2></div>
      <div className="bd form c2">
        <Field label="Name"><input value={f.name} onChange={(e: any) => set('name', e.target.value)} /></Field>
        <Field label="Date"><input type="date" value={f.date} onChange={(e: any) => set('date', e.target.value)} /></Field>
        <Field label="Venue"><input value={f.venue} onChange={(e: any) => set('venue', e.target.value)} /></Field>
        <Field label="City"><input value={f.city} onChange={(e: any) => set('city', e.target.value)} /></Field>
        <Field label="Website"><input value={f.website} onChange={(e: any) => set('website', e.target.value)} /></Field>
        <Field label="Sponsorship target (CAD)"><input type="number" value={f.sponsorshipTarget} onChange={(e: any) => set('sponsorshipTarget', Number(e.target.value))} /></Field>
        <Field label="Exhibitor booths target"><input type="number" value={f.exhibitorTarget} onChange={(e: any) => set('exhibitorTarget', Number(e.target.value))} /></Field>
        <Field label="Registration target"><input type="number" value={f.registrationTarget} onChange={(e: any) => set('registrationTarget', Number(e.target.value))} /></Field>
        <div className="full right"><button className="btn pri" onClick={() => { update(d => { Object.assign(d.events.find(e => e.key === ev.key)!, f) }); onSaved() }}>Save</button></div>
      </div>
    </div>
  )
}

function SpeakerDrawer({ evKey, onClose, onSaved }: { evKey: EventKey; onClose: () => void; onSaved: () => void }) {
  const db = useDb()
  const [f, setF] = useState<Omit<Speaker, 'id' | 'eventKey'>>({ name: '', topic: '', companyId: undefined, slot: '', status: 'Invited' })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return (
    <Drawer title="Add a speaker" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.name.trim()} onClick={() => { update(d => { d.speakers.push({ id: uid('s'), eventKey: evKey, ...f, companyId: f.companyId || undefined }) }); onSaved(); onClose() }}>Add</button></>}>
      <div className="form">
        <Field label="Name"><input value={f.name} onChange={(e: any) => set('name', e.target.value)} autoFocus /></Field>
        <Field label="Company"><select value={f.companyId ?? ''} onChange={(e: any) => set('companyId', e.target.value)}><option value="">—</option>{db.companies.filter(c => !c.archived).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Topic"><input value={f.topic} onChange={(e: any) => set('topic', e.target.value)} /></Field>
        <Field label="Slot (optional)"><input value={f.slot} onChange={(e: any) => set('slot', e.target.value)} placeholder="Keynote, Panel 2, Workshop A" /></Field>
      </div>
    </Drawer>
  )
}

function EventTaskDrawer({ evKey, onClose, onSaved }: { evKey: EventKey; onClose: () => void; onSaved: () => void }) {
  const db = useDb()
  const [f, setF] = useState<Omit<EventTask, 'id' | 'eventKey' | 'done'>>({ title: '', group: 'Venue', ownerId: undefined, due: addDays(todayIso(), 14) })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return (
    <Drawer title="Add an event task" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.title.trim()} onClick={() => { update(d => { d.eventTasks.push({ id: uid('et'), eventKey: evKey, done: false, ...f, ownerId: f.ownerId || undefined }) }); onSaved(); onClose() }}>Add</button></>}>
      <div className="form">
        <Field label="Task"><input value={f.title} onChange={(e: any) => set('title', e.target.value)} autoFocus /></Field>
        <Field label="Group"><select value={f.group} onChange={(e: any) => set('group', e.target.value)}>{['Venue', 'Marketing', 'Registrations', 'Program', 'Sponsors', 'On the day'].map(g => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Owner"><select value={f.ownerId ?? ''} onChange={(e: any) => set('ownerId', e.target.value)}><option value="">—</option>{db.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Due"><input type="date" value={f.due} onChange={(e: any) => set('due', e.target.value)} /></Field>
      </div>
    </Drawer>
  )
}
