import { useMemo, useState } from 'react'
import { useDb, dismiss, personName, completeJourneyTouch, setTaskStatus } from '../data/store'
import { runRules, type TodayItem } from '../data/automations'
import { useUi } from '../app/uiState'
import { Stat, Toast, useToast, fmtMoney } from '../components/ui'
import { LogActivity } from '../components/LogActivity'

export function Today() {
  const db = useDb()
  const ui = useUi()
  const [scope, setScope] = useState<'mine' | 'all'>('all')
  const [logFor, setLogFor] = useState<string | null>(null)
  const [toast, say] = useToast()
  const me = db.settings.currentUserId

  const items = useMemo(() => {
    let list = runRules(db, scope === 'mine' ? me : undefined)
    if (ui.brand !== 'All') list = list.filter(i => !i.companyId || db.companies.find(c => c.id === i.companyId)?.brands.includes(ui.brand as any))
    return list
  }, [db, scope, me, ui.brand])

  const now = items.filter(i => i.urgency === 'now')
  const today = items.filter(i => i.urgency === 'today')
  const soon = items.filter(i => i.urgency === 'soon')

  const month = new Date().toISOString().slice(0, 7)
  const wonThisMonth = db.deals.filter(d => d.stage === 'Won' && d.updatedAt.slice(0, 7) === month).reduce((s, d) => s + d.value, 0)
  const openPipeline = db.deals.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0)
  const nurturing = db.companies.filter(c => c.stage === 'Nurturing').length
  const contactsToday = db.activities.filter(a => a.kind === 'Outreach' && a.date.slice(0, 10) === new Date().toISOString().slice(0, 10)).length

  const act = (i: TodayItem) => {
    if (i.key.startsWith('journey:')) {
      const [, cid, m] = i.key.split(':')
      completeJourneyTouch(cid, Number(m))
      say('Logged. The next touch is already planned.')
    } else if (i.key.startsWith('task:')) {
      setTaskStatus(i.key.split(':')[1], 'Done'); say('Task done')
    } else if (i.companyId && (i.key.startsWith('fu:') || i.key.startsWith('cfu:') || i.key.startsWith('cold:') || i.key.startsWith('stuck:'))) {
      setLogFor(i.companyId)
    } else if (i.href) {
      window.location.hash = i.href
    }
  }

  const Row = ({ i }: { i: TodayItem }) => (
    <div className="row">
      <span className={`u ${i.urgency}`} aria-hidden="true" />
      <div>
        <div className="t">
          {i.companyId ? <a href={`#/company/${i.companyId}`}>{i.title}</a> : i.title}
          {scope === 'all' && i.personId && <span className="who">{personName(i.personId)}</span>}
        </div>
        <div className="d">{i.detail}</div>
      </div>
      <div className="acts">
        {i.action && <button className="btn sm" onClick={() => act(i)}>{i.action}</button>}
        {i.href && !i.action && <a className="btn sm" href={i.href}>Open</a>}
        <button className="btn sm ghost" title="Hide this item" onClick={() => dismiss(i.key)}>Hide</button>
      </div>
    </div>
  )

  const dayName = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <p>{dayName}. Everything that needs a person today, in one list: follow-ups, journey touches, chasers, meetings and tasks. Act on it or hide it.</p>
        </div>
        <div className="page-actions">
          <div className="tabs" style={{ margin: 0, borderBottom: 0 }}>
            <button className={scope === 'mine' ? 'on' : ''} onClick={() => setScope('mine')}>Mine</button>
            <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>Whole team</button>
          </div>
        </div>
      </div>

      <div className="grid c4 mb">
        <Stat label="Needs action now" value={now.length} sub={`${today.length} more due today`} tone={now.length ? 'warn' : undefined} />
        <Stat label="Closed this month" value={fmtMoney(wonThisMonth)} sub={`${fmtMoney(openPipeline)} open pipeline`} />
        <Stat label="In nurture" value={nurturing} sub="companies between content and the pitch" />
        <Stat label="First contacts today" value={`${contactsToday} / ${db.settings.dailyLeadPace}`} sub="team pace" />
      </div>

      <div className="card todo">
        {items.length === 0 && <div className="empty"><b>Nothing waiting.</b>New items appear here the day they are due.</div>}
        {now.length > 0 && <div className="section-lbl">Overdue or urgent</div>}
        {now.map(i => <Row key={i.key} i={i} />)}
        {today.length > 0 && <div className="section-lbl">Due today</div>}
        {today.map(i => <Row key={i.key} i={i} />)}
        {soon.length > 0 && <div className="section-lbl">Coming up</div>}
        {soon.map(i => <Row key={i.key} i={i} />)}
      </div>

      {logFor && <LogActivity companyId={logFor} onClose={() => setLogFor(null)} onSaved={() => say('Logged and next date set')} />}
      <Toast msg={toast} />
    </>
  )
}
