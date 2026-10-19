# CanadianSME CRM

One CRM for the whole business, organised around one idea: every company moves through one lifecycle, and the app moves it when you act.

```
Find      Mined → Validated → Enriched → Assigned
Engage    Contacted → Content booked → Published
Grow      Nurturing → Pitched → Won → Delivered
```

**Published starts a 12-month journey** of helpful touches on the company page. That journey is what keeps a podcast guest or interviewee warm between the content and the SMB Show or Summit pitch, which is where leads used to go cold.

## What is where

| Menu | What it is for |
| --- | --- |
| Today | Everything that needs a person today: follow-ups, journey touches, proposal chasers, invoices, deliverables, meetings, tasks |
| Founder | Money, big deals, decisions, brands side by side, history. Only what needs SK |
| Pipeline | One board, five views: Leads, Outreach, Content, Nurture, Deals |
| Companies | The one shared list and the one company page (contacts, journey, deals, content, history) |
| Content Studio | Podcasts, interviews and articles from invite to published; editorial calendar |
| Events | SMB Show, SMB Summit, SMB Awards: overview, sales, program, logistics, money, settings |
| Sell and deliver | Deals and proposals, rate card, pitch library, deliverables, invoices |
| Team | Performance, tasks, meetings and notes, playbook |
| Admin | Settings, people, automation rules, targets, data quality, backup, help |

The brand filter in the top bar narrows every page. Ask AI answers from the CRM's own data.

## Run it

- Live: enable GitHub Pages for this repository (Settings → Pages → Source: GitHub Actions). Every push to `main` deploys to `https://raoof-pixel.github.io/CSME-CRM/`.
- Locally: `npm install`, then `npm run build` and open `dist/index.html` through any static server (`npm run serve`).

## Data

Data is stored in the browser (localStorage) so the app works with no server. Admin → Data quality has **Download backup**, **Restore a backup** and **Remove sample data**. CSV lead lists import from Pipeline → Import a list.

To connect a real database later, replace `load()` and `persist()` in `src/data/store.ts`. Nothing else talks to storage.

## Code map

```
src/data/types.ts        entities
src/data/lifecycle.ts    stages, phases, the 12-touch journey template
src/data/store.ts        storage + every action that changes data (and advances the stage)
src/data/automations.ts  the rules that build the Today list
src/data/seed.ts         sample data, brands, default rules
src/pages/*              one file per menu item
src/styles/app.css       design tokens (light and dark) and components
scripts/build.mjs        esbuild bundle → dist/
scripts/shot.mjs         Playwright screenshots for visual checks
```
