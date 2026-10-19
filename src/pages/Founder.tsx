import { useMemo } from 'react'
import { useDb, personName, setTaskStatus, todayIso } from '../data/store'
import { useRoute } from '../app/router'
import { useUi } from '../app/uiState'
import { Tabs, Stat, fmtMoney, fmtDate, StagePill } from '../components/ui'
import { STAGES } from '../data/lifecycle'
import { healthOf } from '../data/automations'
import type { Brand } from '../data/types'

export function Founder() {
  const db = useDb()
  const route = useRoute()
  const ui = useUi()
  const tab = route[1] ?? 'overview'
  const month = new Date().toISOString().slice(0, 7)
  const inBrand = (brands: Brand[] | undefined, brand?: Brand) => ui.brand === 'All' || (brands?.includes(ui.brand as Brand) ?? brand === ui.brand)

  const companies = db.companies.filter(c => !c.archived && inBrand(c.brands))
  const deals = db.deals.filter(d => inBrand(db.companies.find(c => c.id === d.companyId)?.brands))
  const won = deals.filter(d => d.stage === 'Won')
  const wonMtd = won.filter(d => d.updatedAt.slice(0, 7) === month).reduce((s, d) => s + d.value, 0)
  const wonYtd = won.filter(d => d.updatedAt.slice(0, 4) === month.slice(0, 4)).reduce((s, d) => s + d.value, 0)
  const open = deals.filter(d => !['Won', 'Lost'].includes(d.stage))
  const weighted = open.reduce((s, d) => s + d.value * d.probability / 100, 0)
  const mediaTarget = db.people.reduce((s, p) => s + (p.monthlyTarget ?? 0), 0)
  const receivables = db.invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.amount - i.paid, 0)
  const overdueRec = db.invoices.filter(i => i.status !== 'Paid' && i.due < todayIso()).reduce((s, i) => s + i.amount - i.paid, 0)
  const nurturing = companies.filter(c => c.stage === 'Nurturing')
  const cold = nurturing.filter(c => healthOf(db, c.id) === 'Cold').length
  const big = deals.filter(d => d.value >= 5000 && d.stage !== 'Lost').sort((a, b) => b.value - a.value)
  const founderTasks = db.tasks.filter(t => t.founderOnly && t.status !== 'Done').sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'))
  const funnel = useMemo(() => STAGES.map(s => ({ s, n: companies.filter(c => c.stage === s).length })), [companies])

  const byBrand = db.settings.activeBrands.map(b => {
    const cs = db.companies.filter(c => c.brands.includes(b) && !c.archived)
    const ds = db.deals.filter(d => d.brand === b || (d.eventKey && db.companies.find(c => c.id === d.companyId)?.brands.includes(b)))
    return { b, companies: cs.length, nurturing: cs.filter(c => c.stage === 'Nurturing').length, won: ds.filter(d => d.stage === 'Won').reduce((s, d) => s + d.value, 0), open: ds.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0), content: db.content.filter(ci => ci.brand === b && ci.status === 'Published').length }
  })

  const history = db.activities.filter(a => a.kind === 'System' || a.kind === 'Deal').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40)

  return (
    <>
      <div className="page-head">
        <div><h1>Founder</h1><p>Only what needs SK: money, the big deals, the team, and the decisions. Routine work stays on Today.</p></div>
      </div>
      <Tabs base="founder" items={[{ key: 'overview', label: 'Overview' }, { key: 'money', label: 'Money' }, { key: 'deals', label: 'Big deals', count: big.length }, { key: 'decisions', label: 'Decisions', count: founderTasks.length }, { key: 'brands', label: 'By brand' }, { key: 'history', label: 'History' }]} />

      {tab === 'overview' && (
        <>
          <div className="grid c4 mb">
            <Stat label="Closed this month" value={fmtMoney(wonMtd)} sub={mediaTarget ? `team media target ${fmtMoney(mediaTarget)}` : undefined} tone={mediaTarget && wonMtd >= mediaTarget ? 'good' : undefined} />
            <Stat label="Weighted pipeline" value={fmtMoney(weighted)} sub={`${fmtMoney(open.reduce((s, d) => s + d.value, 0))} across ${open.length} open deals`} />
            <Stat label="Owed to us" value={fmtMoney(receivables)} sub={overdueRec ? `${fmtMoney(overdueRec)} overdue` : 'nothing overdue'} tone={overdueRec ? 'warn' : undefined} />
            <Stat label="In nurture" value={nurturing.length} sub={cold ? `${cold} going cold` : 'all warm'} tone={cold ? 'warn' : 'good'} />
          </div>
          <div className="grid side">
            <div className="card">
              <div className="hd"><h2>Where every company is<span className="sub">{companies.length} companies</span></h2><a className="btn sm" href="#/pipeline">Open pipeline</a></div>
              <div className="bd">
                {funnel.map(({ s, n }) => {
                  const max = Math.max(1, ...funnel.map(f => f.n))
                  return <div key={s} className="row-between" style={{ padding: '4px 0', gap: 12 }}><div style={{ width: 120 }}><StagePill stage={s} /></div><div style={{ flex: 1 }} className="progress"><i style={{ width: `${(n / max) * 100}%`, background: s === 'Nurturing' ? 'var(--grow)' : STAGES.indexOf(s) < 4 ? 'var(--find)' : STAGES.indexOf(s) < 7 ? 'var(--engage)' : 'var(--grow)' }} /></div><div style={{ width: 28 }} className="right money">{n}</div></div>
                })}
                <p className="muted small mt">Leads should flow left to right and pile up in Nurturing, not in Contacted. A pile in Contacted means invites are not being booked.</p>
              </div>
            </div>
            <div className="stack" style={{ gap: 16 }}>
              <div className="card">
                <div className="hd"><h2>Decisions waiting for you<span className="sub">{founderTasks.length}</span></h2></div>
                <div className="bd stack">
                  {founderTasks.length === 0 && <p className="muted small">Nothing waiting.</p>}
                  {founderTasks.slice(0, 5).map(t => <div key={t.id} className="row-between small"><div><b>{t.title}</b><div className="muted">{t.area} · due {fmtDate(t.due)}</div></div><button className="btn sm" onClick={() => setTaskStatus(t.id, 'Done')}>Done</button></div>)}
                </div>
              </div>
              <div className="card">
                <div className="hd"><h2>Events</h2></div>
                <div className="bd stack">
                  {db.events.map(e => { const w = db.deals.filter(d => d.eventKey === e.key && d.stage === 'Won').reduce((s, d) => s + d.value, 0); return <div key={e.key}><div className="row-between small"><a className="lnk" href={`#/events/${e.key}`}>{e.name}</a><span className="money">{fmtMoney(w)} / {fmtMoney(e.sponsorshipTarget)}</span></div><div className="progress" style={{ marginTop: 4 }}><i style={{ width: `${Math.min(100, (w / e.sponsorshipTarget) * 100)}%` }} /></div></div> })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'money' && (
        <div className="grid c2">
          <div className="card">
            <div className="hd"><h2>Revenue</h2></div>
            <table className="tbl"><tbody>
              <tr><td>Closed this month</td><td className="num money">{fmtMoney(wonMtd)}</td></tr>
              <tr><td>Closed this year</td><td className="num money">{fmtMoney(wonYtd)}</td></tr>
              <tr><td>Media (this year)</td><td className="num money">{fmtMoney(won.filter(d => !d.eventKey).reduce((s, d) => s + d.value, 0))}</td></tr>
              <tr><td>Events (this year)</td><td className="num money">{fmtMoney(won.filter(d => d.eventKey).reduce((s, d) => s + d.value, 0))}</td></tr>
              <tr><td>Collected</td><td className="num money">{fmtMoney(db.invoices.reduce((s, i) => s + i.paid, 0))}</td></tr>
              <tr><td>Owed to us</td><td className="num money">{fmtMoney(receivables)}</td></tr>
            </tbody></table>
          </div>
          <div className="card">
            <div className="hd"><h2>Who owes us<span className="sub">{fmtMoney(receivables)}</span></h2><a className="btn sm" href="#/sell/invoices">All invoices</a></div>
            <table className="tbl"><thead><tr><th>Company</th><th>Invoice</th><th className="num">Outstanding</th><th>Days late</th><th>Owner</th></tr></thead><tbody>
              {db.invoices.filter(i => i.status !== 'Paid').map(i => { const d = db.deals.find(x => x.id === i.dealId); const c = d && db.companies.find(x => x.id === d.companyId); const late = Math.max(0, Math.round((Date.now() - new Date(i.due).getTime()) / 864e5)); return <tr key={i.id}><td>{c && <a className="lnk" href={`#/company/${c.id}`}>{c.name}</a>}</td><td className="muted">{i.number}</td><td className="num money">{fmtMoney(i.amount - i.paid)}</td><td style={late ? { color: 'var(--maple)' } : undefined}>{late || '—'}</td><td className="small">{personName(d?.ownerId)}</td></tr> })}
              {db.invoices.filter(i => i.status !== 'Paid').length === 0 && <tr><td colSpan={5} className="empty">Nothing outstanding.</td></tr>}
            </tbody></table>
          </div>
        </div>
      )}

      {tab === 'deals' && (
        <div className="card wrap">
          <div className="hd"><h2>Deals of $5,000 and above</h2></div>
          <table className="tbl"><thead><tr><th>Company</th><th>Deal</th><th>Stage</th><th className="num">Value</th><th>Owner</th><th>Last update</th><th>Next</th></tr></thead><tbody>
            {big.map(d => { const c = db.companies.find(x => x.id === d.companyId); const idle = Math.round((Date.now() - new Date(d.updatedAt).getTime()) / 864e5); return <tr key={d.id}><td><a className="lnk" href={`#/company/${d.companyId}`}>{c?.name}</a></td><td><b>{d.title}</b></td><td><span className={`pill plain ${d.stage === 'Won' ? 'good' : 'Grow'}`}>{d.stage}</span></td><td className="num money">{fmtMoney(d.value)}</td><td>{personName(d.ownerId)}</td><td className={idle > 7 && d.stage !== 'Won' ? 'money' : 'muted'} style={idle > 7 && d.stage !== 'Won' ? { color: 'var(--warn)' } : undefined}>{idle} days ago</td><td className="small">{d.nextAction ?? '—'}</td></tr> })}
          </tbody></table>
        </div>
      )}

      {tab === 'decisions' && (
        <div className="card wrap">
          <div className="hd"><h2>Only you can move these</h2><a className="btn sm" href="#/team/tasks">All tasks</a></div>
          <table className="tbl"><thead><tr><th>Decision</th><th>Area</th><th>Due</th><th></th></tr></thead><tbody>
            {founderTasks.length === 0 && <tr><td colSpan={4} className="empty">Nothing waiting for a founder decision.</td></tr>}
            {founderTasks.map(t => <tr key={t.id}><td><b>{t.title}</b></td><td className="muted">{t.area}</td><td className={t.due && t.due < todayIso() ? 'money' : 'muted'} style={t.due && t.due < todayIso() ? { color: 'var(--warn)' } : undefined}>{fmtDate(t.due)}</td><td className="act"><button className="btn sm" onClick={() => setTaskStatus(t.id, 'Done')}>Decided</button></td></tr>)}
          </tbody></table>
        </div>
      )}

      {tab === 'brands' && (
        <div className="card wrap">
          <div className="hd"><h2>Brands side by side</h2></div>
          <table className="tbl"><thead><tr><th>Brand</th><th className="num">Companies</th><th className="num">In nurture</th><th className="num">Published pieces</th><th className="num">Open pipeline</th><th className="num">Won</th></tr></thead><tbody>
            {byBrand.map(r => <tr key={r.b}><td><b>{r.b}</b></td><td className="num">{r.companies}</td><td className="num">{r.nurturing}</td><td className="num">{r.content}</td><td className="num">{fmtMoney(r.open)}</td><td className="num money">{fmtMoney(r.won)}</td></tr>)}
          </tbody></table>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="hd"><h2>Stage changes and wins<span className="sub">written by the app</span></h2></div>
          <div className="bd"><div className="timeline">{history.map(a => { const c = db.companies.find(x => x.id === a.companyId); return <div key={a.id} className="ev"><div className="when">{fmtDate(a.date)}</div><div><a className="lnk" href={`#/company/${a.companyId}`}>{c?.name}</a> · {a.summary}</div></div> })}</div></div>
        </div>
      )}
    </>
  )
}
