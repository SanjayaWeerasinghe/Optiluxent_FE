#!/usr/bin/env node
// Runs each spec file one at a time (so each spec's snapshots are grouped
// cleanly and a bad spec doesn't stop the world) then generates the HTML
// documents from the reporter fixture's JSON output.

import { promises as fs } from 'fs'
import path                from 'path'
import { spawn }           from 'child_process'
import { fileURLToPath }   from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')

async function findSpecs(dir) {
  const out = []
  async function walk(d) {
    const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) await walk(full)
      else if (e.isFile() && e.name.endsWith('.spec.ts')) out.push(path.relative(ROOT, full).replace(/\\/g, '/'))
    }
  }
  await walk(dir)
  return out.sort()
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd: ROOT, ...opts })
    child.on('exit', code => resolve(code ?? 1))
  })
}

async function main() {
  const headed = process.argv.includes('--headed')

  console.log('▸ Clearing previous reports...')
  // Windows sometimes holds a lock on the directory root. Retry a few times,
  // and if the rmdir on the root fails, at least clear the subdirs so the
  // next run doesn't mix results.
  const reportsRoot = path.join(ROOT, 'e2e', 'reports')
  async function clear() {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await fs.rm(reportsRoot, { recursive: true, force: true })
        return
      } catch (e) {
        if (attempt === 4) throw e
        await new Promise(r => setTimeout(r, 500))
      }
    }
  }
  try {
    await clear()
  } catch (e) {
    console.warn(`   ↳ couldn't remove ${reportsRoot} (${e.code ?? e.message}). Clearing subdirs instead.`)
    const entries = await fs.readdir(reportsRoot, { withFileTypes: true }).catch(() => [])
    for (const ent of entries) {
      await fs.rm(path.join(reportsRoot, ent.name), { recursive: true, force: true }).catch(() => {})
    }
  }

  const specs = await findSpecs(path.join(ROOT, 'e2e'))
  if (specs.length === 0) {
    console.error('No spec files found under e2e/')
    process.exit(1)
  }
  console.log(`▸ Running ${specs.length} spec file${specs.length === 1 ? '' : 's'}:`)
  specs.forEach(s => console.log(`   · ${s}`))
  console.log('')

  let anyFailed = false
  for (const spec of specs) {
    console.log(`\n─── ${spec} ───────────────────────────────`)
    const args = ['playwright', 'test', spec, '--reporter=list', '--workers=1']
    if (headed) args.push('--headed')
    const code = await run('npx', args)
    if (code !== 0) {
      anyFailed = true
      console.log(`   ↳ spec exited with code ${code} (continuing)`)
    }
  }

  console.log('\n▸ Generating HTML reports...')
  await run('node', ['scripts/generate-reports.mjs'])

  const indexPath = path.join(ROOT, 'e2e', 'reports', 'index.html')
  console.log(`\nDone. Open the master index:\n  ${indexPath}`)
  if (anyFailed) {
    console.log('\nSome specs failed — the report shows exactly which and where.')
    process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
