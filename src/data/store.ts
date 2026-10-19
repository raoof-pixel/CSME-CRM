import { useSyncExternalStore } from 'react'
import type { Database, Company, Stage, Activity, Deal, ContentItem, ContentStatus, Id, Deliverable, Task, Contact } from './types'
import { buildSeed } from './seed'
import { buildJourney, stageIndex } from './lifecycle'

// ---------- persistence ----------
// Everything lives in the browser for now. To connect the live database later, replace
// load() and persist() in this file; nothing else in the app talks to storage.

const KEY = 'csme-crm-v2'

function load(): Database {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw) as Database
      if (db && db.version === 1) {
        // migrations for data saved by earlier builds
        const fresh = buildSeed()
        if (!db.records) db.records = fresh.records
        if (!db.messages) db.messages = fresh.messages
        return db
      }
    }
  } catch { /* storage unavailable or corrupt: start fresh */ }
  return buildSeed()
}

let db: Database = load()
const listeners = new Set<() => void>()

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore quota errors */ }
}

function commit(next: Database) {
  db = next
  persist()
  listeners.forEach(l => l())
}

export function useDb(): Database {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => db,
  )
}

export function getDb() { return db }

// ---------- helpers ----------
export const uid = (p = 'x') => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
export const todayIso = () => new Date().toISOString().slice(0, 10)
export const nowIso = () => new Date().toISOString()
export const addDays = (iso: string, n: number) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5)
export const daysSince = (iso?: string) => iso ? daysBetween(iso.slice(0, 10), todayIso()) : Infinity
export const daysUntil = (iso?: string) => iso ? daysBetween(todayIso(), iso.slice(0, 10)) : Infinity

export function personName(id?: Id) {
  return db.people.find(p => p.id === id)?.name ?? 'Unassigned'
}
export function company(id: Id) { return db.companies.find(c => c.id === id) }

// ---------- generic mutation ----------
export function update(fn: (draft: Database) => void) {
  const next: Database = JSON.parse(JSON.stringify(db))
  fn(next)
  commit(next)
}

// ---------- domain actions ----------
// Stage changes always go through here so the history is written and the journey is created.
export function setStage(companyId: Id, stage: Stage, reason = 'Stage changed') {
  update(d => {
    const c = d.companies.find(x => x.id === companyId)
    if (!c || c.stage === stage) return
    const from = c.stage
    c.stage = stage
    c.stageSince = todayIso()
    if (stage === 'Nurturing' && c.journey.length === 0) {
      c.journeyStart = todayIso()
      c.journey = buildJourney(c.journeyStart)
    }
    d.activities.push({ id: uid('a'), companyId, kind: 'System', summary: `${reason}: ${from} → ${stage}`, date: nowIso(), personId: d.settings.currentUserId })
  })
}

// Move forward only; never pull a company back by accident.
function advanceTo(d: Database, c: Company, stage: Stage, reason: string) {
  if (c.stage === 'Not a fit') return
  if (stageIndex(stage) > stageIndex(c.stage)) {
    const from = c.stage
    c.stage = stage
    c.stageSince = todayIso()
    if (stage === 'Nurturing' && c.journey.length === 0) {
      c.journeyStart = todayIso()
      c.journey = buildJourney(c.journeyStart)
    }
    d.activities.push({ id: uid('a'), companyId: c.id, kind: 'System', summary: `${reason}: ${from} → ${stage}`, date: nowIso(), personId: d.settings.currentUserId })
  }
}

