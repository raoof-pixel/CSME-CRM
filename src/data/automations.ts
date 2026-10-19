import type { Database, Id } from './types'
import { isHelpfulTouch } from './lifecycle'
import { daysSince, daysUntil, todayIso } from './store'

// The rule engine. It reads the database and produces the list that Today shows.
// Nothing here writes data; the person acts, and the action writes.

export type Urgency = 'now' | 'today' | 'soon'

export interface TodayItem {
  key: string                 // stable key so a dismissal sticks
  rule: string                // automation id
  urgency: Urgency
  title: string
  detail: string
  companyId?: Id
  dealId?: Id
  personId?: Id               // who should act
  href?: string               // where to go
  action?: string             // label of the primary action
}

export function runRules(db: Database, forPerson?: Id): TodayItem[] {
  const on = (id: string) => db.automations.find(r => r.id === id)?.on
  const items: TodayItem[] = []
  const today = todayIso()
  const push = (i: TodayItem) => { if (!db.dismissed.includes(i.key)) items.push(i) }

  const lastHelpful = (companyId: Id) => {
    const acts = db.activities.filter(a => a.companyId === companyId && isHelpfulTouch(a.kind))
    return acts.length ? acts.map(a => a.date).sort().slice(-1)[0] : undefined
  }
  const lastAny = (companyId: Id) => {
    const acts = db.activities.filter(a => a.companyId === companyId && a.kind !== 'System')
    return acts.length ? acts.map(a => a.date).sort().slice(-1)[0] : undefined
  }

  // 1. Journey touches due (the nurture engine)
  for (const c of db.companies) {
    if (c.archived || c.stage !== 'Nurturing' && c.stage !== 'Pitched' && c.stage !== 'Won' && c.stage !== 'Delivered') continue
    for (const t of c.journey) {
      if (t.doneDate) continue
      const d = daysUntil(t.dueDate)
      if (d <= 7) push({
        key: `journey:${c.id}:${t.month}`, rule: 'content-starts-journey',
        urgency: d < 0 ? 'now' : d === 0 ? 'today' : 'soon',
        title: `${t.type} for ${c.name}`,
        detail: d < 0 ? `Journey month ${t.month}, ${-d} days late` : d === 0 ? `Journey month ${t.month}, due today` : `Journey month ${t.month}, due in ${d} days`,
        companyId: c.id, personId: c.ownerId, href: `#/company/${c.id}`, action: 'Log it',
      })
    }
  }

  // 2. Follow-ups overdue (deals)
  if (on('follow-up-overdue')) {
    for (const deal of db.deals) {
      if (['Won', 'Lost'].includes(deal.stage) || !deal.nextFollowUp) continue
      const d = daysUntil(deal.nextFollowUp)
      if (d <= 0) {
        const c = db.companies.find(x => x.id === deal.companyId)
        push({
          key: `fu:${deal.id}:${deal.nextFollowUp}`, rule: 'follow-up-overdue', urgency: d < 0 ? 'now' : 'today',
          title: `${deal.nextAction ?? 'Follow up'} — ${c?.name ?? ''}`,
          detail: `${deal.title}, $${deal.value.toLocaleString()}, ${deal.stage}${d < 0 ? `, ${-d} days overdue` : ', due today'}`,
          companyId: deal.companyId, dealId: deal.id, personId: deal.ownerId, href: `#/company/${deal.companyId}`, action: 'Log follow-up',
        })
      }
    }
    // companies in Contacted with a follow-up date from the last activity
    for (const c of db.companies) {
      if (c.stage !== 'Contacted') continue
      const acts = db.activities.filter(a => a.companyId === c.id && a.nextFollowUp).sort((a, b) => a.date.localeCompare(b.date))
      const last = acts[acts.length - 1]
      if (last?.nextFollowUp && daysUntil(last.nextFollowUp) <= 0) {
        const d = daysUntil(last.nextFollowUp)
        push({
          key: `cfu:${c.id}:${last.nextFollowUp}`, rule: 'follow-up-overdue', urgency: d < 0 ? 'now' : 'today',
          title: `Next touch with ${c.name}`, detail: `Last: ${last.summary}${d < 0 ? `, ${-d} days overdue` : ''}`,
          companyId: c.id, personId: c.ownerId, href: `#/company/${c.id}`, action: 'Log it',
        })
      }
    }
  }

  // 3. Going cold
  if (on('going-cold')) {
    for (const c of db.companies) {
      if (!['Nurturing', 'Won', 'Delivered'].includes(c.stage)) continue
      const last = lastHelpful(c.id)
      const d = daysSince(last)
      if (d >= db.settings.goingColdDays) push({
        key: `cold:${c.id}:${today.slice(0, 7)}`, rule: 'going-cold', urgency: 'now',
        title: `${c.name} is going cold`,
        detail: last ? `No helpful touch for ${d} days` : 'No helpful touch logged yet',
        companyId: c.id, personId: c.ownerId, href: `#/company/${c.id}`, action: 'Plan a touch',
      })
    }
  }

  // 4. Pitch window before events
  if (on('pitch-window')) {
    for (const ev of db.events) {
      const d = daysUntil(ev.date)
      const window = db.settings.pitchWindowDays.find(w => d <= w && d > w - 14)
      if (!window) continue
      for (const c of db.companies) {
        if (c.stage !== 'Nurturing') continue
        if (db.deals.some(x => x.companyId === c.id && x.eventKey === ev.key)) continue
        push({
          key: `pitch:${ev.key}:${c.id}:${window}`, rule: 'pitch-window', urgency: 'soon',
          title: `Pitch ${c.name} for ${ev.name}`, detail: `${d} days to the event and no ${ev.kind.toLowerCase()} deal yet`,
          companyId: c.id, personId: c.ownerId, href: `#/company/${c.id}`, action: 'Start a deal',
        })
      }
    }
  }

  // 5. Stage stuck
  if (on('stage-stuck')) {
    for (const c of db.companies) {
      const limit = db.settings.stageLimits[c.stage]
      if (!limit) continue
      const d = daysSince(c.stageSince)
      if (d > limit) push({
        key: `stuck:${c.id}:${c.stage}:${c.stageSince}`, rule: 'stage-stuck', urgency: 'today',
        title: `${c.name} stuck in ${c.stage}`, detail: `${d} days, limit is ${limit}`,
        companyId: c.id, personId: c.ownerId, href: `#/company/${c.id}`, action: 'Move it',
      })
    }
  }

  // 6. Proposal chaser
  if (on('proposal-chaser')) {
    for (const p of db.proposals) {
      if (p.status !== 'Sent' || !p.sentDate) continue
      const since = daysSince(p.lastFollowUp ?? p.sentDate)
      const deal = db.deals.find(x => x.id === p.dealId)
      const c = deal && db.companies.find(x => x.id === deal.companyId)
      if (since >= 3) push({
        key: `prop:${p.id}:${p.lastFollowUp ?? p.sentDate}`, rule: 'proposal-chaser', urgency: since >= 7 ? 'now' : 'today',
        title: `Chase proposal ${p.number} — ${c?.name ?? ''}`,
        detail: since >= 7 ? `${since} days without a reply. Offer a smaller first step.` : `${since} days without a reply`,
        companyId: deal?.companyId, dealId: deal?.id, personId: deal?.ownerId, href: `#/sell`, action: 'Send chaser',
      })
    }
  }

  // 7. Invoices overdue
  if (on('invoice-overdue')) {
    for (const inv of db.invoices) {
      if (inv.status === 'Paid') continue
      const late = -daysUntil(inv.due)
      if (late > 0) {
        const deal = db.deals.find(x => x.id === inv.dealId)
        const c = deal && db.companies.find(x => x.id === deal.companyId)
        push({
          key: `inv:${inv.id}:${today.slice(0, 7)}`, rule: 'invoice-overdue', urgency: late >= 15 ? 'now' : 'today',
          title: `Invoice ${inv.number} is ${late} days late — ${c?.name ?? ''}`,
          detail: `$${(inv.amount - inv.paid).toLocaleString()} outstanding${late >= 15 ? '. Escalated to SK and Raoof.' : ''}`,
          companyId: deal?.companyId, personId: late >= 15 ? 'p-raoof' : deal?.ownerId, href: `#/sell/invoices`, action: 'Send reminder',
        })
      }
    }
  }

  // 8. Deliverables due or waiting
  for (const dl of db.deliverables) {
    if (dl.status === 'Delivered') continue
    const d = daysUntil(dl.due)
    const deal = db.deals.find(x => x.id === dl.dealId)
    const c = deal && db.companies.find(x => x.id === deal.companyId)
    if (d <= 3) push({
      key: `dl:${dl.id}:${dl.due}`, rule: 'won-to-deliverables', urgency: d < 0 ? 'now' : 'today',
      title: `${dl.what} — ${c?.name ?? ''}`, detail: `${dl.status}${d < 0 ? `, ${-d} days late` : d === 0 ? ', due today' : `, due in ${d} days`}`,
      companyId: deal?.companyId, personId: dl.ownerId ?? deal?.ownerId, href: `#/sell/deliverables`, action: 'Update',
    })
  }

  // 9. Tasks due
  for (const t of db.tasks) {
    if (t.status === 'Done' || !t.due) continue
    const d = daysUntil(t.due)
    if (d <= 1) push({
      key: `task:${t.id}:${t.due}`, rule: 'tasks', urgency: d < 0 ? 'now' : d === 0 ? 'today' : 'soon',
      title: t.title, detail: `${t.priority} priority${d < 0 ? `, ${-d} days overdue` : d === 0 ? ', due today' : ', due tomorrow'}`,
      companyId: t.companyId, personId: t.assigneeId, href: `#/team/tasks`, action: 'Mark done',
    })
  }

  // 10. Meetings today and notes missing
  for (const m of db.meetings) {
    const d = daysUntil(m.date)
    if (d === 0) push({ key: `mtg:${m.id}`, rule: 'meetings', urgency: 'today', title: m.title, detail: `Meeting at ${new Date(m.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, companyId: m.companyId, personId: m.attendeeIds[0], href: `#/team/meetings` })
    if (on('missing-notes') && d < 0 && !m.notes) push({ key: `notes:${m.id}`, rule: 'missing-notes', urgency: 'today', title: `Add notes: ${m.title}`, detail: `${-d} days ago, no notes yet`, companyId: m.companyId, personId: m.attendeeIds[0], href: `#/team/meetings`, action: 'Add notes' })
  }

  // 11. No owner
  if (on('no-owner')) {
    const orphans = db.companies.filter(c => !c.ownerId && !['Mined', 'Not a fit'].includes(c.stage) && !c.archived)
    if (orphans.length) push({ key: `orphans:${today.slice(0, 10)}`, rule: 'no-owner', urgency: 'today', title: `${orphans.length} companies have no owner`, detail: orphans.slice(0, 4).map(c => c.name).join(', ') + (orphans.length > 4 ? '…' : ''), personId: 'p-raoof', href: `#/pipeline/leads`, action: 'Assign' })
  }

  // 12. Daily pace
  if (on('daily-pace')) {
    const sales = db.people.filter(p => p.role === 'Sales' || p.role === 'Sales lead')
    for (const p of sales) {
      if (forPerson && p.id !== forPerson) continue
      const doneToday = db.activities.filter(a => a.personId === p.id && a.kind === 'Outreach' && a.date.slice(0, 10) === today).length
      const left = db.settings.dailyLeadPace - doneToday
      const pool = db.companies.filter(c => c.ownerId === p.id && c.stage === 'Assigned').length
      if (left > 0 && pool > 0) push({ key: `pace:${p.id}:${today}`, rule: 'daily-pace', urgency: 'soon', title: `${left} first contacts left today`, detail: `${pool} assigned leads waiting`, personId: p.id, href: `#/pipeline/leads`, action: 'Open leads' })
    }
  }

  // Sort: now → today → soon, then by company name
  const order: Record<Urgency, number> = { now: 0, today: 1, soon: 2 }
  const filtered = forPerson ? items.filter(i => !i.personId || i.personId === forPerson) : items
  return filtered.sort((a, b) => order[a.urgency] - order[b.urgency] || a.title.localeCompare(b.title))
}

export function lastContactDate(db: Database, companyId: Id) {
  const acts = db.activities.filter(a => a.companyId === companyId && a.kind !== 'System')
  return acts.length ? acts.map(a => a.date).sort().slice(-1)[0] : undefined
}

export function healthOf(db: Database, companyId: Id): 'Warm' | 'Cooling' | 'Cold' {
  const acts = db.activities.filter(a => a.companyId === companyId && isHelpfulTouch(a.kind))
  const last = acts.length ? acts.map(a => a.date).sort().slice(-1)[0] : undefined
  const d = daysSince(last)
  if (d <= 30) return 'Warm'
  if (d <= 60) return 'Cooling'
  return 'Cold'
}
