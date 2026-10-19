// Build with esbuild: bundles src/main.tsx into dist/ and writes index.html with the right base path.
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs'

const base = process.env.VITE_BASE ?? '/CSME-CRM/'
const outdir = 'dist'
if (existsSync(outdir)) rmSync(outdir, { recursive: true })
mkdirSync(outdir, { recursive: true })

await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['es2020'],
  outdir,
  entryNames: 'app',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.css': 'css' },
  logLevel: 'info',
})

let html = readFileSync('index.html', 'utf8')
html = html.replace('<script type="module" src="/src/main.tsx"></script>', `<link rel="stylesheet" href="${base}app.css" /><script type="module" src="${base}app.js"></script>`)
writeFileSync(`${outdir}/index.html`, html)
writeFileSync(`${outdir}/404.html`, html) // GitHub Pages fallback
writeFileSync(`${outdir}/.nojekyll`, '')
if (existsSync('public')) cpSync('public', outdir, { recursive: true })
console.log(`built to ${outdir}/ with base ${base}`)
