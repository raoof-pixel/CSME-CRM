import { useMemo, useState } from 'react'
import { useRoute } from './router'
import { useUi, setUi } from './uiState'
import { useDb } from '../data/store'
import { runRules } from '../data/automations'
import { MENUS, MAGAZINES, findPage, type Page, type Section } from '../data/schema'
import { Icons, initials } from '../components/ui'
import { UnitPage } from '../components/UnitPage'
import { TabsPage, GenericList } from '../components/Generic'
import { Today } from '../pages/Today'
import { Founder } from '../pages/Founder'
import { Pipeline } from '../pages/Pipeline'
import { Companies, CompanyPage } from '../pages/Companies'
import { Sell } from '../pages/Sell'
import { Team } from '../pages/Team'
import { Admin } from '../pages/Admin'
import { AskAI } from '../pages/AskAI'
import * as C1 from '../pages/custom'
import * as C2 from '../pages/custom2'
import type { Brand } from '../data/types'

// Every custom page key from the schema → a component
const CUSTOM: Record<string, (p: { page: Page; tab?: string }) => any> = {
  'home': () => <C1.Home />,
  'founder': ({ tab }) => <Founder tab={tab} />,
  'fu-desk': () => <C1.FollowUpDesk />,
  'leads': () => <Pipeline base="leads" />,
  'messages': () => <C1.Messages />,
  'approvals': () => <C1.Approvals />,
  'proposal-requests': () => <C1.ProposalRequests />,
  'imp-tasks': () => <C1.ImpTasks />,
  'ai-assistant': () => <C1.AIAssistant />,
  'ai-toolkit': () => <C1.AIToolkit />,
  'autopilot': ({ tab }) => <C1.Autopilot tab={tab} />,
  'ai-summaries': () => <C1.AISummaries />,
  'eod': () => <C1.EOD />,
  'lead-watch': () => <C1.LeadWatch />,
  'news-alerts': () => <C1.NewsAlerts />,
  'target-dash': () => <C1.TargetDash />,
  'wins': () => <C1.Wins />,
  'edcal': () => <C1.EdCal />,
  'podcast-leads': () => <C1.PodcastLeads />,
  'publications': () => <C1.Publications />,
  'client-relationships': () => <C2.ClientRelationships />,
  'data-cleanup': () => <Admin tab="data" title="Data Clean-up" />,
  'sales-team': () => <C2.SalesTeam />,
  'media-sales': () => <C2.MediaSales />,
  'sales-home': () => <C2.SalesTeam title="Sales" blurb="The same sales management view, for anyone who looks for it under Sales." />,
  'follow-ups': () => <C2.FollowUps />,
  'sales-targets': () => <Admin tab="targets" title="Sales Targets" />,
  'weekly-recap': () => <C2.WeeklyRecap />,
  'research': () => <C2.Research />,
  'pitch-library': () => <Sell tab="pitches" title="Pitch Library" blurb="Emails, follow-ups, LinkedIn messages, call scripts and objection answers that worked. Copy one and replace everything in [brackets]." />,
  'companies': () => <Companies tab="all" />,
  'contacts': () => <Companies tab="contacts" />,
  'proposals': () => <Sell tab="proposals" title="Proposals" blurb="Deals and the proposals sent for them. After 3 days with no reply it says chase. Build new proposals from rate-card prices." />,
  'ratecard': () => <Sell tab="ratecard" title="Rate Card" blurb="All products and packages with current prices, for events and media. Use in a proposal from any deal." />,
  'automations': () => <Admin tab="automations" title="Automations" />,
  'meeting-notes': () => <C2.MeetingNotes />,
  'deliverables': () => <Sell tab="deliverables" title="Client Deliverables" blurb="What each client bought and when it is due. Created automatically when a deal is marked Won. Paste the live link as proof when delivered." />,
  'invoices': () => <Sell tab="invoices" title="Invoices & Payments" blurb="Won deals with no invoice yet, then every invoice. Create the real invoice in Stripe and keep the numbers matched." />,
  'onboarding': () => <C2.Onboarding />,
  'team-performance': () => <Team tab="performance" title="Team" blurb="Who is doing what with their leads and deals." />,
  'meetings': () => <Team tab="meetings" title="Meetings" blurb="The full list of meeting records. For day-to-day notes, Meeting Notes is quicker." />,
  'archive': () => <C2.Archive />,
  'reports': () => <C2.Reports />,
  'knowledge-centre': () => <C2.KnowledgeCentre />,
  'guide': () => <Admin tab="help" title="How to use this CRM" />,
  'settings': () => <C2.SettingsPage />,
}

