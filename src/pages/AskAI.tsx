import { useState } from 'react'
import { useDb, personName } from '../data/store'
import { runRules, healthOf } from '../data/automations'
import { Drawer, fmtMoney } from '../components/ui'

// Ask AI answers from the CRM's own data, with no model and no key, for the questions people ask every day.
// Hooking up a language model later means replacing answer() with an API call that gets the same context.

const QUESTIONS = ['Who should I follow up with today?', 'Which deals are at risk?', 'Who is going cold?', 'What should we pitch for the Summit?', 'Summarise the pipeline']

export function AskAI({ onClose }: { onClose: () => void }) {
  const db = useDb()
  const [q, setQ] = useState('')
  const [log, setLog] = useState<Array<{ q: string; a: string }>>([])

  const answer = (question: string): string => {
    const s = question.toLowerCase()
    const me = db.settings.currentUserId
    if (/follow|today|do first/.test(s)) {
      const items = runRules(db, me).filter(i => i.urgency !== 'soon').slice(0, 8)
      return items.length ? `Top of your list:\n${items.map((i, n) => `${n + 1}. ${i.title} — ${i.detail}`).join('\n')}` : 'Nothing is overdue or due today for you.'
    }
    if (/risk|stuck|stall/.test(s)) {
      const deals = db.deals.filter(d => !['Won', 'Lost'].includes(d.stage)).map(d => ({ d, idle: Math.round((Date.now() - new Date(d.updatedAt).getTime()) / 864e5) })).filter(x => x.idle > 7 || (x.d.nextFollowUp && x.d.nextFollowUp < new Date().toISOString().slice(0, 10)))
      return deals.length ? `Deals at risk:\n${deals.map(({ d, idle }) => `• ${d.title} (${db.companies.find(c => c.id === d.companyId)?.name}, ${fmtMoney(d.value)}) — ${idle} days without an update, owner ${personName(d.ownerId)}`).join('\n')}` : 'No open deal has gone quiet.'
    }
    if (/cold|quiet|warm/.test(s)) {
      const cold = db.companies.filter(c => ['Nurturing', 'Won', 'Delivered'].includes(c.stage) && healthOf(db, c.id) !== 'Warm')
      return cold.length ? `Going cold (no helpful touch in 30+ days):\n${cold.map(c => `• ${c.name} — ${c.stage}, owner ${personName(c.ownerId)}`).join('\n')}\n\nA helpful touch is a journey touch, content or a meeting. A pitch does not count.` : 'Everyone in nurture is warm.'
    }
    if (/pitch|summit|show|sponsor/.test(s)) {
      const ev = /show/.test(s) ? db.events.find(e => e.key === 'show-2027')! : db.events.find(e => e.key === 'summit-2027')!
      const t = db.companies.filter(c => ['Nurturing', 'Won', 'Delivered'].includes(c.stage) && !db.deals.some(d => d.companyId === c.id && d.eventKey === ev.key)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      return t.length ? `Pitch these for ${ev.name} (warm, no deal yet):\n${t.map(c => `• ${c.name} — fit ${c.score ?? '?'}, ${db.content.filter(ci => ci.companyId === c.id && ci.status === 'Published').length} published pieces, owner ${personName(c.ownerId)}`).join('\n')}` : `Every warm company already has a ${ev.name} deal.`
    }
    if (/pipeline|summar|how are we/.test(s)) {
      const open = db.deals.filter(d => !['Won', 'Lost'].includes(d.stage))
      const won = db.deals.filter(d => d.stage === 'Won').reduce((x, d) => x + d.value, 0)
      const byStage: Record<string, number> = {}
      db.companies.forEach(c => { byStage[c.stage] = (byStage[c.stage] ?? 0) + 1 })
      return `${db.companies.length} companies. ${Object.entries(byStage).map(([k, v]) => `${v} ${k}`).join(', ')}.\n${open.length} open deals worth ${fmtMoney(open.reduce((x, d) => x + d.value, 0))}; ${fmtMoney(won)} won.\n${db.content.filter(c => c.status !== 'Published').length} pieces of content in progress.`
    }
    return 'I can answer from the CRM data about follow-ups, deals at risk, who is going cold, who to pitch for an event, and the pipeline. Ask one of those, or connect a language model in src/pages/AskAI.tsx for open questions.'
  }

  const ask = (text: string) => { if (!text.trim()) return; setLog([...log, { q: text, a: answer(text) }]); setQ('') }

  return (
    <Drawer title="Ask AI" onClose={onClose} footer={<form style={{ display: 'flex', gap: 8, width: '100%' }} onSubmit={(e: any) => { e.preventDefault(); ask(q) }}><input className="btn" style={{ flex: 1, textAlign: 'left', fontWeight: 500 }} placeholder="Ask about your deals, companies or follow-ups" value={q} onChange={(e: any) => setQ(e.target.value)} /><button className="btn pri" type="submit">Ask</button></form>}>
      <div className="stack">
        <div className="inline">{QUESTIONS.map(x => <button key={x} className="btn sm" onClick={() => ask(x)}>{x}</button>)}</div>
        {log.length === 0 && <p className="muted small">Answers come from the CRM's own data, live. Nothing leaves your browser.</p>}
        {log.map((l, i) => <div key={i} className="stack" style={{ gap: 6 }}><div className="small" style={{ fontWeight: 700 }}>{l.q}</div><div className="note" style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{l.a}</div></div>)}
      </div>
    </Drawer>
  )
}
