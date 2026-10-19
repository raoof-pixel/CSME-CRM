import { useMemo, useState } from 'react'
import { useDb, personName, update, uid, setDeliverableStatus, todayIso, daysSince } from '../data/store'
import { useRoute } from '../app/router'
import { Tabs, fmtMoney, fmtDate, Drawer, Field, Toast, useToast, Stat } from '../components/ui'
import { DealDrawer } from './Companies'
import type { Package, PitchTemplate } from '../data/types'

export function Sell() {
  const db = useDb()
  const route = useRoute()
  const tab = route[1] ?? 'proposals'
  const [toast, say] = useToast()
  const [editDeal, setEditDeal] = useState<{ companyId: string; dealId: string } | null>(null)
  const [pkgDrawer, setPkgDrawer] = useState<Package | 'new' | null>(null)
  const [pitchDrawer, setPitchDrawer] = useState<PitchTemplate | 'new' | null>(null)
  const [filter, setFilter] = useState('')

  const openDeals = db.deals.filter(d => !['Won', 'Lost'].includes(d.stage))
  const outstanding = db.invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (i.amount - i.paid), 0)
  const overdueInv = db.invoices.filter(i => i.status !== 'Paid' && i.due < todayIso())
  const openDl = db.deliverables.filter(d => d.status !== 'Delivered')

  const companyOf = (dealId: string) => { const d = db.deals.find(x => x.id === dealId); return d && db.companies.find(c => c.id === d.companyId) }

  return (
    <>
      <div className="page-head">
        <div><h1>Sell and deliver</h1><p>From proposal to paid invoice to delivered promise. A Won deal creates its deliverables, so nothing sold is forgotten.</p></div>
      </div>
      <div className="grid c4 mb">
        <Stat label="Open deals" value={openDeals.length} sub={fmtMoney(openDeals.reduce((s, d) => s + d.value, 0))} />
        <Stat label="Proposals waiting" value={db.proposals.filter(p => p.status === 'Sent').length} sub="sent, no answer yet" />
        <Stat label="Outstanding invoices" value={fmtMoney(outstanding)} sub={`${overdueInv.length} overdue`} tone={overdueInv.length ? 'warn' : undefined} />
        <Stat label="Deliverables open" value={openDl.length} sub={`${openDl.filter(d => d.due < todayIso()).length} late`} />
      </div>
      <Tabs base="sell" items={[
        { key: 'proposals', label: 'Deals and proposals', count: openDeals.length },
        { key: 'ratecard', label: 'Rate card', count: db.packages.length },
        { key: 'pitches', label: 'Pitch library', count: db.pitches.length },
        { key: 'deliverables', label: 'Deliverables', count: openDl.length },
        { key: 'invoices', label: 'Invoices', count: db.invoices.filter(i => i.status !== 'Paid').length },
      ]} />

      {tab === 'proposals' && (
        <div className="card wrap">
          <table className="tbl">
            <thead><tr><th>Company</th><th>Deal</th><th>Stage</th><th className="num">Value</th><th>Prob.</th><th>Owner</th><th>Proposal</th><th>Next</th><th></th></tr></thead>
            <tbody>
              {db.deals.filter(d => d.stage !== 'Lost').sort((a, b) => (a.nextFollowUp ?? '9').localeCompare(b.nextFollowUp ?? '9')).map(d => {
                const c = db.companies.find(x => x.id === d.companyId)
                const p = db.proposals.find(x => x.dealId === d.id)
                const since = p?.sentDate ? daysSince(p.lastFollowUp ?? p.sentDate) : 0
                return (
                  <tr key={d.id}>
                    <td><a className="lnk" href={`#/company/${d.companyId}`}>{c?.name}</a></td>
                    <td><b>{d.title}</b><div className="muted small">{d.eventKey ? db.events.find(e => e.key === d.eventKey)?.name : d.brand}</div></td>
                    <td><span className={`pill plain ${d.stage === 'Won' ? 'good' : 'Grow'}`}>{d.stage}</span></td>
                    <td className="num money">{fmtMoney(d.value)}</td>
                    <td className="muted">{d.probability}%</td>
                    <td className="small">{personName(d.ownerId)}</td>
                    <td className="small">{p ? <>{p.number} · {p.status}{p.status === 'Sent' && <div className={since >= 3 ? 'money' : 'muted'} style={since >= 3 ? { color: 'var(--warn)' } : undefined}>{since} days, no reply</div>}</> : <span className="muted">—</span>}</td>
                    <td className="small">{d.stage === 'Won' ? <span className="muted">Delivering</span> : <>{d.nextAction ?? '—'}{d.nextFollowUp && <div className="muted">{fmtDate(d.nextFollowUp)}</div>}</>}</td>
                    <td className="act">
                      {p?.status === 'Sent' && <button className="btn sm" onClick={() => { update(x => { x.proposals.find(y => y.id === p.id)!.lastFollowUp = todayIso() }); say('Follow-up recorded') }}>Followed up</button>}{' '}
                      {!p && d.stage !== 'Won' && <button className="btn sm" onClick={() => { update(x => { x.proposals.push({ id: uid('pr'), dealId: d.id, number: `P-${new Date().getFullYear()}-${String(x.proposals.length + 42).padStart(3, '0')}`, sentDate: todayIso(), total: d.value, status: 'Sent' }); const dd = x.deals.find(y => y.id === d.id)!; if (dd.stage === 'Qualified') dd.stage = 'Proposal sent'; const cc = x.companies.find(y => y.id === d.companyId); if (cc && ['Nurturing', 'Published', 'Contacted', 'Content booked'].includes(cc.stage)) { cc.stage = 'Pitched'; cc.stageSince = todayIso() } }); say('Proposal recorded as sent') }}>Mark proposal sent</button>}{' '}
                      <button className="btn sm ghost" onClick={() => setEditDeal({ companyId: d.companyId, dealId: d.id })}>Edit</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'ratecard' && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="row-between"><p className="muted small">Prices here feed every deal and proposal. Update once, and the team sells from the same sheet.</p><button className="btn pri" onClick={() => setPkgDrawer('new')}>Add package</button></div>
          {[['Events', db.packages.filter(p => p.eventKey)], ['Media', db.packages.filter(p => !p.eventKey)]].map(([label, list]: any) => (
            <div className="card" key={label}>
              <div className="hd"><h2>{label}</h2></div>
              <div className="wrap"><table className="tbl"><thead><tr><th>Package</th><th>For</th><th>Kind</th><th>Includes</th><th className="num">Price</th><th></th></tr></thead><tbody>
                {list.map((p: Package) => <tr key={p.id}><td><b>{p.name}</b></td><td className="small">{p.eventKey ? db.events.find(e => e.key === p.eventKey)?.name : p.brand}</td><td><span className="tag">{p.kind}</span></td><td className="small">{p.includes}</td><td className="num money">{fmtMoney(p.price)}</td><td className="act"><button className="btn sm ghost" onClick={() => setPkgDrawer(p)}>Edit</button></td></tr>)}
              </tbody></table></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'pitches' && (
        <>
          <div className="filters"><input className="grow" placeholder="Search pitches, objections, follow-ups" value={filter} onChange={(e: any) => setFilter(e.target.value)} /><button className="btn pri" onClick={() => setPitchDrawer('new')}>Add to library</button></div>
          <div className="grid c2">
            {db.pitches.filter(p => !filter || (p.name + p.body + p.type + p.audience).toLowerCase().includes(filter.toLowerCase())).map(p => (
              <div className="card" key={p.id}>
                <div className="hd"><h2>{p.name}<span className="sub">{p.type} · {p.audience}</span></h2><div className="inline"><button className="btn sm" onClick={() => { navigator.clipboard?.writeText((p.subject ? `Subject: ${p.subject}\n\n` : '') + p.body); say('Copied. Replace everything in [brackets].') }}>Copy</button><button className="btn sm ghost" onClick={() => setPitchDrawer(p)}>Edit</button></div></div>
                <div className="bd small" style={{ whiteSpace: 'pre-wrap' }}>{p.subject && <div className="mb" style={{ marginBottom: 8 }}><b>Subject:</b> {p.subject}</div>}{p.body}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'deliverables' && (
        <div className="card wrap">
          <table className="tbl">
            <thead><tr><th>What</th><th>Company</th><th>Deal</th><th>Who delivers</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {db.deliverables.length === 0 && <tr><td colSpan={7} className="empty">Nothing to deliver. Deliverables appear when a deal is Won.</td></tr>}
              {[...db.deliverables].sort((a, b) => Number(a.status === 'Delivered') - Number(b.status === 'Delivered') || a.due.localeCompare(b.due)).map(dl => {
                const d = db.deals.find(x => x.id === dl.dealId); const c = companyOf(dl.dealId)
                const late = dl.status !== 'Delivered' && dl.due < todayIso()
                return (
                  <tr key={dl.id} style={{ opacity: dl.status === 'Delivered' ? .6 : 1 }}>
                    <td><b>{dl.what}</b>{dl.proofUrl && <div className="small"><a href={dl.proofUrl} target="_blank" rel="noreferrer">Proof</a></div>}</td>
                    <td>{c && <a className="lnk" href={`#/company/${c.id}`}>{c.name}</a>}</td>
                    <td className="small">{d?.title}</td>
                    <td><select className="btn sm" value={dl.ownerId ?? ''} onChange={(e: any) => update(x => { x.deliverables.find(y => y.id === dl.id)!.ownerId = e.target.value || undefined })}><option value="">Assign</option>{db.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                    <td className={late ? 'money' : 'muted'} style={late ? { color: 'var(--warn)' } : undefined}>{fmtDate(dl.due)}</td>
                    <td><span className={`pill plain ${dl.status === 'Delivered' ? 'good' : late ? 'maple' : 'warn'}`}>{dl.status}</span></td>
                    <td className="act">{dl.status !== 'Delivered' && <>
                      <select className="btn sm" value={dl.status} onChange={(e: any) => setDeliverableStatus(dl.id, e.target.value)}>{['Open', 'Waiting for client files', 'In production'].map(s => <option key={s}>{s}</option>)}</select>{' '}
                      <button className="btn sm" onClick={() => { const url = prompt('Paste the live link as proof (optional)') ?? undefined; setDeliverableStatus(dl.id, 'Delivered', url || undefined); say('Delivered') }}>Delivered</button></>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="card wrap">
          <table className="tbl">
            <thead><tr><th>Invoice</th><th>Company</th><th>Deal</th><th className="num">Amount</th><th className="num">Paid</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {db.invoices.map(i => {
                const d = db.deals.find(x => x.id === i.dealId); const c = companyOf(i.dealId)
                const late = i.status !== 'Paid' && i.due < todayIso()
                return <tr key={i.id}><td><b>{i.number}</b><div className="muted small">issued {fmtDate(i.issued)}</div></td><td>{c && <a className="lnk" href={`#/company/${c.id}`}>{c.name}</a>}</td><td className="small">{d?.title}</td><td className="num money">{fmtMoney(i.amount)}</td><td className="num money">{fmtMoney(i.paid)}</td><td className={late ? 'money' : 'muted'} style={late ? { color: 'var(--warn)' } : undefined}>{fmtDate(i.due)}</td><td><span className={`pill plain ${i.status === 'Paid' ? 'good' : late ? 'maple' : 'warn'}`}>{late && i.status !== 'Paid' ? 'Overdue' : i.status}</span></td><td className="act">{i.status !== 'Paid' && <button className="btn sm" onClick={() => { update(x => { const y = x.invoices.find(z => z.id === i.id)!; y.paid = y.amount; y.status = 'Paid' }); say('Marked paid') }}>Mark paid</button>}</td></tr>
              })}
              {db.deals.filter(d => d.stage === 'Won' && !db.invoices.some(i => i.dealId === d.id)).map(d => <tr key={d.id}><td colSpan={7} className="small" style={{ color: 'var(--warn)' }}>Won with no invoice: <b>{d.title}</b> for {db.companies.find(c => c.id === d.companyId)?.name} ({fmtMoney(d.value)})</td><td className="act"><button className="btn sm pri" onClick={() => { update(x => { x.invoices.push({ id: uid('in'), dealId: d.id, number: `INV-${1043 + x.invoices.length}`, amount: d.value, paid: 0, issued: todayIso(), due: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), status: 'Sent' }) }); say('Invoice created. Create the real one in Stripe and keep the numbers matched.') }}>Create invoice</button></td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {editDeal && <DealDrawer companyId={editDeal.companyId} dealId={editDeal.dealId} onClose={() => setEditDeal(null)} onSaved={() => say('Deal saved')} />}
      {pkgDrawer && <PackageDrawer pkg={pkgDrawer === 'new' ? null : pkgDrawer} onClose={() => setPkgDrawer(null)} onSaved={() => say('Rate card updated')} />}
      {pitchDrawer && <PitchDrawer pitch={pitchDrawer === 'new' ? null : pitchDrawer} onClose={() => setPitchDrawer(null)} onSaved={() => say('Saved to library')} />}
      <Toast msg={toast} />
    </>
  )
}

function PackageDrawer({ pkg, onClose, onSaved }: { pkg: Package | null; onClose: () => void; onSaved: () => void }) {
  const db = useDb()
  const [f, setF] = useState<Omit<Package, 'id'>>(pkg ?? { name: '', kind: 'Sponsorship', price: 0, includes: '', eventKey: db.events[0].key })
  const [scope, setScope] = useState<string>(pkg?.eventKey ? pkg.eventKey : pkg?.brand ? `brand:${pkg.brand}` : db.events[0].key)
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const save = () => {
    const eventKey = scope.startsWith('brand:') ? undefined : scope as any
    const brand = scope.startsWith('brand:') ? scope.slice(6) as any : undefined
    update(d => { if (pkg) Object.assign(d.packages.find(p => p.id === pkg.id)!, { ...f, eventKey, brand }); else d.packages.push({ id: uid('pk'), ...f, eventKey, brand }) })
    onSaved(); onClose()
  }
  return (
    <Drawer title={pkg ? 'Edit package' : 'New package'} onClose={onClose} footer={<>{pkg && <button className="btn" onClick={() => { if (confirm('Remove this package from the rate card?')) { update(d => { d.packages = d.packages.filter(p => p.id !== pkg.id) }); onClose() } }}>Remove</button>}<span style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.name.trim()} onClick={save}>Save</button></>}>
      <div className="form">
        <Field label="Name"><input value={f.name} onChange={(e: any) => set('name', e.target.value)} autoFocus /></Field>
        <Field label="For"><select value={scope} onChange={(e: any) => setScope(e.target.value)}>{db.events.map(e => <option key={e.key} value={e.key}>{e.name}</option>)}{db.settings.activeBrands.map(b => <option key={b} value={`brand:${b}`}>{b} (media)</option>)}</select></Field>
        <Field label="Kind"><select value={f.kind} onChange={(e: any) => set('kind', e.target.value)}>{['Sponsorship', 'Exhibitor', 'Media', 'Workshop', 'Award category'].map(k => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Price (CAD)"><input type="number" value={f.price} onChange={(e: any) => set('price', Number(e.target.value))} /></Field>
        <Field label="Includes (comma separated; each becomes a deliverable when Won)"><textarea value={f.includes} onChange={(e: any) => set('includes', e.target.value)} /></Field>
      </div>
    </Drawer>
  )
}

function PitchDrawer({ pitch, onClose, onSaved }: { pitch: PitchTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Omit<PitchTemplate, 'id'>>(pitch ?? { name: '', type: 'Email', audience: '', subject: '', body: '' })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return (
    <Drawer title={pitch ? 'Edit pitch' : 'Add to library'} onClose={onClose} footer={<>{pitch && <button className="btn" onClick={() => { update(d => { d.pitches = d.pitches.filter(p => p.id !== pitch.id) }); onClose() }}>Remove</button>}<span style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.name.trim() || !f.body.trim()} onClick={() => { update(d => { if (pitch) Object.assign(d.pitches.find(p => p.id === pitch.id)!, f); else d.pitches.push({ id: uid('pt'), ...f }) }); onSaved(); onClose() }}>Save</button></>}>
      <div className="form">
        <Field label="Name"><input value={f.name} onChange={(e: any) => set('name', e.target.value)} autoFocus /></Field>
        <div className="form c2">
          <Field label="Type"><select value={f.type} onChange={(e: any) => set('type', e.target.value)}>{['Email', 'Follow-up', 'LinkedIn', 'Call script', 'Objection', 'Renewal'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Who it is for"><input value={f.audience} onChange={(e: any) => set('audience', e.target.value)} /></Field>
        </div>
        <Field label="Subject (emails)"><input value={f.subject ?? ''} onChange={(e: any) => set('subject', e.target.value)} /></Field>
        <Field label="Text. Put anything to replace in [brackets]."><textarea style={{ minHeight: 200 }} value={f.body} onChange={(e: any) => set('body', e.target.value)} /></Field>
      </div>
    </Drawer>
  )
}
