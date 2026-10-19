import { useMemo, useState } from 'react'
import { useDb, personName, update, uid, setTaskStatus, todayIso, addDays } from '../data/store'
import { useRoute } from '../app/router'
import { Tabs, fmtMoney, fmtDate, Drawer, Field, Toast, useToast } from '../components/ui'
import { healthOf } from '../data/automations'
import type { Task, Meeting } from '../data/types'

const GUIDES: Array<{ title: string; steps: string[] }> = [
  { title: 'Email interview', steps: ['Invite from the company page (Book content → Email interview).', 'Send 8–10 questions; status becomes Questions sent.', 'Angana edits the answers into an article; status Editing → Sent to client → Approved.', 'Publish. The company moves to Nurturing and its 12-month journey starts.', 'Send the live link and a social tag the same day.'] },
  { title: 'Podcast, Zoom or in studio', steps: ['Book the date on the company page; status Booked moves the company to Content booked.', 'Prep sheet: guest bio, 6 questions, one product to mention.', 'Record. Mark Recorded; Ashraf gets the edit.', 'Sent to client for approval, then Approved.', 'Publish, then send the thank-you pack within 2 days.'] },
  { title: 'Sponsored article', steps: ['Mark the media deal Won; deliverables are created automatically.', 'Request logo, photos and brief from the client (Deliverables → Waiting for client files).', 'Draft, send for approval, publish.', 'Paste the live link as proof and mark Delivered.', 'Invoice goes out when Won; chase at 15 days late.'] },
  { title: 'Event sponsorship', steps: ['Pitch only from Nurture: the company has had at least one helpful touch.', 'Start a deal from the event page with the right package.', 'Mark proposal sent; the chaser rule follows up at 3 and 7 days.', 'Won creates deliverables: logo, booth, passes, e-blast.', 'After the event: thank-you, results report, and renewal 30 days before next year\'s pitch window.'] },
  { title: 'Who does what', steps: ['SK: founder decisions, big deals, approvals.', 'Raoof: sales lead, owners and targets, weekly review.', 'Maheen, Nishat, Kripa, Amanda: owners of their companies end to end.', 'Angana: articles and email interviews.', 'Ashraf: magazine and podcast edits.', 'Azhar: websites, sponsor logos, registration pages.'] },
]

