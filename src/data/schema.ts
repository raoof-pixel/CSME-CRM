// The whole CRM structure in one place: main menu → submenu → page → sections.
// Every list section is described by its columns; the generic engine renders it.

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'datetime' | 'select' | 'url' | 'email' | 'phone' | 'person' | 'company' | 'bool' | 'percent'

export interface Field {
  key: string
  label: string
  type?: FieldType          // default text
  options?: string[]        // for select
  required?: boolean
  wide?: boolean            // takes the full form row
  hideInTable?: boolean
}

export interface Section {
  key: string
  label: string
  group?: string            // heading in the section panel
  kind?: 'list' | 'command' | 'graphs' | 'custom' | 'knowledge' | 'sheets'
  collection?: string       // records live under this name (scoped by unit)
  singular?: string         // "Add <singular>"
  fields?: Field[]
  description?: string
  custom?: string           // key of a custom renderer
}

export interface Page {
  key: string               // route segment
  label: string
  icon?: string
  badge?: string            // 'NEW'
  kind: 'custom' | 'unit' | 'tabs'
  custom?: string           // custom component key
  unit?: UnitKind
  unitName?: string         // display name for unit pages
  brand?: string            // magazine brand name
  sections?: Section[]      // for unit and tabs pages
  description?: string
}

export type UnitKind = 'event' | 'awards' | 'podcast' | 'magazine' | 'marketplace' | 'hub'

export interface Menu {
  key: string
  label: string
  icon: string
  pages: Page[]
  nested?: { label: string; pageKeys: string[] }   // e.g. Magazines group inside Media & Publications
}

// ---------- reusable field sets ----------
const F = {
  company: { key: 'company', label: 'Company', type: 'company' as FieldType, required: true },
  owner: { key: 'owner', label: 'Owner', type: 'person' as FieldType },
  status: (opts: string[]) => ({ key: 'status', label: 'Status', type: 'select' as FieldType, options: opts }),
  notes: { key: 'notes', label: 'Notes', type: 'textarea' as FieldType, wide: true, hideInTable: true },
  money: (key: string, label: string) => ({ key, label, type: 'money' as FieldType }),
  date: (key: string, label: string) => ({ key, label, type: 'date' as FieldType }),
  text: (key: string, label: string, required = false) => ({ key, label, required }),
  select: (key: string, label: string, options: string[]) => ({ key, label, type: 'select' as FieldType, options }),
  person: (key: string, label: string) => ({ key, label, type: 'person' as FieldType }),
  url: (key: string, label: string) => ({ key, label, type: 'url' as FieldType }),
}

const DEAL_STAGES = ['Lead', 'Conversation', 'Qualified', 'Proposal sent', 'Negotiating', 'Verbal yes', 'Won', 'Lost']

// Sections shared by every unit
const pipelineSec = (label = 'Pipeline'): Section => ({ key: 'pipeline', label, group: 'Sales', kind: 'list', collection: 'opportunities', singular: 'opportunity', fields: [
  F.text('name', 'Opportunity name', true), F.company, F.text('product', 'Product or package'), F.money('value', 'Deal value'), F.select('stage', 'Stage', DEAL_STAGES), { key: 'probability', label: 'Probability', type: 'percent' }, F.owner, F.date('nextFollowUp', 'Next follow-up'), F.date('expectedClose', 'Expected close'), F.notes,
] })
const companiesSec: Section = { key: 'companies', label: 'Companies', group: 'Sales', kind: 'custom', custom: 'unit-companies' }
const contactsSec: Section = { key: 'contacts', label: 'Contacts', group: 'Sales', kind: 'custom', custom: 'unit-contacts' }
const companyListSec = (key: string, label: string, group: string, role: string): Section => ({ key, label, group, kind: 'list', collection: 'company-roles', singular: 'company', description: `Companies marked as ${role} for this unit.`, fields: [
  F.company, { key: 'role', label: 'Role', type: 'select', options: [role], hideInTable: true }, F.owner, F.select('status', 'Status', ['Target', 'Contacted', 'In talks', 'Confirmed', 'Declined']), F.money('value', 'Value'), F.notes,
] })
const packagesSec = (label = 'Sponsorship Options'): Section => ({ key: 'packages', label, group: 'Sponsors', kind: 'list', collection: 'packages', singular: 'package', fields: [
  F.text('name', 'Package', true), F.select('kind', 'Kind', ['Sponsorship', 'Exhibitor', 'Media', 'Workshop', 'Award category', 'Other']), F.money('price', 'Price'), { key: 'includes', label: 'Includes', wide: true }, { key: 'available', label: 'Available', type: 'number' },
] })
const invoicesSec: Section = { key: 'invoices', label: 'Invoices', group: 'Finance', kind: 'list', collection: 'invoices', singular: 'invoice', fields: [
  F.text('number', 'Invoice number', true), F.company, F.money('amount', 'Amount'), F.money('paid', 'Amount paid'), F.date('issued', 'Issued date'), F.date('due', 'Due date'), F.select('status', 'Status', ['Draft', 'Sent', 'Partial', 'Paid', 'Overdue']), F.url('file', 'Invoice file or Stripe link'),
] }
const expensesSec: Section = { key: 'expenses', label: 'Expenses', group: 'Finance', kind: 'list', collection: 'expenses', singular: 'expense', fields: [
  F.text('name', 'Expense', true), F.text('vendor', 'Vendor'), F.money('amount', 'Amount (CAD)'), F.select('category', 'Category', ['Venue', 'AV', 'Catering', 'Marketing', 'Printing', 'Travel', 'Staff', 'Software', 'Other']), F.select('status', 'Status', ['Planned', 'Approved', 'Paid']), F.date('date', 'Date'), F.notes,
] }
const filesSec: Section = { key: 'files', label: 'Files', group: 'Files and Notes', kind: 'list', collection: 'files', singular: 'document', fields: [
  F.text('title', 'Title', true), F.select('category', 'Category', ['Contract', 'Floor plan', 'Proposal', 'Invoice', 'Artwork', 'Photo', 'Presentation', 'Other']), F.select('confidentiality', 'Confidentiality', ['Team', 'Managers', 'Founder only']), F.owner, F.url('link', 'File link'),
] }
const sheetsSec: Section = { key: 'sheets', label: 'Sheets', group: 'Files and Notes', kind: 'list', collection: 'sheets', singular: 'linked sheet', fields: [F.text('title', 'Sheet title', true), F.url('link', 'Google Sheet link')] }
const meetingsSec: Section = { key: 'meetings', label: 'Meetings', group: 'Files and Notes', kind: 'list', collection: 'meetings', singular: 'meeting', fields: [
  F.text('title', 'Title', true), F.select('type', 'Meeting type', ['Founder', 'Sales', 'Product', 'Event', 'Podcast', 'Magazine', 'Partnership', 'Funding']), { key: 'when', label: 'Date and time', type: 'datetime' }, F.person('whose', 'Whose meeting'), F.company, F.select('status', 'Status', ['Scheduled', 'Completed', 'Cancelled']), { key: 'discussed', label: 'What was discussed', type: 'textarea', wide: true, hideInTable: true }, { key: 'nextSteps', label: 'Next steps', type: 'textarea', wide: true, hideInTable: true },
] }
const tasksSec = (group = 'Event Prep'): Section => ({ key: 'tasks', label: 'Tasks', group, kind: 'list', collection: 'tasks', singular: 'task', fields: [
  F.text('title', 'Task', true), F.select('category', 'Category', ['Venue', 'Marketing', 'Registrations', 'Program', 'Sponsors', 'Operations', 'On the day', 'Other']), F.owner, F.date('due', 'Due date'), F.select('priority', 'Priority', ['Low', 'Medium', 'High', 'Urgent']), F.select('status', 'Status', ['To do', 'In progress', 'Blocked', 'Waiting for client', 'Done']), F.notes,
] })
const decisionsSec: Section = { key: 'decisions', label: 'Decisions', group: 'Files and Notes', kind: 'list', collection: 'decisions', singular: 'decision / approval', fields: [
  F.text('title', 'Title', true), F.select('type', 'Type', ['Decision', 'Approval']), F.select('status', 'Status', ['Open', 'Approved', 'Rejected', 'Decided']), F.select('priority', 'Priority', ['Low', 'Medium', 'High']), F.owner, F.date('due', 'Due date'), F.notes,
] }
const teamSec = (label: string): Section => ({ key: 'team', label, group: 'Workspace', kind: 'list', collection: 'team', singular: 'team member', fields: [
  F.person('person', 'Person'), F.text('jobTitle', 'Job title'), F.select('role', 'Role', ['Lead', 'Sales', 'Marketing', 'Editorial', 'Design', 'Operations', 'Support']), F.text('department', 'Department'), F.select('workload', 'Workload', ['Light', 'Normal', 'Heavy']), F.select('training', 'Training status', ['Not started', 'In progress', 'Done']),
] })
const campaignsSec = (group = 'Marketing'): Section => ({ key: 'campaigns', label: 'Campaigns', group, kind: 'list', collection: 'campaigns', singular: 'campaign', fields: [
  F.text('name', 'Campaign', true), F.select('channel', 'Channel', ['Email', 'LinkedIn', 'Instagram', 'Facebook', 'X', 'YouTube', 'Newsletter', 'Paid ads', 'Partner']), F.date('start', 'Start'), F.date('end', 'End'), F.owner, F.select('status', 'Status', ['Planned', 'Active', 'Paused', 'Done']), F.money('budget', 'Budget'), F.notes,
] })

