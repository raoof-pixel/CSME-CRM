import { useMemo, useState } from 'react'
import type { Page, Section, Field } from '../data/schema'
import { useDb, recordsOf, addRecord, updateRecord, personName, daysUntil, todayIso } from '../data/store'
import { GenericList } from './Generic'
import { Stat, fmtMoney, fmtDate, Field as FieldWrap, StagePill, Icons } from './ui'
import { useUi } from '../app/uiState'
import type { Brand } from '../data/types'

const EVENT_KEY: Record<string, 'show-2027' | 'summit-2027' | 'awards-2026'> = { tour: 'show-2027', summit: 'summit-2027', awards: 'awards-2026' }

export function UnitPage({ page, sectionKey, renderCustom }: { page: Page; sectionKey?: string; renderCustom?: (key: string, section: Section, page: Page) => any }) {
  const sections = page.sections ?? []
  const current = sections.find(s => s.key === sectionKey) ?? sections[0]
  const [open, setOpen] = useState(true)

  // group the panel like the original: ungrouped first, then headed groups
  const groups: Array<{ name?: string; items: Section[] }> = []
  sections.forEach(s => { const g = groups.find(x => x.name === s.group); if (g) g.items.push(s); else groups.push({ name: s.group, items: [s] }) })

  return (
    <>
      <div className="page-head">
        <div><h1>{page.unitName ?? page.label}</h1><p>{unitBlurb(page)}</p></div>
        <button className="btn sm ghost menubtn" onClick={() => setOpen(!open)}>{open ? 'Hide sections' : 'Sections'}</button>
      </div>
      <div className="unit">
        <nav className={`secpanel ${open ? '' : 'closed'}`} aria-label={`${page.label} sections`}>
          {groups.map((g, i) => (
            <div key={i} className="sgrp">
              {g.name && <div className="sgrp-h">{g.name}</div>}
              {g.items.map(s => <a key={s.key} href={`#/${page.key}/${s.key}`} className={current.key === s.key ? 'on' : ''}>{s.label}</a>)}
            </div>
          ))}
        </nav>
        <div className="unit-body">
          {current.kind === 'list' && <GenericList section={current} unit={page.key} />}
          {current.kind === 'command' && <CommandCentre page={page} />}
          {current.kind === 'graphs' && <Graphs page={page} />}
          {current.kind === 'custom' && (
            current.custom === 'unit-companies' ? <UnitCompanies page={page} /> :
            current.custom === 'unit-contacts' ? <UnitContacts page={page} /> :
            current.custom === 'event-settings' ? <UnitSettings page={page} /> :
            current.custom === 'event-management' ? <EventManagement page={page} /> :
            current.custom === 'podcast-recording' ? <PodcastRecording page={page} /> :
            renderCustom ? renderCustom(current.custom ?? '', current, page) : null
          )}
        </div>
      </div>
    </>
  )
}

function unitBlurb(page: Page) {
  switch (page.unit) {
    case 'event': return 'Sales, sponsors, exhibitors, program and event prep for this event. Companies and contacts come from the shared list.'
    case 'awards': return 'Sales, sponsors, categories, nominations and judges.'
    case 'podcast': return 'Guests, recordings, episodes, sponsors and promotion across the show.'
    case 'magazine': return 'Advertising, editorial, marketing and operations for this publication.'
    case 'marketplace': return 'Vendors, buyer leads, onboarding, renewals and the product roadmap.'
    case 'hub': return 'Company strategy, roadmap, partnerships, funding, hiring, KPIs and contracts.'
    default: return ''
  }
}

// Which companies "belong" to a unit: by brand for magazines, by deals and roles for events
function unitCompanyIds(db: ReturnType<typeof useDb>, page: Page): Set<string> {
  const ids = new Set<string>()
  if (page.brand) db.companies.filter(c => c.brands.includes(page.brand as Brand)).forEach(c => ids.add(c.id))
  const ek = EVENT_KEY[page.key]
  if (ek) db.deals.filter(d => d.eventKey === ek).forEach(d => ids.add(d.companyId))
  recordsOf(db, 'company-roles', page.key).forEach(r => { if (typeof r.company === 'string') ids.add(r.company) })
  recordsOf(db, 'opportunities', page.key).forEach(r => { if (typeof r.company === 'string') ids.add(r.company) })
  if (page.key === 'podcast') db.content.filter(c => c.type.startsWith('Podcast')).forEach(c => ids.add(c.companyId))
  return ids
}