export function logActivity(a: Omit<Activity, 'id' | 'date'> & { date?: string }) {
  update(d => {
    const c = d.companies.find(x => x.id === a.companyId)
    const act: Activity = { id: uid('a'), date: a.date ?? nowIso(), ...a }
    d.activities.push(act)
    if (!c) return
    if (a.kind === 'Outreach' || a.kind === 'Reply') advanceTo(d, c, 'Contacted', 'First contact logged')
    if (a.kind === 'Meeting') advanceTo(d, c, 'Contacted', 'Meeting logged')
    if (a.kind === 'Proposal') advanceTo(d, c, 'Pitched', 'Proposal sent')
    // keep the next follow-up on the company's open deals too
    if (a.nextFollowUp) {
      d.deals.filter(x => x.companyId === c.id && !['Won', 'Lost'].includes(x.stage)).forEach(x => { x.nextFollowUp = a.nextFollowUp; x.updatedAt = nowIso() })
    }
  })
}

export function completeJourneyTouch(companyId: Id, month: number, note?: string) {
  update(d => {
    const c = d.companies.find(x => x.id === companyId)
    if (!c) return
    const t = c.journey.find(j => j.month === month)
    if (!t) return
    t.doneDate = todayIso()
    if (note) t.note = note
    d.activities.push({ id: uid('a'), companyId, kind: 'Journey touch', summary: `Month ${month}: ${t.type}${note ? ' — ' + note : ''}`, date: nowIso(), personId: d.settings.currentUserId })
  })
}

export function assignOwner(companyId: Id, ownerId?: Id) {
  update(d => {
    const c = d.companies.find(x => x.id === companyId)
    if (!c) return
    c.ownerId = ownerId
    if (ownerId) advanceTo(d, c, 'Assigned', 'Owner assigned')
  })
}

export function addContact(contact: Omit<Contact, 'id'>) {
  update(d => {
    d.contacts.push({ id: uid('ct'), ...contact })
    const c = d.companies.find(x => x.id === contact.companyId)
    if (c && contact.decisionMaker) advanceTo(d, c, 'Enriched', 'Decision-maker added')
  })
}

export function addCompany(c: Partial<Company> & { name: string }): Id {
  const id = uid('c')
  update(d => {
    d.companies.push({
      id, name: c.name, website: c.website, industry: c.industry, city: c.city, province: c.province,
      brands: c.brands ?? [d.settings.defaultBrand], ownerId: c.ownerId, stage: c.stage ?? 'Mined', stageSince: todayIso(),
      leadList: c.leadList, source: c.source ?? 'Added by hand', score: c.score, tags: c.tags ?? [], journey: [], createdAt: todayIso(),
    })
  })
  return id
}

export function setContentStatus(contentId: Id, status: ContentStatus, extra?: Partial<ContentItem>) {
  update(d => {
    const ci = d.content.find(x => x.id === contentId)
    if (!ci) return
    ci.status = status
    Object.assign(ci, extra ?? {})
    const c = d.companies.find(x => x.id === ci.companyId)
    if (!c) return
    if (status === 'Booked' || status === 'Questions sent') advanceTo(d, c, 'Content booked', `${ci.type} booked`)
    if (status === 'Recorded') d.activities.push({ id: uid('a'), companyId: c.id, kind: 'Content', summary: `${ci.type} recorded: ${ci.title}`, date: nowIso(), personId: ci.hostId })
    if (status === 'Published') {
      if (!ci.publishDate) ci.publishDate = todayIso()
      d.activities.push({ id: uid('a'), companyId: c.id, kind: 'Content', summary: `${ci.type} published: ${ci.title}`, date: nowIso(), personId: ci.editorId ?? ci.hostId })
      advanceTo(d, c, 'Published', `${ci.type} published`)
      const rule = d.automations.find(r => r.id === 'content-starts-journey')
      if (rule?.on) advanceTo(d, c, 'Nurturing', 'Journey started after publishing')
    }
  })
}

export function addContent(ci: Omit<ContentItem, 'id'>) {
  update(d => {
    d.content.push({ id: uid('ci'), ...ci })
    const c = d.companies.find(x => x.id === ci.companyId)
    if (c && ['Booked', 'Questions sent'].includes(ci.status)) advanceTo(d, c, 'Content booked', `${ci.type} booked`)
  })
}