// ---------- Events (SMB Show / Summit): 33 sections ----------
export function eventSections(): Section[] {
  return [
    { key: 'command', label: 'Command Centre', kind: 'command' },
    { key: 'graphs', label: 'Graphs', kind: 'graphs' },
    { key: 'management', label: 'Event Management', kind: 'custom', custom: 'event-management' },
    { key: 'mastersheet', label: 'MasterSheet', kind: 'list', collection: 'mastersheet', singular: 'row', fields: [F.text('item', 'Item', true), F.text('area', 'Area'), F.owner, F.date('due', 'Due'), F.select('status', 'Status', ['Open', 'In progress', 'Done']), F.notes] },
    { key: 'faq', label: 'FAQ', kind: 'list', collection: 'faq', singular: 'question', fields: [F.text('question', 'Question', true), { key: 'answer', label: 'Answer', type: 'textarea', wide: true }, F.select('audience', 'For', ['Attendees', 'Sponsors', 'Exhibitors', 'Speakers', 'Team'])] },
    pipelineSec('Pipeline'), companiesSec, contactsSec,
    companyListSec('target-sponsors', 'Target Sponsors', 'Sponsors', 'Target sponsor'), companyListSec('confirmed-sponsors', 'Confirmed Sponsors', 'Sponsors', 'Confirmed sponsor'), packagesSec(),
    { key: 'deliverables', label: 'Deliverables', group: 'Sponsors', kind: 'list', collection: 'sponsor-deliverables', singular: 'sponsor delivery', fields: [F.company, F.select('type', 'Type', ['Sponsor', 'Exhibitor', 'Partner']), F.text('package', 'Package'), F.money('value', 'Deal value'), F.money('collected', 'Amount collected'), F.select('payment', 'Payment status', ['Not invoiced', 'Invoiced', 'Partial', 'Paid']), F.select('contract', 'Contract', ['Not sent', 'Sent', 'Signed']), F.select('logo', 'Logo', ['Missing', 'Received', 'On website']), F.text('booth', 'Booth'), { key: 'passes', label: 'Passes', type: 'number' }] },
    companyListSec('target-exhibitors', 'Target Exhibitors', 'Exhibitors', 'Target exhibitor'), companyListSec('confirmed-exhibitors', 'Confirmed Exhibitors', 'Exhibitors', 'Confirmed exhibitor'),
    { key: 'workshops', label: 'Workshops', group: 'Workshops and Demos', kind: 'list', collection: 'workshops', singular: 'workshop', fields: [F.text('title', 'Workshop', true), F.select('status', 'Status', ['Open slot', 'Pitched', 'Sold', 'Confirmed', 'Delivered']), F.company, F.text('topic', 'Topic'), F.text('presenter', 'Presenter'), F.person('soldBy', 'Who sold it'), { key: 'when', label: 'Date', type: 'datetime' }, F.money('price', 'Price'), { key: 'paid', label: 'Paid', type: 'bool' }] },
    { key: 'demos', label: 'Demos', group: 'Workshops and Demos', kind: 'list', collection: 'demos', singular: 'demo', fields: [F.text('title', 'Demo', true), F.select('status', 'Status', ['Open slot', 'Pitched', 'Sold', 'Confirmed', 'Delivered']), F.company, F.text('topic', 'Topic'), F.text('presenter', 'Presenter'), F.person('soldBy', 'Who sold it'), { key: 'when', label: 'Date', type: 'datetime' }, F.money('price', 'Price'), { key: 'paid', label: 'Paid', type: 'bool' }] },
    { key: 'speakers', label: 'Speakers', group: 'Program', kind: 'list', collection: 'speakers', singular: 'speaker', fields: [F.text('name', 'Name', true), F.company, F.text('topic', 'Topic'), F.text('slot', 'Slot'), F.select('status', 'Status', ['Invited', 'Accepted', 'Confirmed', 'Declined']), F.notes] },
    { key: 'agenda', label: 'Agenda', group: 'Program', kind: 'list', collection: 'agenda', singular: 'session', fields: [F.text('title', 'Session title', true), F.select('type', 'Session type', ['Keynote', 'Panel', 'Workshop', 'Demo', 'Fireside', 'Networking', 'Break']), F.text('speaker', 'Speaker'), { key: 'start', label: 'Start time', type: 'datetime' }, F.text('room', 'Room / stage')] },
    tasksSec('Event Prep'),
    { key: 'timeline', label: 'Timeline', group: 'Event Prep', kind: 'list', collection: 'timeline', singular: 'milestone', fields: [F.text('milestone', 'Milestone', true), F.date('date', 'Date'), F.owner, F.select('status', 'Status', ['Upcoming', 'On track', 'At risk', 'Done'])] },
    { key: 'registrations', label: 'Registrations', group: 'Event Prep', kind: 'list', collection: 'registrations', singular: 'registration', fields: [F.text('name', 'Attendee name', true), F.text('companyName', 'Company'), { key: 'email', label: 'Email', type: 'email' }, F.select('ticket', 'Ticket type', ['General', 'VIP', 'Sponsor', 'Exhibitor', 'Speaker', 'Press', 'Comp']), F.text('city', 'City'), F.select('status', 'Status', ['Registered', 'Checked in', 'Cancelled']), F.date('registered', 'Registered date')] },
    { key: 'vendors', label: 'Vendors', group: 'Event Prep', kind: 'list', collection: 'vendors', singular: 'vendor', fields: [F.text('name', 'Vendor name', true), F.text('service', 'Service'), F.text('contact', 'Contact name'), { key: 'email', label: 'Email', type: 'email' }, F.select('contract', 'Contract', ['Quote', 'Signed', 'Paid']), F.money('cost', 'Agreed cost'), F.owner] },
    companyListSec('partners', 'Partners', 'Event Prep', 'Partner'),
    { key: 'risks', label: 'Risks', group: 'Event Prep', kind: 'list', collection: 'risks', singular: 'risk', fields: [F.text('risk', 'Risk', true), F.select('severity', 'Severity', ['Low', 'Medium', 'High', 'Critical']), F.select('likelihood', 'Likelihood', ['Low', 'Medium', 'High']), F.owner, F.select('status', 'Status', ['Open', 'Mitigating', 'Closed']), { key: 'mitigation', label: 'Mitigation', type: 'textarea', wide: true, hideInTable: true }] },
    invoicesSec, expensesSec, filesSec, sheetsSec, meetingsSec, decisionsSec,
    { key: 'website-feedback', label: 'Website Feedback', group: 'Files and Notes', kind: 'list', collection: 'website-feedback', singular: 'website feedback', fields: [F.text('page', 'Page', true), { key: 'feedback', label: 'Feedback', type: 'textarea', wide: true }, F.select('priority', 'Priority', ['Low', 'Medium', 'High']), F.person('assignee', 'Assigned to'), F.date('deadline', 'Deadline'), F.select('status', 'Status', ['Open', 'In progress', 'Done'])] },
    teamSec('Event Team'),
    { key: 'settings', label: 'Event Settings', group: 'Workspace', kind: 'custom', custom: 'event-settings' },
  ]
}