function CommandCentre({ page }: { page: Page }) {
  const db = useDb()
  const settings = recordsOf(db, 'unit-settings', page.key)[0]
  const ek = EVENT_KEY[page.key]
  const deals = ek ? db.deals.filter(d => d.eventKey === ek) : page.brand ? db.deals.filter(d => d.brand === page.brand) : []
  const opps = recordsOf(db, 'opportunities', page.key)
  const won = deals.filter(d => d.stage === 'Won').reduce((s, d) => s + d.value, 0) + opps.filter(o => o.stage === 'Won').reduce((s, o) => s + Number(o.value ?? 0), 0)
  const openV = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0) + opps.filter(o => !['Won', 'Lost'].includes(String(o.stage))).reduce((s, o) => s + Number(o.value ?? 0), 0)
  const count = (c: string, pred?: (r: any) => boolean) => recordsOf(db, c, page.key).filter(pred ?? (() => true)).length
  const target = Number(settings?.sponsorshipTarget ?? settings?.revenueTarget ?? (ek ? db.events.find(e => e.key === ek)?.sponsorshipTarget : 0) ?? 0)
  const date = String(settings?.date ?? (ek ? db.events.find(e => e.key === ek)?.date : '') ?? '')
  const invoices = recordsOf(db, 'invoices', page.key)
  const overdueInv = invoices.filter(i => i.status !== 'Paid' && String(i.due ?? '9') < todayIso()).length
  const tasks = recordsOf(db, 'tasks', page.key)
  const openTasks = tasks.filter(t => t.status !== 'Done')
  const companies = unitCompanyIds(db, page).size

  type Card = { label: string; state: 'On Track' | 'Attention Needed' | 'Critical'; detail: string; href: string }
  const cards: Card[] = []
  const push = (label: string, ok: boolean, detail: string, sec: string) => cards.push({ label, state: ok ? 'On Track' : 'Attention Needed', detail, href: `#/${page.key}/${sec}` })

  push('Sales', openV > 0 || won > 0, `${deals.length + opps.length} opportunities · ${fmtMoney(openV)} pipeline`, 'pipeline')
  if (page.unit === 'event' || page.unit === 'awards' || page.unit === 'podcast') push('Sponsorship', target ? won >= target * 0.5 : won > 0, `${fmtMoney(won)} won${target ? ` of ${fmtMoney(target)}` : ''}`, page.unit === 'podcast' ? 'sponsors' : 'confirmed-sponsors')
  if (page.unit === 'event') {
    push('Exhibitors', count('company-roles', r => r.role === 'Confirmed exhibitor') > 0, `${count('company-roles', r => r.role === 'Confirmed exhibitor')} confirmed · ${count('company-roles', r => r.role === 'Target exhibitor')} targets`, 'confirmed-exhibitors')
    push('Sponsor deliverables', count('sponsor-deliverables', r => r.payment !== 'Paid') === 0, `${count('sponsor-deliverables')} on the list`, 'deliverables')
    push('Registration', count('registrations') > 0, `${count('registrations')} registered${settings?.registrationTarget ? ` of ${settings.registrationTarget}` : ''}`, 'registrations')
    push('Speakers', count('speakers', r => r.status === 'Confirmed') > 0, `${count('speakers', r => r.status === 'Confirmed')} confirmed · ${count('speakers', r => r.status === 'Invited')} invited`, 'speakers')
    push('Agenda', count('agenda') > 0, `${count('agenda')} sessions scheduled`, 'agenda')
    push('Vendors', count('vendors', r => r.contract !== 'Quote') === count('vendors'), `${count('vendors')} vendors · ${count('vendors', r => r.contract === 'Quote')} quotes open`, 'vendors')
    push('Risks', count('risks', r => ['High', 'Critical'].includes(String(r.severity)) && r.status !== 'Closed') === 0, `${count('risks', r => r.status !== 'Closed')} open`, 'risks')
    push('Event day readiness', count('timeline', r => r.status === 'Done') === count('timeline') && count('timeline') > 0, `${count('timeline', r => r.status === 'Done')} of ${count('timeline')} milestones`, 'timeline')
  }
  if (page.unit === 'awards') {
    push('Categories', count('categories') > 0, `${count('categories')} categories · ${count('categories', r => !r.sponsor)} without a sponsor`, 'categories')
    push('Nominations', count('nominations') > 0, `${count('nominations')} nominations · ${count('nominations', r => r.status === 'Submitted')} to review`, 'nominations')
    push('Judging', count('judges', r => r.status === 'Confirmed') > 0, `${count('judges', r => r.status === 'Confirmed')} judges confirmed`, 'judges')
    push('Marketing', count('campaigns', r => r.status === 'Active') > 0, `${count('campaigns', r => r.status === 'Active')} active of ${count('campaigns')} campaigns`, 'campaigns')
  }
  if (page.unit === 'podcast') {
    const guests = recordsOf(db, 'guests', page.key)
    push('Guest pipeline', guests.length > 0, `${guests.length} guests · ${guests.filter(g => g.outreach === 'Booked').length} booked`, 'guest-pipeline')
    push('Recording schedule', guests.some(g => g.recordingDate && String(g.recordingDate) >= todayIso()), `${guests.filter(g => g.recordingDate && String(g.recordingDate) >= todayIso()).length} recordings booked`, 'recording')
    const eps = recordsOf(db, 'episodes', page.key)
    push('Production', eps.filter(e => ['Needs editing', 'Editing', 'Changes requested'].includes(String(e.status))).length === 0, `${eps.filter(e => ['Needs editing', 'Editing', 'Changes requested'].includes(String(e.status))).length} in production`, 'episodes')
    push('Publishing', eps.filter(e => e.status === 'Published').length > 0, `${eps.filter(e => e.status === 'Published').length} of ${eps.length} episodes published`, 'episodes')
    push('Promotion', count('campaigns', r => r.status === 'Active') > 0, `${count('campaigns', r => r.status === 'Active')} active promotions`, 'promotion')
  }
  if (page.unit === 'magazine') {
    push('Advertising', count('company-roles', r => r.role === 'Advertiser') > 0, `${count('company-roles', r => r.role === 'Advertiser')} advertisers · ${count('ad-deals')} ad deals`, 'advertisers')
    const items = recordsOf(db, 'content-items', page.key)
    push('Editorial', items.filter(i => i.status !== 'Published' && String(i.deadline ?? '9') < todayIso()).length === 0, `${items.filter(i => i.status !== 'Published').length} in production · ${items.filter(i => i.status !== 'Published' && String(i.deadline ?? '9') < todayIso()).length} overdue`, 'articles')
    const issue = recordsOf(db, 'issues', page.key).filter(i => i.status !== 'Published').sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0]
    push('Issue readiness', !!issue, issue ? `${issue.issue} · ${Math.max(0, daysUntil(String(issue.deadline)))} days to deadline` : 'No issue planned', 'edcal')
    push('Sponsored content', count('sponsored', r => r.stage !== 'Published') >= 0, `${count('sponsored', r => r.stage !== 'Published')} in production of ${count('sponsored')}`, 'sponsored')
    push('Marketing', count('campaigns', r => r.status === 'Active') > 0, `${count('campaigns', r => r.status === 'Active')} active of ${count('campaigns')} campaigns`, 'campaigns')
  }
  if (page.unit === 'marketplace') {
    const v = recordsOf(db, 'mp-vendors', page.key)
    push('Vendors', v.filter(x => x.listing === 'Live').length > 0, `${v.filter(x => x.listing === 'Live').length} live · ${v.filter(x => x.listing === 'Onboarding').length} onboarding`, 'vendors')
    push('Buyer leads', count('mp-buyer-leads', r => r.status === 'New') === 0, `${count('mp-buyer-leads', r => !String(r.status).startsWith('Closed'))} open`, 'buyer-leads')
    push('Renewals', count('mp-renewals', r => r.status === 'Upcoming' && String(r.due) < todayIso()) === 0, `${count('mp-renewals', r => r.status === 'Upcoming')} upcoming`, 'renewals')
    push('Roadmap', count('mp-roadmap', r => r.phase === 'Now') > 0, `${count('mp-roadmap', r => r.phase === 'Now')} now · ${count('mp-roadmap', r => r.phase === 'Shipped')} shipped`, 'roadmap')
  }
  push('Finance', overdueInv === 0, `${fmtMoney(invoices.reduce((s, i) => s + Number(i.paid ?? 0), 0))} collected · ${overdueInv} overdue invoices`, 'invoices')
  push('Operations', openTasks.filter(t => String(t.due ?? '9') < todayIso()).length === 0, `${openTasks.length} open tasks · ${openTasks.filter(t => String(t.due ?? '9') < todayIso()).length} overdue`, 'tasks')

  const d = date ? daysUntil(date) : undefined

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid c4">
        {d !== undefined && !Number.isNaN(d) && <Stat label="Days to go" value={d < 0 ? 'Done' : d} sub={`${fmtDate(date)}${settings?.location ? ` · ${settings.location}` : ''}`} />}
        <Stat label={page.unit === 'magazine' ? 'Revenue won' : 'Sponsorship sold'} value={fmtMoney(won)} sub={target ? `${Math.round((won / target) * 100)}% of ${fmtMoney(target)}` : 'no target set'} tone={target && won >= target * 0.5 ? 'good' : undefined} />
        <Stat label="Open pipeline" value={fmtMoney(openV)} sub={`${deals.filter(x => !['Won', 'Lost'].includes(x.stage)).length + opps.filter(o => !['Won', 'Lost'].includes(String(o.stage))).length} open`} />
        <Stat label="Companies in this unit" value={companies} sub="from the shared list" />
      </div>
      <div className="card">
        <div className="hd"><h2>Status by area</h2><a className="btn sm" href={`#/${page.key}/settings`}>Edit targets</a></div>
        <div className="cc-grid">
          {cards.map(c => (
            <a key={c.label} href={c.href} className={`cc ${c.state === 'On Track' ? 'ok' : 'warn'}`}>
              <div className="cc-l">{c.label}</div>
              <div className="cc-s">{c.state}</div>
              <div className="cc-d">{c.detail}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function Graphs({ page }: { page: Page }) {
  const db = useDb()
  const ek = EVENT_KEY[page.key]
  const deals = [...(ek ? db.deals.filter(d => d.eventKey === ek) : page.brand ? db.deals.filter(d => d.brand === page.brand) : [])]
  const opps = recordsOf(db, 'opportunities', page.key)
  const stageCounts: Record<string, number> = {}
  deals.forEach(d => { stageCounts[d.stage] = (stageCounts[d.stage] ?? 0) + d.value })
  opps.forEach(o => { stageCounts[String(o.stage ?? 'Lead')] = (stageCounts[String(o.stage ?? 'Lead')] ?? 0) + Number(o.value ?? 0) })
  const byPerson: Record<string, number> = {}
  deals.forEach(d => { byPerson[d.ownerId] = (byPerson[d.ownerId] ?? 0) + d.value })
  opps.forEach(o => { if (o.owner) byPerson[String(o.owner)] = (byPerson[String(o.owner)] ?? 0) + Number(o.value ?? 0) })
  const Bars = ({ title, data, money }: { title: string; data: Array<[string, number]>; money?: boolean }) => {
    const max = Math.max(1, ...data.map(d => d[1]))
    return <div className="card"><div className="hd"><h2>{title}</h2></div><div className="bd stack">{data.length === 0 && <span className="muted small">Nothing yet.</span>}{data.map(([k, v]) => <div key={k}><div className="row-between small"><span>{k}</span><span className="money">{money ? fmtMoney(v) : v}</span></div><div className="progress" style={{ marginTop: 4 }}><i style={{ width: `${(v / max) * 100}%` }} /></div></div>)}</div></div>
  }
  const tasks = recordsOf(db, 'tasks', page.key)
  const taskData: Array<[string, number]> = ['To do', 'In progress', 'Blocked', 'Waiting for client', 'Done'].map(s => [s, tasks.filter(t => t.status === s).length] as [string, number]).filter(x => x[1] > 0)
  const weeks: Array<[string, number]> = []
  for (let i = 5; i >= 0; i--) { const start = new Date(); start.setDate(start.getDate() - i * 7 - 6); const end = new Date(); end.setDate(end.getDate() - i * 7); const n = deals.filter(d => d.createdAt >= start.toISOString() && d.createdAt <= end.toISOString()).length + opps.filter(o => o.createdAt >= start.toISOString().slice(0, 10) && o.createdAt <= end.toISOString().slice(0, 10)).length; weeks.push([`Week of ${fmtDate(start.toISOString())}`, n]) }
  return (
    <div className="grid c2">
      <Bars title="Sales pipeline by stage" data={Object.entries(stageCounts)} money />
      <Bars title="Sales by person" data={Object.entries(byPerson).map(([k, v]) => [personName(k), v] as [string, number])} money />
      <Bars title="New deals each week" data={weeks} />
      <Bars title="Tasks" data={taskData} />
    </div>
  )
}

function UnitCompanies({ page }: { page: Page }) {
  const db = useDb()
  const ids = unitCompanyIds(db, page)
  const rows = db.companies.filter(c => ids.has(c.id) && !c.archived).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div className="card">
      <div className="hd"><h2>Companies in this unit<span className="sub">{rows.length}</span></h2><div className="inline"><a className="btn sm" href="#/companies">All companies</a><a className="btn sm pri" href="#/leads">Add or import</a></div></div>
      {rows.length === 0 ? <div className="empty"><b>No companies linked yet.</b>{page.brand ? `Tick "${page.brand}" in a company's brands, or add a deal for this unit.` : 'Add a target sponsor, exhibitor or opportunity and the company appears here.'}</div> : (
        <div className="wrap"><table className="tbl"><thead><tr><th>Company</th><th>Stage</th><th>Owner</th><th>Industry</th><th>City</th><th className="num">Open deals</th></tr></thead><tbody>
          {rows.map(c => { const open = db.deals.filter(d => d.companyId === c.id && !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0); return <tr key={c.id}><td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a></td><td><StagePill stage={c.stage} /></td><td>{personName(c.ownerId)}</td><td className="muted">{c.industry}</td><td className="muted">{c.city}</td><td className="num">{open ? fmtMoney(open) : '—'}</td></tr> })}
        </tbody></table></div>
      )}
    </div>
  )
}

function UnitContacts({ page }: { page: Page }) {
  const db = useDb()
  const ids = unitCompanyIds(db, page)
  const rows = db.contacts.filter(ct => ids.has(ct.companyId))
  return (
    <div className="card">
      <div className="hd"><h2>Contacts at these companies<span className="sub">{rows.length}</span></h2><a className="btn sm" href="#/contacts">All contacts</a></div>
      {rows.length === 0 ? <div className="empty"><b>No contacts yet.</b>Add people from a company page.</div> : (
        <div className="wrap"><table className="tbl"><thead><tr><th>Name</th><th>Title</th><th>Company</th><th>Email</th><th>Phone</th></tr></thead><tbody>
          {rows.map(ct => { const c = db.companies.find(x => x.id === ct.companyId)!; return <tr key={ct.id}><td><b>{ct.name}</b></td><td className="muted">{ct.title}</td><td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a></td><td>{ct.email ? <a href={`mailto:${ct.email}`}>{ct.email}</a> : '—'}</td><td>{ct.phone ?? '—'}</td></tr> })}
        </tbody></table></div>
      )}
    </div>
  )
}

const SETTINGS_FIELDS: Record<string, Field[]> = {
  event: [{ key: 'name', label: 'Event name', required: true }, { key: 'date', label: 'Event date', type: 'date' }, { key: 'location', label: 'Location' }, { key: 'status', label: 'Status', type: 'select', options: ['Planning', 'Selling', 'Final prep', 'Live', 'Done'] }, { key: 'phase', label: 'Phase', type: 'select', options: ['12 months out', '6 months out', '3 months out', '1 month out', 'Event week'] }, { key: 'sponsorshipTarget', label: 'Sponsorship target', type: 'money' }, { key: 'registrationTarget', label: 'Registration target', type: 'number' }, { key: 'totalBudget', label: 'Total budget', type: 'money' }, { key: 'website', label: 'Website', type: 'url' }],
  awards: [{ key: 'name', label: 'Awards name', required: true }, { key: 'date', label: 'Awards night date', type: 'date' }, { key: 'nominationsClose', label: 'Nominations close on', type: 'date' }, { key: 'location', label: 'Location' }, { key: 'sponsorshipTarget', label: 'Sponsorship target', type: 'money' }, { key: 'nominationsTarget', label: 'Nominations target', type: 'number' }],
  podcast: [{ key: 'name', label: 'Show name', required: true }, { key: 'sponsorshipTarget', label: 'Sponsorship target', type: 'money' }, { key: 'episodesTarget', label: 'Episodes target (this year)', type: 'number' }, { key: 'guestsTarget', label: 'Confirmed guests target', type: 'number' }],
  magazine: [{ key: 'name', label: 'Magazine name', required: true }, { key: 'revenueTarget', label: 'Advertising revenue target', type: 'money' }, { key: 'advertisersTarget', label: 'Advertisers target', type: 'number' }, { key: 'piecesPerIssue', label: 'Content pieces per issue', type: 'number' }, { key: 'website', label: 'Website', type: 'url' }],
  marketplace: [{ key: 'name', label: 'Name', required: true }, { key: 'revenueTarget', label: 'Monthly revenue target', type: 'money' }, { key: 'vendorsTarget', label: 'Live vendors target', type: 'number' }],
  hub: [{ key: 'name', label: 'Name', required: true }],
}

function UnitSettings({ page }: { page: Page }) {
  const db = useDb()
  const fields = SETTINGS_FIELDS[page.unit ?? 'hub']
  const existing = recordsOf(db, 'unit-settings', page.key)[0]
  const ek = EVENT_KEY[page.key]
  const ev = ek ? db.events.find(e => e.key === ek) : undefined
  const [f, setF] = useState<Record<string, unknown>>(existing ? { ...existing } : { name: page.unitName, date: ev?.date, location: ev ? `${ev.venue}, ${ev.city}` : undefined, sponsorshipTarget: ev?.sponsorshipTarget, registrationTarget: ev?.registrationTarget, website: ev?.website })
  const save = () => { const data: Record<string, unknown> = {}; fields.forEach(x => { data[x.key] = f[x.key] }); if (existing) updateRecord('unit-settings', existing.id, data); else addRecord('unit-settings', page.key, data) }
  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <div className="hd"><h2>{fields === SETTINGS_FIELDS.event ? 'Event settings' : 'Settings'}<span className="sub">these numbers drive the Command Centre</span></h2></div>
      <div className="bd form c2">
        {fields.map(x => <div key={x.key} className={x.wide ? 'full' : ''}><FieldWrap label={x.label}>{x.type === 'select' ? <select value={String(f[x.key] ?? '')} onChange={(e: any) => setF({ ...f, [x.key]: e.target.value })}><option value="">—</option>{x.options!.map(o => <option key={o}>{o}</option>)}</select> : <input type={x.type === 'date' ? 'date' : ['money', 'number'].includes(x.type ?? '') ? 'number' : 'text'} value={String(f[x.key] ?? '')} onChange={(e: any) => setF({ ...f, [x.key]: ['money', 'number'].includes(x.type ?? '') ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value })} />}</FieldWrap></div>)}
        <div className="full right"><button className="btn pri" onClick={save}><Icons.check />Save settings</button></div>
      </div>
    </div>
  )
}

function EventManagement({ page }: { page: Page }) {
  const db = useDb()
  const s = recordsOf(db, 'unit-settings', page.key)[0]
  const tasks = recordsOf(db, 'tasks', page.key)
  const timeline = recordsOf(db, 'timeline', page.key)
  const overdue = tasks.filter(t => t.status !== 'Done' && String(t.due ?? '9') < todayIso()).length + timeline.filter(t => t.status !== 'Done' && String(t.date ?? '9') < todayIso()).length
  const invoices = recordsOf(db, 'invoices', page.key)
  const weekAhead = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const dueWeek = invoices.filter(i => i.status !== 'Paid' && String(i.due) <= weekAhead).length
  const vendors = recordsOf(db, 'vendors', page.key)
  const team = recordsOf(db, 'team', page.key)
  const d = s?.date ? daysUntil(String(s.date)) : undefined
  const tiles: Array<[string, string, string, string]> = [
    ['Event setup', 'Date, venue and team', String(team.length), 'settings'], ['Tasks and timeline', 'To-dos and milestones', String(tasks.length + timeline.length), 'tasks'],
    ['Budget and expenses', 'Planned against actual', fmtMoney(recordsOf(db, 'expenses', page.key).reduce((x, e) => x + Number(e.amount ?? 0), 0)), 'expenses'],
    ['Staffing and roles', 'Who does what on the day', String(team.length), 'team'], ['Vendors and suppliers', 'Quotes and payments', String(vendors.length), 'vendors'],
    ['Venue and logistics', 'AV, catering, permits', String(tasks.filter(t => t.category === 'Venue').length), 'tasks'], ['Registrations', 'Tickets and check-in', String(recordsOf(db, 'registrations', page.key).length), 'registrations'], ['Documents', 'Contracts and floor plans', String(recordsOf(db, 'files', page.key).length), 'files'],
  ]
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid c4">
        <Stat label="Days to go" value={d === undefined ? '—' : d < 0 ? 'Done' : d} sub={s?.date ? `${fmtDate(String(s.date))}${s.location ? ` · ${s.location}` : ''}` : 'Set the date in Event Settings'} />
        <Stat label="Overdue tasks" value={overdue} sub="tasks and milestones past their date" tone={overdue ? 'warn' : undefined} />
        <Stat label="Payments due this week" value={dueWeek} />
        <Stat label="Vendor quotes open" value={vendors.filter(v => v.contract === 'Quote').length} />
      </div>
      <div className="cc-grid">{tiles.map(([t, sub, n, sec]) => <a key={t} href={`#/${page.key}/${sec}`} className="cc ok"><div className="cc-l">{t}</div><div className="cc-d">{sub}</div><div className="cc-s" style={{ marginTop: 6 }}>{n}</div></a>)}</div>
    </div>
  )
}

