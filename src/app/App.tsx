import { useMemo, useState } from 'react'
import { useRoute } from './router'
import { useUi, setUi } from './uiState'
import { useDb } from '../data/store'
import { runRules } from '../data/automations'
import { Icons, initials } from '../components/ui'
import { Today } from '../pages/Today'
import { Founder } from '../pages/Founder'
import { Pipeline } from '../pages/Pipeline'
import { Companies, CompanyPage } from '../pages/Companies'
import { Content } from '../pages/Content'
import { Events } from '../pages/Events'
import { Sell } from '../pages/Sell'
import { Team } from '../pages/Team'
import { Admin } from '../pages/Admin'
import { AskAI } from '../pages/AskAI'
import type { Brand } from '../data/types'

const NAV = [
  { key: 'today', label: 'Today', icon: Icons.today, group: '' },
  { key: 'founder', label: 'Founder', icon: Icons.founder, group: '' },
  { key: 'pipeline', label: 'Pipeline', icon: Icons.pipeline, group: 'Work the lifecycle' },
  { key: 'companies', label: 'Companies', icon: Icons.companies, group: 'Work the lifecycle' },
  { key: 'content', label: 'Content Studio', icon: Icons.content, group: 'Work the lifecycle' },
  { key: 'events', label: 'Events', icon: Icons.events, group: 'Sell and deliver' },
  { key: 'sell', label: 'Sell and deliver', icon: Icons.sell, group: 'Sell and deliver' },
  { key: 'team', label: 'Team', icon: Icons.team, group: 'Run the company' },
  { key: 'admin', label: 'Admin', icon: Icons.admin, group: 'Run the company' },
]

export function App() {
  const route = useRoute()
  const ui = useUi()
  const db = useDb()
  const [q, setQ] = useState('')
  const [ask, setAsk] = useState(false)
  const section = route[0]

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
    db.content.filter(c => c.title.toLowerCase().includes(s)).slice(0, 4).forEach(c => out.push({ label: c.title, kind: c.type, href: `#/content` }))
    return out
  }, [q, db])

  let page: any
  switch (section) {
    case 'founder': page = <Founder />; break
    case 'pipeline': page = <Pipeline />; break
    case 'companies': page = <Companies />; break
    case 'company': page = <CompanyPage id={route[1]} />; break
    case 'content': page = <Content />; break
    case 'events': page = <Events />; break
    case 'sell': page = <Sell />; break
    case 'team': page = <Team />; break
    case 'admin': page = <Admin />; break
    default: page = <Today />
  }

  let lastGroup = ''
  return (
    <div className="shell">
      <aside className={`rail ${ui.railOpen ? 'open' : ''}`}>
        <a className="brandmark" href="#/today" onClick={() => setUi({ railOpen: false })}>
          <span className="leaf" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l1.8 3.8 4-.8-1.3 3.6 3.8 1.7-3.5 2.1 1 4-3.8-1.3L12 19l-2-3.9-3.8 1.3 1-4L3.7 10.3l3.8-1.7L6.2 5l4 .8z" /></svg>
          </span>
          <span><b>CanadianSME</b><small>CRM</small></span>
        </a>
        <nav className="nav" aria-label="Main">
          {NAV.map(n => {
            const grp = n.group && n.group !== lastGroup ? <div className="grp" key={'g' + n.group}>{n.group}</div> : null
            lastGroup = n.group
            const on = section === n.key || (section === 'company' && n.key === 'companies')
            return [grp, (
              <a key={n.key} href={`#/${n.key}`} className={on ? 'on' : ''} onClick={() => setUi({ railOpen: false })}>
                <n.icon className="ic" />{n.label}
                {n.key === 'today' && todayCount > 0 && <span className="cnt">{todayCount}</span>}
              </a>
            )]
          })}
        </nav>
        <div className="rail-foot">
          <div className="who">{me?.name ?? 'You'}</div>
          <div>{me?.role}</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="iconbtn menubtn" aria-label="Menu" onClick={() => setUi({ railOpen: !ui.railOpen })}><Icons.menu /></button>
          <div className="search">
            <Icons.search />
            <input placeholder="Search companies, contacts, deals, content" value={q} onChange={(e: any) => setQ(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Escape') setQ('') }} aria-label="Search" />
            {results.length > 0 && (
              <div className="search-pop">
                {results.map((r, i) => <a key={i} href={r.href} onClick={() => setQ('')}><span>{r.label}</span><span className="k">{r.kind}</span></a>)}
              </div>
            )}
          </div>
          <div className="sp" />
          <div className="brandpick">
            <select value={ui.brand} onChange={(e: any) => setUi({ brand: e.target.value as Brand | 'All' })} aria-label="Brand filter">
              <option value="All">All brands</option>
              {db.settings.activeBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <button className="iconbtn" aria-label="Ask AI" title="Ask AI" onClick={() => setAsk(true)}><Icons.spark /></button>
          <a className="iconbtn" href="#/today" aria-label="What needs you" title="What needs you"><Icons.bell />{todayCount > 0 && <span className="dot" />}</a>
          <a className="iconbtn" href="#/admin/help" aria-label="Help" title="How to use this CRM"><Icons.help /></a>
          <button className="iconbtn" aria-label="Toggle theme" title="Light or dark" onClick={() => setUi({ theme: dark ? 'light' : 'dark' })}>{dark ? <Icons.sun /> : <Icons.moon />}</button>
          <a className="avatar" href="#/admin/settings" title={me?.name}>{initials(me?.name ?? 'U')}</a>
        </header>
        <main className="page">{page}</main>
      </div>
      {ask && <AskAI onClose={() => setAsk(false)} />}
    </div>
  )
}