// ---------- Awards: 19 sections ----------
export function awardsSections(): Section[] {
  return [
    { key: 'command', label: 'Command Centre', kind: 'command' },
    pipelineSec('Pipeline'), companiesSec, contactsSec,
    companyListSec('target-sponsors', 'Target Sponsors', 'Sponsors', 'Target sponsor'), companyListSec('confirmed-sponsors', 'Confirmed Sponsors', 'Sponsors', 'Confirmed sponsor'), packagesSec(),
    { key: 'categories', label: 'Categories', group: 'Awards', kind: 'list', collection: 'categories', singular: 'award category', fields: [F.text('name', 'Category name', true), F.text('sponsor', 'Category sponsor'), { key: 'judges', label: 'Judges assigned', type: 'number' }, F.select('status', 'Status', ['Open', 'Closed', 'Judging', 'Winner chosen'])] },
    { key: 'nominations', label: 'Nominations', group: 'Awards', kind: 'list', collection: 'nominations', singular: 'nomination', fields: [F.text('nominee', 'Nominee name', true), F.text('business', 'Business name'), F.text('category', 'Category'), { key: 'email', label: 'Email', type: 'email' }, F.select('status', 'Status', ['Submitted', 'Reviewing', 'Finalist', 'Winner', 'Not selected']), F.date('submitted', 'Submitted date'), F.owner] },
    { key: 'judges', label: 'Judges', group: 'Awards', kind: 'list', collection: 'judges', singular: 'judge', fields: [F.text('name', 'Name', true), F.text('companyName', 'Company'), F.text('jobTitle', 'Job title'), { key: 'email', label: 'Email', type: 'email' }, F.text('categories', 'Categories judging'), F.select('status', 'Status', ['Invited', 'Confirmed', 'Declined'])] },
    campaignsSec('Marketing'), companyListSec('partners', 'Partners', 'Marketing', 'Partner'),
    { ...invoicesSec, group: 'Operations' }, { ...filesSec, group: 'Operations' }, { ...sheetsSec, group: 'Operations' }, tasksSec('Operations'), { ...meetingsSec, group: 'Operations' },
    teamSec('Awards Team'),
    { key: 'settings', label: 'Awards Settings', group: 'Workspace', kind: 'custom', custom: 'event-settings' },
  ]
}