function PodcastRecording({ page }: { page: Page }) {
  const db = useDb()
  const guests = recordsOf(db, 'guests', page.key).filter(g => g.recordingDate).sort((a, b) => String(a.recordingDate).localeCompare(String(b.recordingDate)))
  const upcoming = guests.filter(g => String(g.recordingDate) >= todayIso())
  const content = db.content.filter(c => c.type.startsWith('Podcast') && c.recordingDate && c.recordingDate >= todayIso())
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card"><div className="hd"><h2>Upcoming recordings<span className="sub">{upcoming.length + content.length}</span></h2></div>
        <table className="tbl"><thead><tr><th>When</th><th>Guest</th><th>Company</th><th>Host</th><th>Where</th><th>Status</th></tr></thead><tbody>
          {content.map(c => <tr key={c.id}><td>{fmtDate(c.recordingDate)}</td><td><b>{db.contacts.find(x => x.id === c.contactId)?.name ?? '—'}</b><div className="muted small">{c.title}</div></td><td><a className="lnk" href={`#/company/${c.companyId}`}>{db.companies.find(x => x.id === c.companyId)?.name}</a></td><td>{personName(c.hostId)}</td><td className="muted">{c.type.includes('studio') ? 'In studio' : 'Zoom'}</td><td><span className="pill plain Engage">{c.status}</span></td></tr>)}
          {upcoming.map(g => <tr key={g.id}><td>{fmtDate(String(g.recordingDate))}</td><td><b>{String(g.guest)}</b></td><td>{typeof g.company === 'string' ? <a className="lnk" href={`#/company/${g.company}`}>{db.companies.find(x => x.id === g.company)?.name ?? String(g.company)}</a> : '—'}</td><td>{personName(String(g.outreachOwner ?? ''))}</td><td className="muted">—</td><td><span className="pill plain Engage">{String(g.outreach)}</span></td></tr>)}
          {upcoming.length + content.length === 0 && <tr><td colSpan={6} className="empty">Nothing booked. Set a recording date on a guest, or book a podcast from a company page.</td></tr>}
        </tbody></table>
      </div>
      <p className="note">The booking board in Content Studio (Media → Podcast) tracks the same recordings from invite to published; this list shows the calendar.</p>
    </div>
  )
}