// Custom sections inside tabs pages (Operations Dashboard, Production Hub, Training)
function renderCustomSection(key: string, section: Section, page: Page) {
  switch (key) {
    case 'ops-dashboard': return <C2.OpsDashboard />
    case 'ops-today': return <C2.OpsToday />
    case 'team-tasks': return <C2.TeamTasks />
    case 'ops-magazines': return <><C1.OpsMagazines /><div className="mt"><GenericList section={{ key: 'jobs', label: 'Magazine pieces: articles, ads and design', kind: 'list', collection: 'magazine-jobs', singular: 'magazine job', fields: (findPage('production')!.page.sections!.find(s => s.key === 'magazine')!.fields) }} unit="" /></div></>
    case 'ops-podcasts': return <C1.OpsPodcasts />
    case 'weekly-report': return <C2.WeeklyReport />
    case 'production-overview': return <C2.ProductionOverview />
    case 'knowledge': return <Team tab="knowledge" title="Playbook" blurb=" " />
    default: return <div className="empty">Section “{section.label}” on {page.label}.</div>
  }
}

export function App() {
  const route = useRoute()
  const ui = useUi()
  const db = useDb()
  const [q, setQ] = useState('')
  const [ask, setAsk] = useState(false)
  const [magsOpen, setMagsOpen] = useState(true)

  const key = route[0] || 'home'
  const found = key === 'company' ? findPage('companies') : findPage(key)
  const menu = found?.menu ?? MENUS[0]
  const page = found?.page ?? MENUS[0].pages[0]

  const todayCount = useMemo(() => runRules(db).filter(i => i.urgency !== 'soon').length, [db])
  const me = db.people.find(p => p.id === db.settings.currentUserId)
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const out: Array<{ label: string; kind: string; href: string }> = []
    db.companies.filter(c => c.name.toLowerCase().includes(s)).slice(0, 6).forEach(c => out.push({ label: c.name, kind: c.stage, href: `#/company/${c.id}` }))
    db.contacts.filter(c => c.name.toLowerCase().includes(s)).slice(0, 4).forEach(c => out.push({ label: c.name, kind: 'Contact', href: `#/company/${c.companyId}` }))
    db.deals.filter(d => d.title.toLowerCase().includes(s)).slice(0, 4).forEach(d => out.push({ label: d.title, kind: 'Deal', href: `#/company/${d.companyId}` }))
    MENUS.forEach(m => m.pages.filter(p => p.label.toLowerCase().includes(s)).slice(0, 3).forEach(p => out.push({ label: p.label, kind: m.label, href: `#/${p.key}` })))
    return out
  }, [q, db])

  let body: any
  if (key === 'company') body = <CompanyPage id={route[1]} />
  else if (page.kind === 'custom') body = (CUSTOM[page.custom ?? ''] ?? (() => <div className="empty">Page not built: {page.label}</div>))({ page, tab: route[1] })
  else if (page.kind === 'unit') body = <UnitPage page={page} sectionKey={route[1]} />
  else body = <TabsPage page={page} tab={route[1]} renderCustom={renderCustomSection} />

  const nestedKeys = new Set(menu.nested?.pageKeys ?? [])
  const plainPages = menu.pages.filter(p => !nestedKeys.has(p.key))
  const nestedPages = menu.pages.filter(p => nestedKeys.has(p.key))
  const IconFor = (name: string) => (Icons as any)[name] ?? Icons.today
  const iconFor = (n: string) => { const I = IconFor(n); return <I className="ic" /> }

  return (
    <div className="shell">
      <aside className={`rail ${ui.railOpen ? 'open' : ''}`}>
        <a className="brandmark" href="#/home">
          <span className="leaf" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l1.8 3.8 4-.8-1.3 3.6 3.8 1.7-3.5 2.1 1 4-3.8-1.3L12 19l-2-3.9-3.8 1.3 1-4L3.7 10.3l3.8-1.7L6.2 5l4 .8z" /></svg></span>
          <span><b>CanadianSME</b></span>
        </a>
        <nav className="mainnav" aria-label="Main menu">
          {MENUS.map(m => (
            <a key={m.key} href={`#/${m.pages[0].key}`} className={menu.key === m.key ? 'on' : ''} title={m.label}>
              {iconFor(m.icon)}{m.label}
              {m.key === 'today' && todayCount > 0 && <span className="cnt">{todayCount}</span>}
            </a>
          ))}
        </nav>
        <div className="rail-foot"><div className="who">{me?.name ?? 'You'}</div><div>{me?.role}</div></div>
      </aside>

      <aside className="subrail" aria-label={`${menu.label} menu`}>
        <div className="sh">{menu.label}<small>{menu.pages.length}</small></div>
        <div className="list">
          {plainPages.map(p => (
            <a key={p.key} href={`#/${p.key}`} className={page.key === p.key ? 'on' : ''} onClick={() => setUi({ railOpen: false })}>{p.label}{p.badge && <span className="tag-new">{p.badge}</span>}</a>
          ))}
          {menu.nested && (
            <div className="nest">
              <div className="nest-h" role="button" tabIndex={0} onClick={() => setMagsOpen(!magsOpen)}><span>{menu.nested.label}</span><span className="n">{nestedPages.length} {magsOpen ? '–' : '+'}</span></div>
              {magsOpen && nestedPages.map(p => { const mg = MAGAZINES.find(m => m.key === p.key); return <a key={p.key} href={`#/${p.key}`} className={page.key === p.key ? 'on' : ''} onClick={() => setUi({ railOpen: false })}><span className="mono">{mg?.short}</span>{p.label}</a> })}
            </div>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="iconbtn menubtn" aria-label="Menu" onClick={() => setUi({ railOpen: !ui.railOpen })}><Icons.menu /></button>
          <a className="btn sm ghost" href="javascript:history.back()" style={{ paddingLeft: 6 }}>‹ Back</a>
          <div className="search">
            <Icons.search />
            <input placeholder="Search companies, contacts, deals, pages" value={q} onChange={(e: any) => setQ(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Escape') setQ('') }} aria-label="Search" />
            {results.length > 0 && <div className="search-pop">{results.map((r, i) => <a key={i} href={r.href} onClick={() => setQ('')}><span>{r.label}</span><span className="k">{r.kind}</span></a>)}</div>}
          </div>
          <div className="sp" />
          <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <div className="brandpick"><select value={ui.brand} onChange={(e: any) => setUi({ brand: e.target.value as Brand | 'All' })} aria-label="Brand filter"><option value="All">All brands</option>{db.settings.activeBrands.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          <button className="iconbtn" aria-label="Ask AI" title="Ask AI" onClick={() => setAsk(true)}><Icons.spark /></button>
          <a className="iconbtn" href="#/home" aria-label="What needs you" title="What needs you"><Icons.bell />{todayCount > 0 && <span className="dot" />}</a>
          <a className="iconbtn" href="#/chat" aria-label="Messages" title="Messages"><Icons.chat /></a>
          <a className="iconbtn" href="#/guide" aria-label="Help" title="How to use this CRM"><Icons.help /></a>
          <button className="iconbtn" aria-label="Toggle theme" title="Light or dark" onClick={() => setUi({ theme: dark ? 'light' : 'dark' })}>{dark ? <Icons.sun /> : <Icons.moon />}</button>
          <a className="avatar" href="#/settings" title={me?.name}>{initials(me?.name ?? 'U')}</a>
        </header>
        <main className="page">{body}</main>
      </div>
      {ask && <AskAI onClose={() => setAsk(false)} />}
    </div>
  )
}
