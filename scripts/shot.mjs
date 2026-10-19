// Render pages with Playwright for visual checks: node scripts/shot.mjs [route...]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs'
import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const base = '/CSME-CRM/'
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace(base, '/')
  if (p === '/' || !existsSync(join('dist', p))) p = '/index.html'
  const f = join('dist', p)
  const type = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html'
  res.writeHead(200, { 'content-type': type }); res.end(readFileSync(f))
}).listen(4173)

const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['today']
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch())
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
for (const r of routes) {
  const dark = r.endsWith(':dark'); const route = r.replace(':dark', '')
  await page.goto(`http://localhost:4173${base}#/${route}`)
  await page.waitForTimeout(600)
  if (dark) { await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await page.waitForTimeout(150) }
  const name = r.replace(/[\/:]/g, '_')
  await page.screenshot({ path: `/tmp/claude-0/-home-claude/fa7d87c3-68c1-5514-9f10-2ea1a0eea227/scratchpad/shot-${name}.png`, fullPage: true })
  console.log('shot', r)
}
console.log('errors:', errors.length ? errors : 'none')
await browser.close(); server.close()
