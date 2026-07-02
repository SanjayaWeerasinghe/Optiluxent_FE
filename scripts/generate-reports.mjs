#!/usr/bin/env node
// Turns the JSON manifests written by the reporter fixture into one HTML
// document per test plus a master index.
//
// Reads:   e2e/reports/<spec>/<slug>/steps.json + PNGs in the same dir
// Writes:  e2e/reports/<spec>/<slug>/report.html
//          e2e/reports/index.html

import { promises as fs } from 'fs'
import path               from 'path'

const REPORTS_DIR = path.join(process.cwd(), 'e2e', 'reports')

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}

function statusPill(status) {
  const color = status === 'passed' ? '#10b981'
              : status === 'failed' ? '#ef4444'
              : status === 'skipped' ? '#94a3b8'
              : status === 'timedOut' ? '#f97316'
              : '#64748b'
  return `<span style="display:inline-block; padding:2px 10px; border-radius:9999px; background:${color}22; color:${color}; font-weight:600; font-size:12px; letter-spacing:.02em; text-transform:uppercase;">${esc(status ?? 'unknown')}</span>`
}

function formatMs(ms) {
  if (!ms || ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const BASE_CSS = `
  * { box-sizing: border-box }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #f8fafc; }
  header { padding: 24px 32px; background: #ffffff; border-bottom: 1px solid #e2e8f0; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header .meta { color: #64748b; font-size: 13px; }
  header .pathline { font-family: ui-monospace, Menlo, Consolas, monospace; color: #64748b; font-size: 12px; margin-top: 4px; }
  main { padding: 24px 32px; max-width: 1120px; margin: 0 auto; }
  .error { padding: 12px 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; margin-bottom: 20px; white-space: pre-wrap; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; color: #7f1d1d; }
  .step { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; overflow: hidden; }
  .step-head { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
  .step-n { display: inline-flex; width: 28px; height: 28px; border-radius: 6px; background: #0f172a; color: #fff; font-weight: 600; font-size: 12px; align-items: center; justify-content: center; }
  .step-label { font-weight: 600; font-size: 14px; }
  .step-ts { margin-left: auto; color: #94a3b8; font-size: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .step img { display: block; width: 100%; height: auto; }
  .index-card { display: block; padding: 14px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; text-decoration: none; color: inherit; transition: box-shadow 0.15s; }
  .index-card:hover { box-shadow: 0 2px 12px rgba(15,23,42,.06); }
  .index-card .row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .index-card .title { font-weight: 600; }
  .index-card .sub { color: #64748b; font-size: 12px; margin-top: 2px; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .empty { padding: 60px 20px; text-align: center; color: #64748b; }
  a.back { display: inline-block; margin-bottom: 16px; text-decoration: none; color: #0369a1; font-size: 13px; }
  a.back:hover { text-decoration: underline; }
`

function renderReport(m) {
  const stepsHtml = m.steps.length === 0
    ? `<div class="empty">This test didn't record any snapshots.</div>`
    : m.steps.map(s => `
      <div class="step">
        <div class="step-head">
          <span class="step-n">${s.n}</span>
          <span class="step-label">${esc(s.label)}</span>
          <span class="step-ts">${esc(s.ts?.slice(11, 19) ?? '')}</span>
        </div>
        <img loading="lazy" src="${esc(s.file)}" alt="${esc(s.label)}" />
      </div>`).join('')

  const errBlock = m.error ? `<div class="error">${esc(m.error)}</div>` : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(m.title)} — ${esc(m.spec)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
  <header>
    <a class="back" href="../../index.html">← All reports</a>
    <h1>${esc(m.title)}</h1>
    <div class="meta">${statusPill(m.status)} · ${esc(m.spec)} · ${m.steps.length} snapshot${m.steps.length === 1 ? '' : 's'} · ${formatMs(m.duration)}</div>
    <div class="pathline">${esc(m.file)}</div>
  </header>
  <main>
    ${errBlock}
    ${stepsHtml}
  </main>
</body>
</html>`
}

function renderIndex(all) {
  const bySpec = {}
  for (const m of all) {
    if (!bySpec[m.spec]) bySpec[m.spec] = []
    bySpec[m.spec].push(m)
  }

  const specHtml = Object.keys(bySpec).sort().map(spec => {
    const cards = bySpec[spec].map(m => `
      <a class="index-card" href="${esc(spec)}/${esc(m.slug)}/report.html">
        <div class="row">
          <div>
            <div class="title">${esc(m.title)}</div>
            <div class="sub">${esc(m.file)} · ${m.steps.length} step${m.steps.length === 1 ? '' : 's'} · ${formatMs(m.duration)}</div>
          </div>
          <div>${statusPill(m.status)}</div>
        </div>
      </a>`).join('')
    return `<section style="margin-bottom: 32px;">
      <h2 style="font-size: 15px; margin: 0 0 10px; color: #334155; letter-spacing: .04em; text-transform: uppercase;">${esc(spec)}</h2>
      ${cards}
    </section>`
  }).join('')

  const stats = {
    total:   all.length,
    passed:  all.filter(m => m.status === 'passed').length,
    failed:  all.filter(m => m.status === 'failed' || m.status === 'timedOut').length,
    skipped: all.filter(m => m.status === 'skipped').length,
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Playwright Reports — Optiluxent ERP</title>
<style>${BASE_CSS}
  .stats { display: flex; gap: 16px; margin: 8px 0 0; }
  .stat { padding: 12px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; min-width: 100px; }
  .stat .n { font-size: 24px; font-weight: 700; }
  .stat .l { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
</style>
</head>
<body>
  <header>
    <h1>Playwright Test Reports</h1>
    <div class="meta">Generated ${new Date().toISOString().replace('T', ' ').slice(0, 19)}</div>
    <div class="stats">
      <div class="stat"><div class="n">${stats.total}</div><div class="l">Tests</div></div>
      <div class="stat"><div class="n" style="color: #10b981">${stats.passed}</div><div class="l">Passed</div></div>
      <div class="stat"><div class="n" style="color: #ef4444">${stats.failed}</div><div class="l">Failed</div></div>
      <div class="stat"><div class="n" style="color: #94a3b8">${stats.skipped}</div><div class="l">Skipped</div></div>
    </div>
  </header>
  <main>
    ${specHtml || '<div class="empty">No test reports found. Run <code>npm run test:e2e:snap</code> first.</div>'}
  </main>
</body>
</html>`
}

async function readTests(dir) {
  const specs = await fs.readdir(dir).catch(() => [])
  const all = []
  for (const spec of specs) {
    const specDir = path.join(dir, spec)
    const stat = await fs.stat(specDir).catch(() => null)
    if (!stat?.isDirectory()) continue
    const testSlugs = await fs.readdir(specDir).catch(() => [])
    for (const slug of testSlugs) {
      const slugDir = path.join(specDir, slug)
      const stat2 = await fs.stat(slugDir).catch(() => null)
      if (!stat2?.isDirectory()) continue
      const jsonPath = path.join(slugDir, 'steps.json')
      const raw = await fs.readFile(jsonPath, 'utf8').catch(() => null)
      if (!raw) continue
      try { all.push(JSON.parse(raw)) } catch { /* skip malformed */ }
    }
  }
  return all
}

async function main() {
  const all = await readTests(REPORTS_DIR)

  for (const m of all) {
    const outDir  = path.join(REPORTS_DIR, m.spec, m.slug)
    const outFile = path.join(outDir, 'report.html')
    await fs.writeFile(outFile, renderReport(m))
  }

  await fs.writeFile(path.join(REPORTS_DIR, 'index.html'), renderIndex(all))

  console.log(`Generated ${all.length} test report${all.length === 1 ? '' : 's'}.`)
  console.log(`Master index: ${path.relative(process.cwd(), path.join(REPORTS_DIR, 'index.html'))}`)
}

main().catch(err => { console.error(err); process.exit(1) })