// ---------- SMB Podcast: 19 sections ----------
export function podcastSections(): Section[] {
  return [
    { key: 'command', label: 'Command Centre', kind: 'command' },
    pipelineSec('Pipeline'), companiesSec, contactsSec,
    companyListSec('sponsors', 'Sponsors', 'Sponsors', 'Podcast sponsor'), packagesSec('Sponsorship Options'),
    companyListSec('target-guests', 'Target Guests', 'Guests', 'Target guest'),
    { key: 'guest-pipeline', label: 'Guest Pipeline', group: 'Guests', kind: 'list', collection: 'guests', singular: 'guest', fields: [F.text('guest', 'Guest', true), F.company, F.select('priority', 'Priority', ['A', 'B', 'C']), F.select('outreach', 'Outreach status', ['New', 'Invited', 'Replied', 'Booked', 'Recorded', 'Declined']), F.person('outreachOwner', 'Outreach owner'), { key: 'recordingDate', label: 'Recording date', type: 'datetime' }, { key: 'strategic', label: 'Strategic value (0-100)', type: 'number' }, F.notes] },
    { key: 'recording', label: 'Recording Schedule', group: 'Guests', kind: 'custom', custom: 'podcast-recording' },
    { key: 'episodes', label: 'Episodes', group: 'Episodes', kind: 'list', collection: 'episodes', singular: 'episode', fields: [{ key: 'number', label: 'Episode no.', type: 'number' }, F.text('title', 'Episode title', true), F.text('guest', 'Guest'), F.date('recorded', 'Recording date'), F.date('published', 'Publish date'), F.select('status', 'Status', ['Not recorded yet', 'Needs editing', 'Editing', 'Sent to client', 'Changes requested', 'Approved', 'Published']), { key: 'views', label: 'Views', type: 'number' }, { key: 'listens', label: 'Listens', type: 'number' }, F.url('link', 'Link')] },
    { ...campaignsSec('Episodes'), key: 'promotion', label: 'Promotion', singular: 'promotion' },
    companyListSec('partners', 'Partners', 'Episodes', 'Partner'),
    { ...invoicesSec, group: 'Operations' }, { ...filesSec, group: 'Operations' }, { ...sheetsSec, group: 'Operations' }, tasksSec('Operations'), { ...meetingsSec, group: 'Operations' },
    teamSec('Podcast Team'),
    { key: 'settings', label: 'Podcast Settings', group: 'Workspace', kind: 'custom', custom: 'event-settings' },
  ]
}

// ---------- Magazines: 25 sections ----------
export function magazineSections(): Section[] {
  const content = (key: string, label: string, type: string): Section => ({ key, label, group: 'Editorial', kind: 'list', collection: 'content-items', singular: 'content item', description: `${label} for this magazine.`, fields: [F.text('title', 'Title', true), F.company, F.person('writer', 'Writer'), { key: 'contentType', label: 'Content type', type: 'select', options: [type], hideInTable: true }, F.select('kind', 'Editorial / sponsored', ['Editorial', 'Sponsored']), F.select('status', 'Status', ['Idea', 'Invited', 'Questions sent', 'Drafting', 'Editing', 'Sent to client', 'Approved', 'Published']), F.date('deadline', 'Deadline'), F.text('issue', 'Issue'), F.url('link', 'Link'), F.notes] })
  return [
    { key: 'command', label: 'Command Centre', kind: 'command' },
    { key: 'graphs', label: 'Graphs', kind: 'graphs' },
    pipelineSec('Pipeline'), companiesSec, contactsSec,
    companyListSec('advertisers', 'Advertisers', 'Advertisers', 'Advertiser'),
    { key: 'ad-deals', label: 'Advertising Deals', group: 'Advertisers', kind: 'list', collection: 'ad-deals', singular: 'advertising deal', fields: [F.company, F.text('package', 'Package'), F.money('value', 'Deal value'), F.owner, F.select('stage', 'Sales stage', DEAL_STAGES), F.text('issue', 'Issue'), F.notes] },
    { ...packagesSec('Ad Options'), key: 'ad-options', group: 'Advertisers', description: 'Advertising options and rates for this magazine.' },
    { key: 'sponsored', label: 'Sponsored Content', group: 'Advertisers', kind: 'list', collection: 'sponsored', singular: 'sponsored content', fields: [F.text('title', 'Sponsored content item', true), F.company, F.text('deliverables', 'Deliverables'), F.select('stage', 'Production stage', ['Brief', 'Waiting for client files', 'Drafting', 'Design', 'Sent to client', 'Approved', 'Published']), F.date('due', 'Due'), F.url('link', 'Link')] },
    { key: 'edcal', label: 'Editorial Calendar', group: 'Editorial', kind: 'list', collection: 'issues', singular: 'issue', fields: [F.text('month', 'Month', true), F.text('issue', 'Issue'), F.text('theme', 'Theme'), F.text('cover', 'Cover story'), F.date('deadline', 'Deadline'), F.date('published', 'Publication date'), F.select('status', 'Status', ['Planned', 'In progress', 'Sent for review', 'Approved', 'Published']), F.url('drive', 'Drive link')] },
    content('articles', 'Articles', 'Article'), content('interviews', 'Interviews', 'Interview'), content('emails', 'Emails', 'Email interview'),
    campaignsSec('Marketing'), companyListSec('pr-companies', 'PR Companies', 'Marketing', 'PR company'), companyListSec('partners', 'Partners', 'Marketing', 'Partner'),
    { ...invoicesSec, group: 'Operations' }, { ...filesSec, group: 'Operations' }, { ...sheetsSec, group: 'Operations' }, tasksSec('Operations'), { ...meetingsSec, group: 'Operations' },
    teamSec('Magazine Team'),
    { key: 'knowledge', label: 'Knowledge Centre', group: 'Workspace', kind: 'list', collection: 'tips', singular: 'tip', fields: [F.text('section', 'Section', true), { key: 'tip', label: 'Tip', type: 'textarea', wide: true }, F.person('by', 'Written by')] },
    { key: 'audience', label: 'Audience and Links', group: 'Workspace', kind: 'list', collection: 'audience', singular: 'audience update', fields: [F.date('asOf', 'As of'), { key: 'newsletter', label: 'Newsletter subscribers', type: 'number' }, { key: 'magazine', label: 'Magazine subscribers', type: 'number' }, { key: 'web', label: 'Website visitors a month', type: 'number' }, { key: 'linkedin', label: 'LinkedIn followers', type: 'number' }, { key: 'instagram', label: 'Instagram followers', type: 'number' }, { key: 'facebook', label: 'Facebook followers', type: 'number' }, { key: 'x', label: 'X followers', type: 'number' }, { key: 'youtube', label: 'YouTube subscribers', type: 'number' }] },
    { key: 'settings', label: 'Magazine Settings', group: 'Workspace', kind: 'custom', custom: 'event-settings' },
  ]
}

