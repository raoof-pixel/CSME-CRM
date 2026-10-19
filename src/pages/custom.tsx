// Custom pages for the Today, AI, Team & Targets and Media & Publications menus.
import { useMemo, useState } from 'react'
import { useDb, personName, recordsOf, addRecord, updateRecord, sendMessage, logActivity, todayIso, addDays, daysUntil, upsertDeal } from '../data/store'
import { runRules, healthOf, lastContactDate } from '../data/automations'
import { useRoute } from '../app/router'
import { Stat, fmtMoney, fmtDate, StagePill, Field, Drawer, Toast, useToast, Icons } from '../components/ui'
import { GenericList } from '../components/Generic'
import type { Section } from '../data/schema'
import { MAGAZINES } from '../data/schema'
import { Today } from './Today'
import { Team, TeamPerformance } from './Team'
import { Admin } from './Admin'
import { Content } from './Content'
import { answerFor, QUESTIONS } from './AskAI'
import { LogActivity } from '../components/LogActivity'
import type { Brand } from '../data/types'

const sec = (key: string, label: string, collection: string, singular: string, fields: Section['fields'], description?: string): Section => ({ key, label, kind: 'list', collection, singular, fields, description })

// ---------------- Home ----------------
export function Home() {
  const db = useDb()
  const items = useMemo(() => runRules(db), [db])
  const month = new Date().toISOString().slice(0, 7)
  const today = todayIso()
  const meetingsToday = db.meetings.filter(m => m.date.slice(0, 10) === today)
  const sales = db.people.filter(p => p.role === 'Sales' || p.role === 'Sales lead')
  const brief = items.filter(i => i.urgency === 'now').slice(0, 5)
  const unitRows = [
    { k: 'tour', t: 'T', name: 'SMB Show 2027', sub: 'Live events & sponsorships' }, { k: 'summit', t: 'S', name: 'SMB Summit 2027', sub: 'Live events & sponsorships' },
    { k: 'hub', t: 'H', name: 'CSME Hub', sub: 'Core platform & partnerships' }, { k: 'podcast', t: 'P', name: 'SMB Podcast', sub: 'Guests, recordings & deals' },
    { k: 'awards', t: 'A', name: 'SMB Awards 2026', sub: 'Nominations, judges & sponsors' }, { k: 'magazine', t: 'M', name: 'CanadianSME', sub: 'Issues, ads & revenue' },
  ]
  const evKey: Record<string, string> = { tour: 'show-2027', summit: 'summit-2027', awards: 'awards-2026' }
  const health = db.companies.filter(c => ['Nurturing', 'Won', 'Delivered'].includes(c.stage)).map(c => healthOf(db, c.id))
  return (
    <>
      <div className="page-head"><div><h1>Home</h1><p>Unified view across all your business units. The AI brief is written from today's rules; the numbers are live.</p></div></div>
      <div className="grid c2 mb">
        <div className="card"><div className="hd"><h2>Founder brief<span className="sub">AI assistant</span></h2><a className="btn sm" href="#/founder-cc">Founder Command Centre</a></div>
          <div className="bd stack">{brief.length === 0 ? <p className="muted small">Nothing urgent. The brief is rewritten each time data changes.</p> : brief.map(i => <div key={i.key} className="small"><b>{i.title}</b><div className="muted">{i.detail}{i.personId ? ` · ${personName(i.personId)}` : ''}</div></div>)}</div></div>
        <div className="card"><div className="hd"><h2>Sales team summary</h2><a className="btn sm" href="#/sales-team">Sales Team</a></div>
          <div className="bd stack">{sales.map(p => { const closed = db.deals.filter(d => d.ownerId === p.id && d.stage === 'Won' && d.updatedAt.slice(0, 7) === month).reduce((s, d) => s + d.value, 0); const t = p.monthlyTarget ?? 0; return <div key={p.id}><div className="row-between small"><b>{p.name}</b><span>{t ? `${fmtMoney(closed)} of ${fmtMoney(t)}` : 'No target set yet'}</span></div>{t > 0 && <div className="progress" style={{ marginTop: 4 }}><i style={{ width: `${Math.min(100, (closed / t) * 100)}%` }} /></div>}</div> })}</div></div>
      </div>
      <div className="grid c3 mb">
        <div className="card"><div className="hd"><h2>Meetings today<span className="sub">{meetingsToday.length}</span></h2><a className="btn sm" href="#/meeting-log">+ Add meeting</a></div><div className="bd stack">{meetingsToday.length === 0 ? <p className="muted small">No meetings today.</p> : meetingsToday.map(m => <div key={m.id} className="small"><b>{m.title}</b><div className="muted">{new Date(m.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {m.attendeeIds.map(personName).join(', ')}</div></div>)}</div></div>
        <div className="card"><div className="hd"><h2>Event sponsorship sold</h2><a className="btn sm" href="#/summit">Events</a></div><div className="bd stack">{db.events.map(e => { const w = db.deals.filter(d => d.eventKey === e.key && d.stage === 'Won').reduce((s, d) => s + d.value, 0); return <div key={e.key}><div className="row-between small"><b>{e.name}</b><span>{fmtMoney(w)} of {fmtMoney(e.sponsorshipTarget)}</span></div><div className="progress" style={{ marginTop: 4 }}><i style={{ width: `${Math.min(100, (w / e.sponsorshipTarget) * 100)}%` }} /></div></div> })}</div></div>
        <div className="card"><div className="hd"><h2>Client health<span className="sub">helpful touch in 30 days</span></h2><a className="btn sm" href="#/relations">Client Relationships</a></div><div className="bd"><div className="grid c3"><div className="stat" style={{ padding: 0 }}><div className="l">Healthy</div><div className="v" style={{ color: 'var(--good)' }}>{health.filter(h => h === 'Warm').length}</div></div><div className="stat" style={{ padding: 0 }}><div className="l">Getting cold</div><div className="v" style={{ color: 'var(--warn)' }}>{health.filter(h => h === 'Cooling').length}</div></div><div className="stat" style={{ padding: 0 }}><div className="l">Cold</div><div className="v" style={{ color: 'var(--maple)' }}>{health.filter(h => h === 'Cold').length}</div></div></div></div></div>
      </div>
      <div className="card wrap"><div className="hd"><h2>Business units</h2><a className="btn sm" href="#/publications">Publications</a></div>
        <table className="tbl"><thead><tr><th>Business unit</th><th>Key numbers</th><th></th></tr></thead><tbody>
          {unitRows.map(u => { const ek = evKey[u.k]; const deals = ek ? db.deals.filter(d => d.eventKey === ek) : u.k === 'magazine' ? db.deals.filter(d => d.brand === 'CanadianSME') : []; const rev = deals.filter(d => d.stage === 'Won').reduce((s, d) => s + d.value, 0); const pipe = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0)
            const nums = u.k === 'hub' ? [['Priorities', recordsOf(db, 'founder-priorities').length], ['Partnerships', recordsOf(db, 'hub-partnerships', 'hub').length], ['KPIs', recordsOf(db, 'hub-kpis', 'hub').length]] : u.k === 'podcast' ? [['Guests', recordsOf(db, 'guests', 'podcast').length + db.content.filter(c => c.type.startsWith('Podcast')).length], ['Upcoming recordings', db.content.filter(c => c.type.startsWith('Podcast') && c.recordingDate && c.recordingDate >= today).length], ['Published', db.content.filter(c => c.type.startsWith('Podcast') && c.status === 'Published').length]] : u.k === 'awards' ? [['Nominations', recordsOf(db, 'nominations', 'awards').length], ['Sponsors', deals.filter(d => d.stage === 'Won').length], ['Pipeline', fmtMoney(pipe)]] : [['Revenue', fmtMoney(rev)], ['Pipeline', fmtMoney(pipe)], ['Sponsors', deals.filter(d => d.stage === 'Won').length]]
            return <tr key={u.k}><td><div className="inline"><span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{u.t}</span><div><b>{u.name}</b><div className="muted small">{u.sub}</div></div></div></td><td><div className="inline" style={{ gap: 24 }}>{nums.map(([l, v]) => <div key={String(l)}><div className="muted small" style={{ textTransform: 'uppercase', fontSize: 10.5, fontWeight: 700 }}>{l}</div><div className="money">{v as any}</div></div>)}</div></td><td className="act"><a className="btn sm" href={`#/${u.k}`}>Open</a></td></tr> })}
        </tbody></table></div>
    </>
  )
}

// ---------------- Follow-Up Desk ----------------
export function FollowUpDesk() {
  const db = useDb()
  const me = db.settings.currentUserId
  const week = addDays(todayIso(), -7)
  const mine = db.activities.filter(a => a.personId === me && a.channel && a.date.slice(0, 10) >= week)
  const mix = ['Email', 'LinkedIn', 'Call', 'WhatsApp', 'Social', 'Meeting'].map(ch => [ch, mine.filter(a => a.channel === ch).length] as [string, number])
  const emailShare = mine.length ? Math.round((mix[0][1] / mine.length) * 100) : 0
  return (
    <>
      <div className="grid c4 mb">
        <Stat label="My follow-ups this week" value={mine.length} sub="target: 5 or more" tone={mine.length >= 5 ? 'good' : undefined} />
        <Stat label="Channels I used" value={mix.filter(m => m[1] > 0).length} sub="target: 3 or more" />
        <Stat label="Email share" value={`${emailShare}%`} sub="keep it under 60%" tone={emailShare > 60 ? 'warn' : undefined} />
        <div className="card stat"><div className="l">My channel mix, 7 days</div><div className="small" style={{ marginTop: 6 }}>{mix.map(([c, n]) => `${c} ${n}`).join(' · ')}</div></div>
      </div>
      <p className="note mb">The rule: never two emails in a row. Each client gets the next step of the plan: Email, LinkedIn, Call, Text, Social, Call, Email. The log form suggests the next channel. Do it, then log it and pick the next date.</p>
      <Today mode="followups" title="Follow-Up Desk" blurb="Every client due today and the channel to use. Log it and pick the next date." />
    </>
  )
}

// ---------------- Messages ----------------
export function Messages() {
  const db = useDb()
  const route = useRoute()
  const me = db.settings.currentUserId
  const channels = [{ key: 'general', label: 'General' }, { key: 'sales', label: 'Sales team' }, { key: 'tour', label: 'SMB Show 2027' }, { key: 'summit', label: 'SMB Summit 2027' }, { key: 'awards', label: 'SMB Awards 2026' }, { key: 'podcast', label: 'SMB Podcast' }, { key: 'magazine', label: 'CanadianSME' }]
  const current = route[1] ?? 'general'
  const [text, setText] = useState('')
  const msgs = db.messages.filter(m => m.channel === current || (current.startsWith('dm:') && (m.channel === current || m.channel === `dm:${me}:${current.slice(3)}` || m.channel === `dm:${current.slice(3)}:${me}`))).sort((a, b) => a.date.localeCompare(b.date))
  const send = () => { if (!text.trim()) return; sendMessage(current, text.trim()); setText('') }
  const last = (k: string) => { const m = db.messages.filter(x => x.channel === k).slice(-1)[0]; return m ? `${personName(m.fromId).split(' ')[0]}: ${m.text.slice(0, 28)}` : 'No messages yet' }
  return (
    <>
      <div className="page-head"><div><h1>Messages</h1><p>Pick a channel or a person, type, and press Enter. A red number beside Today means unread items, not messages.</p></div></div>
      <div className="card chat">
        <div className="side">
          <div className="section-lbl">Channels</div>
          {channels.map(c => <a key={c.key} href={`#/chat/${c.key}`} className={current === c.key ? 'on' : ''}>{c.label}<div className="last">{last(c.key)}</div></a>)}
          <div className="section-lbl">People</div>
          {db.people.filter(p => p.id !== me).map(p => <a key={p.id} href={`#/chat/dm:${p.id}`} className={current === `dm:${p.id}` ? 'on' : ''}>{p.name}<div className="last">{last(`dm:${p.id}`)}</div></a>)}
        </div>
        <div className="thread">
          <div className="msgs">
            {msgs.length === 0 && <p className="muted small">Start the conversation.</p>}
            {msgs.map(m => <div key={m.id} className={`msg ${m.fromId === me ? 'me' : ''}`}><div className="m">{personName(m.fromId)} · {new Date(m.date).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>{m.text}</div>)}
          </div>
          <form className="compose" onSubmit={(e: any) => { e.preventDefault(); send() }}><input placeholder={`Message ${channels.find(c => c.key === current)?.label ?? personName(current.slice(3))}`} value={text} onChange={(e: any) => setText(e.target.value)} /><button className="btn pri" type="submit">Send</button></form>
        </div>
      </div>
    </>
  )
}

// ---------------- Approvals ----------------
const APPROVAL_COLLECTIONS: Array<[string, string, string]> = [['social-posts', 'Social post', 'post'], ['video-jobs', 'Video', 'title'], ['magazine-jobs', 'Magazine job', 'piece'], ['decisions', 'Decision / approval', 'title'], ['founder-decisions', 'Founder decision', 'decision']]
export function Approvals() {
  const db = useDb()
  const [toast, say] = useToast()
  const waiting = APPROVAL_COLLECTIONS.flatMap(([col, kind, titleKey]) => recordsOf(db, col).filter(r => r.approval === 'Pending' || (col.includes('decision') && r.status === 'Open' && (r.type === 'Approval' || col === 'founder-decisions'))).map(r => ({ col, kind, title: String(r[titleKey] ?? ''), r })))
  const act = (col: string, id: string, ok: boolean) => { updateRecord(col, id, col.includes('decision') ? { status: ok ? 'Approved' : 'Rejected' } : { approval: ok ? 'Approved' : 'Changes requested' }); say(ok ? 'Approved' : 'Changes requested') }
  return (
    <>
      <div className="page-head"><div><h1>Approvals</h1><p>To ask for approval, set Approval to Pending on a post, video or magazine job. Managers approve here, or request changes and say what needs fixing.</p></div></div>
      <div className="card"><div className="hd"><h2>Waiting for approval<span className="sub">{waiting.length}</span></h2></div>
        {waiting.length === 0 ? <div className="empty"><b>Nothing waiting.</b>Items appear here when someone sets Approval to Pending.</div> : (
          <table className="tbl"><thead><tr><th>Item</th><th>Type</th><th>Who</th><th>Due</th><th className="act"></th></tr></thead><tbody>
            {waiting.map(w => <tr key={w.col + w.r.id}><td><b>{w.title}</b></td><td className="muted">{w.kind}</td><td>{personName(String(w.r.maker ?? w.r.editor ?? w.r.designer ?? w.r.owner ?? w.r.raisedBy ?? ''))}</td><td className="muted">{fmtDate(String(w.r.due ?? w.r.deadline ?? ''))}</td><td className="act"><button className="btn sm pri" onClick={() => act(w.col, w.r.id, true)}>Approve</button> <button className="btn sm" onClick={() => act(w.col, w.r.id, false)}>Request changes</button></td></tr>)}
          </tbody></table>
        )}
      </div>
      <Toast msg={toast} />
    </>
  )
}

// ---------------- Proposal Requests ----------------
export function ProposalRequests() {
  const s = sec('prop-req', 'Proposal requests from the team', 'proposal-requests', 'proposal request', [
    { key: 'company', label: 'Company', type: 'company', required: true }, { key: 'contact', label: 'Contact name' }, { key: 'email', label: 'Contact email', type: 'email' },
    { key: 'type', label: 'Type', type: 'select', options: ['Media', 'Event', 'Both'] }, { key: 'publication', label: 'Publication or event', type: 'select', options: ['CanadianSME', ...MAGAZINES.slice(1).map(m => m.brand), 'SMB Show 2027', 'SMB Summit 2027', 'SMB Awards 2026'] },
    { key: 'want', label: 'What the client wants', type: 'textarea', wide: true }, { key: 'budget', label: 'Budget', type: 'money' }, { key: 'timing', label: 'Timing (e.g. Jan to Mar 2027)' }, { key: 'needBy', label: 'Needed by', type: 'date' },
    { key: 'requestedBy', label: 'Requested by', type: 'person' }, { key: 'status', label: 'Status', type: 'select', options: ['To do', 'Question asked', 'Built', 'Not going ahead'] }, { key: 'notes', label: 'Notes', type: 'textarea', wide: true, hideInTable: true },
  ], 'Sales asks, the proposal gets built. Build it in Proposals, then mark the request Built.')
  return <><div className="page-head"><div><h1>Proposal Requests</h1><p>Requests from the sales team for a proposal to be built. Open Proposals to build it with rate-card prices.</p></div><div className="page-actions"><a className="btn" href="#/proposals">Build the proposal</a></div></div><GenericList section={s} unit="" /></>
}

// ---------------- AI Assistant ----------------
export function AIAssistant() {
  const db = useDb()
  const [q, setQ] = useState('')
  const [log, setLog] = useState<Array<{ q: string; a: string }>>([])
  const saved = recordsOf(db, 'saved-work')
  const ask = (t: string) => { if (!t.trim()) return; setLog([{ q: t, a: answerFor(db, t) }, ...log]); setQ('') }
  const me = db.people.find(p => p.id === db.settings.currentUserId)
  const prompts = [...QUESTIONS, 'Cross-sell ideas for existing clients', 'Monday team report']
  return (
    <>
      <div className="page-head"><div><h1>AI Assistant</h1><p>Hi {me?.name.split(' ')[0]}, what can I help with? Answers come from the CRM's own data.</p></div></div>
      <div className="grid side">
        <div className="card"><div className="bd stack">
          <form className="inline" style={{ flexWrap: 'nowrap' }} onSubmit={(e: any) => { e.preventDefault(); ask(q) }}><input className="btn" style={{ flex: 1, fontWeight: 500, textAlign: 'left' }} placeholder="Ask anything, e.g. who should I follow up with today" value={q} onChange={(e: any) => setQ(e.target.value)} /><button className="btn pri" type="submit">Ask</button></form>
          <div className="inline">{prompts.map(p => <button key={p} className="btn sm" onClick={() => ask(p)}>{p}</button>)}</div>
          {log.map((l, i) => <div key={i}><div className="small" style={{ fontWeight: 700 }}>{l.q}</div><div className="note" style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', marginTop: 4 }}>{l.a}</div><button className="btn sm ghost" style={{ marginTop: 4 }} onClick={() => addRecord('saved-work', '', { title: l.q, body: l.a, by: db.settings.currentUserId })}>Save this</button></div>)}
        </div></div>
        <div className="card"><div className="hd"><h2>Saved work<span className="sub">{saved.length}</span></h2></div><div className="bd stack">{saved.length === 0 ? <p className="muted small">Answers and drafts you save appear here.</p> : saved.map(s => <div key={s.id} className="small"><b>{String(s.title)}</b><div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{String(s.body).slice(0, 160)}…</div></div>)}</div></div>
      </div>
    </>
  )
}

// ---------------- AI Toolkit ----------------
const TOOLS: Array<{ key: string; name: string; desc: string; needsCompany?: boolean; needsText?: boolean }> = [
  { key: 'prep', name: 'Call prep sheet', desc: 'A one-page brief before a meeting or call.', needsCompany: true },
  { key: 'proposal', name: 'Proposal writer', desc: 'A one-page proposal with products from the rate card.', needsCompany: true },
  { key: 'cleaner', name: 'Lead list cleaner', desc: 'Scores the leads in a list and flags duplicates.' },
  { key: 'objection', name: 'Objection helper', desc: 'Type what the client said and get a reply.', needsText: true },
  { key: 'podprep', name: 'Podcast prep', desc: 'Guest bio, 8 to 10 questions, intro and outro.', needsCompany: true },
  { key: 'article', name: 'Interview answers to article', desc: 'Paste the answers; get an article draft.', needsText: true, needsCompany: true },
  { key: 'social', name: 'Social posts about a client', desc: 'Posts to celebrate a client or episode.', needsCompany: true },
  { key: 'award', name: 'Award nomination helper', desc: 'A strong nomination write-up.', needsCompany: true },
  { key: 'newsletter', name: 'Newsletter roundup', desc: "Drafts this month's client roundup." },
  { key: 'results', name: 'Campaign results report', desc: 'A client-friendly report of what was delivered.', needsCompany: true },
  { key: 'renewal', name: 'Renewal offer', desc: 'The renewal pitch before a campaign ends.', needsCompany: true },
  { key: 'chaser', name: 'Invoice chaser', desc: 'Polite payment reminders: friendly, firm, final.', needsCompany: true },
  { key: 'coaching', name: 'Coaching notes', desc: '3 specific tips for one salesperson.' },
  { key: 'forecast', name: 'Pipeline forecast', desc: 'What will close this month, and what is at risk.' },
  { key: 'lost', name: 'Lost deal lessons', desc: 'Why we lose deals and what to change.' },
]
export function AIToolkit() {
  const db = useDb()
  const [tool, setTool] = useState(TOOLS[0])
  const [companyId, setCompanyId] = useState('')
  const [text, setText] = useState('')
  const [out, setOut] = useState('')
  const [toast, say] = useToast()
  const c = db.companies.find(x => x.id === companyId)
  const ct = c ? db.contacts.find(x => x.companyId === c.id && x.decisionMaker) ?? db.contacts.find(x => x.companyId === c.id) : undefined
  const first = ct?.name.split(' ')[0] ?? '[first name]'
  const pubs = c ? db.content.filter(x => x.companyId === c.id && x.status === 'Published') : []
  const deals = c ? db.deals.filter(x => x.companyId === c.id) : []
  const write = () => {
    const name = c?.name ?? '[company]'
    const acts = c ? db.activities.filter(a => a.companyId === c.id && a.kind !== 'System').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4) : []
    const media = db.packages.filter(p => !p.eventKey)
    let t = ''
    switch (tool.key) {
      case 'prep': t = `CALL PREP: ${name}\n\nWho: ${ct ? `${ct.name}, ${ct.title ?? ''}` : 'no contact on file'}\nStage: ${c?.stage ?? '-'} · Owner: ${personName(c?.ownerId)} · Health: ${c ? healthOf(db, c.id) : '-'}\nIndustry: ${c?.industry ?? '-'} · ${c?.city ?? ''}\n\nWhat we have done together:\n${pubs.map(p => `• ${p.type}: ${p.title} (${fmtDate(p.publishDate)})`).join('\n') || '• Nothing published yet'}\n\nLast touches:\n${acts.map(a => `• ${fmtDate(a.date)} ${a.channel ?? a.kind}: ${a.summary}`).join('\n') || '• None logged'}\n\nOpen deals: ${deals.filter(d => !['Won', 'Lost'].includes(d.stage)).map(d => `${d.title} (${fmtMoney(d.value)}, ${d.stage})`).join('; ') || 'none'}\n\nThree questions to ask:\n1. What does a good ${new Date().getFullYear() + 1} look like for ${name}?\n2. Who else at ${name} should hear about the Summit?\n3. Which of our audiences matters most to you: readers, listeners or attendees?\n\nOne ask: ${c?.stage === 'Nurturing' ? 'propose the next journey touch and float the event' : c?.stage === 'Contacted' ? 'book a podcast or email interview' : 'confirm the next step and date'}`; break
      case 'proposal': t = `PROPOSAL FOR ${name.toUpperCase()}\nPrepared by ${personName(db.settings.currentUserId)} · ${fmtDate(todayIso())}\n\nWhy now\n${name} ${pubs.length ? `has already been featured with us (${pubs.map(p => p.title).join(', ')}) and the audience responded.` : 'reaches exactly the small-business owners our readers are.'}\n\nRecommended package\n${media.slice(0, 3).map(p => `• ${p.name}: ${p.includes} — ${fmtMoney(p.price)}`).join('\n')}\nBundle: ${fmtMoney(media.slice(0, 3).reduce((s, p) => s + p.price, 0) * 0.85)} (15% off the list price)\n\nAudience\nNewsletter 48,000 · Website 95,000 visitors a month · LinkedIn 31,000 (update in Audience and Links)\n\nNext step\nReply with a start month and we hold the slots. Valid until ${fmtDate(addDays(todayIso(), 21))}.`; break
      case 'cleaner': { const seen = new Map<string, number>(); db.companies.forEach(x => { const k = x.name.toLowerCase().replace(/\b(inc|ltd|canada|corp)\b/g, '').replace(/[^a-z0-9]/g, ''); seen.set(k, (seen.get(k) ?? 0) + 1) }); const dupes = [...seen.entries()].filter(e => e[1] > 1).length; const scored = db.companies.filter(x => x.stage === 'Mined' || x.stage === 'Validated').map(x => ({ x, s: (x.score ?? 50) + (db.contacts.some(ct => ct.companyId === x.id) ? 10 : 0) + (x.website ? 5 : 0) })).sort((a, b) => b.s - a.s); t = `LEAD LIST CLEANER\n\n${db.companies.length} companies · ${dupes} possible duplicate names (see Data Clean-up)\n\nTop leads to work first:\n${scored.slice(0, 10).map(({ x, s }) => `• ${x.name} — ${s} (${x.industry ?? 'industry unknown'}${x.city ? ', ' + x.city : ''})`).join('\n')}\n\nSkip for now (score under 40):\n${scored.filter(y => y.s < 40).map(y => `• ${y.x.name}`).join('\n') || '• none'}`; break }
      case 'objection': t = `They said: "${text || '[what the client said]'}"\n\nReply:\n${/budget|expensive|cost|price/i.test(text) ? `Understood. Most of our sponsors plan this in ${new Date().toLocaleString('en-CA', { month: 'long' })} for next year's budget. Shall I hold the slot at this year's price until ${fmtDate(addDays(todayIso(), 30))}, and start with the smallest piece, a sponsored article, so you can see the response first?` : /time|busy|later|not now/i.test(text) ? `Of course. I will not chase you; I will send one line when the ${db.events[1].name} agenda is final so you can decide with the full picture. In the meantime, can I feature ${name} in our newsletter roundup at no cost?` : /already|another|competitor/i.test(text) ? `That makes sense. Our readers are owner-operators, which is a different room from most trade media. If it helps, I can share the results report from a similar sponsor so you can compare like for like.` : `Thank you for being direct. If I understand correctly, the concern is ${text ? text.toLowerCase() : '[the concern]'}. The quickest way to answer it is a 15-minute call with results from a similar client. Does ${fmtDate(addDays(todayIso(), 2))} work?`}`; break
      case 'podprep': t = `PODCAST PREP: ${ct?.name ?? '[guest]'}, ${name}\n\nIntro (30 sec)\nToday's guest leads ${name}, ${c?.industry ? `a ${c.industry.toLowerCase()} company` : 'a Canadian business'} based in ${c?.city ?? 'Canada'}. We talk about what is working for small businesses right now.\n\nQuestions\n1. What does ${name} do, in one sentence a customer would use?\n2. What was the moment you knew this would work?\n3. What do small-business owners get wrong about ${c?.industry ?? 'your field'}?\n4. Walk us through one customer story.\n5. What changed in the last 12 months?\n6. How are you using AI, honestly?\n7. What would you tell someone starting today?\n8. What is next for ${name} in ${new Date().getFullYear() + 1}?\n9. Where can people find you?\n\nOutro\nThank you ${first}. Links in the show notes. Subscribe for a new conversation every week.\n\nAfter recording: thank-you email within 2 days, live link and social tag on publish day.`; break
      case 'article': t = `DRAFT ARTICLE: ${name}\n\n${name}: ${c?.industry ? `rethinking ${c.industry.toLowerCase()} for small business` : 'a Canadian small business story'}\n\n${text ? text.split(/\n+/).filter(Boolean).map((p, i) => (i === 0 ? `${ct?.name ?? 'The founder'} puts it plainly: "${p.trim()}"` : p.trim())).join('\n\n') : '[Paste the interview answers in the text box and the draft is built from them.]'}\n\nAbout ${name}\n${c?.website ? `Learn more at ${c.website}.` : ''}`; break
      case 'social': t = `LINKEDIN\n${pubs[0] ? `New on the CanadianSME podcast: ${pubs[0].title} with ${ct?.name ?? name}. ` : `Spotlight on ${name}. `}Three takeaways for small-business owners:\n1. [takeaway]\n2. [takeaway]\n3. [takeaway]\nListen or read: [link] #CanadianSME #SmallBusiness\n\nINSTAGRAM\n${name} is ${c?.industry ? `changing how small businesses handle ${c.industry.toLowerCase()}` : 'one to watch'}. Full story at the link in bio.\n\nX\n"[one quote from the piece]" — ${ct?.name ?? name}. [link]`; break
      case 'award': t = `NOMINATION: ${name} for SMB Awards 2026\n\nCategory: [category]\n\nWhy ${name} deserves it\n${name} ${c?.industry ? `has built a ${c.industry.toLowerCase()} business` : 'has built a business'} that ${pubs.length ? `we have featured ${pubs.length} time${pubs.length > 1 ? 's' : ''}, most recently "${pubs[0].title}".` : 'stands out in its market.'}\n\nImpact: [customers served, jobs created, growth]\nInnovation: [what they do differently]\nCommunity: [who they help beyond customers]\n\nSubmitted by ${personName(db.settings.currentUserId)}, ${fmtDate(todayIso())}`; break
      case 'newsletter': { const recent = db.content.filter(x => x.status === 'Published' && (x.publishDate ?? '') >= addDays(todayIso(), -30)); t = `NEWSLETTER ROUNDUP: ${new Date().toLocaleString('en-CA', { month: 'long' })}\n\nThis month on CanadianSME\n${recent.map(x => `• ${x.title} — ${db.companies.find(y => y.id === x.companyId)?.name} (${x.type})`).join('\n') || '• [no pieces published in the last 30 days]'}\n\nComing up\n${db.events.map(e => `• ${e.name}, ${fmtDate(e.date)} — ${e.website}`).join('\n')}\n\nOne ask\nKnow a founder we should feature? Reply to this email.`; break }
      case 'results': t = `RESULTS REPORT FOR ${name.toUpperCase()}\n\nWhat we delivered\n${deals.filter(d => d.stage === 'Won').map(d => `• ${d.title}`).join('\n') || '• [deliverables]'}\n${pubs.map(p => `• ${p.type}: ${p.title}${p.liveUrl ? ` — ${p.liveUrl}` : ''}`).join('\n')}\n\nReach\n• Newsletter: [opens] opens · [clicks] clicks\n• Website: [views] views\n• Social: [impressions] impressions\n\nWhat we recommend next\n• ${db.events[1].name}: a panel seat puts ${first} in front of the same audience live.\n\nThank you for working with us.`; break
      case 'renewal': t = `Subject: Your results so far, and keeping the momentum\n\nHi ${first},\n\nHere is what ${name}'s campaign has delivered so far: [results]. It ends on [date].\n\nIf you want to keep the audience warm, I can roll it into ${media[0]?.name ?? '[next package]'} at the current rate, held until ${fmtDate(addDays(todayIso(), 14))}.\n\nShall I send the one-page renewal?\n\n${personName(db.settings.currentUserId)}`; break
      case 'chaser': { const inv = db.invoices.find(i => deals.some(d => d.id === i.dealId) && i.status !== 'Paid'); t = `FRIENDLY (day 3)\nHi ${first}, a quick note that invoice ${inv?.number ?? '[number]'} for ${inv ? fmtMoney(inv.amount - inv.paid) : '[amount]'} was due on ${inv ? fmtDate(inv.due) : '[date]'}. Could you let me know when it is scheduled? Thank you.\n\nFIRM (day 15)\nHi ${first}, invoice ${inv?.number ?? '[number]'} is now 15 days past due. Please arrange payment this week, or tell me if something is holding it up so we can fix it.\n\nFINAL (day 30)\nHi ${first}, invoice ${inv?.number ?? '[number]'} is 30 days overdue. If payment is not received by ${fmtDate(addDays(todayIso(), 7))} we will pause the remaining deliverables. I would much rather sort this out; call me any time.`; break }
      case 'coaching': { const p = db.people.find(x => x.id === db.settings.currentUserId); const owned = db.companies.filter(x => x.ownerId === p?.id); t = `COACHING NOTES: ${p?.name}\n\n1. ${owned.filter(x => x.stage === 'Assigned').length} assigned leads have not been contacted. Block 45 minutes tomorrow morning for first touches, LinkedIn first.\n2. ${owned.filter(x => x.stage === 'Nurturing' && healthOf(db, x.id) !== 'Warm').length} nurturing companies are cooling. Do the due journey touch today; it is already written on each company page.\n3. ${db.deals.filter(d => d.ownerId === p?.id && d.stage === 'Proposal sent').length} proposals are out. Call, do not email, on day 3.`; break }
      case 'forecast': { const open = db.deals.filter(d => !['Won', 'Lost'].includes(d.stage)); const month = new Date().toISOString().slice(0, 7); const thisMonth = open.filter(d => (d.expectedClose ?? '').slice(0, 7) === month); t = `PIPELINE FORECAST: ${new Date().toLocaleString('en-CA', { month: 'long' })}\n\nExpected to close this month: ${thisMonth.length} deals, ${fmtMoney(thisMonth.reduce((s, d) => s + d.value, 0))} (weighted ${fmtMoney(thisMonth.reduce((s, d) => s + d.value * d.probability / 100, 0))})\n${thisMonth.map(d => `• ${d.title} — ${fmtMoney(d.value)} at ${d.probability}%, ${personName(d.ownerId)}`).join('\n')}\n\nAt risk (no update in 7+ days):\n${open.filter(d => Date.now() - new Date(d.updatedAt).getTime() > 7 * 864e5).map(d => `• ${d.title} — ${personName(d.ownerId)}`).join('\n') || '• none'}\n\nTotal open: ${fmtMoney(open.reduce((s, d) => s + d.value, 0))} across ${open.length} deals`; break }
      case 'lost': { const lost = db.deals.filter(d => d.stage === 'Lost'); const reasons: Record<string, number> = {}; lost.forEach(d => { reasons[d.lostReason ?? 'No reason recorded'] = (reasons[d.lostReason ?? 'No reason recorded'] ?? 0) + 1 }); t = `LOST DEAL LESSONS\n\n${lost.length} lost deals worth ${fmtMoney(lost.reduce((s, d) => s + d.value, 0))}\n\nReasons\n${Object.entries(reasons).map(([r, n]) => `• ${r}: ${n}`).join('\n') || '• none yet'}\n\nWhat to change\n• Ask about budget timing on the first call, and hold slots instead of discounting.\n• Pitch only from Nurture: companies with a published piece convert better than cold ones.\n• Record a reason on every lost deal so this report gets smarter.`; break }
    }
    setOut(t)
  }
  return (
    <>
      <div className="page-head"><div><h1>AI Toolkit</h1><p>15 helpers that write from your CRM data. Pick a tool, pick a company if it needs one, and press Write it. Replace anything in [brackets].</p></div></div>
      <div className="grid side">
        <div className="card"><div className="bd stack">
          <div className="grid c3">{TOOLS.map(t => <button key={t.key} className={`btn ${tool.key === t.key ? 'pri' : ''}`} style={{ height: 'auto', padding: '10px 12px', flexDirection: 'column', alignItems: 'flex-start', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => { setTool(t); setOut('') }}><b>{t.name}</b><span className="small" style={{ fontWeight: 500, opacity: .8 }}>{t.desc}</span></button>)}</div>
          <div className="form c2">
            {tool.needsCompany && <Field label="Company"><select value={companyId} onChange={(e: any) => setCompanyId(e.target.value)}><option value="">Start typing a company name</option>{[...db.companies].sort((a, b) => a.name.localeCompare(b.name)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}
            {tool.needsText && <div className="full"><Field label={tool.key === 'objection' ? 'What the client said' : 'Paste the text'}><textarea value={text} onChange={(e: any) => setText(e.target.value)} /></Field></div>}
            <div className="full"><button className="btn pri" onClick={write}><Icons.spark />Write it</button></div>
          </div>
        </div></div>
        <div className="card"><div className="hd"><h2>{tool.name}</h2>{out && <div className="inline"><button className="btn sm" onClick={() => { navigator.clipboard?.writeText(out); say('Copied') }}>Copy</button><button className="btn sm" onClick={() => { addRecord('saved-work', '', { title: `${tool.name}${c ? ': ' + c.name : ''}`, body: out, by: db.settings.currentUserId }); say('Saved to AI Assistant → Saved work') }}>Save</button></div>}</div>
          <div className="bd small" style={{ whiteSpace: 'pre-wrap', minHeight: 200 }}>{out || <span className="muted">The draft appears here.</span>}</div></div>
      </div>
      <Toast msg={toast} />
    </>
  )
}

// ---------------- AI Autopilot ----------------
export function Autopilot({ tab }: { tab?: string }) {
  const db = useDb()
  const route = useRoute()
  const t = tab ?? route[1] ?? 'today'
  const [who, setWho] = useState(db.settings.currentUserId)
  const tabs = [['today', "Today's actions"], ['week', 'My week plan'], ['scores', 'Lead scores and tags'], ['units', 'Team leads by unit'], ['manager', 'Manager report'], ['cleanup', 'Data clean-up']]
  const items = useMemo(() => runRules(db, who), [db, who])
  const owned = db.companies.filter(c => c.ownerId === who && !c.archived)
  const week = owned.map(c => { const d = db.deals.filter(x => x.companyId === c.id && !['Won', 'Lost'].includes(x.stage)); const next = c.journey.find(j => !j.doneDate); const why = d.length ? `${fmtMoney(d.reduce((s, x) => s + x.value, 0))} open` : next ? `journey touch due ${fmtDate(next.dueDate)}` : c.stage === 'Assigned' ? 'not contacted yet' : `${c.stage}`; const what = d.length ? (d[0].nextAction ?? 'Move the deal') : next ? next.type : c.stage === 'Assigned' ? 'First contact' : 'Helpful touch'; const score = d.reduce((s, x) => s + x.value, 0) / 1000 + (next && next.dueDate <= addDays(todayIso(), 7) ? 20 : 0) + (c.stage === 'Assigned' ? 10 : 0) + (c.score ?? 0) / 10; return { c, why, what, score } }).sort((a, b) => b.score - a.score).slice(0, 10)
  const scores = owned.map(c => ({ c, s: Math.min(100, Math.round((c.score ?? 40) + (db.contacts.some(x => x.companyId === c.id) ? 10 : 0) + (db.content.some(x => x.companyId === c.id) ? 15 : 0) + (healthOf(db, c.id) === 'Warm' ? 10 : 0))) })).sort((a, b) => b.s - a.s)
  return (
    <>
      <div className="page-head"><div><h1>AI Autopilot</h1><p>Open this every morning. It lists what needs chasing, plans the week, scores leads and shows who needs help. Nothing is sent without you.</p></div>
        <div className="page-actions"><select className="btn" value={who} onChange={(e: any) => setWho(e.target.value)}>{db.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
      <nav className="tabs">{tabs.map(([k, l]) => <a key={k} href={`#/autopilot/${k}`} className={t === k ? 'on' : ''}>{l}</a>)}</nav>
      {t === 'today' && <div className="card todo">{items.length === 0 ? <div className="empty"><b>All clear.</b>Nothing needs chasing for {personName(who)}.</div> : items.map(i => <div key={i.key} className="row"><span className={`u ${i.urgency}`} /><div><div className="t">{i.companyId ? <a href={`#/company/${i.companyId}`}>{i.title}</a> : i.title}</div><div className="d">{i.detail}</div></div><div className="acts">{i.href && <a className="btn sm" href={i.href}>{i.action ?? 'Open'}</a>}</div></div>)}</div>}
      {t === 'week' && <div className="card wrap"><div className="hd"><h2>Top 10 accounts this week for {personName(who)}</h2></div><table className="tbl"><thead><tr><th>Account</th><th>What</th><th>Why it is on the list</th><th>What to do</th></tr></thead><tbody>{week.map(w => <tr key={w.c.id}><td><a className="lnk" href={`#/company/${w.c.id}`}>{w.c.name}</a></td><td><StagePill stage={w.c.stage} /></td><td className="small">{w.why}</td><td className="small"><b>{w.what}</b></td></tr>)}{week.length === 0 && <tr><td colSpan={4} className="empty">No companies owned by {personName(who)}.</td></tr>}</tbody></table></div>}
      {t === 'scores' && <div className="card wrap"><div className="hd"><h2>Lead scores for {personName(who)}<span className="sub">{scores.length}</span></h2></div><table className="tbl"><thead><tr><th>Company</th><th>Score</th><th>Why</th><th>Suggested tags</th></tr></thead><tbody>{scores.map(({ c, s }) => <tr key={c.id}><td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a></td><td><span className={`pill plain ${s >= 70 ? 'good' : s >= 45 ? 'warn' : 'none'}`}>{s} · {s >= 70 ? 'Hot' : s >= 45 ? 'Warm' : 'Cold'}</span></td><td className="small muted">{[db.contacts.some(x => x.companyId === c.id) ? 'has a contact' : 'no contact', db.content.some(x => x.companyId === c.id) ? 'has content' : 'no content yet', healthOf(db, c.id).toLowerCase()].join(', ')}</td><td className="small">{[c.industry, c.city, c.stage].filter(Boolean).map(x => <span key={String(x)} className="tag" style={{ marginRight: 4 }}>{x}</span>)}</td></tr>)}</tbody></table></div>}
      {t === 'units' && <TeamPerformance />}
      {t === 'manager' && <div className="card wrap"><div className="hd"><h2>Who needs help today</h2></div><table className="tbl"><thead><tr><th>Person</th><th className="num">Open deals</th><th className="num">Overdue follow-ups</th><th className="num">Stuck deals</th><th className="num">Proposals waiting</th><th className="num">Overdue invoices</th><th className="num">Good leads not contacted</th></tr></thead><tbody>{db.people.filter(p => ['Sales', 'Sales lead'].includes(p.role)).map(p => { const d = db.deals.filter(x => x.ownerId === p.id && !['Won', 'Lost'].includes(x.stage)); return <tr key={p.id}><td><b>{p.name}</b></td><td className="num">{d.length}</td><td className="num">{d.filter(x => x.nextFollowUp && x.nextFollowUp < todayIso()).length}</td><td className="num">{d.filter(x => Date.now() - new Date(x.updatedAt).getTime() > 7 * 864e5).length}</td><td className="num">{db.proposals.filter(pr => pr.status === 'Sent' && d.some(x => x.id === pr.dealId)).length}</td><td className="num">{db.invoices.filter(i => i.status !== 'Paid' && i.due < todayIso() && db.deals.some(x => x.id === i.dealId && x.ownerId === p.id)).length}</td><td className="num">{db.companies.filter(c => c.ownerId === p.id && c.stage === 'Assigned' && (c.score ?? 0) >= 60).length}</td></tr> })}</tbody></table></div>}
      {t === 'cleanup' && <Admin tab="data" title="Data clean-up" />}
    </>
  )
}

// ---------------- AI Executive Summaries ----------------
export function AISummaries() {
  const db = useDb()
  const list = recordsOf(db, 'ai-summaries').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [q, setQ] = useState('')
  const generate = () => {
    const month = new Date().toISOString().slice(0, 7)
    const won = db.deals.filter(d => d.stage === 'Won' && d.updatedAt.slice(0, 7) === month).reduce((s, d) => s + d.value, 0)
    const open = db.deals.filter(d => !['Won', 'Lost'].includes(d.stage))
    const risks = runRules(db).filter(i => i.urgency === 'now')
    const body = `Revenue: ${fmtMoney(won)} closed this month; ${fmtMoney(open.reduce((s, d) => s + d.value, 0))} open across ${open.length} deals.\nReceivables: ${fmtMoney(db.invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.amount - i.paid, 0))} outstanding.\nRisks: ${risks.length} urgent items. ${risks.slice(0, 3).map(r => r.title).join('; ')}.\nTeam: ${db.activities.filter(a => a.kind !== 'System' && a.date.slice(0, 10) >= addDays(todayIso(), -7)).length} touches logged in 7 days.\nNurture: ${db.companies.filter(c => c.stage === 'Nurturing').length} companies in the journey, ${db.companies.filter(c => c.stage === 'Nurturing' && healthOf(db, c.id) === 'Cold').length} cold.\nDecisions waiting: ${db.tasks.filter(t => t.founderOnly && t.status !== 'Done').length}.`
    addRecord('ai-summaries', '', { headline: `Executive summary, ${fmtDate(todayIso())}`, body })
  }
  return (
    <>
      <div className="page-head"><div><h1>AI Executive Summaries</h1><p>A saved snapshot of revenue, risks, team and decisions. Generate one any time; they stay here for trend reading.</p></div><div className="page-actions"><input className="btn" style={{ fontWeight: 500 }} placeholder="Search summaries" value={q} onChange={(e: any) => setQ(e.target.value)} /><button className="btn pri" onClick={generate}><Icons.spark />AI Executive Summary</button></div></div>
      <div className="stack" style={{ gap: 12 }}>{list.filter(s => !q || (String(s.headline) + String(s.body)).toLowerCase().includes(q.toLowerCase())).map(s => <div key={s.id} className="card"><div className="hd"><h2>{String(s.headline)}</h2><button className="btn sm ghost" onClick={() => { const blob = new Blob([String(s.body)], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${s.headline}.txt`; a.click() }}>Export</button></div><div className="bd small" style={{ whiteSpace: 'pre-wrap' }}>{String(s.body)}</div></div>)}{list.length === 0 && <div className="card"><div className="empty"><b>No summaries yet.</b>Press AI Executive Summary to write the first one.</div></div>}</div>
    </>
  )
}

// ---------------- End-of-Day Reports ----------------
export function EOD() {
  const db = useDb()
  const [day, setDay] = useState(todayIso())
  const [editing, setEditing] = useState<string | null>(null)
  const reports = recordsOf(db, 'eod-reports').filter(r => r.date === day)
  const people = db.people.filter(p => p.role !== 'Founder')
  const summary = reports.length ? `${reports.length} of ${people.length} reports in. Calls ${reports.reduce((s, r) => s + Number(r.calls ?? 0), 0)}, emails ${reports.reduce((s, r) => s + Number(r.emails ?? 0), 0)}, meetings ${reports.reduce((s, r) => s + Number(r.meetings ?? 0), 0)}. Wins: ${reports.map(r => r.wins).filter(Boolean).join('; ') || 'none noted'}. Blockers: ${reports.map(r => r.blockers).filter(Boolean).join('; ') || 'none'}.` : 'No reports yet for this day.'
  return (
    <>
      <div className="page-head"><div><h1>End-of-Day Reports</h1><p>Each person sends one at 5 pm: calls, emails, meetings, wins and blockers. Raoof gets the roll-up at 7 pm.</p></div><div className="page-actions"><button className="btn" onClick={() => setDay(addDays(day, -1))}>‹</button><input className="btn" type="date" value={day} onChange={(e: any) => setDay(e.target.value)} /><button className="btn" onClick={() => setDay(addDays(day, 1))}>›</button></div></div>
      <div className="card mb"><div className="hd"><h2>AI summary of the day</h2></div><div className="bd small">{summary}</div></div>
      <div className="grid c3">{people.map(p => { const r = reports.find(x => x.person === p.id); return <div key={p.id} className="card" style={{ padding: 14 }}><div className="row-between"><b>{p.name}</b><span className={`pill plain ${r ? 'good' : 'none'}`}>{r ? 'Sent' : 'Not sent yet'}</span></div><div className="muted small" style={{ marginTop: 6 }}>{r ? `${r.calls ?? 0} calls · ${r.emails ?? 0} emails · ${r.meetings ?? 0} meetings` : '0 calls · 0 emails · 0 meetings'}</div>{r?.wins ? <div className="small" style={{ marginTop: 4 }}><b>Wins:</b> {String(r.wins)}</div> : null}{r?.blockers ? <div className="small" style={{ color: 'var(--warn)' }}><b>Blockers:</b> {String(r.blockers)}</div> : null}<button className="btn sm mt" style={{ marginTop: 10 }} onClick={() => setEditing(p.id)}>{r ? 'Edit report' : 'Send report'}</button></div> })}</div>
      {editing && <EODForm personId={editing} day={day} existing={reports.find(x => x.person === editing)} onClose={() => setEditing(null)} />}
    </>
  )
}
function EODForm({ personId, day, existing, onClose }: { personId: string; day: string; existing?: any; onClose: () => void }) {
  const [f, setF] = useState({ calls: existing?.calls ?? 0, emails: existing?.emails ?? 0, meetings: existing?.meetings ?? 0, wins: existing?.wins ?? '', blockers: existing?.blockers ?? '', tomorrow: existing?.tomorrow ?? '' })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return <Drawer title={`End of day: ${personName(personId)}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={() => { if (existing) updateRecord('eod-reports', existing.id, f); else addRecord('eod-reports', '', { person: personId, date: day, ...f }); onClose() }}>Send</button></>}>
    <div className="form"><div className="form c2"><Field label="Calls"><input type="number" value={f.calls} onChange={(e: any) => set('calls', Number(e.target.value))} /></Field><Field label="Emails"><input type="number" value={f.emails} onChange={(e: any) => set('emails', Number(e.target.value))} /></Field><Field label="Meetings"><input type="number" value={f.meetings} onChange={(e: any) => set('meetings', Number(e.target.value))} /></Field></div><Field label="Wins"><textarea value={f.wins} onChange={(e: any) => set('wins', e.target.value)} /></Field><Field label="Blockers"><textarea value={f.blockers} onChange={(e: any) => set('blockers', e.target.value)} /></Field><Field label="Top priority tomorrow"><input value={f.tomorrow} onChange={(e: any) => set('tomorrow', e.target.value)} /></Field></div>
  </Drawer>
}

// ---------------- Team Leads Watch ----------------
export function LeadWatch() {
  const db = useDb()
  const route = useRoute()
  const units = [['all', 'All units'], ['tour', 'SMB Show 2027'], ['awards', 'SMB Awards 2026'], ['podcast', 'SMB Podcast'], ['magazine', 'CanadianSME']]
  const u = route[1] ?? 'all'
  const missed = db.companies.filter(c => c.ownerId && !c.archived).map(c => { const last = lastContactDate(db, c.id); const what = c.stage === 'Assigned' ? 'Not contacted' : c.stage === 'Contacted' && (!last || last < addDays(todayIso(), -14)) ? 'No contact for 14 days' : c.stage === 'Nurturing' && c.journey.some(j => !j.doneDate && j.dueDate < todayIso()) ? 'Journey touch overdue' : null; return what ? { c, what, last } : null }).filter(Boolean) as Array<{ c: any; what: string; last?: string }>
  return (
    <>
      <div className="page-head"><div><h1>Team Leads Watch</h1><p>What each person is doing with their leads, the steps they missed, and what was done in the last 7 days.</p></div></div>
      <nav className="tabs">{units.map(([k, l]) => <a key={k} href={`#/lead-watch/${k}`} className={u === k ? 'on' : ''}>{l}</a>)}</nav>
      <TeamPerformance />
      <div className="card mt"><div className="hd"><h2>Missed steps<span className="sub">{missed.length}</span></h2></div>{missed.length === 0 ? <div className="empty small">No missed steps.</div> : <table className="tbl"><thead><tr><th>Client</th><th>List</th><th>Owner</th><th>What was missed</th><th>Last contact</th><th></th></tr></thead><tbody>{missed.map(m => <tr key={m.c.id}><td><a className="lnk" href={`#/company/${m.c.id}`}>{m.c.name}</a></td><td className="muted small">{m.c.leadList ?? '—'}</td><td>{personName(m.c.ownerId)}</td><td><span className="pill plain warn">{m.what}</span></td><td className="muted">{m.last ? fmtDate(m.last) : 'Never'}</td><td className="act"><a className="btn sm" href={`#/chat/dm:${m.c.ownerId}`}>Message owner</a></td></tr>)}</tbody></table>}</div>
    </>
  )
}

// ---------------- News & Funding Alerts ----------------
export function NewsAlerts() {
  const db = useDb()
  const route = useRoute()
  const tier = route[1] ?? 'all'
  const [logFor, setLogFor] = useState<string | null>(null)
  const s = sec('news', 'Signals', 'news-signals', 'signal', [
    { key: 'company', label: 'Company', type: 'company', required: true }, { key: 'headline', label: 'Headline', required: true }, { key: 'tier', label: 'Tier', type: 'select', options: ['Act Today', 'Warm', 'FYI'] }, { key: 'kind', label: 'Signal', type: 'select', options: ['Funding', 'Product launch', 'Award', 'Hiring', 'Expansion', 'Leadership change', 'Other'] }, { key: 'date', label: 'Date', type: 'date' }, { key: 'source', label: 'Source link', type: 'url' }, { key: 'acted', label: 'Acted on', type: 'bool' },
  ])
  const rows = recordsOf(db, 'news-signals').filter(r => tier === 'all' || r.tier === ({ act: 'Act Today', warm: 'Warm', fyi: 'FYI' } as any)[tier])
  return (
    <>
      <div className="page-head"><div><h1>News & Funding Alerts</h1><p>Signals about your companies. Red (Act Today) means funding, a launch or an award: call within 24 hours. Yellow is worth a follow-up this week. Grey is for awareness. Automatic fetching needs a news source connected; until then, add signals here.</p></div></div>
      <nav className="tabs">{[['all', 'All'], ['act', 'Act Today'], ['warm', 'Warm'], ['fyi', 'FYI']].map(([k, l]) => <a key={k} href={`#/news-alerts/${k}`} className={tier === k ? 'on' : ''}>{l}</a>)}</nav>
      {rows.length > 0 && <div className="card mb"><div className="hd"><h2>Act on a signal</h2></div><table className="tbl"><tbody>{rows.filter(r => !r.acted).slice(0, 10).map(r => <tr key={r.id}><td><span className={`pill plain ${r.tier === 'Act Today' ? 'maple' : r.tier === 'Warm' ? 'warn' : 'none'}`}>{String(r.tier)}</span></td><td><b>{String(r.headline)}</b><div className="muted small">{db.companies.find(c => c.id === r.company)?.name}</div></td><td className="act"><button className="btn sm" onClick={() => setLogFor(String(r.company))}>Generate pitch and log</button> <button className="btn sm ghost" onClick={() => updateRecord('news-signals', r.id, { acted: true })}>I acted on it</button></td></tr>)}</tbody></table></div>}
      <GenericList section={s} unit="" />
      {logFor && <LogActivity companyId={logFor} onClose={() => setLogFor(null)} />}
    </>
  )
}

// ---------------- Target Dashboard ----------------
export function TargetDash() {
  const db = useDb()
  const sales = db.people.filter(p => ['Sales', 'Sales lead'].includes(p.role))
  const [who, setWho] = useState(sales.find(p => p.monthlyTarget)?.id ?? sales[0]?.id)
  const p = db.people.find(x => x.id === who)
  const month = new Date().toISOString().slice(0, 7)
  const closed = db.deals.filter(d => d.ownerId === who && d.stage === 'Won' && d.updatedAt.slice(0, 7) === month && !d.eventKey).reduce((s, d) => s + d.value, 0)
  const target = p?.monthlyTarget ?? 0
  const gap = Math.max(0, target - closed)
  const open = db.deals.filter(d => d.ownerId === who && !['Won', 'Lost'].includes(d.stage)).sort((a, b) => b.probability - a.probability)
  const attention = open.filter(d => (d.nextFollowUp && d.nextFollowUp < todayIso()) || Date.now() - new Date(d.updatedAt).getTime() > 7 * 864e5)
  const media = db.packages.filter(x => !x.eventKey)
  return (
    <>
      <div className="page-head"><div><h1>Target Dashboard</h1><p>Monthly target, what is closed, the gap, and the fastest ways to close it.</p></div><div className="page-actions"><select className="btn" value={who} onChange={(e: any) => setWho(e.target.value)}>{sales.map(x => <option key={x.id} value={x.id}>{x.name}{x.monthlyTarget ? '' : ' (no target)'}</option>)}</select><a className="btn" href="#/targets">Edit targets</a></div></div>
      <div className="grid c4 mb"><Stat label="Monthly target" value={target ? fmtMoney(target) : 'Not set'} sub="media sales only · events excluded" /><Stat label="Closed this month" value={fmtMoney(closed)} tone={target && closed >= target ? 'good' : undefined} /><Stat label="Gap" value={fmtMoney(gap)} tone={gap ? 'warn' : 'good'} /><Stat label="Open pipeline" value={fmtMoney(open.reduce((s, d) => s + d.value, 0))} sub={`${open.length} deals`} /></div>
      <div className="grid c2">
        <div className="card"><div className="hd"><h2>Ways to close the gap</h2><a className="btn sm" href="#/proposals">New proposal</a></div><table className="tbl"><tbody>{media.map(x => <tr key={x.id}><td><b>{x.name}</b><div className="muted small">{x.includes}</div></td><td className="num money">{fmtMoney(x.price)}</td><td className="num muted small">{gap ? `${Math.ceil(gap / x.price)} to close the gap` : ''}</td></tr>)}</tbody></table><div className="bd small muted">Commission structure: edit in Admin → Targets when agreed. Example: 10% on media sales above target.</div></div>
        <div className="stack" style={{ gap: 16 }}>
          <div className="card"><div className="hd"><h2>Closest to closing</h2></div><table className="tbl"><tbody>{open.slice(0, 5).map(d => <tr key={d.id}><td><a className="lnk" href={`#/company/${d.companyId}`}>{db.companies.find(c => c.id === d.companyId)?.name}</a><div className="muted small">{d.title}</div></td><td className="num money">{fmtMoney(d.value)}</td><td className="muted">{d.probability}%</td></tr>)}{open.length === 0 && <tr><td className="empty small">No open deals.</td></tr>}</tbody></table></div>
          <div className="card"><div className="hd"><h2>Needs attention<span className="sub">{attention.length}</span></h2></div><table className="tbl"><tbody>{attention.map(d => <tr key={d.id}><td><a className="lnk" href={`#/company/${d.companyId}`}>{db.companies.find(c => c.id === d.companyId)?.name}</a><div className="muted small">{d.title}</div></td><td className="small" style={{ color: 'var(--warn)' }}>{d.nextFollowUp && d.nextFollowUp < todayIso() ? 'Follow-up overdue' : 'No update in 7 days'}</td></tr>)}{attention.length === 0 && <tr><td className="empty small">Nothing stuck.</td></tr>}</tbody></table></div>
        </div>
      </div>
    </>
  )
}

// ---------------- Wins Board ----------------
export function Wins() {
  const db = useDb()
  const route = useRoute()
  const p = route[1] ?? 'month'
  const from = p === 'week' ? addDays(todayIso(), -7) : p === 'year' ? todayIso().slice(0, 4) + '-01-01' : todayIso().slice(0, 7) + '-01'
  const won = db.deals.filter(d => d.stage === 'Won' && d.updatedAt.slice(0, 10) >= from).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const by: Record<string, number> = {}
  won.forEach(d => { by[d.ownerId] = (by[d.ownerId] ?? 0) + d.value })
  return (
    <>
      <div className="page-head"><div><h1>Wins Board</h1><p>Every deal the team has closed. A deal appears here the moment its stage is set to Won. Media and events are shown separately.</p></div></div>
      <nav className="tabs">{[['week', 'This week'], ['month', 'This month'], ['year', 'This year']].map(([k, l]) => <a key={k} href={`#/wins/${k}`} className={p === k ? 'on' : ''}>{l}</a>)}</nav>
      <div className="grid c3 mb"><Stat label="Media" value={fmtMoney(won.filter(d => !d.eventKey).reduce((s, d) => s + d.value, 0))} /><Stat label="Events" value={fmtMoney(won.filter(d => d.eventKey).reduce((s, d) => s + d.value, 0))} /><Stat label="Deals won" value={won.length} /></div>
      <div className="grid side"><div className="card wrap"><div className="hd"><h2>Wins</h2></div><table className="tbl"><thead><tr><th>Company</th><th>Deal</th><th>Who closed</th><th>When</th><th className="num">Value</th></tr></thead><tbody>{won.map(d => <tr key={d.id}><td><a className="lnk" href={`#/company/${d.companyId}`}>{db.companies.find(c => c.id === d.companyId)?.name}</a></td><td>{d.title}</td><td>{personName(d.ownerId)}</td><td className="muted">{fmtDate(d.updatedAt)}</td><td className="num money">{fmtMoney(d.value)}</td></tr>)}{won.length === 0 && <tr><td colSpan={5} className="empty">No wins in this period yet.</td></tr>}</tbody></table></div>
        <div className="card"><div className="hd"><h2>Who closed</h2></div><div className="bd stack">{Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => <div key={k} className="row-between small"><b>{personName(k)}</b><span className="money">{fmtMoney(v)}</span></div>)}{!Object.keys(by).length && <span className="muted small">—</span>}</div></div></div>
    </>
  )
}

// ---------------- Editorial Calendar (global) ----------------
const INDUSTRIES = ['Manufacturing', 'Automotive', 'Retail', 'Finance and banking', 'Technology', 'Health', 'Construction', 'Food and hospitality', 'Professional services', 'Real estate', 'Logistics', 'Energy', 'Education', 'Non-profit']
export function EdCal() {
  const route = useRoute()
  const v = route[1] ?? 'month'
  return (
    <>
      <nav className="tabs">{[['month', 'By month'], ['industry', `By industry (${INDUSTRIES.length})`]].map(([k, l]) => <a key={k} href={`#/edcal/${k}`} className={v === k ? 'on' : ''}>{l}</a>)}</nav>
      {v === 'month' ? <Content tab="calendar" title="Editorial Calendar" /> : <><div className="page-head"><div><h1>Editorial Calendar</h1><p>Industries we cover across the year. Pitch an expert quote, a feature or a podcast to a company in the industry of the month.</p></div></div><div className="grid c3">{INDUSTRIES.map(i => <div key={i} className="card" style={{ padding: 14 }}><b>{i}</b><div className="muted small">Pitch: sponsored article, expert quote, podcast.</div><a className="btn sm" style={{ marginTop: 8 }} href="#/ai-tools">Write pitch</a></div>)}</div></>}
    </>
  )
}

// ---------------- Podcast leads (LinkedIn) ----------------
export function PodcastLeads() {
  const db = useDb()
  const [toast, say] = useToast()
  const s = sec('linkedin', 'Leads to decide on', 'linkedin-leads', 'lead', [
    { key: 'person', label: 'Person', required: true }, { key: 'companyName', label: 'Company' }, { key: 'posted', label: 'What they posted', type: 'textarea', wide: true }, { key: 'postUrl', label: 'Post', type: 'url' }, { key: 'profileUrl', label: 'Profile', type: 'url' },
    { key: 'show', label: 'Show', type: 'select', options: ['SMB', 'She and Success', 'Black Business', 'B2B Market Insights', 'SMB AI Magazine'] }, { key: 'grade', label: 'Grade', type: 'select', options: ['A · Top pick', 'B · Good', 'C · Maybe'] },
    { key: 'status', label: 'Status', type: 'select', options: ['New', 'Questions drafted', 'Invite sent', 'Booked', 'Not a fit'] }, { key: 'nextStep', label: 'Next step', type: 'select', options: ['Podcast', 'Email interview', 'Article', 'Not a fit'] }, { key: 'found', label: 'Found on', type: 'date' },
  ], 'Guests found from LinkedIn posts, graded A, B or C. When one is booked, add the company to the CRM so the lifecycle and journey start.')
  const rows = recordsOf(db, 'linkedin-leads')
  const counts = (k: string, v: string) => rows.filter(r => r[k] === v).length
  return (
    <>
      <div className="page-head"><div><h1>Podcast</h1><p>Leads to decide on: people who posted something our audience cares about. Grade them, draft questions, send the invite, book.</p></div><div className="page-actions"><a className="btn" href="#/podcast">SMB Podcast workspace</a><a className="btn pri" href="#/leads">Add booked guest to CRM</a></div></div>
      <div className="grid c4 mb"><Stat label="All" value={rows.length} /><Stat label="A · Top pick" value={counts('grade', 'A · Top pick')} /><Stat label="Invite sent" value={counts('status', 'Invite sent')} /><Stat label="Booked" value={counts('status', 'Booked')} tone="good" /></div>
      <GenericList section={s} unit="" />
      <Toast msg={toast} />
    </>
  )
}

// ---------------- Publications (side by side) ----------------
export function Publications() {
  const db = useDb()
  const route = useRoute()
  const sel = route[1]
  const rows = MAGAZINES.map(m => {
    const brand = m.brand as Brand
    const cs = db.companies.filter(c => c.brands.includes(brand) && !c.archived)
    const ds = db.deals.filter(d => d.brand === brand)
    const month = new Date().toISOString().slice(0, 7)
    const owed = db.invoices.filter(i => i.status !== 'Paid' && ds.some(d => d.id === i.dealId)).reduce((s, i) => s + i.amount - i.paid, 0)
    const overdueFu = ds.filter(d => !['Won', 'Lost'].includes(d.stage) && d.nextFollowUp && d.nextFollowUp < todayIso()).length
    const issue = recordsOf(db, 'issues', m.key).filter(i => i.status !== 'Published').sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0]
    const deliver = db.deliverables.filter(x => x.status !== 'Delivered' && ds.some(d => d.id === x.dealId)).length
    return { m, clients: cs.length, open: ds.filter(d => !['Won', 'Lost'].includes(d.stage)).length, pipeline: ds.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0), closedMonth: ds.filter(d => d.stage === 'Won' && d.updatedAt.slice(0, 7) === month).reduce((s, d) => s + d.value, 0), closedYear: ds.filter(d => d.stage === 'Won' && d.updatedAt.slice(0, 4) === month.slice(0, 4)).reduce((s, d) => s + d.value, 0), owed, overdueFu, issue: issue ? String(issue.issue) : '—', deliver }
  })
  const shown = sel ? rows.filter(r => r.m.key === sel) : rows
  const tot = (k: keyof typeof rows[0]) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0)
  return (
    <>
      <div className="page-head"><div><h1>Publications</h1><p>All publications side by side. Click a name to open its workspace. A deal counts for a publication when its brand is set; a company belongs when the brand is ticked on its page.</p></div></div>
      <nav className="tabs"><a href="#/publications" className={!sel ? 'on' : ''}>All publications</a>{MAGAZINES.map(m => <a key={m.key} href={`#/publications/${m.key}`} className={sel === m.key ? 'on' : ''}>{m.brand}</a>)}</nav>
      <div className="card wrap"><table className="tbl"><thead><tr><th>Publication</th><th className="num">Clients</th><th className="num">Open deals</th><th className="num">Pipeline</th><th className="num">Closed this month</th><th className="num">Closed this year</th><th className="num">Money owed</th><th className="num">Follow-ups overdue</th><th>Current issue</th><th className="num">To deliver</th><th></th></tr></thead><tbody>
        {shown.map(r => <tr key={r.m.key}><td><a className="lnk" href={`#/${r.m.key}`}>{r.m.brand}</a></td><td className="num">{r.clients}</td><td className="num">{r.open}</td><td className="num">{fmtMoney(r.pipeline)}</td><td className="num money">{fmtMoney(r.closedMonth)}</td><td className="num">{fmtMoney(r.closedYear)}</td><td className="num" style={r.owed ? { color: 'var(--warn)' } : undefined}>{fmtMoney(r.owed)}</td><td className="num" style={r.overdueFu ? { color: 'var(--warn)' } : undefined}>{r.overdueFu}</td><td className="small">{r.issue}</td><td className="num">{r.deliver}</td><td className="act"><a className="btn sm" href={`#/${r.m.key}`}>Open</a></td></tr>)}
        {!sel && <tr><td><b>Total</b></td><td className="num"><b>{tot('clients')}</b></td><td className="num"><b>{tot('open')}</b></td><td className="num"><b>{fmtMoney(tot('pipeline'))}</b></td><td className="num money">{fmtMoney(tot('closedMonth'))}</td><td className="num"><b>{fmtMoney(tot('closedYear'))}</b></td><td className="num"><b>{fmtMoney(tot('owed'))}</b></td><td className="num"><b>{tot('overdueFu')}</b></td><td></td><td className="num"><b>{tot('deliver')}</b></td><td></td></tr>}
      </tbody></table></div>
    </>
  )
}

// ---------------- Decisions Required (founder) ----------------
export function DecisionsRequired() {
  const db = useDb()
  const asking = db.deals.filter(d => d.value >= 5000 && ['Negotiating', 'Verbal yes', 'Proposal sent'].includes(d.stage))
  const founder = recordsOf(db, 'founder-decisions').filter(r => r.implementation !== 'Done')
  const esc = recordsOf(db, 'escalations').filter(r => r.status !== 'Resolved' && (r.actor === 'p-sk'))
  return (
    <div className="grid c2">
      <div className="card"><div className="hd"><h2>Escalated to SK<span className="sub">{esc.length}</span></h2><a className="btn sm" href="#/ops/escalations">Escalations</a></div>{esc.length === 0 ? <div className="empty small">Nothing escalated.</div> : <table className="tbl"><tbody>{esc.map(e => <tr key={e.id}><td><b>{String(e.problem)}</b><div className="muted small">raised by {personName(String(e.raisedBy))} · {fmtDate(String(e.raisedOn))}</div></td></tr>)}</tbody></table>}</div>
      <div className="card"><div className="hd"><h2>Deals asking for SK<span className="sub">{asking.length}</span></h2></div>{asking.length === 0 ? <div className="empty small">No big deals need you right now.</div> : <table className="tbl"><tbody>{asking.map(d => <tr key={d.id}><td><a className="lnk" href={`#/company/${d.companyId}`}>{db.companies.find(c => c.id === d.companyId)?.name}</a><div className="muted small">{d.title} · {d.stage}</div></td><td className="num money">{fmtMoney(d.value)}</td><td className="small">{personName(d.ownerId)}</td></tr>)}</tbody></table>}</div>
      <div className="card"><div className="hd"><h2>Waiting for approval</h2><a className="btn sm" href="#/approvals">Open Approvals</a></div><Approvals /></div>
      <div className="card"><div className="hd"><h2>Founder decisions open<span className="sub">{founder.length}</span></h2><a className="btn sm" href="#/founder-decisions">Decision Centre</a></div>{founder.length === 0 ? <div className="empty small">None open.</div> : <table className="tbl"><tbody>{founder.map(f => <tr key={f.id}><td><b>{String(f.decision)}</b><div className="muted small">{String(f.unit ?? '')} · due {fmtDate(String(f.deadline ?? ''))}</div></td><td><span className="pill plain warn">{String(f.implementation ?? 'Not started')}</span></td></tr>)}</tbody></table>}</div>
    </div>
  )
}

export function ImpTasks() { return <Team tab="tasks" title="IMP Tasks" blurb="All important tasks across the team. Use the name filter to see one person. Weekly and monthly tasks roll forward." /> }
export function OpsPodcasts() { return <Content tab="podcasts" title="Podcasts" /> }
export function OpsMagazines() { return <Content tab="articles" title="Magazines" /> }
