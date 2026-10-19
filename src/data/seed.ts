import type { Database, Company, Stage, Brand, Activity, ContentItem, Deal } from './types'
import { buildJourney } from './lifecycle'

// Sample data so the app is usable on first open. Every record carries sample:true where
// it matters, and Admin → Data has a one-click "Remove sample data".

const today = new Date()
const iso = (d: Date) => d.toISOString().slice(0, 10)
const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d) }
const daysAhead = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d) }
const at = (n: number, h = 10) => { const d = new Date(today); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d.toISOString() }

export const BRANDS: Brand[] = [
  'CanadianSME', 'Indigenous SME', 'Black Business Magazine', 'Startup Growth',
  'B2B Market Insights', 'She and Success', 'American SMB', 'She Founded', 'SMB AI Magazine',
]

export const BRAND_SITES: Record<Brand, string> = {
  'CanadianSME': 'canadiansme.ca',
  'Indigenous SME': 'indigenous-sme.ca',
  'Black Business Magazine': 'blackbusinessmagazine.ca',
  'Startup Growth': 'startupgrowth.ca',
  'B2B Market Insights': 'b2bmarketinsights.com',
  'She and Success': 'sheandsuccess.ca',
  'American SMB': 'americansmb.com',
  'She Founded': 'shefoundedmag.com',
  'SMB AI Magazine': 'smbaimagazine.com',
}

const people = [
  { id: 'p-sk', name: 'SK Uddin', role: 'Founder' as const, brands: BRANDS },
  { id: 'p-raoof', name: 'Raoof Shaik', role: 'Sales lead' as const, brands: BRANDS, email: 'raoof@canadiansme.ca' },
  { id: 'p-maheen', name: 'Maheen Bari', role: 'Sales' as const, brands: ['CanadianSME'] as Brand[], monthlyTarget: 25000 },
  { id: 'p-nishat', name: 'Nishat (Nina)', role: 'Sales' as const, brands: ['She and Success', 'She Founded'] as Brand[], monthlyTarget: 15000 },
  { id: 'p-kripa', name: 'Kripa Anand', role: 'Sales' as const, brands: ['SMB AI Magazine', 'B2B Market Insights'] as Brand[], monthlyTarget: 15000 },
  { id: 'p-amanda', name: 'Amanda (Rubeena)', role: 'Sales' as const, brands: ['Black Business Magazine', 'Startup Growth'] as Brand[], monthlyTarget: 15000 },
  { id: 'p-angana', name: 'Angana', role: 'Editorial' as const, brands: BRANDS },
  { id: 'p-ashraf', name: 'Ashraf', role: 'Design' as const, brands: BRANDS },
  { id: 'p-azhar', name: 'Azhar', role: 'Web' as const, brands: BRANDS },
]

type Seed = [name: string, industry: string, city: string, stage: Stage, daysInStage: number, owner: string, brands: Brand[], score: number, source: string]

