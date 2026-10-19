import { useState } from 'react'
import { Drawer, Field } from './ui'
import { useDb, logActivity, addDays, todayIso } from '../data/store'
import type { Channel, ActivityKind, Id } from '../data/types'

const CHANNELS: Channel[] = ['Email', 'Call', 'LinkedIn', 'WhatsApp', 'Meeting', 'Social']
const KINDS: Array<{ k: ActivityKind; label: string }> = [
  { k: 'Outreach', label: 'I reached out' },
  { k: 'Reply', label: 'They replied' },
  { k: 'Meeting', label: 'We met or spoke' },
  { k: 'Journey touch', label: 'Helpful touch (not a pitch)' },
  { k: 'Proposal', label: 'Sent a proposal' },
  { k: 'Note', label: 'Just a note' },
]

export function LogActivity({ companyId, onClose, onSaved }: { companyId: Id; onClose: () => void; onSaved?: () => void }) {
  const db = useDb()
  const c = db.companies.find(x => x.id === companyId)
  const contacts = db.contacts.filter(x => x.companyId === companyId)
  const [kind, setKind] = useState<ActivityKind>('Outreach')
  const [channel, setChannel] = useState<Channel>('Email')
  const [contactId, setContactId] = useState<string>(contacts[0]?.id ?? '')
  const [summary, setSummary] = useState('')
  const [next, setNext] = useState<string>(addDays(todayIso(), 3))

  // The rule from the old Follow-Up Desk, kept: never two emails in a row.
  const last = db.activities.filter(a => a.companyId === companyId && a.channel).sort((a, b) => b.date.localeCompare(a.date))[0]
  const suggest = last?.channel === 'Email' ? 'LinkedIn' : last?.channel === 'LinkedIn' ? 'Call' : last?.channel === 'Call' ? 'Email' : 'Email'

  const save = () => {
    if (!summary.trim()) return
    logActivity({ companyId, contactId: contactId || undefined, personId: db.settings.currentUserId, kind, channel: kind === 'Note' ? undefined : channel, summary: summary.trim(), nextFollowUp: next || undefined })
    onSaved?.()
    onClose()
  }

  return (
    <Drawer title={`Log with ${c?.name ?? 'company'}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={save} disabled={!summary.trim()}>Save and set next date</button></>}>
      <div className="form">
        <Field label="What happened">
          <select value={kind} onChange={(e: any) => setKind(e.target.value)}>{KINDS.map(k => <option key={k.k} value={k.k}>{k.label}</option>)}</select>
        </Field>
        {kind !== 'Note' && (
          <Field label={`Channel${last?.channel ? ` (last was ${last.channel}; suggested ${suggest})` : ''}`}>
            <select value={channel} onChange={(e: any) => setChannel(e.target.value)}>{CHANNELS.map(ch => <option key={ch}>{ch}</option>)}</select>
          </Field>
        )}
        {contacts.length > 0 && (
          <Field label="With whom">
            <select value={contactId} onChange={(e: any) => setContactId(e.target.value)}><option value="">Not specified</option>{contacts.map(ct => <option key={ct.id} value={ct.id}>{ct.name}{ct.title ? `, ${ct.title}` : ''}</option>)}</select>
          </Field>
        )}
        <Field label="Summary"><textarea value={summary} onChange={(e: any) => setSummary(e.target.value)} placeholder="One or two lines. What did you say, what did they say, what is next." /></Field>
        <Field label="Next follow-up"><input type="date" value={next} onChange={(e: any) => setNext(e.target.value)} /></Field>
        <p className="note">Logging a first contact moves the company to Contacted automatically. A proposal moves it to Pitched. You never edit the stage by hand.</p>
      </div>
    </Drawer>
  )
}