export function Team() {
  const db = useDb()
  const route = useRoute()
  const tab = route[1] ?? 'performance'
  const [toast, say] = useToast()
  const [taskDrawer, setTaskDrawer] = useState(false)
  const [meetingDrawer, setMeetingDrawer] = useState<Meeting | 'new' | null>(null)
  const [who, setWho] = useState('all')

  const month = new Date().toISOString().slice(0, 7)
  const weekAgo = addDays(todayIso(), -7)
  const sales = db.people.filter(p => p.role === 'Sales' || p.role === 'Sales lead')

  const perf = useMemo(() => sales.map(p => {
    const owned = db.companies.filter(c => c.ownerId === p.id && !c.archived)
    const closed = db.deals.filter(d => d.ownerId === p.id && d.stage === 'Won' && d.updatedAt.slice(0, 7) === month).reduce((s, d) => s + d.value, 0)
    const pipeline = db.deals.filter(d => d.ownerId === p.id && !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0)
    const overdue = db.deals.filter(d => d.ownerId === p.id && !['Won', 'Lost'].includes(d.stage) && d.nextFollowUp && d.nextFollowUp < todayIso()).length
    const touches = db.activities.filter(a => a.personId === p.id && a.kind !== 'System' && a.date.slice(0, 10) >= weekAgo).length
    const nurturing = owned.filter(c => c.stage === 'Nurturing')
    const cold = nurturing.filter(c => healthOf(db, c.id) === 'Cold').length
    const notContacted = owned.filter(c => c.stage === 'Assigned').length
    return { p, owned: owned.length, closed, pipeline, overdue, touches, nurturing: nurturing.length, cold, notContacted }
  }), [db, month, weekAgo])

  const tasks = db.tasks.filter(t => who === 'all' || t.assigneeId === who).sort((a, b) => Number(a.status === 'Done') - Number(b.status === 'Done') || (a.due ?? '9').localeCompare(b.due ?? '9'))
  const meetings = [...db.meetings].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <div className="page-head">
        <div><h1>Team</h1><p>Who is doing what with their companies, one task list, one meeting log, and the playbook.</p></div>
      </div>
      <Tabs base="team" items={[{ key: 'performance', label: 'Performance' }, { key: 'tasks', label: 'Tasks', count: db.tasks.filter(t => t.status !== 'Done').length }, { key: 'meetings', label: 'Meetings', count: db.meetings.length }, { key: 'knowledge', label: 'Playbook' }]} />

      {tab === 'performance' && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="card wrap">
            <div className="hd"><h2>Sales this month<span className="sub">{new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}</span></h2><a className="btn sm" href="#/admin/targets">Edit targets</a></div>
            <table className="tbl">
              <thead><tr><th>Person</th><th className="num">Target</th><th className="num">Closed</th><th>Progress</th><th className="num">Pipeline</th><th className="num">Companies</th><th className="num">Not contacted</th><th className="num">In nurture</th><th className="num">Cold</th><th className="num">Overdue</th><th className="num">Touches, 7 days</th></tr></thead>
              <tbody>
                {perf.map(r => {
                  const t = r.p.monthlyTarget ?? 0
                  const pct = t ? Math.min(100, Math.round((r.closed / t) * 100)) : 0
                  return (
                    <tr key={r.p.id}>
                      <td><b>{r.p.name}</b><div className="muted small">{r.p.brands.length > 3 ? 'All brands' : r.p.brands.join(', ')}</div></td>
                      <td className="num">{t ? fmtMoney(t) : <span className="muted">not set</span>}</td>
                      <td className="num money">{fmtMoney(r.closed)}</td>
                      <td style={{ minWidth: 120 }}>{t ? <><div className="progress"><i style={{ width: `${pct}%` }} /></div><div className="muted small">{pct}%</div></> : <span className="muted">—</span>}</td>
                      <td className="num">{fmtMoney(r.pipeline)}</td>
                      <td className="num">{r.owned}</td>
                      <td className="num" style={r.notContacted ? { color: 'var(--warn)' } : undefined}>{r.notContacted}</td>
                      <td className="num">{r.nurturing}</td>
                      <td className="num" style={r.cold ? { color: 'var(--maple)' } : undefined}>{r.cold}</td>
                      <td className="num" style={r.overdue ? { color: 'var(--warn)' } : undefined}>{r.overdue}</td>
                      <td className="num">{r.touches}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="hd"><h2>Recent activity<span className="sub">last 7 days, whole team</span></h2></div>
            <div className="bd">
              <div className="timeline">
                {db.activities.filter(a => a.kind !== 'System' && a.date.slice(0, 10) >= weekAgo).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25).map(a => { const c = db.companies.find(x => x.id === a.companyId); return <div key={a.id} className="ev"><div className="when">{fmtDate(a.date)}</div><div><span className="k">{personName(a.personId)}</span>{a.channel ?? a.kind} · <a className="lnk" href={`#/company/${a.companyId}`}>{c?.name}</a> · {a.summary}</div></div> })}
                {db.activities.filter(a => a.kind !== 'System' && a.date.slice(0, 10) >= weekAgo).length === 0 && <p className="muted small">Nothing logged this week.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <>
          <div className="filters">
            <select value={who} onChange={(e: any) => setWho(e.target.value)}><option value="all">Everyone</option>{db.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <span style={{ flex: 1 }} /><button className="btn pri" onClick={() => setTaskDrawer(true)}>Add task</button>
          </div>
          <div className="card wrap">
            <table className="tbl"><thead><tr><th></th><th>Task</th><th>Who</th><th>Area</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead><tbody>
              {tasks.length === 0 && <tr><td colSpan={7} className="empty">No tasks.</td></tr>}
              {tasks.map(t => { const late = t.status !== 'Done' && t.due && t.due < todayIso(); return (
                <tr key={t.id} style={{ opacity: t.status === 'Done' ? .55 : 1 }}>
                  <td><input type="checkbox" checked={t.status === 'Done'} onChange={() => setTaskStatus(t.id, t.status === 'Done' ? 'To do' : 'Done')} aria-label="Done" /></td>
                  <td><b>{t.title}</b>{t.founderOnly && <span className="tag" style={{ marginLeft: 6 }}>founder</span>}{t.companyId && <div className="small"><a className="lnk" href={`#/company/${t.companyId}`}>{db.companies.find(c => c.id === t.companyId)?.name}</a></div>}</td>
                  <td>{personName(t.assigneeId)}</td><td className="muted small">{t.area ?? '—'}</td>
                  <td><span className={`pill plain ${t.priority === 'High' ? 'maple' : t.priority === 'Medium' ? 'warn' : 'none'}`}>{t.priority}</span></td>
                  <td className={late ? 'money' : 'muted'} style={late ? { color: 'var(--warn)' } : undefined}>{fmtDate(t.due)}</td>
                  <td><select className="btn sm" value={t.status} onChange={(e: any) => setTaskStatus(t.id, e.target.value)}>{['To do', 'In progress', 'Done'].map(s => <option key={s}>{s}</option>)}</select></td>
                </tr>) })}
            </tbody></table>
          </div>
        </>
      )}

      {tab === 'meetings' && (
        <>
          <div className="filters"><span className="muted small">A finished meeting with no notes is flagged on Today the same afternoon.</span><span style={{ flex: 1 }} /><button className="btn pri" onClick={() => setMeetingDrawer('new')}>Add meeting</button></div>
          <div className="card wrap">
            <table className="tbl"><thead><tr><th>When</th><th>Meeting</th><th>Company</th><th>Who</th><th>Notes</th><th></th></tr></thead><tbody>
              {meetings.map(m => { const c = db.companies.find(x => x.id === m.companyId); const past = m.date < new Date().toISOString(); return (
                <tr key={m.id}><td className="muted small">{new Date(m.date).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td><b>{m.title}</b></td><td>{c ? <a className="lnk" href={`#/company/${c.id}`}>{c.name}</a> : '—'}</td><td className="small">{m.attendeeIds.map(personName).join(', ')}</td><td className="small">{m.notes ? <>{m.notes}{m.nextSteps && <div className="muted">Next: {m.nextSteps}</div>}</> : past ? <span className="pill plain maple">Notes missing</span> : <span className="muted">Upcoming</span>}</td><td className="act"><button className="btn sm" onClick={() => setMeetingDrawer(m)}>{m.notes ? 'Edit' : 'Add notes'}</button></td></tr>) })}
            </tbody></table>
          </div>
        </>
      )}

      {tab === 'knowledge' && (
        <div className="grid c2">
          {GUIDES.map(g => <div className="card" key={g.title}><div className="hd"><h2>{g.title}</h2></div><div className="bd"><ol style={{ margin: 0, paddingLeft: 18 }} className="small stack">{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div></div>)}
        </div>
      )}

      {taskDrawer && <TaskDrawer onClose={() => setTaskDrawer(false)} onSaved={() => say('Task added')} />}
      {meetingDrawer && <MeetingDrawer meeting={meetingDrawer === 'new' ? null : meetingDrawer} onClose={() => setMeetingDrawer(null)} onSaved={() => say('Saved')} />}
      <Toast msg={toast} />
    </>
  )
}

function TaskDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const db = useDb()
  const [f, setF] = useState<Omit<Task, 'id'>>({ title: '', assigneeId: db.settings.currentUserId, priority: 'Medium', status: 'To do', due: addDays(todayIso(), 3), area: '', companyId: undefined })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return (
    <Drawer title="Add a task" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.title.trim()} onClick={() => { update(d => { d.tasks.push({ id: uid('t'), ...f, companyId: f.companyId || undefined, area: f.area || undefined }) }); onSaved(); onClose() }}>Add</button></>}>
      <div className="form">
        <Field label="Task"><input value={f.title} onChange={(e: any) => set('title', e.target.value)} autoFocus /></Field>
        <div className="form c2">
          <Field label="Who"><select value={f.assigneeId ?? ''} onChange={(e: any) => set('assigneeId', e.target.value)}>{db.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Priority"><select value={f.priority} onChange={(e: any) => set('priority', e.target.value)}>{['Low', 'Medium', 'High'].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Due"><input type="date" value={f.due ?? ''} onChange={(e: any) => set('due', e.target.value)} /></Field>
          <Field label="Area"><input value={f.area ?? ''} onChange={(e: any) => set('area', e.target.value)} placeholder="Sales, Events, Magazine…" /></Field>
        </div>
        <Field label="Company (optional)"><select value={f.companyId ?? ''} onChange={(e: any) => set('companyId', e.target.value)}><option value="">—</option>{db.companies.filter(c => !c.archived).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      </div>
    </Drawer>
  )
}

function MeetingDrawer({ meeting, onClose, onSaved }: { meeting: Meeting | null; onClose: () => void; onSaved: () => void }) {
  const db = useDb()
  const [f, setF] = useState<Omit<Meeting, 'id'>>(meeting ?? { title: '', date: new Date().toISOString().slice(0, 16), attendeeIds: [db.settings.currentUserId], companyId: undefined, notes: '', nextSteps: '' })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const toggle = (id: string) => set('attendeeIds', f.attendeeIds.includes(id) ? f.attendeeIds.filter(x => x !== id) : [...f.attendeeIds, id])
  const save = () => {
    update(d => {
      const rec = { ...f, companyId: f.companyId || undefined, notes: f.notes || undefined, nextSteps: f.nextSteps || undefined, date: new Date(f.date).toISOString() }
      if (meeting) Object.assign(d.meetings.find(m => m.id === meeting.id)!, rec); else d.meetings.push({ id: uid('m'), ...rec })
      if (rec.companyId && rec.notes) d.activities.push({ id: uid('a'), companyId: rec.companyId, kind: 'Meeting', channel: 'Meeting', summary: `${rec.title}: ${rec.notes}`, date: rec.date, personId: rec.attendeeIds[0] })
    })
    onSaved(); onClose()
  }
  return (
    <Drawer title={meeting ? meeting.title : 'Add a meeting'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.title.trim()} onClick={save}>Save</button></>}>
      <div className="form">
        <Field label="Title"><input value={f.title} onChange={(e: any) => set('title', e.target.value)} /></Field>
        <div className="form c2">
          <Field label="When"><input type="datetime-local" value={f.date.slice(0, 16)} onChange={(e: any) => set('date', e.target.value)} /></Field>
          <Field label="Company"><select value={f.companyId ?? ''} onChange={(e: any) => set('companyId', e.target.value)}><option value="">Internal</option>{db.companies.filter(c => !c.archived).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        </div>
        <Field label="Who was there"><div className="brandbar">{db.people.map(p => <span key={p.id} role="button" tabIndex={0} className={f.attendeeIds.includes(p.id) ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => toggle(p.id)}>{p.name}</span>)}</div></Field>
        <Field label="What was discussed"><textarea value={f.notes ?? ''} onChange={(e: any) => set('notes', e.target.value)} /></Field>
        <Field label="Next steps"><input value={f.nextSteps ?? ''} onChange={(e: any) => set('nextSteps', e.target.value)} /></Field>
        <p className="note">Notes on a client meeting are also written into that company's history.</p>
      </div>
    </Drawer>
  )
}