const companySeeds: Seed[] = [
  ['Lumina Labs', 'AI automation', 'Toronto', 'Mined', 2, '', ['CanadianSME', 'SMB AI Magazine'], 72, 'LinkedIn scan'],
  ['Trilix AI', 'AI consulting', 'Ottawa', 'Mined', 5, '', ['SMB AI Magazine'], 61, 'LinkedIn scan'],
  ['Northwind Payroll', 'HR software', 'Mississauga', 'Validated', 3, '', ['CanadianSME'], 68, 'List upload'],
  ['Expeflow Inc.', 'Workflow software', 'Waterloo', 'Enriched', 4, 'p-maheen', ['CanadianSME'], 77, 'List upload'],
  ['Linexa AI Consulting', 'AI consulting', 'Toronto', 'Assigned', 1, 'p-kripa', ['SMB AI Magazine'], 70, 'News alert'],
  ['EngageFit AI', 'Fitness tech', 'Vancouver', 'Assigned', 9, 'p-maheen', ['CanadianSME', 'Startup Growth'], 58, 'LinkedIn scan'],
  ['4imprint Canada', 'Promotional products', 'Toronto', 'Contacted', 12, 'p-nishat', ['CanadianSME'], 64, 'List upload'],
  ['Tulip', 'Retail software', 'Toronto', 'Contacted', 25, 'p-maheen', ['CanadianSME'], 81, 'Referral'],
  ['247 Labs', 'Software development', 'Toronto', 'Content booked', 6, 'p-maheen', ['CanadianSME'], 74, 'LinkedIn scan'],
  ['Maple Ledger', 'Accounting software', 'Calgary', 'Content booked', 3, 'p-kripa', ['CanadianSME', 'B2B Market Insights'], 69, 'Referral'],
  ['Clearpath Robotics', 'Robotics', 'Kitchener', 'Published', 4, 'p-maheen', ['CanadianSME'], 88, 'Referral'],
  ['Harbour Legal Tech', 'Legal software', 'Halifax', 'Nurturing', 40, 'p-nishat', ['CanadianSME', 'She and Success'], 76, 'LinkedIn scan'],
  ['Lenovo Canada', 'Hardware', 'Markham', 'Nurturing', 95, 'p-maheen', ['CanadianSME'], 92, 'Referral'],
  ['Aurora Designs', 'Branding agency', 'Toronto', 'Nurturing', 61, 'p-amanda', ['Black Business Magazine'], 66, 'LinkedIn scan'],
  ['StackAdapt', 'Ad tech', 'Toronto', 'Nurturing', 20, 'p-kripa', ['B2B Market Insights', 'CanadianSME'], 85, 'Referral'],
  ['Achievers', 'Employee recognition', 'Toronto', 'Pitched', 11, 'p-maheen', ['CanadianSME'], 83, 'Referral'],
  ['Alterna Savings', 'Banking', 'Ottawa', 'Pitched', 30, 'p-raoof', ['CanadianSME', 'Indigenous SME'], 90, 'Referral'],
  ['Shopify', 'E-commerce', 'Ottawa', 'Won', 15, 'p-raoof', ['CanadianSME'], 95, 'Referral'],
  ['Ackroo', 'Loyalty software', 'Hamilton', 'Won', 22, 'p-maheen', ['CanadianSME'], 71, 'List upload'],
  ['Interac', 'Payments', 'Toronto', 'Delivered', 50, 'p-raoof', ['CanadianSME'], 94, 'Referral'],
  ['Konica Minolta Canada', 'Office technology', 'Mississauga', 'Contacted', 45, 'p-nishat', ['CanadianSME'], 60, 'List upload'],
  ['Phala Robotics', 'Robotics', 'Montreal', 'Not a fit', 10, 'p-kripa', ['SMB AI Magazine'], 22, 'LinkedIn scan'],
  ['Bucketlist Rewards', 'HR software', 'Vancouver', 'Validated', 7, '', ['CanadianSME'], 55, 'LinkedIn scan'],
  ['Great Bear Financial', 'Financial services', 'Winnipeg', 'Assigned', 2, 'p-raoof', ['Indigenous SME'], 73, 'Referral'],
]

