import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs'
import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const base = '/CSME-CRM/'
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]).replace(base, '/'); if (p === '/' || !existsSync(join('dist', p))) p = '/index.html'; const f = join('dist', p); res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(readFileSync(f)) }).listen(4174)
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch())
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push({ route: page.url().split('#')[1], e: String(e).slice(0, 200) }))
await page.goto(`http://localhost:4174${base}#/home`); await page.waitForTimeout(800)
// pull the route list from the schema via the built page
const routes = await page.evaluate(() => [...document.querySelectorAll('.mainnav a')].map(a => a.getAttribute('href')))
const visited = new Set(); let count = 0
for (const r of routes) {
  await page.goto(`http://localhost:4174${base}${r}`); await page.waitForTimeout(250)
  const subs = await page.evaluate(() => [...document.querySelectorAll('.subrail .list a')].map(a => a.getAttribute('href')))
  for (const s of subs) {
    if (visited.has(s)) continue; visited.add(s)
    await page.goto(`http://localhost:4174${base}${s}`); await page.waitForTimeout(220); count++
    const blank = await page.evaluate(() => (document.querySelector('main')?.innerText ?? '').trim().length < 20)
    if (blank) errors.push({ route: s, e: 'BLANK PAGE' })
    const secs = await page.evaluate(() => [...document.querySelectorAll('main .secpanel a, main nav.tabs a')].map(a => a.getAttribute('href')).filter(Boolean))
    for (const x of secs) { if (visited.has(x)) continue; visited.add(x); await page.goto(`http://localhost:4174${base}${x}`); await page.waitForTimeout(140); count++; const b = await page.evaluate(() => (document.querySelector('main')?.innerText ?? '').trim().length < 20); if (b) errors.push({ route: x, e: 'BLANK PAGE' }) }
  }
}
console.log('visited', count, 'routes')
console.log('errors', errors.length ? JSON.stringify([...new Map(errors.map(e => [e.route + e.e, e])).values()].slice(0, 40), null, 1) : 'none')
await browser.close(); server.close()
