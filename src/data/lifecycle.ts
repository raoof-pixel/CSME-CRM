import type { Stage, Phase, JourneyTouch } from './types'

export const STAGES: Stage[] = [
  'Mined', 'Validated', 'Enriched', 'Assigned',
  'Contacted', 'Content booked', 'Published',
  'Nurturing', 'Pitched', 'Won', 'Delivered',
]

export const PHASES: Record<Phase, Stage[]> = {
  Find: ['Mined', 'Validated', 'Enriched', 'Assigned'],
  Engage: ['Contacted', 'Content booked', 'Published'],
  Grow: ['Nurturing', 'Pitched', 'Won', 'Delivered'],
}

export function phaseOf(stage: Stage): Phase | null {
  if (stage === 'Not a fit') return null
  for (const p of Object.keys(PHASES) as Phase[]) if (PHASES[p].includes(stage)) return p
  return null
}

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage)
}

// Stages that each pipeline view shows
export const PIPELINE_VIEWS = [
  { key: 'leads', label: 'Leads', stages: ['Mined', 'Validated', 'Enriched', 'Assigned'] as Stage[], hint: 'Mined, validated, enriched and assigned, but not yet contacted.' },
  { key: 'outreach', label: 'Outreach', stages: ['Contacted'] as Stage[], hint: 'First contact made. Goal: book a podcast, interview or article.' },
  { key: 'content', label: 'Content', stages: ['Content booked', 'Published'] as Stage[], hint: 'Booked or published. Published starts the 12-month journey automatically.' },
  { key: 'nurture', label: 'Nurture', stages: ['Nurturing'] as Stage[], hint: 'The relationship months between content and the event pitch. This is where leads used to go cold.' },
  { key: 'deals', label: 'Deals', stages: ['Pitched', 'Won', 'Delivered'] as Stage[], hint: 'Sponsorship, exhibitor and media deals.' },
] as const

export type PipelineViewKey = typeof PIPELINE_VIEWS[number]['key']

// The 12-month journey every company gets when it reaches Nurturing.
// Order matches the touchpoint plan already used on the company page of the old CRM.
export const JOURNEY_TEMPLATE: string[] = [
  'Email interview',
  'Expert quote in an article',
  'Podcast invite',
  'Product or service feature',
  'Social media spotlight',
  'Office tour feature',
  'Panel discussion invite',
  'Round table invite',
  'Event invite (Show or Summit)',
  'Newsletter expert roundup',
  'Awards nomination',
  'Thank-you, survey and early look at next year',
]

export function buildJourney(startIso: string): JourneyTouch[] {
  const start = new Date(startIso)
  return JOURNEY_TEMPLATE.map((type, i) => {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i)
    // first touch 14 days after start, the rest monthly
    if (i === 0) d.setDate(d.getDate() + 14)
    return { month: i + 1, type, dueDate: d.toISOString().slice(0, 10) }
  })
}

// Helpful (non-sales) touches keep a relationship warm. Pitches do not count.
export function isHelpfulTouch(kind: string): boolean {
  return kind === 'Journey touch' || kind === 'Content' || kind === 'Meeting'
}
