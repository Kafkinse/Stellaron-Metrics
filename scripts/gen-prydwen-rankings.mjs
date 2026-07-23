// Generates src/data/prydwen_rankings.json — per-character ORDER of the best
// light cones, relic sets and planar ornaments, scraped from Prydwen
// (https://www.prydwen.gg) with the site owner's permission and credited in
// the UI.
//
//   node scripts/gen-prydwen-rankings.mjs
//
// We keep ONLY the ordering (which cone/set is ranked above which). Prydwen's
// performance percentages, usage stats and written analysis are their content
// and are deliberately not stored — we sort by their numbers, then drop them.
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'https://www.prydwen.gg/star-rail/characters'

const gameData = JSON.parse(
  readFileSync(new URL('../src/data/game_data.json', import.meta.url), 'utf8'),
)

// Character name -> Prydwen slug. Most are the lowercased, hyphenated name;
// add exceptions here as they surface from failed fetches.
const SLUG_OVERRIDES = {}

const MAX = 6

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[•’'.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stripToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;|&rsquo;/g, '\'')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const PERCENT = /(\d{1,3}(?:\.\d+)?)\s*%/g

// Nearest percentage that precedes a name (Prydwen prints "100.00%" then the
// item), within the same block.
function percentBeforeIndex(text, nameIndex) {
  let best = null
  PERCENT.lastIndex = 0
  let m
  while ((m = PERCENT.exec(text)) !== null) {
    if (m.index > nameIndex) break
    best = { value: Number(m[1]), index: m.index }
  }
  if (best && nameIndex - best.index < 400) return best.value
  return null
}

// Ordered ids/names for a set of candidates found within a text region.
function orderByPercent(region, candidates) {
  const found = []
  for (const { key, name } of candidates) {
    const idx = region.search(new RegExp(escapeRegExp(name)))
    if (idx === -1) continue
    const percent = percentBeforeIndex(region, idx)
    if (percent == null) continue
    found.push({ key, percent })
  }
  const seen = new Set()
  return found
    .sort((a, b) => b.percent - a.percent)
    .filter((r) => (seen.has(r.key) ? false : seen.add(r.key)))
    .slice(0, MAX)
    .map((r) => r.key)
}

function sliceRegion(text, startRe, endRes) {
  const start = text.search(startRe)
  if (start === -1) return null
  const after = text.slice(start)
  let end = after.length
  for (const re of endRes) {
    const i = after.slice(1).search(re)
    if (i !== -1) end = Math.min(end, i + 1)
  }
  return after.slice(0, end)
}

async function fetchCharacterPage(slug) {
  const res = await fetch(`${BASE}/${slug}`, {
    headers: { 'User-Agent': 'Stellaron-Metrics ranking sync (with permission)' },
  })
  if (!res.ok) return null
  return res.text()
}

// Candidate lists from our own data.
const conesByPath = new Map()
for (const lc of Object.values(gameData.lightCones)) {
  if (!lc.path) continue
  if (!conesByPath.has(lc.path)) conesByPath.set(lc.path, [])
  conesByPath.get(lc.path).push({ key: String(lc.id), name: lc.name })
}
const cavernSets = gameData.relics.filter((r) => Number(r.id) < 300).map((r) => ({ key: r.name, name: r.name }))
const planarSets = gameData.relics.filter((r) => Number(r.id) >= 300).map((r) => ({ key: r.name, name: r.name }))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const out = {}
let ok = 0
const missing = []
for (const [id, character] of Object.entries(gameData.characters)) {
  if (character?.unreleased || !character.name) continue
  const slug = SLUG_OVERRIDES[character.name] ?? toSlug(character.name)
  try {
    const html = await fetchCharacterPage(slug)
    if (!html) {
      missing.push(`${character.name} (404 ${slug})`)
      continue
    }
    const text = stripToText(html)
    const lcRegion = sliceRegion(text, /best light cones/i, [/best relic/i, /best stats/i, /best team/i]) ?? ''
    const relicRegion = sliceRegion(text, /best relic/i, [/best stats/i, /best team/i, /synerg/i]) ?? ''

    const entry = {
      lightCones: orderByPercent(lcRegion, conesByPath.get(character.path) ?? []),
      relics: orderByPercent(relicRegion, cavernSets),
      ornaments: orderByPercent(relicRegion, planarSets),
    }
    if (entry.lightCones.length || entry.relics.length || entry.ornaments.length) {
      out[id] = entry
      ok++
    } else {
      missing.push(`${character.name} (nothing parsed)`)
    }
  } catch (e) {
    missing.push(`${character.name} (${e.message})`)
  }
  await sleep(300)
}

writeFileSync(
  new URL('../src/data/prydwen_rankings.json', import.meta.url),
  JSON.stringify(out, null, 2),
)

console.log(`prydwen rankings: ${ok} characters`)
if (missing.length) console.log('missing / unparsed:', missing.join(', '))
