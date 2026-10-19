import { useMemo, useState } from 'react'
import { useDb, setSettings, toggleAutomation, removeSampleData, resetToSample, exportJson, importJson, update, uid } from '../data/store'
import { useRoute } from '../app/router'
import { Tabs, Field, Toast, useToast, fmtMoney, Drawer } from '../components/ui'
import { STAGES } from '../data/lifecycle'
import { BRANDS } from '../data/seed'
import { download } from '../data/csv'
import type { Brand, Person } from '../data/types'

export function Admin(props: { tab?: string; title?: string } = {}) {
  const db = useDb()
  const route = useRoute()
  const tab = props.tab ?? route[1] ?? 'settings'
  const [toast, say] = useToast()
  const [personDrawer, setPersonDrawer] = useState<Person | 'new' | null>(null)

  const dupes = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/\b(inc|ltd|canada|corp|co|the)\b/g, '').replace(/[^a-z0-9]/g, '')
    const seen = new Map<string, string[]>()
    db.companies.filter(c => !c.archived).forEach(c => { const k = norm(c.name); seen.set(k, [...(seen.get(k) ?? []), c.id]) })
    return [...seen.values()].filter(v => v.length > 1)
  }, [db])
  const missing = db.companies.filter(c => !c.archived && (!c.ownerId && c.stage !== 'Mined' || !db.contacts.some(ct => ct.companyId === c.id)))
  const sampleCount = db.companies.filter(c => c.sample).length

  const onImport = (e: any) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { say(importJson(String(r.result)) ? 'Backup restored' : 'That file is not a CRM backup') }; r.readAsText(f) }

  return (
    <>
      <div className="page-head"><div><h1>{props.title ?? 'Settings'}</h1><p>Settings, the people, the automation rules, targets and data quality. Nothing here is day-to-day work.</p></div></div>
      {!props.tab && <Tabs base="settings" items={[{ key: 'settings', label: 'Settings' }, { key: 'people', label: 'People', count: db.people.length }, { key: 'automations', label: 'Automations', count: db.automations.filter(a => a.on).length }, { key: 'targets', label: 'Targets' }, { key: 'data', label: 'Data quality', count: dupes.length + missing.length }, { key: 'help', label: 'How to use this CRM' }]} />}

      {tab === 'settings' && (
        <div className="grid c2">
          <div className="card"><div className="hd"><h2>You</h2></div><div className="bd form">
            <Field label="Signed in as (switches the Mine view and who logs actions)"><select value={db.settings.currentUserId} onChange={(e: any) => setSettings({ currentUserId: e.target.value })}>{db.people.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}</select></Field>
            <Field label="Default brand for new companies"><select value={db.settings.defaultBrand} onChange={(e: any) => setSettings({ defaultBrand: e.target.value as Brand })}>{db.settings.activeBrands.map(b => <option key={b}>{b}</option>)}</select></Field>
            <Field label="Active brands (hidden brands keep their data)"><div className="brandbar" style={{ marginTop: 4 }}>{BRANDS.map(b => <span key={b} role="button" tabIndex={0} style={{ cursor: 'pointer' }} className={db.settings.activeBrands.includes(b) ? 'on' : ''} onClick={() => setSettings({ activeBrands: db.settings.activeBrands.includes(b) ? db.settings.activeBrands.filter(x => x !== b) : [...db.settings.activeBrands, b] })}>{b}</span>)}</div></Field>
          </div></div>
          <div className="card"><div className="hd"><h2>Rules of the lifecycle</h2></div><div className="bd form">
            <div className="form c2">
              <Field label="Going cold after (days with no helpful touch)"><input type="number" value={db.settings.goingColdDays} onChange={(e: any) => setSettings({ goingColdDays: Number(e.target.value) })} /></Field>
              <Field label="Daily first-contact pace per salesperson"><input type="number" value={db.settings.dailyLeadPace} onChange={(e: any) => setSettings({ dailyLeadPace: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Pitch window: days before an event to prompt pitches (comma separated)"><input value={db.settings.pitchWindowDays.join(', ')} onChange={(e: any) => setSettings({ pitchWindowDays: e.target.value.split(',').map((s: string) => Number(s.trim())).filter((n: number) => n > 0) })} /></Field>
            <div><label className="small" style={{ fontWeight: 700, color: 'var(--text-2)' }}>Days allowed in each stage before it is flagged</label>
              <div className="form c2 mt" style={{ marginTop: 8 }}>{STAGES.filter(s => !['Won', 'Delivered', 'Nurturing'].includes(s)).map(s => <Field key={s} label={s}><input type="number" value={db.settings.stageLimits[s] ?? ''} placeholder="no limit" onChange={(e: any) => setSettings({ stageLimits: { ...db.settings.stageLimits, [s]: e.target.value ? Number(e.target.value) : undefined } })} /></Field>)}</div>
            </div>
          </div></div>
        </div>
      )}

      {tab === 'people' && (
        <>
          <div className="filters"><span className="muted small">Owners, hosts, editors and designers. Targets apply to media sales only.</span><span style={{ flex: 1 }} /><button className="btn pri" onClick={() => setPersonDrawer('new')}>Add person</button></div>
          <div className="card wrap"><table className="tbl"><thead><tr><th>Name</th><th>Role</th><th>Brands</th><th className="num">Monthly target</th><th className="num">Companies owned</th><th></th></tr></thead><tbody>
            {db.people.map(p => <tr key={p.id}><td><b>{p.name}</b>{p.email && <div className="muted small">{p.email}</div>}</td><td>{p.role}</td><td className="small">{p.brands.length >= BRANDS.length ? 'All' : p.brands.join(', ')}</td><td className="num">{p.monthlyTarget ? fmtMoney(p.monthlyTarget) : '—'}</td><td className="num">{db.companies.filter(c => c.ownerId === p.id).length}</td><td className="act"><button className="btn sm ghost" onClick={() => setPersonDrawer(p)}>Edit</button></td></tr>)}
          </tbody></table></div>
        </>
      )}

      {tab === 'automations' && (
        <div className="card">
          <div className="hd"><h2>Rules<span className="sub">{db.automations.filter(a => a.on).length} of {db.automations.length} on</span></h2></div>
          <table className="tbl"><tbody>
            {db.automations.map(r => <tr key={r.id}><td style={{ width: 70 }}><button className={`btn sm ${r.on ? 'pri' : ''}`} onClick={() => toggleAutomation(r.id)}>{r.on ? 'On' : 'Off'}</button></td><td><b>{r.name}</b><div className="muted small">{r.description}</div></td></tr>)}
          </tbody></table>
          <div className="bd"><p className="note">Rules run every time the app opens and whenever data changes. They put items on Today; they never send anything without a person.</p></div>
        </div>
      )}

      {tab === 'targets' && (
        <div className="card wrap">
          <div className="hd"><h2>Monthly media targets</h2></div>
          <table className="tbl"><thead><tr><th>Person</th><th className="num">Target (CAD)</th></tr></thead><tbody>
            {db.people.filter(p => ['Sales', 'Sales lead'].includes(p.role)).map(p => <tr key={p.id}><td><b>{p.name}</b></td><td className="num"><input className="btn sm" style={{ width: 120, textAlign: 'right' }} type="number" value={p.monthlyTarget ?? ''} placeholder="none" onChange={(e: any) => update(d => { d.people.find(x => x.id === p.id)!.monthlyTarget = e.target.value ? Number(e.target.value) : undefined })} /></td></tr>)}
            <tr><td><b>Team</b></td><td className="num money">{fmtMoney(db.people.reduce((s, p) => s + (p.monthlyTarget ?? 0), 0))}</td></tr>
          </tbody></table>
          <div className="bd"><p className="muted small">Event sponsorship targets live on each event's Settings tab.</p></div>
        </div>
      )}

      {tab === 'data' && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="grid c2">
            <div className="card"><div className="hd"><h2>Possible duplicates<span className="sub">{dupes.length}</span></h2></div>
              {dupes.length === 0 ? <div className="empty small">No duplicates by name.</div> : <table className="tbl"><tbody>{dupes.map((g, i) => <tr key={i}><td>{g.map(id => { const c = db.companies.find(x => x.id === id)!; return <div key={id} className="row-between small"><a className="lnk" href={`#/company/${id}`}>{c.name}</a><button className="btn sm ghost" onClick={() => update(d => { d.companies.find(x => x.id === id)!.archived = true })}>Archive</button></div> })}</td></tr>)}</tbody></table>}
            </div>
            <div className="card"><div className="hd"><h2>Missing details<span className="sub">{missing.length}</span></h2></div>
              {missing.length === 0 ? <div className="empty small">Every active company has an owner and a contact.</div> : <table className="tbl"><tbody>{missing.slice(0, 30).map(c => <tr key={c.id}><td><a className="lnk" href={`#/company/${c.id}`}>{c.name}</a></td><td className="small muted">{[!c.ownerId && c.stage !== 'Mined' ? 'no owner' : '', !db.contacts.some(ct => ct.companyId === c.id) ? 'no contact' : ''].filter(Boolean).join(', ')}</td></tr>)}</tbody></table>}
            </div>
          </div>
          <div className="card"><div className="hd"><h2>Backup, restore and sample data</h2></div><div className="bd stack">
            <div className="inline">
              <button className="btn" onClick={() => download(`csme-crm-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJson(), 'application/json')}>Download backup (JSON)</button>
              <label className="btn">Restore a backup<input type="file" accept="application/json" style={{ display: 'none' }} onChange={onImport} /></label>
              <button className="btn" disabled={!sampleCount} onClick={() => { if (confirm(`Remove ${sampleCount} sample companies and everything attached to them?`)) { removeSampleData(); say('Sample data removed') } }}>Remove sample data ({sampleCount})</button>
              <button className="btn ghost" onClick={() => { if (confirm('Replace everything with the original sample data?')) { resetToSample(); say('Reset to sample') } }}>Reset to sample</button>
            </div>
            <p className="note">Data is saved in this browser. Download a backup before clearing browser data or moving computers. Connecting the live database is a one-file change in the code (src/data/store.ts).</p>
          </div></div>
          <div className="card"><div className="hd"><h2>Archived companies<span className="sub">{db.companies.filter(c => c.archived).length}</span></h2></div>
            {db.companies.filter(c => c.archived).length === 0 ? <div className="empty small">Nothing archived.</div> : <table className="tbl"><tbody>{db.companies.filter(c => c.archived).map(c => <tr key={c.id}><td>{c.name}</td><td className="act"><button className="btn sm" onClick={() => update(d => { d.companies.find(x => x.id === c.id)!.archived = false })}>Restore</button></td></tr>)}</tbody></table>}
          </div>
        </div>
      )}

      {tab === 'help' && <Help />}

      {personDrawer && <PersonDrawer person={personDrawer === 'new' ? null : personDrawer} onClose={() => setPersonDrawer(null)} onSaved={() => say('Saved')} />}
      <Toast msg={toast} />
    </>
  )
}

function PersonDrawer({ person, onClose, onSaved }: { person: Person | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Omit<Person, 'id'>>(person ?? { name: '', role: 'Sales', brands: [...BRANDS], email: '', monthlyTarget: undefined })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return (
    <Drawer title={person ? 'Edit person' : 'Add person'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.name.trim()} onClick={() => { update(d => { if (person) Object.assign(d.people.find(p => p.id === person.id)!, f); else d.people.push({ id: uid('p'), ...f }) }); onSaved(); onClose() }}>Save</button></>}>
      <div className="form">
        <Field label="Name"><input value={f.name} onChange={(e: any) => set('name', e.target.value)} autoFocus /></Field>
        <div className="form c2">
          <Field label="Role"><select value={f.role} onChange={(e: any) => set('role', e.target.value)}>{['Founder', 'Sales lead', 'Sales', 'Editorial', 'Design', 'Web', 'Operations'].map(r => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Email"><input value={f.email ?? ''} onChange={(e: any) => set('email', e.target.value)} /></Field>
        </div>
        <Field label="Monthly media target (CAD, sales only)"><input type="number" value={f.monthlyTarget ?? ''} onChange={(e: any) => set('monthlyTarget', e.target.value ? Number(e.target.value) : undefined)} /></Field>
        <Field label="Brands"><div className="brandbar">{BRANDS.map(b => <span key={b} role="button" tabIndex={0} style={{ cursor: 'pointer' }} className={f.brands.includes(b) ? 'on' : ''} onClick={() => set('brands', f.brands.includes(b) ? f.brands.filter(x => x !== b) : [...f.brands, b])}>{b}</span>)}</div></Field>
      </div>
    </Drawer>
  )
}

function Help() {
  const topics: Array<[string, string[]]> = [
    ['The one idea', ['Every company is at one stage of one lifecycle: Mined → Validated → Enriched → Assigned → Contacted → Content booked → Published → Nurturing → Pitched → Won → Delivered.', 'You never set the stage by hand. Logging a first contact, booking content, publishing it, sending a proposal and winning a deal each move it.', 'Published starts a 12-month journey of helpful touches. That journey is what keeps a podcast guest warm until the Summit or Show pitch.']],
    ['Every morning', ['Open Today. Work the red items first, then the amber ones.', '"Log it" on a journey touch marks it done; the next one is already planned.', 'Hide anything that does not apply; it will not come back unless the data changes.']],
    ['Working a lead', ['Pipeline → Leads shows what is mined and assigned. Add the decision-maker, assign an owner, then log the first email, call or LinkedIn message.', 'Never two emails in a row: the log form suggests the next channel.', 'Goal of outreach is content, not a sale: book a podcast, email interview or article from the company page.']],
    ['Content to nurture', ['Content Studio moves each piece from Invited to Published. Press Publish and the company moves to Nurturing.', 'The company page shows the 12 touches. Do the one that is due, log it, and the relationship stays warm.', 'Going cold means 30 days without a helpful touch. Pitches do not count as helpful.']],
    ['Pitching an event', ['Events → Sales lists warm companies with no deal for that event. Start a deal with a package from the rate card.', 'Mark proposal sent; the chaser rule reminds you at 3 and 7 days.', 'Won creates deliverables and the invoice reminder. Delivered puts the company back into nurture for next year.']],
    ['Brands', ['The brand filter in the top bar narrows every page. Companies can belong to several brands.', 'Hide brands you are not selling yet under Admin → Settings; their data is kept.']],
  ]
  return <div className="grid c2">{topics.map(([t, lines]) => <div className="card" key={t}><div className="hd"><h2>{t}</h2></div><div className="bd"><ul className="small stack" style={{ margin: 0, paddingLeft: 18 }}>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul></div></div>)}</div>
}