// ---------- B2Bmarket.ca: 22 sections ----------
export function marketplaceSections(): Section[] {
  return [
    { key: 'command', label: 'Command Centre', kind: 'command' },
    pipelineSec('Pipeline'), companiesSec, contactsSec,
    { key: 'vendors', label: 'Vendors', group: 'Marketplace', kind: 'list', collection: 'mp-vendors', singular: 'vendor', fields: [F.text('name', 'Vendor / seller name', true), F.text('category', 'Category (what they sell)'), F.select('plan', 'Plan', ['Free', 'Basic', 'Pro', 'Enterprise']), F.select('listing', 'Listing status', ['Draft', 'Onboarding', 'Live', 'Paused']), F.money('fee', 'Monthly fee'), F.owner, F.date('renewal', 'Renewal due')] },
    { key: 'onboarding', label: 'Onboarding', group: 'Marketplace', kind: 'list', collection: 'mp-onboarding', singular: 'onboarding step', fields: [F.text('vendor', 'Vendor', true), F.text('step', 'Step'), F.owner, F.select('status', 'Status', ['To do', 'Waiting on vendor', 'Done']), F.text('blocker', 'Blocker')] },
    { key: 'renewals', label: 'Renewals', group: 'Marketplace', kind: 'list', collection: 'mp-renewals', singular: 'renewal', fields: [F.text('vendor', 'Vendor', true), F.date('due', 'Renewal due'), F.money('fee', 'Monthly fee'), F.owner, F.select('status', 'Status', ['Upcoming', 'Contacted', 'Renewed', 'Churned'])] },
    { key: 'buyer-leads', label: 'Buyer Leads', group: 'Marketplace', kind: 'list', collection: 'mp-buyer-leads', singular: 'buyer lead', fields: [F.text('buyer', 'Buyer company', true), F.text('need', 'What they are looking for'), F.text('matched', 'Matched vendor'), F.select('status', 'Status', ['New', 'Matched', 'Introduced', 'Closed won', 'Closed lost']), F.money('value', 'Estimated deal value'), F.person('handledBy', 'Handled by'), F.date('nextFollowUp', 'Next follow-up')] },
    { key: 'roadmap', label: 'Roadmap', group: 'Product', kind: 'list', collection: 'mp-roadmap', singular: 'feature', fields: [F.text('feature', 'Feature', true), F.select('type', 'Type', ['Feature', 'Fix', 'Integration', 'Content']), F.select('phase', 'Phase', ['Now', 'Next', 'Later', 'Shipped']), F.owner, F.date('target', 'Target date')] },
    { key: 'vendor-requests', label: 'Vendor Requests', group: 'Product', kind: 'list', collection: 'mp-requests', singular: 'vendor request', fields: [F.text('request', 'What they asked for', true), F.text('vendor', 'Vendor who asked'), F.select('type', 'Type', ['Feature', 'Bug', 'Pricing', 'Support']), F.select('urgency', 'Urgency', ['Low', 'Medium', 'High']), F.select('status', 'Status', ['Open', 'Planned', 'Shipped', 'Declined']), F.text('linked', 'Linked roadmap feature'), F.date('asked', 'Asked on')] },
    campaignsSec('Marketing'), companyListSec('target-partners', 'Target Partners', 'Marketing', 'Target partner'), companyListSec('confirmed-partners', 'Confirmed Partners', 'Marketing', 'Confirmed partner'),
    { ...invoicesSec, group: 'Operations' }, { ...filesSec, group: 'Operations' }, { ...sheetsSec, group: 'Operations' }, tasksSec('Operations'), { ...meetingsSec, group: 'Operations' },
    teamSec('Marketplace Team'),
    { key: 'numbers', label: 'Numbers', group: 'Workspace', kind: 'list', collection: 'mp-numbers', singular: 'month', fields: [F.text('month', 'Month', true), { key: 'live', label: 'Vendors went live', type: 'number' }, { key: 'won', label: 'Deals won', type: 'number' }, F.money('value', 'Value of deals won'), F.money('mrr', 'Monthly revenue')] },
    { key: 'priorities', label: 'Priorities', group: 'Workspace', kind: 'list', collection: 'mp-priorities', singular: 'priority', fields: [F.text('priority', 'Priority', true), F.owner, F.select('level', 'Priority level', ['Low', 'Medium', 'High']), F.date('deadline', 'Deadline'), { key: 'progress', label: 'Progress', type: 'percent' }, F.text('status', 'Current status'), F.text('next', 'Next action')] },
    { ...decisionsSec, key: 'decisions-notes', label: 'Decisions and Notes', group: 'Workspace', singular: 'founder decision' },
  ]
}

