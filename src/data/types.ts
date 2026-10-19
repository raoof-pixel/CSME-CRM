// Core data model for the CanadianSME CRM.
// One company moves through one lifecycle. Everything else hangs off the company.

export type Id = string;

export type Phase = 'Find' | 'Engage' | 'Grow';

export type Stage =
  | 'Mined'
  | 'Validated'
  | 'Enriched'
  | 'Assigned'
  | 'Contacted'
  | 'Content booked'
  | 'Published'
  | 'Nurturing'
  | 'Pitched'
  | 'Won'
  | 'Delivered'
  | 'Not a fit';

export type Brand =
  | 'CanadianSME'
  | 'Indigenous SME'
  | 'Black Business Magazine'
  | 'Startup Growth'
  | 'B2B Market Insights'
  | 'She and Success'
  | 'American SMB'
  | 'She Founded'
  | 'SMB AI Magazine';

export type Channel = 'Email' | 'Call' | 'LinkedIn' | 'WhatsApp' | 'Meeting' | 'Social';

export type ActivityKind =
  | 'Outreach'        // email, call, LinkedIn, WhatsApp
  | 'Reply'           // they replied
  | 'Meeting'
  | 'Journey touch'   // one of the 12 nurture touches
  | 'Content'         // podcast / interview / article milestone
  | 'Proposal'
  | 'Deal'
  | 'Note'
  | 'System';         // stage change written by the app

export interface Person {
  id: Id;
  name: string;
  role: 'Founder' | 'Sales lead' | 'Sales' | 'Editorial' | 'Design' | 'Web' | 'Operations';
  brands: Brand[];         // brands this person sells for
  email?: string;
  monthlyTarget?: number;  // media sales target, CAD
}

export interface Contact {
  id: Id;
  companyId: Id;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  decisionMaker: boolean;
  doNotContact?: boolean;
}

export interface Company {
  id: Id;
  name: string;
  website?: string;
  industry?: string;
  city?: string;
  province?: string;
  size?: string;
  linkedin?: string;
  brands: Brand[];           // which brands this company is relevant to
  ownerId?: Id;              // relationship owner
  stage: Stage;
  stageSince: string;        // ISO date
  leadList?: string;         // batch it came from
  source?: string;           // LinkedIn scan, list upload, news alert, referral
  score?: number;            // 0-100 fit score
  tags: string[];
  journeyStart?: string;     // ISO date; set when Nurturing starts
  journey: JourneyTouch[];   // the 12-month plan, created when Nurturing starts
  archived?: boolean;
  sample?: boolean;          // sample data shipped with the app
  createdAt: string;
}

export interface JourneyTouch {
  month: number;             // 1..12
  type: string;              // e.g. "Email interview"
  dueDate: string;           // ISO
  doneDate?: string;
  note?: string;
}

export interface Activity {
  id: Id;
  companyId: Id;
  contactId?: Id;
  personId?: Id;             // who did it
  kind: ActivityKind;
  channel?: Channel;
  summary: string;
  date: string;              // ISO datetime
  nextFollowUp?: string;     // ISO date set by this activity
}

export type ContentType = 'Podcast (Zoom)' | 'Podcast (In studio)' | 'Email interview' | 'Article' | 'Expert quote';
export type ContentStatus = 'Invited' | 'Questions sent' | 'Booked' | 'Recorded' | 'Editing' | 'Sent to client' | 'Approved' | 'Published';

export interface ContentItem {
  id: Id;
  companyId: Id;
  contactId?: Id;
  brand: Brand;
  type: ContentType;
  title: string;
  status: ContentStatus;
  hostId?: Id;               // who runs the interview
  editorId?: Id;             // who edits / writes
  recordingDate?: string;    // ISO
  publishDate?: string;      // ISO
  liveUrl?: string;
  notes?: string;
}

export type EventKey = 'show-2027' | 'summit-2027' | 'awards-2026';

export interface Event {
  key: EventKey;
  name: string;
  date: string;              // ISO
  venue: string;
  city: string;
  website: string;
  sponsorshipTarget: number; // CAD
  exhibitorTarget: number;   // booths
  registrationTarget: number;
  kind: 'Show' | 'Summit' | 'Awards';
}

