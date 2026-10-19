# CanadianSME CRM

One CRM for the whole business, organised around one idea: every company moves through one lifecycle, and the app moves it when you act.

```
Find      Mined → Validated → Enriched → Assigned
Engage    Contacted → Content booked → Published
Grow      Nurturing → Pitched → Won → Delivered
```

**Published starts a 12-month journey** of helpful touches on the company page. That journey is what keeps a podcast guest or interviewee warm between the content and the SMB Show or Summit pitch, which is where leads used to go cold.

## How it is organised

Three levels, same names as before:

1. **Main menu** (left rail): Today, Events, AI, Team & Targets, Media & Publications, Sales & CRM, Operations, Founder Tools, Help.
2. **Submenu** (second column): every page in that menu. Media & Publications holds Podcast, Publications, CSME Hub, SMB Podcast, the 12 magazines and B2Bmarket.ca.
3. **Inside a unit page**: its own section panel. Events have 33 sections, Awards 19, SMB Podcast 19, each magazine 25, B2Bmarket.ca 22, CSME Hub 12.

The whole structure lives in `src/data/schema.ts`. Every list section there renders with add, edit, delete, CSV template, upload and export, with no extra code.

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
src/data/schema.ts       the menu, every page, every section and its columns
src/components/Generic.tsx  schema-driven list (add/edit/upload/export)
src/components/UnitPage.tsx section panel, command centre cards, graphs
src/pages/*              the custom pages (Today, Founder, Leads, Companies, Sales Team, …)
src/styles/app.css       design tokens (light and dark) and components
scripts/build.mjs        esbuild bundle → dist/
scripts/shot.mjs         Playwright screenshots for visual checks
```