// ---------- CSME Hub: 12 sections ----------
export function hubSections(): Section[] {
  return [
    { key: 'strategy', label: 'Company Strategy', kind: 'list', collection: 'hub-strategy', singular: 'strategy', fields: [F.text('strategy', 'Strategy', true), F.select('pillar', 'Pillar', ['Revenue', 'Audience', 'Events', 'Product', 'Team', 'AI']), F.owner, F.text('timeline', 'Timeline'), F.select('status', 'Status', ['Planned', 'In progress', 'Done', 'Paused']), { key: 'progress', label: 'Progress', type: 'percent' }] },
    { key: 'roadmap', label: '30/60/90 Day Roadmap', kind: 'list', collection: 'hub-roadmap', singular: 'milestone', fields: [F.text('milestone', 'Milestone', true), F.select('phase', 'Phase', ['30 days', '60 days', '90 days']), F.text('category', 'Category'), F.text('unit', 'Business unit'), F.owner, F.date('deadline', 'Deadline'), F.select('status', 'Status', ['Not started', 'In progress', 'Done'])] },
    { key: 'partnerships', label: 'Partnerships', kind: 'list', collection: 'hub-partnerships', singular: 'partnership', fields: [F.text('partner', 'Partner', true), F.select('type', 'Type', ['Media', 'Association', 'Government', 'Corporate', 'Technology']), F.select('stage', 'Stage', ['Idea', 'Talking', 'Proposal', 'Signed', 'Active', 'Ended']), F.money('value', 'Value'), F.owner, F.notes] },
    { key: 'funding', label: 'Funding Opportunities', kind: 'list', collection: 'hub-funding', singular: 'funding opportunity', fields: [F.text('opportunity', 'Opportunity', true), F.text('source', 'Source'), F.money('amount', 'Amount'), F.select('stage', 'Stage', ['Researching', 'Applying', 'Submitted', 'Approved', 'Declined']), F.owner, F.date('deadline', 'Deadline')] },
    { key: 'strategic-sales', label: 'Strategic Sales', kind: 'list', collection: 'hub-strategic-sales', singular: 'strategic deal', fields: [F.company, F.text('deal', 'Deal', true), F.money('value', 'Value'), F.select('stage', 'Stage', DEAL_STAGES), F.owner, F.date('close', 'Close date')] },
    { key: 'responsibilities', label: 'Founder Responsibilities', kind: 'list', collection: 'hub-responsibilities', singular: 'responsibility', fields: [F.text('responsibility', 'Responsibility', true), F.person('founder', 'Founder'), F.select('priority', 'Priority', ['Low', 'Medium', 'High']), F.date('due', 'Due date'), F.select('status', 'Status', ['Open', 'In progress', 'Done'])] },
    { key: 'hiring', label: 'Hiring', kind: 'list', collection: 'hub-hiring', singular: 'open role', fields: [F.text('role', 'Role', true), F.text('department', 'Department'), F.select('type', 'Type', ['Full-time', 'Part-time', 'Contract', 'Intern']), F.select('stage', 'Stage', ['Planned', 'Posted', 'Interviewing', 'Offer', 'Hired', 'Closed']), F.owner, F.date('target', 'Target date')] },
    { key: 'finance', label: 'Finance', kind: 'list', collection: 'hub-finance', singular: 'finance line', fields: [F.text('item', 'Line item', true), F.text('category', 'Category'), F.select('type', 'Type', ['Revenue', 'Cost']), F.money('amount', 'Amount'), F.text('period', 'Period')] },
    { key: 'strategic-meetings', label: 'Strategic Meetings', kind: 'list', collection: 'hub-meetings', singular: 'strategic meeting', fields: [F.text('title', 'Title', true), { key: 'when', label: 'Date and time', type: 'datetime' }, F.text('topic', 'Topic'), F.text('attendees', 'Attendees'), F.select('status', 'Status', ['Scheduled', 'Completed', 'Cancelled']), F.notes] },
    { key: 'kpis', label: 'Company KPIs', kind: 'list', collection: 'hub-kpis', singular: 'KPI', fields: [F.text('kpi', 'KPI', true), F.text('category', 'Category'), { key: 'current', label: 'Current', type: 'number' }, { key: 'target', label: 'Target', type: 'number' }, F.select('status', 'Status', ['On track', 'At risk', 'Behind'])] },
    { key: 'contracts', label: 'Contracts', kind: 'list', collection: 'hub-contracts', singular: 'contract', fields: [F.text('title', 'Title', true), F.text('counterparty', 'Counterparty'), F.select('type', 'Type', ['Client', 'Vendor', 'Partner', 'Employment', 'Venue']), F.money('value', 'Value'), F.select('status', 'Status', ['Draft', 'Sent', 'Signed', 'Expired']), F.url('link', 'File link')] },
    { key: 'sheets', label: 'Google Sheets', kind: 'list', collection: 'sheets', singular: 'linked sheet', fields: [F.text('title', 'Sheet title', true), F.url('link', 'Google Sheet link')] },
  ]
}

// ---------- Operations Dashboard tabs (list-driven) ----------
export const OPS_TABS: Section[] = [
  { key: 'dashboard', label: 'Dashboard', kind: 'custom', custom: 'ops-dashboard' },
  { key: 'today', label: "Today's Tasks", kind: 'custom', custom: 'ops-today' },
  { key: 'team-tasks', label: 'Team Tasks', kind: 'custom', custom: 'team-tasks' },
  { key: 'magazines', label: 'Magazines', kind: 'custom', custom: 'ops-magazines' },
  { key: 'podcasts', label: 'Podcasts', kind: 'custom', custom: 'ops-podcasts' },
  { key: 'social', label: 'Social Media', kind: 'list', collection: 'social-posts', singular: 'social post', fields: [F.text('post', 'Post', true), F.select('platform', 'Platform', ['LinkedIn', 'Instagram', 'Facebook', 'X', 'YouTube', 'TikTok']), F.text('brand', 'Brand'), F.person('maker', 'Who makes it'), F.date('due', 'Due'), F.select('status', 'Status', ['Idea', 'Drafting', 'Ready', 'Scheduled', 'Posted']), F.select('approval', 'Approval', ['Not needed', 'Pending', 'Approved', 'Changes requested']), F.url('link', 'Link')] },
  { key: 'sales-support', label: 'Sales Support', kind: 'list', collection: 'sales-support', singular: 'sales support request', fields: [F.text('need', 'What sales needs', true), F.select('type', 'Type', ['Proposal', 'Deck', 'Artwork', 'Numbers', 'Case study', 'Other']), F.person('requestedBy', 'Requested by'), F.company, F.date('neededBy', 'Needed by'), F.select('status', 'Status', ['New', 'In progress', 'Done'])] },
  { key: 'training', label: 'Training', kind: 'list', collection: 'training-sessions', singular: 'training session', fields: [F.person('employee', 'Employee'), F.text('topic', 'Training topic', true), F.select('category', 'Category', ['CRM', 'Sales', 'AI', 'Product', 'Tools']), F.text('trainer', 'Trainer'), F.date('date', 'Date'), F.select('status', 'Status', ['Scheduled', 'Done', 'Missed']), { key: 'score', label: 'Score (0-100)', type: 'number' }] },
  { key: 'escalations', label: 'Escalations', kind: 'list', collection: 'escalations', singular: 'escalation', fields: [F.text('problem', 'What is the problem', true), F.select('label', 'Label', ['Client', 'Deadline', 'Payment', 'Team', 'Tech', 'Other']), F.person('actor', 'Who needs to act'), F.person('raisedBy', 'Raised by'), F.date('raisedOn', 'Raised on'), F.select('status', 'Status', ['Open', 'In progress', 'Resolved'])] },
  { key: 'weekly-report', label: 'Weekly Report', kind: 'custom', custom: 'weekly-report' },
]

// ---------- The menu ----------
export const MAGAZINES: Array<{ key: string; short: string; brand: string }> = [
  { key: 'magazine', short: 'CS', brand: 'CanadianSME' },
  { key: 'pub-she-success', short: 'SS', brand: 'She and Success' },
  { key: 'pub-black-business', short: 'BB', brand: 'Black Business Magazine' },
  { key: 'pub-b2b-market-insights', short: 'BM', brand: 'B2B Market Insights' },
  { key: 'pub-enable-canada', short: 'EC', brand: 'Enable Canada' },
  { key: 'pub-startup-growth', short: 'SG', brand: 'Startup Growth' },
  { key: 'pub-american-smb', short: 'AS', brand: 'American SMB' },
  { key: 'pub-european-smb', short: 'ES', brand: 'European SMB' },
  { key: 'pub-indigenous-smb', short: 'IS', brand: 'Indigenous SME' },
  { key: 'pub-she-founded-usa', short: 'SF', brand: 'She Founded USA' },
  { key: 'pub-she-founded-eu', short: 'SF', brand: 'She Founded EU' },
  { key: 'pub-smb-ai-magazine', short: 'SA', brand: 'SMB AI Magazine' },
]

