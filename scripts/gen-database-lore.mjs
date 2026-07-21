// Generates src/data/database_lore.json — eidolon/ability texts for characters
// and passive/superimposition texts for light cones — by joining the project's
// game_data.json ids with the StarRailRes dataset (Mar-7th/StarRailRes), the
// same community dataset family this project already sources data from.
//
//   node scripts/gen-database-lore.mjs
//
// Notes:
// - Keys are the numeric ids from game_data.json (including `<id>b1` revamp
//   variants, which reuse the base id's entry with revamp-prefixed skills
//   preferred when present).
// - Ability/superimposition descriptions are rendered at max level from the
//   dataset's parameter tables. Missing text stays "" (never invented).
import { readFileSync, writeFileSync } from 'node:fs'

const SRR = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_min/en'

const gameData = JSON.parse(
  readFileSync(new URL('../src/data/game_data.json', import.meta.url), 'utf8'),
)

async function fetchJson(name) {
  const res = await fetch(`${SRR}/${name}`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return res.json()
}

const [srrCharacters, srrRanks, srrSkills, srrLcRanks, srrLcs] = await Promise.all([
  fetchJson('characters.json'),
  fetchJson('character_ranks.json'),
  fetchJson('character_skills.json'),
  fetchJson('light_cone_ranks.json'),
  fetchJson('light_cones.json'),
])

// --- template rendering -------------------------------------------------------
// Descriptions use placeholders like `#1[i]%` / `#2[f1]` with a params row per
// level. A trailing % means the value is a fraction to show as a percentage.
function renderTemplate(desc, params) {
  if (!desc) return ''
  let out = desc.replace(/#(\d+)\[(i|f\d)\](%?)/g, (_, idxStr, fmt, pct) => {
    const value = params?.[Number(idxStr) - 1]
    if (value == null) return ''
    const v = pct ? value * 100 : value
    const text = fmt === 'i'
      ? String(Math.round(v * 100) / 100) // ints in data may still be 12.5
      : v.toFixed(Number(fmt.slice(1)))
    return text + pct
  })
  // Strip simple markup tags the dataset occasionally carries.
  out = out.replace(/<\/?[a-z][^>]*>/gi, '').replace(/\\n/g, '\n')
  return out.trim()
}

// --- characters -----------------------------------------------------------------
const TYPE_TO_KEY = {
  'Basic ATK': 'basic_atk',
  'Skill': 'skill',
  'Ultimate': 'ultimate',
  'Talent': 'talent',
  'Technique': 'technique',
}

function buildAbilities(skillIds, preferRevamp) {
  const abilities = {
    basic_atk: { name: '', description: '' },
    skill: { name: '', description: '' },
    ultimate: { name: '', description: '' },
    talent: { name: '', description: '' },
    technique: { name: '', description: '' },
  }
  const extra = []
  // Group this character's skills by canonical slot, keeping every variant.
  const byKey = new Map()
  for (const sid of skillIds) {
    const s = srrSkills[sid]
    if (!s || !s.type_text) continue
    const key = TYPE_TO_KEY[s.type_text]
    const lastParams = s.params?.[s.params.length - 1]
    const entry = {
      id: String(s.id),
      type: s.type_text,
      name: s.name ?? '',
      description: renderTemplate(s.desc, lastParams),
    }
    if (!entry.name && !entry.description) continue
    if (key) {
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(entry)
    } else {
      extra.push({ type: entry.type, name: entry.name, description: entry.description })
    }
  }
  for (const [key, variants] of byKey) {
    // Revamped (b1) kits ship their texts under "1"-prefixed skill ids; prefer
    // those for b1 characters and the plain ids otherwise.
    const revamp = variants.find((v) => v.id.length > 6)
    const original = variants.find((v) => v.id.length <= 6)
    const chosen = (preferRevamp ? revamp ?? original : original ?? revamp)
    abilities[key] = { name: chosen.name, description: chosen.description }
    // Keep the remaining variants (e.g. enhanced basics) as extra entries.
    for (const v of variants) {
      if (v !== chosen) extra.push({ type: v.type, name: v.name, description: v.description })
    }
  }
  return { abilities, extra }
}

function buildEidolons(rankIds) {
  const eidolons = []
  for (const rid of rankIds) {
    const r = srrRanks[rid]
    if (!r) continue
    eidolons.push({ level: r.rank, name: r.name ?? '', description: (r.desc ?? '').trim() })
  }
  eidolons.sort((a, b) => a.level - b.level)
  return eidolons
}

// Base ids superseded by a released `<id>b1` revamp are deprecated — skip them.
const deprecatedBases = new Set(
  Object.keys(gameData.characters)
    .filter((id) => /b\d+$/.test(id) && !gameData.characters[id]?.unreleased)
    .map((id) => id.replace(/b\d+$/, '')),
)

const characters = {}
let charsMissing = []
for (const id of Object.keys(gameData.characters)) {
  const meta = gameData.characters[id]
  if (meta?.unreleased) continue
  if (deprecatedBases.has(id)) continue
  const baseId = id.replace(/b\d+$/, '')
  const srr = srrCharacters[baseId]
  if (!srr) {
    charsMissing.push(`${id} (${meta?.name ?? '?'})`)
    continue
  }
  const preferRevamp = /b\d+$/.test(id)
  const { abilities, extra } = buildAbilities(srr.skills ?? [], preferRevamp)
  characters[id] = {
    name: meta?.name ?? srr.name ?? '',
    path: meta?.path ?? '',
    element: meta?.element ?? '',
    abilities,
    ...(extra.length ? { extraAbilities: extra } : {}),
    eidolons: buildEidolons(srr.ranks ?? []),
  }
}

// --- light cones ------------------------------------------------------------------
const lightCones = {}
let lcMissing = []
for (const id of Object.keys(gameData.lightCones)) {
  const meta = gameData.lightCones[id]
  if (meta?.unreleased) continue
  const rank = srrLcRanks[id]
  if (!rank) {
    lcMissing.push(`${id} (${meta?.name ?? '?'})`)
    continue
  }
  lightCones[id] = {
    name: meta?.name ?? srrLcs[id]?.name ?? '',
    path: meta?.path ?? '',
    rarity: meta?.rarity ?? srrLcs[id]?.rarity ?? 0,
    passive: {
      name: rank.skill ?? '',
      superimpositions: (rank.params ?? []).map((p, i) => ({
        level: i + 1,
        description: renderTemplate(rank.desc, p),
      })),
    },
  }
}

const out = { characters, lightCones }
writeFileSync(
  new URL('../src/data/database_lore.json', import.meta.url),
  JSON.stringify(out, null, 2),
)

const totalChars = Object.keys(gameData.characters).filter((id) => !gameData.characters[id]?.unreleased).length
const totalLcs = Object.keys(gameData.lightCones).filter((id) => !gameData.lightCones[id]?.unreleased).length
console.log(`characters: ${Object.keys(characters).length}/${totalChars} filled`)
console.log(`lightCones: ${Object.keys(lightCones).length}/${totalLcs} filled`)
if (charsMissing.length) console.log('missing characters:', charsMissing.join(', '))
if (lcMissing.length) console.log('missing light cones:', lcMissing.join(', '))