export function upsertDeal(deal: Partial<Deal> & { companyId: Id; title: string; value: number }) {
  update(d => {
    const existing = deal.id ? d.deals.find(x => x.id === deal.id) : undefined
    const c = d.companies.find(x => x.id === deal.companyId)
    if (existing) {
      const was = existing.stage
      Object.assign(existing, deal, { updatedAt: nowIso() })
      if (existing.stage === 'Won' && was !== 'Won') onWon(d, existing)
      if (c && existing.stage === 'Proposal sent') advanceTo(d, c, 'Pitched', 'Proposal sent')
    } else {
      const nd: Deal = {
        id: uid('d'), ownerId: deal.ownerId ?? c?.ownerId ?? d.settings.currentUserId, stage: deal.stage ?? 'Qualified',
        probability: deal.probability ?? 30, createdAt: nowIso(), updatedAt: nowIso(), ...deal,
      } as Deal
      d.deals.push(nd)
      if (c && nd.stage === 'Proposal sent') advanceTo(d, c, 'Pitched', 'Proposal sent')
      if (nd.stage === 'Won') onWon(d, nd)
    }
  })
}

function onWon(d: Database, deal: Deal) {
  const c = d.companies.find(x => x.id === deal.companyId)
  if (c) advanceTo(d, c, 'Won', `Deal won: ${deal.title}`)
  d.activities.push({ id: uid('a'), companyId: deal.companyId, kind: 'Deal', summary: `Won: ${deal.title} ($${deal.value.toLocaleString()})`, date: nowIso(), personId: deal.ownerId })
  const rule = d.automations.find(r => r.id === 'won-to-deliverables')
  if (rule?.on && !d.deliverables.some(x => x.dealId === deal.id)) {
    const pk = d.packages.find(p => p.id === deal.packageId)
    const items = pk ? pk.includes.split(',').map(s => s.trim()).filter(Boolean) : [deal.title]
    items.forEach(what => d.deliverables.push({ id: uid('dl'), dealId: deal.id, what, due: addDays(todayIso(), 30), status: 'Open' }))
  }
}

export function setDeliverableStatus(id: Id, status: Deliverable['status'], proofUrl?: string) {
  update(d => {
    const dl = d.deliverables.find(x => x.id === id)
    if (!dl) return
    dl.status = status
    if (proofUrl) dl.proofUrl = proofUrl
    const deal = d.deals.find(x => x.id === dl.dealId)
    if (!deal) return
    const all = d.deliverables.filter(x => x.dealId === deal.id)
    if (all.every(x => x.status === 'Delivered')) {
      const c = d.companies.find(x => x.id === deal.companyId)
      if (c) advanceTo(d, c, 'Delivered', 'All deliverables done')
    }
  })
}

export function setTaskStatus(id: Id, status: Task['status']) {
  update(d => { const t = d.tasks.find(x => x.id === id); if (t) t.status = status })
}

export function dismiss(key: string) {
  update(d => { if (!d.dismissed.includes(key)) d.dismissed.push(key) })
}

export function importCompanies(rows: Array<Record<string, string>>, opts: { leadList: string; ownerId?: Id; brands: Company['brands'] }) {
  let added = 0, skipped = 0
  update(d => {
    const names = new Set(d.companies.map(c => c.name.trim().toLowerCase()))
    for (const r of rows) {
      const name = (r.company ?? r.name ?? r['company name'] ?? '').trim()
      if (!name) { skipped++; continue }
      if (names.has(name.toLowerCase())) { skipped++; continue }
      names.add(name.toLowerCase())
      const id = uid('c')
      d.companies.push({
        id, name, website: r.website, industry: r.industry, city: r.city, province: r.province ?? r.state,
        linkedin: r.linkedin ?? r['company linkedin'], brands: opts.brands, ownerId: opts.ownerId,
        stage: opts.ownerId ? 'Assigned' : 'Mined', stageSince: todayIso(), leadList: opts.leadList, source: 'List upload',
        tags: [], journey: [], createdAt: todayIso(),
      })
      const cname = (r.contact ?? r['contact name'] ?? '').trim()
      if (cname) d.contacts.push({ id: uid('ct'), companyId: id, name: cname, title: r.title, email: r.email, phone: r.phone, linkedin: r['contact linkedin'], decisionMaker: false })
      added++
    }
  })
  return { added, skipped }
}