export const MENUS: Menu[] = [
  { key: 'today', label: 'Today', icon: 'today', pages: [
    { key: 'home', label: 'Home', kind: 'custom', custom: 'home' },
    { key: 'founder-cc', label: 'Founder Command Centre', kind: 'custom', custom: 'founder' },
    { key: 'fu-desk', label: 'Follow-Up Desk', kind: 'custom', custom: 'fu-desk' },
    { key: 'leads', label: 'Leads', kind: 'custom', custom: 'leads' },
    { key: 'chat', label: 'Messages', kind: 'custom', custom: 'messages' },
    { key: 'approvals', label: 'Approvals', kind: 'custom', custom: 'approvals' },
    { key: 'prop-req', label: 'Proposal Requests', kind: 'custom', custom: 'proposal-requests' },
    { key: 'tasks', label: 'IMP Tasks', kind: 'custom', custom: 'imp-tasks' },
  ] },
  { key: 'events', label: 'Events', icon: 'events', pages: [
    { key: 'tour', label: 'SMB Show 2027', kind: 'unit', unit: 'event', unitName: 'SMB Show 2027', sections: eventSections() },
    { key: 'summit', label: 'SMB Summit 2027', kind: 'unit', unit: 'event', unitName: 'SMB Summit 2027', sections: eventSections() },
    { key: 'awards', label: 'SMB Awards 2026', kind: 'unit', unit: 'awards', unitName: 'SMB Awards 2026', sections: awardsSections() },
  ] },
  { key: 'ai', label: 'AI', icon: 'spark', pages: [
    { key: 'assistant', label: 'AI Assistant', kind: 'custom', custom: 'ai-assistant' },
    { key: 'ai-tools', label: 'AI Toolkit', kind: 'custom', custom: 'ai-toolkit' },
    { key: 'autopilot', label: 'AI Autopilot', kind: 'custom', custom: 'autopilot' },
    { key: 'ai-hub', label: 'AI Hub', kind: 'tabs', sections: [
      { key: 'adoption', label: 'Adoption', kind: 'list', collection: 'ai-wins', singular: 'AI win', fields: [F.text('what', 'What you used AI for', true), F.person('who', 'Who'), F.text('tool', 'Tool'), F.text('department', 'Department'), F.date('date', 'Date'), { key: 'minutes', label: 'Minutes saved', type: 'number' }, { key: 'share', label: 'Worth sharing with the team', type: 'bool' }] },
      { key: 'playbook', label: 'Playbook', kind: 'list', collection: 'ai-playbook', singular: 'playbook entry', fields: [F.text('title', 'Title', true), F.text('department', 'Department'), F.person('by', 'Written by'), F.select('status', 'Status', ['Draft', 'Published']), { key: 'prompt', label: 'Prompt or steps', type: 'textarea', wide: true, hideInTable: true }] },
      { key: 'training', label: 'Training', kind: 'list', collection: 'training-modules', singular: 'training module', fields: [F.text('title', 'Title', true), F.select('category', 'Category', ['AI', 'CRM', 'Sales', 'Editorial', 'Design']), F.person('assignee', 'Assignee'), F.select('status', 'Status', ['Assigned', 'In progress', 'Done']), F.date('assigned', 'Assigned date')] },
    ] },
    { key: 'ai-summaries', label: 'AI Executive Summaries', kind: 'custom', custom: 'ai-summaries' },
  ] },
  { key: 'team', label: 'Team & Targets', icon: 'team', pages: [
    { key: 'eod', label: 'End-of-Day Reports', kind: 'custom', custom: 'eod' },
    { key: 'ops', label: 'Operations Dashboard', kind: 'tabs', sections: OPS_TABS },
    { key: 'lead-watch', label: 'Team Leads Watch', kind: 'custom', custom: 'lead-watch' },
    { key: 'news-alerts', label: 'News & Funding Alerts', kind: 'custom', custom: 'news-alerts' },
    { key: 'target-dash', label: 'Target Dashboard', kind: 'custom', custom: 'target-dash' },
    { key: 'wins', label: 'Wins Board', kind: 'custom', custom: 'wins' },
    { key: 'edcal', label: 'Editorial Calendar', kind: 'custom', custom: 'edcal' },
  ] },
  { key: 'media', label: 'Media & Publications', icon: 'content', nested: { label: 'Magazines', pageKeys: MAGAZINES.map(m => m.key) }, pages: [
    { key: 'linkedin-podcast', label: 'Podcast', badge: 'NEW', kind: 'custom', custom: 'podcast-leads' },
    { key: 'publications', label: 'Publications', kind: 'custom', custom: 'publications' },
    { key: 'hub', label: 'CSME Hub', kind: 'unit', unit: 'hub', unitName: 'CSME Hub Corporate Command Centre', sections: hubSections() },
    { key: 'podcast', label: 'SMB Podcast', kind: 'unit', unit: 'podcast', unitName: 'SMB Podcast', sections: podcastSections() },
    ...MAGAZINES.map(m => ({ key: m.key, label: m.brand, kind: 'unit' as const, unit: 'magazine' as UnitKind, unitName: m.brand, brand: m.brand, sections: magazineSections() })),
    { key: 'b2bmarket', label: 'B2Bmarket.ca', kind: 'unit', unit: 'marketplace', unitName: 'B2Bmarket.ca', sections: marketplaceSections() },
  ] },
  { key: 'sales', label: 'Sales & CRM', icon: 'pipeline', pages: [
    { key: 'relations', label: 'Client Relationships', kind: 'custom', custom: 'client-relationships' },
    { key: 'cleanup', label: 'Data Clean-up', kind: 'custom', custom: 'data-cleanup' },
    { key: 'sales-team', label: 'Sales Team', kind: 'custom', custom: 'sales-team' },
    { key: 'media-sales', label: 'Media Sales', kind: 'custom', custom: 'media-sales' },
    { key: 'sales-home', label: 'Sales', kind: 'custom', custom: 'sales-home' },
    { key: 'follow-up', label: 'Follow-Ups', kind: 'custom', custom: 'follow-ups' },
    { key: 'targets', label: 'Sales Targets', kind: 'custom', custom: 'sales-targets' },
    { key: 'my-week', label: 'Weekly Recap', kind: 'custom', custom: 'weekly-recap' },
    { key: 'research', label: 'Prospect Research', kind: 'custom', custom: 'research' },
    { key: 'pitches', label: 'Pitch Library', kind: 'custom', custom: 'pitch-library' },
    { key: 'companies', label: 'Companies', kind: 'custom', custom: 'companies' },
    { key: 'contacts', label: 'Contacts', kind: 'custom', custom: 'contacts' },
    { key: 'proposals', label: 'Proposals', kind: 'custom', custom: 'proposals' },
    { key: 'ratecard', label: 'Rate Card', kind: 'custom', custom: 'ratecard' },
  ] },
  { key: 'operations', label: 'Operations', icon: 'sell', pages: [
    { key: 'automations', label: 'Automations', kind: 'custom', custom: 'automations' },
    { key: 'meeting-log', label: 'Meeting Notes', kind: 'custom', custom: 'meeting-notes' },
    { key: 'deliverables', label: 'Client Deliverables', kind: 'custom', custom: 'deliverables' },
    { key: 'assets', label: 'Client Assets', kind: 'tabs', sections: [{ key: 'requests', label: 'Asset requests', kind: 'list', collection: 'asset-requests', singular: 'asset request', fields: [F.company, F.text('bought', 'What they bought'), F.text('unit', 'Publication or event'), F.text('contact', 'Client contact'), { key: 'email', label: 'Client email', type: 'email' }, F.owner, F.url('upload', 'Upload link'), F.date('neededBy', 'Files needed by'), F.select('status', 'Status', ['Not sent', 'Requested', 'Reminded', 'Received']), F.date('requested', 'Requested on'), F.date('reminded', 'Last reminder on'), F.notes] }] },
    { key: 'invoices', label: 'Invoices & Payments', kind: 'custom', custom: 'invoices' },
    { key: 'production', label: 'Production Hub', kind: 'tabs', sections: [
      { key: 'overview', label: 'Overview', kind: 'custom', custom: 'production-overview' },
      { key: 'social', label: 'Social Media', kind: 'list', collection: 'social-posts', singular: 'social post', fields: OPS_TABS.find(t => t.key === 'social')!.fields },
      { key: 'video', label: 'Video', kind: 'list', collection: 'video-jobs', singular: 'video job', fields: [F.text('title', 'Video', true), F.select('type', 'Type', ['Podcast edit', 'Reel', 'Event recap', 'Interview', 'Ad']), F.person('editor', 'Editor'), F.date('due', 'Due'), F.select('status', 'Status', ['Needs editing', 'Editing', 'Sent to client', 'Changes requested', 'Approved', 'Published']), F.select('approval', 'Approval', ['Not needed', 'Pending', 'Approved', 'Changes requested']), F.url('link', 'Link')] },
      { key: 'magazine', label: 'Magazine', kind: 'list', collection: 'magazine-jobs', singular: 'magazine job', fields: [F.text('piece', 'Piece', true), F.text('publication', 'Publication'), F.text('issue', 'Issue (e.g. November 2026)'), F.select('type', 'Type', ['Article layout', 'Ad', 'Cover', 'Full issue', 'Infographic']), F.person('designer', 'Designer'), F.date('due', 'Due'), F.select('status', 'Status', ['Brief', 'In progress', 'Sent for review', 'Approved', 'Published']), F.select('approval', 'Approval', ['Not needed', 'Pending', 'Approved', 'Changes requested'])] },
    ] },
    { key: 'onboarding', label: 'Onboarding', kind: 'custom', custom: 'onboarding' },
    { key: 'team-page', label: 'Team', kind: 'custom', custom: 'team-performance' },
    { key: 'meetings', label: 'Meetings', kind: 'custom', custom: 'meetings' },
    { key: 'documents', label: 'Documents', kind: 'tabs', sections: [{ ...filesSec, key: 'documents', label: 'Documents', group: undefined }] },
    { key: 'training', label: 'Training & Playbooks', kind: 'tabs', sections: [{ key: 'modules', label: 'Training modules', kind: 'list', collection: 'training-modules', singular: 'training module', fields: [F.text('title', 'Title', true), F.select('category', 'Category', ['AI', 'CRM', 'Sales', 'Editorial', 'Design']), F.person('assignee', 'Assignee'), F.select('status', 'Status', ['Assigned', 'In progress', 'Done']), F.date('assigned', 'Assigned date')] }, { key: 'playbook', label: 'Playbook', kind: 'knowledge' }] },
    { key: 'expenses', label: 'Expenses', kind: 'tabs', sections: [{ ...expensesSec, group: undefined, fields: [...expensesSec.fields!, F.text('unit', 'Business unit')] }] },
    { key: 'archive', label: 'Archive & Recycle Bin', kind: 'custom', custom: 'archive' },
  ] },
  { key: 'founder-tools', label: 'Founder Tools', icon: 'founder', pages: [
    { key: 'founder-priorities', label: 'Priority Centre', kind: 'tabs', sections: [{ key: 'priorities', label: 'Priorities', kind: 'list', collection: 'founder-priorities', singular: 'priority', fields: [F.text('priority', 'Priority', true), F.text('unit', 'Business unit'), F.owner, F.select('level', 'Priority level', ['Low', 'Medium', 'High', 'Critical']), F.date('deadline', 'Deadline'), { key: 'progress', label: 'Progress', type: 'percent' }, F.text('status', 'Current status'), F.text('next', 'Next action')] }] },
    { key: 'founder-decisions', label: 'Decision Centre', kind: 'tabs', sections: [
      { key: 'founder', label: 'Founder decisions', kind: 'list', collection: 'founder-decisions', singular: 'founder decision', fields: [F.text('decision', 'Decision', true), F.text('unit', 'Business unit'), F.person('raisedBy', 'Raised by'), F.text('final', 'Final decision'), F.owner, F.date('deadline', 'Deadline'), F.select('implementation', 'Implementation status', ['Not started', 'In progress', 'Done'])] },
      { ...decisionsSec, key: 'approvals', label: 'Decisions and approvals', group: undefined },
    ] },
    { key: 'reports', label: 'Reports', kind: 'custom', custom: 'reports' },
  ] },
  { key: 'help', label: 'Help', icon: 'help', pages: [
    { key: 'knowledge', label: 'Knowledge Centre', kind: 'custom', custom: 'knowledge-centre' },
    { key: 'guide', label: 'How to use this CRM', kind: 'custom', custom: 'guide' },
    { key: 'settings', label: 'Settings', kind: 'custom', custom: 'settings' },
  ] },
]

export function findPage(key: string): { menu: Menu; page: Page } | undefined {
  for (const m of MENUS) for (const p of m.pages) if (p.key === key) return { menu: m, page: p }
  return undefined
}