export interface Package {
  id: Id;
  eventKey?: EventKey;       // undefined = media package
  brand?: Brand;
  name: string;
  kind: 'Sponsorship' | 'Exhibitor' | 'Media' | 'Workshop' | 'Award category';
  price: number;             // CAD
  includes: string;
}

export type DealStage = 'Qualified' | 'Proposal sent' | 'Negotiating' | 'Verbal yes' | 'Won' | 'Lost';

export interface Deal {
  id: Id;
  companyId: Id;
  ownerId: Id;
  title: string;
  packageId?: Id;
  eventKey?: EventKey;
  brand?: Brand;
  value: number;             // CAD
  stage: DealStage;
  probability: number;       // 0-100
  nextAction?: string;
  nextFollowUp?: string;     // ISO date
  expectedClose?: string;    // ISO date
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: Id;
  dealId: Id;
  number: string;
  sentDate?: string;
  validUntil?: string;
  total: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  lastFollowUp?: string;
}

export interface Invoice {
  id: Id;
  dealId: Id;
  number: string;
  amount: number;
  paid: number;
  issued: string;
  due: string;
  status: 'Draft' | 'Sent' | 'Partial' | 'Paid' | 'Overdue';
}

export interface Deliverable {
  id: Id;
  dealId: Id;
  what: string;
  ownerId?: Id;              // who delivers it (design, editorial, web)
  due: string;
  status: 'Open' | 'Waiting for client files' | 'In production' | 'Delivered';
  proofUrl?: string;
}

export interface Task {
  id: Id;
  title: string;
  assigneeId?: Id;
  companyId?: Id;
  eventKey?: EventKey;
  due?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To do' | 'In progress' | 'Done';
  founderOnly?: boolean;     // only SK can move it
  area?: string;
}

export interface Meeting {
  id: Id;
  title: string;
  date: string;              // ISO datetime
  companyId?: Id;
  attendeeIds: Id[];
  notes?: string;
  nextSteps?: string;
}

export interface Speaker {
  id: Id;
  eventKey: EventKey;
  name: string;
  companyId?: Id;
  topic: string;
  slot?: string;
  status: 'Invited' | 'Confirmed' | 'Declined';
}

export interface EventTask {
  id: Id;
  eventKey: EventKey;
  title: string;
  group: 'Venue' | 'Marketing' | 'Registrations' | 'Program' | 'Sponsors' | 'On the day';
  ownerId?: Id;
  due: string;
  done: boolean;
}

export interface PitchTemplate {
  id: Id;
  name: string;
  type: 'Email' | 'Follow-up' | 'LinkedIn' | 'Call script' | 'Objection' | 'Renewal';
  audience: string;
  subject?: string;
  body: string;
}

export interface Settings {
  activeBrands: Brand[];
  defaultBrand: Brand;
  stageLimits: Partial<Record<Stage, number>>;   // days allowed in a stage before it is flagged
  goingColdDays: number;
  pitchWindowDays: number[];                     // days before an event to prompt pitches
  dailyLeadPace: number;
  theme: 'light' | 'dark' | 'system';
  currentUserId: Id;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  on: boolean;
}

export interface GenericRecord {
  id: Id;
  unit: string;              // page key the record belongs to ('' for global)
  createdAt: string;
  deletedAt?: string;        // recycle bin
  [field: string]: unknown;
}

export interface Message {
  id: Id;
  channel: string;           // 'general', 'sales', a unit key, or 'dm:<personId>'
  fromId: Id;
  text: string;
  date: string;
}

export interface Database {
  version: number;
  records: Record<string, GenericRecord[]>;
  messages: Message[];
  people: Person[];
  companies: Company[];
  contacts: Contact[];
  activities: Activity[];
  content: ContentItem[];
  events: Event[];
  packages: Package[];
  deals: Deal[];
  proposals: Proposal[];
  invoices: Invoice[];
  deliverables: Deliverable[];
  tasks: Task[];
  meetings: Meeting[];
  speakers: Speaker[];
  eventTasks: EventTask[];
  pitches: PitchTemplate[];
  automations: AutomationRule[];
  settings: Settings;
  dismissed: string[];       // automation item keys the user dismissed
}