export function removeSampleData() {
  update(d => {
    const sampleIds = new Set(d.companies.filter(c => c.sample).map(c => c.id))
    d.companies = d.companies.filter(c => !c.sample)
    d.contacts = d.contacts.filter(x => !sampleIds.has(x.companyId))
    d.activities = d.activities.filter(x => !sampleIds.has(x.companyId))
    d.content = d.content.filter(x => !sampleIds.has(x.companyId))
    const dealIds = new Set(d.deals.filter(x => sampleIds.has(x.companyId)).map(x => x.id))
    d.deals = d.deals.filter(x => !dealIds.has(x.id))
    d.proposals = d.proposals.filter(x => !dealIds.has(x.dealId))
    d.invoices = d.invoices.filter(x => !dealIds.has(x.dealId))
    d.deliverables = d.deliverables.filter(x => !dealIds.has(x.dealId))
    d.tasks = d.tasks.filter(x => !x.companyId || !sampleIds.has(x.companyId))
    d.meetings = d.meetings.filter(x => !x.companyId || !sampleIds.has(x.companyId))
    d.speakers = d.speakers.filter(x => !x.companyId || !sampleIds.has(x.companyId))
  })
}

export function resetToSample() { commit(buildSeed()) }

export function exportJson(): string { return JSON.stringify(db, null, 2) }

export function importJson(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as Database
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.companies)) return false
    commit(parsed)
    return true
  } catch { return false }
}

export function setSettings(patch: Partial<Database['settings']>) {
  update(d => { Object.assign(d.settings, patch) })
}

export function toggleAutomation(id: string) {
  update(d => { const r = d.automations.find(x => x.id === id); if (r) r.on = !r.on })
}

// ---------- generic records (schema-driven sections) ----------
import type { GenericRecord, Message } from './types'

export function recordsOf(d: Database, collection: string, unit?: string): GenericRecord[] {
  const list = d.records[collection] ?? []
  return list.filter(r => !r.deletedAt && (unit === undefined || r.unit === unit))
}

export function addRecord(collection: string, unit: string, data: Record<string, unknown>): Id {
  const id = uid('r')
  update(d => { (d.records[collection] ??= []).push({ id, unit, createdAt: todayIso(), ...data }) })
  return id
}

export function updateRecord(collection: string, id: Id, data: Record<string, unknown>) {
  update(d => { const r = (d.records[collection] ?? []).find(x => x.id === id); if (r) Object.assign(r, data) })
}

export function deleteRecord(collection: string, id: Id) {
  update(d => { const r = (d.records[collection] ?? []).find(x => x.id === id); if (r) r.deletedAt = nowIso() })
}

export function restoreRecord(collection: string, id: Id) {
  update(d => { const r = (d.records[collection] ?? []).find(x => x.id === id); if (r) delete r.deletedAt })
}

export function purgeRecord(collection: string, id: Id) {
  update(d => { d.records[collection] = (d.records[collection] ?? []).filter(x => x.id !== id) })
}

export function importRecords(collection: string, unit: string, rows: Array<Record<string, unknown>>) {
  update(d => { const list = (d.records[collection] ??= []); rows.forEach(r => list.push({ id: uid('r'), unit, createdAt: todayIso(), ...r })) })
}

export function sendMessage(channel: string, text: string) {
  update(d => { d.messages.push({ id: uid('msg'), channel, fromId: d.settings.currentUserId, text, date: nowIso() } as Message) })
}
