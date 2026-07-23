// Generates src/data/lightcone_rankings.json — a per-character light-cone
// ranking scraped from Prydwen (https://www.prydwen.gg), used with the site
// owner's permission and credited in the UI.
//
//   node scripts/gen-prydwen-rankings.mjs
//
// We extract ONLY factual ranking data: the light cone and its relative
// performance percentage. Prydwen's written analysis / usage stats are their
// editorial content and are deliberately NOT scraped or stored.
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'https://www.prydwen.gg/star-rail/characters'

const gameData = JSON.parse(
  readFileSync(new URL('../src/data/game_data.json', import.meta.url), 'utf8'),
)

// Character name -> Prydwen slug. Most are the lowercased, hyphenated name;
// add exceptions here as they surface from failed fetches.
const SLUG_OVERRIDES = {}

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

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const PERCENT = /(\d{1,3}(?:\.\d+)?)\s*%/g

// For a light cone name found in the ranking region, associate the nearest
// percentage that precedes it (Prydwen prints "125.50%" then the cone name).
function percentBeforeIndex(text, nameIndex) {
  let best = null
  PERCENT.lastIndex = 0
  let m
  while ((m = PERCENT.exec(text)) !== null) {
    if (m.index > nameIndex) break
    best = { value: Number(m[1]), index: m.index }
  }
  // Only trust a percentage that's reasonably close to the name (same block).
  if (best && nameIndex - best.index < 400) return best.value
  return null
}

async function fetchCharacterPage(slug) {
  const res = await fetch(`${BASE}/${slug}`, {
    headers: { 'User-Agent': 'Stellaron-Metrics ranking sync (with permission)' },
  })
  if (!res.ok) return null
  return res.text()
}

function rankingsFromText(text, coneNames) {
  // Narrow to the "Best Light Cones" region so cone names mentioned elsewhere
  // (teams, synergies) don't get picked up.
  const start = text.search(/best light cones/i)
  if (start === -1) return []
  const after = text.slice(start + 16)
  const endMatch = after.search(/best relics|best relic sets|best planar|best team|teams? & synerg|final comments/i)
  const region = endMatch === -1 ? after : after.slice(0, endMatch)

  const found = []
  for (const { id, name } of coneNames) {
    const idx = region.search(new RegExp(escapeRegExp(name)))
    if (idx === -1) continue
    const percent = percentBeforeIndex(region, idx)
    if (percent == null) continue
    found.push({ id, percent })
  }
  // Highest performance first; de-dupe by cone id.
  const seen = new Set()
  return found
    .sort((a, b) => b.percent - a.percent)
    .filter((r) => (seen.has(r.id) ? false : seen.add(r.id)))
}

const lightCones = Object.values(gameData.lightCones)
const conesByPath = new Map()
for (const lc of lightCones) {
  if (!lc.path) continue
  if (!conesByPath.has(lc.path)) conesByPath.set(lc.path, [])
  conesByPath.get(lc.path).push({ id: String(lc.id), name: lc.name })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const out = {}
let ok = 0
const missing = []
for (const [id, character] of Object.entries(gameData.characters)) {
  if (character?.unreleased) continue
  const name = character.name
  if (!name) continue
  const slug = SLUG_OVERRIDES[name] ?? toSlug(name)
  const coneNames = conesByPath.get(character.path) ?? []
  if (coneNames.length === 0) continue
  try {
    const html = await fetchCharacterPage(slug)
    if (!html) {
      missing.push(`${name} (${slug})`)
      continue
    }
    const ranking = rankingsFromText(stripToText(html), coneNames)
    if (ranking.length > 0) {
      out[id] = ranking
      ok++
    } else {
      missing.push(`${name} (no ranking parsed)`)
    }
  } catch (e) {
    missing.push(`${name} (${e.message})`)
  }
  await sleep(300) // be gentle with Prydwen
}

writeFileSync(
  new URL('../src/data/lightcone_rankings.json', import.meta.url),
  JSON.stringify(out, null, 2),
)

console.log(`lightcone rankings: ${ok} characters`)
if (missing.length) console.log('missing / unparsed:', missing.join(', '))