const companies: Company[] = companySeeds.map((s, i) => {
  const [name, industry, city, stage, days, owner, brands, score, source] = s
  const id = `c-${i + 1}`
  const stageSince = daysAgo(days)
  const nurturing = ['Nurturing', 'Pitched', 'Won', 'Delivered'].includes(stage)
  const journeyStart = nurturing ? daysAgo(days + (stage === 'Nurturing' ? 0 : 60)) : undefined
  const journey = journeyStart ? buildJourney(journeyStart) : []
  // mark earlier touches done for companies deep in the journey
  if (journeyStart) {
    const months = Math.floor((today.getTime() - new Date(journeyStart).getTime()) / (30 * 864e5))
    journey.forEach((t, k) => { if (k < months && k < 4) t.doneDate = t.dueDate })
  }
  return {
    id, name, industry, city, province: city === 'Vancouver' ? 'BC' : city === 'Calgary' ? 'AB' : city === 'Halifax' ? 'NS' : city === 'Montreal' ? 'QC' : city === 'Winnipeg' ? 'MB' : 'ON',
    website: `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
    brands, ownerId: owner || undefined, stage, stageSince, score, source,
    leadList: source === 'LinkedIn scan' ? 'AI Companies' : source === 'List upload' ? 'New prospects' : undefined,
    tags: [], journeyStart, journey, sample: true, createdAt: daysAgo(days + 30),
  }
})

const byName = (n: string) => companies.find(c => c.name === n)!.id

const contacts = [
  ['Tulip', 'Ali Asaria', 'CEO', true], ['247 Labs', 'Sarah K.', 'Marketing Director', true],
  ['Clearpath Robotics', 'Matt Rendall', 'CEO', true], ['Lenovo Canada', 'Priya Nair', 'SMB Marketing Lead', true],
  ['Harbour Legal Tech', 'Dana Whitfield', 'Founder', true], ['StackAdapt', 'Jordan Lee', 'VP Marketing', true],
  ['Achievers', 'Chris Ho', 'Director, Brand', true], ['Alterna Savings', 'Monique Tremblay', 'Head of Community', true],
  ['Shopify', 'Devon Park', 'Partnerships Manager', false], ['Interac', 'Lena Costa', 'Sponsorships Lead', true],
  ['4imprint Canada', 'Nina Patel', 'Marketing Manager', false], ['Expeflow Inc.', 'Omar Haddad', 'Co-founder', true],
  ['Aurora Designs', 'Keisha Grant', 'Founder', true], ['Ackroo', 'Steve Levely', 'CEO', true],
].map(([co, name, title, dm], i) => ({
  id: `ct-${i + 1}`, companyId: byName(co as string), name: name as string, title: title as string,
  email: `${(name as string).split(' ')[0].toLowerCase()}@${(co as string).toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
  decisionMaker: dm as boolean,
}))

const activities: Activity[] = []
let aid = 1
const act = (co: string, kind: Activity['kind'], summary: string, days: number, channel?: Activity['channel'], person = 'p-maheen', next?: number) => {
  activities.push({ id: `a-${aid++}`, companyId: byName(co), kind, channel, summary, date: at(days), personId: person, nextFollowUp: next !== undefined ? daysAhead(next) : undefined })
}
act('Tulip', 'Outreach', 'Intro email about a CanadianSME feature', 25, 'Email', 'p-maheen', -18)
act('4imprint Canada', 'Outreach', 'LinkedIn message to Nina', 12, 'LinkedIn', 'p-nishat', -5)
act('247 Labs', 'Outreach', 'Email invite to an email interview', 14, 'Email')
act('247 Labs', 'Reply', 'Sarah said yes to the email interview', 9, 'Email')
act('247 Labs', 'Content', 'Email interview questions sent', 6, 'Email')
act('Clearpath Robotics', 'Content', 'Podcast recorded in studio with Matt', 18, 'Meeting')
act('Clearpath Robotics', 'Content', 'Episode published', 4)
act('Lenovo Canada', 'Content', 'Podcast published', 155)
act('Lenovo Canada', 'Journey touch', 'Expert quote used in the AI issue', 120)
act('Lenovo Canada', 'Journey touch', 'Social spotlight posted', 92)
act('Harbour Legal Tech', 'Content', 'Email interview published', 40)
act('Harbour Legal Tech', 'Journey touch', 'Thank-you and live link sent', 38, 'Email', 'p-nishat')
act('StackAdapt', 'Content', 'Podcast published', 20)
act('StackAdapt', 'Journey touch', 'Thank-you, live link and social tag', 18, 'Email', 'p-kripa', 10)
act('Achievers', 'Proposal', 'Summit Gold sponsorship proposal sent', 11, 'Email', 'p-maheen', -3)
act('Alterna Savings', 'Proposal', 'Show Platinum proposal sent', 30, 'Email', 'p-raoof', -16)
act('Shopify', 'Deal', 'Summit Title sponsorship signed', 15, undefined, 'p-raoof')
act('Ackroo', 'Deal', 'Sponsored article package signed', 22)
act('Interac', 'Deal', 'Delivered: Show 2026 Platinum package', 50, undefined, 'p-raoof')
act('Konica Minolta Canada', 'Outreach', 'Cold email, no reply', 45, 'Email', 'p-nishat', -30)
act('Aurora Designs', 'Content', 'Feature article published', 61, undefined, 'p-amanda')

const content: ContentItem[] = [
  { id: 'ci-1', companyId: byName('247 Labs'), contactId: 'ct-2', brand: 'CanadianSME', type: 'Email interview', title: 'How 247 Labs ships software for SMEs', status: 'Questions sent', hostId: 'p-angana', editorId: 'p-angana', notes: 'Answers due Friday' },
  { id: 'ci-2', companyId: byName('Maple Ledger'), brand: 'CanadianSME', type: 'Podcast (Zoom)', title: 'Cash flow habits for small firms', status: 'Booked', hostId: 'p-raoof', editorId: 'p-ashraf', recordingDate: daysAhead(5) },
  { id: 'ci-3', companyId: byName('Clearpath Robotics'), contactId: 'ct-3', brand: 'CanadianSME', type: 'Podcast (In studio)', title: 'Robots on the shop floor', status: 'Published', hostId: 'p-sk', editorId: 'p-ashraf', recordingDate: daysAgo(18), publishDate: daysAgo(4), liveUrl: 'https://canadiansme.ca/podcast/clearpath' },
  { id: 'ci-4', companyId: byName('Lenovo Canada'), contactId: 'ct-4', brand: 'CanadianSME', type: 'Podcast (In studio)', title: 'Hybrid work for small teams', status: 'Published', hostId: 'p-sk', recordingDate: daysAgo(170), publishDate: daysAgo(155) },
  { id: 'ci-5', companyId: byName('StackAdapt'), contactId: 'ct-6', brand: 'B2B Market Insights', type: 'Podcast (Zoom)', title: 'Programmatic for B2B', status: 'Published', hostId: 'p-raoof', recordingDate: daysAgo(30), publishDate: daysAgo(20) },
  { id: 'ci-6', companyId: byName('Harbour Legal Tech'), contactId: 'ct-5', brand: 'She and Success', type: 'Email interview', title: 'Building legal tech from Halifax', status: 'Published', editorId: 'p-angana', publishDate: daysAgo(40) },
  { id: 'ci-7', companyId: byName('Tulip'), contactId: 'ct-1', brand: 'CanadianSME', type: 'Article', title: 'Retail tech trends 2027', status: 'Invited', editorId: 'p-angana' },
  { id: 'ci-8', companyId: byName('Aurora Designs'), contactId: 'ct-13', brand: 'Black Business Magazine', type: 'Article', title: 'Brand building on a budget', status: 'Published', editorId: 'p-angana', publishDate: daysAgo(61) },
]

const events = [
  { key: 'show-2027' as const, name: 'SMB Show 2027', kind: 'Show' as const, date: '2027-06-16', venue: 'Confirm in Event settings', city: 'Toronto', website: 'https://smeexpo.ca', sponsorshipTarget: 350000, exhibitorTarget: 120, registrationTarget: 3000 },
  { key: 'summit-2027' as const, name: 'SMB Summit 2027', kind: 'Summit' as const, date: '2027-10-21', venue: 'Confirm in Event settings', city: 'Toronto', website: 'https://smesummit.ca', sponsorshipTarget: 581000, exhibitorTarget: 50, registrationTarget: 800 },
  { key: 'awards-2026' as const, name: 'SMB Awards 2026', kind: 'Awards' as const, date: '2026-11-26', venue: 'Confirm in Event settings', city: 'Toronto', website: 'https://smesummit.ca', sponsorshipTarget: 200000, exhibitorTarget: 0, registrationTarget: 400 },
]

const packages = [
  { id: 'pk-1', eventKey: 'summit-2027' as const, name: 'Title sponsor', kind: 'Sponsorship' as const, price: 75000, includes: 'Naming, keynote slot, 10 passes, logo on everything' },
  { id: 'pk-2', eventKey: 'summit-2027' as const, name: 'Platinum sponsor', kind: 'Sponsorship' as const, price: 40000, includes: 'Panel seat, booth, 6 passes, e-blast' },
  { id: 'pk-3', eventKey: 'summit-2027' as const, name: 'Gold sponsor', kind: 'Sponsorship' as const, price: 20000, includes: 'Booth, 4 passes, logo' },
  { id: 'pk-4', eventKey: 'summit-2027' as const, name: 'Exhibitor booth', kind: 'Exhibitor' as const, price: 4500, includes: '10x10 booth, 2 passes' },
  { id: 'pk-5', eventKey: 'show-2027' as const, name: 'Platinum sponsor', kind: 'Sponsorship' as const, price: 35000, includes: 'Stage slot, booth, 6 passes' },
  { id: 'pk-6', eventKey: 'show-2027' as const, name: 'Exhibitor booth', kind: 'Exhibitor' as const, price: 3800, includes: '10x10 booth, 2 passes' },
  { id: 'pk-7', eventKey: 'show-2027' as const, name: 'Workshop slot', kind: 'Workshop' as const, price: 6000, includes: '45-minute workshop, attendee list' },
  { id: 'pk-8', eventKey: 'awards-2026' as const, name: 'Category sponsor', kind: 'Award category' as const, price: 12000, includes: 'Named category, presents the award, table of 8' },
  { id: 'pk-9', brand: 'CanadianSME' as const, name: 'Sponsored article', kind: 'Media' as const, price: 2500, includes: '800-word article, newsletter, social' },
  { id: 'pk-10', brand: 'CanadianSME' as const, name: 'E-blast', kind: 'Media' as const, price: 1800, includes: 'Dedicated send to the subscriber list' },
  { id: 'pk-11', brand: 'CanadianSME' as const, name: 'Web banner (month)', kind: 'Media' as const, price: 1200, includes: 'Leaderboard on canadiansme.ca' },
  { id: 'pk-12', brand: 'CanadianSME' as const, name: 'Podcast sponsorship (4 episodes)', kind: 'Media' as const, price: 6000, includes: 'Pre-roll and host read' },
  { id: 'pk-13', brand: 'CanadianSME' as const, name: 'Full-page magazine ad', kind: 'Media' as const, price: 3200, includes: 'Print and digital issue' },
]

const deals: Deal[] = [
  { id: 'd-1', companyId: byName('Achievers'), ownerId: 'p-maheen', title: 'Summit 2027 Gold', packageId: 'pk-3', eventKey: 'summit-2027', value: 20000, stage: 'Proposal sent', probability: 50, nextAction: 'Call Chris about the panel topic', nextFollowUp: daysAgo(3), expectedClose: daysAhead(20), createdAt: daysAgo(14), updatedAt: daysAgo(11) },
  { id: 'd-2', companyId: byName('Alterna Savings'), ownerId: 'p-raoof', title: 'Show 2027 Platinum', packageId: 'pk-5', eventKey: 'show-2027', value: 35000, stage: 'Negotiating', probability: 60, nextAction: 'Send revised package with Indigenous SME feature', nextFollowUp: daysAhead(2), expectedClose: daysAhead(30), createdAt: daysAgo(40), updatedAt: daysAgo(16) },
  { id: 'd-3', companyId: byName('Shopify'), ownerId: 'p-raoof', title: 'Summit 2027 Title sponsor', packageId: 'pk-1', eventKey: 'summit-2027', value: 75000, stage: 'Won', probability: 100, createdAt: daysAgo(60), updatedAt: daysAgo(15) },
  { id: 'd-4', companyId: byName('Ackroo'), ownerId: 'p-maheen', title: 'Sponsored article + e-blast', packageId: 'pk-9', brand: 'CanadianSME', value: 4300, stage: 'Won', probability: 100, createdAt: daysAgo(35), updatedAt: daysAgo(22) },
  { id: 'd-5', companyId: byName('Interac'), ownerId: 'p-raoof', title: 'Show 2026 Platinum (delivered)', eventKey: 'show-2027', value: 35000, stage: 'Won', probability: 100, createdAt: daysAgo(200), updatedAt: daysAgo(50) },
  { id: 'd-6', companyId: byName('Lenovo Canada'), ownerId: 'p-maheen', title: 'Podcast sponsorship', packageId: 'pk-12', brand: 'CanadianSME', value: 6000, stage: 'Qualified', probability: 30, nextAction: 'Share listener numbers from the Clearpath episode', nextFollowUp: daysAhead(4), expectedClose: daysAhead(45), createdAt: daysAgo(10), updatedAt: daysAgo(10) },
  { id: 'd-7', companyId: byName('Tulip'), ownerId: 'p-maheen', title: 'Full-page ad, December issue', packageId: 'pk-13', brand: 'CanadianSME', value: 3200, stage: 'Lost', probability: 0, lostReason: 'Budget frozen until Q1', createdAt: daysAgo(50), updatedAt: daysAgo(28) },
]

const proposals = [
  { id: 'pr-1', dealId: 'd-1', number: 'P-2026-041', sentDate: daysAgo(11), validUntil: daysAhead(19), total: 20000, status: 'Sent' as const },
  { id: 'pr-2', dealId: 'd-2', number: 'P-2026-037', sentDate: daysAgo(30), validUntil: daysAhead(0), total: 35000, status: 'Sent' as const, lastFollowUp: daysAgo(16) },
  { id: 'pr-3', dealId: 'd-3', number: 'P-2026-030', sentDate: daysAgo(45), total: 75000, status: 'Accepted' as const },
  { id: 'pr-4', dealId: 'd-4', number: 'P-2026-033', sentDate: daysAgo(30), total: 4300, status: 'Accepted' as const },
]

const invoices = [
  { id: 'in-1', dealId: 'd-3', number: 'INV-1042', amount: 75000, paid: 37500, issued: daysAgo(14), due: daysAhead(16), status: 'Partial' as const },
  { id: 'in-2', dealId: 'd-4', number: 'INV-1039', amount: 4300, paid: 0, issued: daysAgo(21), due: daysAgo(6), status: 'Overdue' as const },
  { id: 'in-3', dealId: 'd-5', number: 'INV-0988', amount: 35000, paid: 35000, issued: daysAgo(190), due: daysAgo(160), status: 'Paid' as const },
]

const deliverables = [
  { id: 'dl-1', dealId: 'd-4', what: 'Sponsored article: Ackroo loyalty for SMEs', ownerId: 'p-angana', due: daysAhead(6), status: 'Waiting for client files' as const },
  { id: 'dl-2', dealId: 'd-4', what: 'E-blast artwork and send', ownerId: 'p-ashraf', due: daysAhead(12), status: 'Open' as const },
  { id: 'dl-3', dealId: 'd-3', what: 'Summit logo placement on smesummit.ca', ownerId: 'p-azhar', due: daysAhead(3), status: 'In production' as const },
  { id: 'dl-4', dealId: 'd-5', what: 'Show 2026 Platinum: booth, stage slot, e-blast', ownerId: 'p-raoof', due: daysAgo(50), status: 'Delivered' as const, proofUrl: 'https://smeexpo.ca' },
]

const tasks = [
  { id: 't-1', title: 'Confirm November CanadianSME media target by person', assigneeId: 'p-sk', priority: 'High' as const, status: 'To do' as const, due: daysAhead(2), founderOnly: true, area: 'Revenue' },
  { id: 't-2', title: 'Approve Summit 2027 sponsorship packages', assigneeId: 'p-sk', priority: 'High' as const, status: 'To do' as const, due: daysAhead(5), founderOnly: true, area: 'Events' },
  { id: 't-3', title: 'Assign a relationship owner to every Nurturing company', assigneeId: 'p-raoof', priority: 'High' as const, status: 'In progress' as const, due: daysAhead(1), area: 'Team' },
  { id: 't-4', title: 'Chase Ackroo for article files', assigneeId: 'p-angana', companyId: byName('Ackroo'), priority: 'Medium' as const, status: 'To do' as const, due: daysAhead(0), area: 'Delivery' },
  { id: 't-5', title: 'Summit venue shortlist to SK', assigneeId: 'p-raoof', eventKey: 'summit-2027' as const, priority: 'Medium' as const, status: 'To do' as const, due: daysAhead(9), area: 'Events' },
  { id: 't-6', title: 'Refresh the rate card for 2027', assigneeId: 'p-raoof', priority: 'Low' as const, status: 'To do' as const, due: daysAhead(20), area: 'Sales' },
  { id: 't-7', title: 'Design December cover', assigneeId: 'p-ashraf', priority: 'Medium' as const, status: 'In progress' as const, due: daysAhead(7), area: 'Magazine' },
  { id: 't-8', title: 'Fix the Summit sponsor logo wall on the website', assigneeId: 'p-azhar', eventKey: 'summit-2027' as const, priority: 'Medium' as const, status: 'To do' as const, due: daysAhead(3), area: 'Web' },
]

const meetings = [
  { id: 'm-1', title: 'Podcast recording: Maple Ledger', date: new Date(Date.now() + 5 * 864e5).toISOString(), companyId: byName('Maple Ledger'), attendeeIds: ['p-raoof', 'p-ashraf'] },
  { id: 'm-2', title: 'Weekly sales review', date: new Date(Date.now() + 1 * 864e5).toISOString(), attendeeIds: ['p-sk', 'p-raoof', 'p-maheen', 'p-nishat', 'p-kripa', 'p-amanda'] },
  { id: 'm-3', title: 'Alterna Savings: package walkthrough', date: new Date(Date.now() - 16 * 864e5).toISOString(), companyId: byName('Alterna Savings'), attendeeIds: ['p-raoof'], notes: 'Monique wants an Indigenous SME feature bundled. Decision expected after their board meeting.', nextSteps: 'Send revised package' },
]

const speakers = [
  { id: 's-1', eventKey: 'summit-2027' as const, name: 'Matt Rendall', companyId: byName('Clearpath Robotics'), topic: 'Automation for small manufacturers', status: 'Invited' as const },
  { id: 's-2', eventKey: 'summit-2027' as const, name: 'Devon Park', companyId: byName('Shopify'), topic: 'Selling across Canada', slot: 'Keynote', status: 'Confirmed' as const },
  { id: 's-3', eventKey: 'show-2027' as const, name: 'Priya Nair', companyId: byName('Lenovo Canada'), topic: 'Hybrid work setups', status: 'Invited' as const },
]

const eventTasks = [
  { id: 'et-1', eventKey: 'summit-2027' as const, title: 'Sign venue contract', group: 'Venue' as const, ownerId: 'p-raoof', due: daysAhead(30), done: false },
  { id: 'et-2', eventKey: 'summit-2027' as const, title: 'Open early-bird registration', group: 'Registrations' as const, ownerId: 'p-azhar', due: daysAhead(45), done: false },
  { id: 'et-3', eventKey: 'summit-2027' as const, title: 'Publish sponsorship prospectus', group: 'Sponsors' as const, ownerId: 'p-ashraf', due: daysAhead(10), done: false },
  { id: 'et-4', eventKey: 'show-2027' as const, title: 'Floor plan v1', group: 'Venue' as const, ownerId: 'p-raoof', due: daysAhead(60), done: false },
  { id: 'et-5', eventKey: 'awards-2026' as const, title: 'Close nominations', group: 'Program' as const, ownerId: 'p-nishat', due: daysAhead(12), done: false },
  { id: 'et-6', eventKey: 'awards-2026' as const, title: 'Confirm judges', group: 'Program' as const, ownerId: 'p-raoof', due: daysAhead(18), done: false },
]

const pitches = [
  { id: 'pt-1', name: 'Podcast invite', type: 'Email' as const, audience: 'Founder or marketing lead', subject: 'Would you join us on the CanadianSME podcast?', body: 'Hi [first name],\n\nI read your post on [topic] and it is exactly what our small-business readers ask about. Would you join SK for a 25-minute episode of the CanadianSME podcast? We record on Zoom or in our Toronto studio, and we promote every episode to [audience number] readers.\n\nTwo slots that work: [date 1] or [date 2].\n\n[your name]' },
  { id: 'pt-2', name: 'Thank-you after recording', type: 'Follow-up' as const, audience: 'Podcast guest', subject: 'Thank you, and what happens next', body: 'Hi [first name],\n\nThank you for today. The episode goes live on [date]; I will send the link and the social assets the same morning so your team can share it.\n\nOne more thing: we would love to feature [company] in our [month] issue. No cost, just 10 minutes for a few questions.\n\n[your name]' },
  { id: 'pt-3', name: 'Event invite after content', type: 'Email' as const, audience: 'Nurturing company', subject: 'A seat for you at SMB Summit 2027', body: 'Hi [first name],\n\nYour episode has had [plays] plays, and the Summit audience is the same people. I have held two complimentary passes for [company]. If visibility on the day is useful, the sponsorship options are attached; otherwise come as our guest.\n\n[your name]' },
  { id: 'pt-4', name: 'Proposal chaser, day 3', type: 'Follow-up' as const, audience: 'Proposal sent', subject: 'Re: [proposal title]', body: 'Hi [first name],\n\nChecking you received the proposal. Happy to adjust the package, for example [smaller first step]. Does a 15-minute call on [day] work?\n\n[your name]' },
  { id: 'pt-5', name: 'Budget is frozen', type: 'Objection' as const, audience: 'Any', body: 'Understood. Most sponsors book in [month] for next year\'s budget; shall I hold [package] at this year\'s price until [date] so you do not lose the slot?' },
  { id: 'pt-6', name: 'Renewal, 30 days before campaign ends', type: 'Renewal' as const, audience: 'Paying client', subject: 'Your [product] results so far', body: 'Hi [first name],\n\nHere is what your [product] delivered: [results]. It ends on [date]. If you want to keep the momentum, I can roll it into [next package] at the current rate.\n\n[your name]' },
]

export const DEFAULT_AUTOMATIONS = [
  { id: 'content-starts-journey', name: 'Published content starts the journey', description: 'When a podcast, interview or article is marked Published, the company moves to Nurturing and its 12-month journey is created.', on: true },
  { id: 'thank-you-pack', name: 'Thank-you pack after recording', description: 'Two days after a recording, a thank-you email with the live link and a social tag is queued for the owner.', on: true },
  { id: 'going-cold', name: 'Going cold', description: 'Any Nurturing company or paying client with no helpful touch for 30 days is flagged to its owner and to Raoof.', on: true },
  { id: 'pitch-window', name: 'Event pitch window', description: '120, 90 and 60 days before each event, every Nurturing company not yet pitched appears with the package that fits its history.', on: true },
  { id: 'stage-stuck', name: 'Stage stuck', description: 'A company past its stage limit (for example 21 days in Contacted) is flagged to the owner.', on: true },
  { id: 'follow-up-overdue', name: 'Follow-ups overdue', description: 'Deals and companies with a follow-up date in the past show on Today.', on: true },
  { id: 'proposal-chaser', name: 'Proposal chaser', description: 'No reply 3 days after a proposal: a follow-up is queued. No reply after 7 days: a second one with a smaller first step.', on: true },
  { id: 'won-to-deliverables', name: 'Won deal creates deliverables', description: 'When a deal is marked Won, a deliverable is created for each item in the package and the owner is asked to assign it.', on: true },
  { id: 'invoice-overdue', name: 'Overdue invoice escalation', description: 'Unpaid invoices past due are shown to the salesperson; at 15 days late, to SK and Raoof.', on: true },
  { id: 'no-owner', name: 'Companies with no owner', description: 'Every Monday, companies past Mined with no owner are listed for Raoof.', on: true },
  { id: 'daily-pace', name: 'Daily lead pace', description: 'Each salesperson sees how many first contacts are left to reach the daily pace.', on: true },
  { id: 'missing-notes', name: 'Meeting notes missing', description: 'A finished meeting with no notes is flagged the same afternoon.', on: true },
]

function seedRecords(): Database['records'] {
  const r = (unit: string, data: Record<string, unknown>) => ({ id: uidSeed(), unit, createdAt: daysAgo(10), ...data })
  return {
    'packages': [
      r('summit', { name: 'Title sponsor', kind: 'Sponsorship', price: 75000, includes: 'Naming, keynote slot, 10 passes, logo on everything', available: 1 }),
      r('summit', { name: 'Platinum sponsor', kind: 'Sponsorship', price: 40000, includes: 'Panel seat, booth, 6 passes, e-blast', available: 4 }),
      r('summit', { name: 'Gold sponsor', kind: 'Sponsorship', price: 20000, includes: 'Booth, 4 passes, logo', available: 8 }),
      r('summit', { name: 'Exhibitor booth', kind: 'Exhibitor', price: 4500, includes: '10x10 booth, 2 passes', available: 50 }),
      r('tour', { name: 'Platinum sponsor', kind: 'Sponsorship', price: 35000, includes: 'Stage slot, booth, 6 passes', available: 4 }),
      r('tour', { name: 'Exhibitor booth', kind: 'Exhibitor', price: 3800, includes: '10x10 booth, 2 passes', available: 120 }),
      r('tour', { name: 'Workshop slot', kind: 'Workshop', price: 6000, includes: '45-minute workshop, attendee list', available: 16 }),
      r('awards', { name: 'Category sponsor', kind: 'Award category', price: 12000, includes: 'Named category, presents the award, table of 8', available: 12 }),
      r('magazine', { name: 'Sponsored article', kind: 'Media', price: 2500, includes: '800-word article, newsletter, social' }),
      r('magazine', { name: 'E-blast', kind: 'Media', price: 1800, includes: 'Dedicated send to the subscriber list' }),
      r('magazine', { name: 'Web banner (month)', kind: 'Media', price: 1200, includes: 'Leaderboard on canadiansme.ca' }),
      r('magazine', { name: 'Full-page magazine ad', kind: 'Media', price: 3200, includes: 'Print and digital issue' }),
      r('podcast', { name: 'Podcast sponsorship (4 episodes)', kind: 'Media', price: 6000, includes: 'Pre-roll and host read' }),
    ],
    'issues': [
      r('magazine', { month: 'November', issue: 'November 2026', theme: 'Manufacturing and digital health', cover: 'TBD', deadline: daysAhead(12), published: daysAhead(22), status: 'In progress' }),
      r('magazine', { month: 'December', issue: 'December 2026', theme: 'Economic and social development', deadline: daysAhead(42), published: daysAhead(52), status: 'Planned' }),
    ],
    'episodes': [
      r('podcast', { number: 41, title: 'Robots on the shop floor', guest: 'Matt Rendall, Clearpath Robotics', recorded: daysAgo(18), published: daysAgo(4), status: 'Published', views: 1240, listens: 860 }),
      r('podcast', { number: 42, title: 'Cash flow habits for small firms', guest: 'Maple Ledger', recorded: daysAhead(5), status: 'Not recorded yet' }),
    ],
    'categories': [ r('awards', { name: 'Small Business Leadership', sponsor: '', judges: 2, status: 'Open' }), r('awards', { name: 'Innovation in AI', sponsor: '', judges: 1, status: 'Open' }) ],
    'nominations': [ r('awards', { nominee: 'Keisha Grant', business: 'Aurora Designs', category: 'Small Business Leadership', status: 'Submitted', submitted: daysAgo(3), owner: 'p-nishat' }) ],
    'hub-strategy': [ r('hub', { strategy: 'Sell integrated media + event packages', pillar: 'Revenue', owner: 'p-sk', timeline: 'Q1 2027', status: 'In progress', progress: 30 }) ],
    'hub-kpis': [ r('hub', { kpi: 'Monthly media revenue', category: 'Revenue', current: 0, target: 25000, status: 'Behind' }), r('hub', { kpi: 'Companies in nurture', category: 'Pipeline', current: 4, target: 50, status: 'At risk' }) ],
    'audience': [ r('magazine', { asOf: daysAgo(5), newsletter: 48000, magazine: 22000, web: 95000, linkedin: 31000, instagram: 8400, facebook: 12000, x: 9600, youtube: 3100 }) ],
    'mastersheet': [ r('summit', { item: 'Confirm venue hold', area: 'Venue', owner: 'p-raoof', due: daysAhead(30), status: 'Open' }) ],
    'social-posts': [ r('', { post: 'Clearpath episode clip', platform: 'LinkedIn', brand: 'CanadianSME', maker: 'p-ashraf', due: daysAhead(1), status: 'Ready', approval: 'Pending' }) ],
    'escalations': [ r('', { problem: 'Ackroo article files still missing after two reminders', label: 'Client', actor: 'p-raoof', raisedBy: 'p-angana', raisedOn: daysAgo(1), status: 'Open' }) ],
    'founder-priorities': [ r('', { priority: 'Finalize 3 to 5 easy-to-sell integrated media packages', unit: 'CanadianSME', owner: 'p-sk', level: 'High', deadline: daysAhead(14), progress: 20, status: 'Drafting', next: 'Review rate card with Raoof' }) ],
  }
}

let seedN = 0
const uidSeed = () => `r-${++seedN}`

export function buildSeed(): Database {
  return {
    version: 1,
    records: seedRecords(),
    messages: [
      { id: 'msg-1', channel: 'general', fromId: 'p-raoof', text: 'Welcome to the new CRM. Start on Today every morning.', date: at(1, 9) },
      { id: 'msg-2', channel: 'general', fromId: 'p-maheen', text: 'ok', date: at(1, 10) },
    ],
    people, companies, contacts, activities, content, events, packages, deals, proposals, invoices, deliverables,
    tasks, meetings, speakers, eventTasks, pitches,
    automations: DEFAULT_AUTOMATIONS,
    settings: {
      activeBrands: BRANDS,
      defaultBrand: 'CanadianSME',
      stageLimits: { Mined: 7, Validated: 7, Enriched: 7, Assigned: 5, Contacted: 21, 'Content booked': 45, Published: 3, Pitched: 30 },
      goingColdDays: 30,
      pitchWindowDays: [120, 90, 60],
      dailyLeadPace: 10,
      theme: 'system',
      currentUserId: 'p-sk',
    },
    dismissed: [],
  }
}
