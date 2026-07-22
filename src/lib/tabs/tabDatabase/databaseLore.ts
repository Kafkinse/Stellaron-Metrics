import loreData from 'data/database_lore.json' with { type: 'json' }

// Typed access to the generated lore dataset (see scripts/gen-database-lore.mjs).
// Ability descriptions are stored as templates with per-level parameter tables,
// so the UI can render any level with a slider. Entries may be missing or empty
// for brand-new content — consumers must treat every lookup as optional and
// render a placeholder instead of crashing.

export interface LoreAbility {
  name: string,
  template: string,
  params: number[][],
}

export interface LoreExtraAbility extends LoreAbility {
  type: string,
}

export interface LoreEidolon {
  level: number,
  name: string,
  description: string,
}

export interface LoreMajorTrace {
  unlock: string, // 'A2' | 'A4' | 'A6'
  name: string,
  description: string,
}

export interface CharacterLore {
  name: string,
  path: string,
  element: string,
  abilities: {
    basic_atk: LoreAbility,
    skill: LoreAbility,
    ultimate: LoreAbility,
    talent: LoreAbility,
    technique: LoreAbility,
  },
  extraAbilities?: LoreExtraAbility[],
  majorTraces?: LoreMajorTrace[],
  eidolons: LoreEidolon[],
}

export interface LoreSuperimposition {
  level: number,
  description: string,
}

export interface LightConeLore {
  name: string,
  path: string,
  rarity: number,
  passive: {
    name: string,
    superimpositions: LoreSuperimposition[],
  },
}

interface DatabaseLore {
  characters: Record<string, CharacterLore>,
  lightCones: Record<string, LightConeLore>,
}

const lore = loreData as unknown as DatabaseLore

export function getCharacterLore(id: string): CharacterLore | undefined {
  return lore.characters[id]
}

export function getLightConeLore(id: string): LightConeLore | undefined {
  return lore.lightCones[id]
}

/**
 * Render an ability template at a given level (1-based). Placeholders look
 * like `#1[i]%` / `#2[f1]`: index into the level's parameter row, `i` rounds,
 * `fN` fixes decimals, and a trailing `%` means the value is a fraction.
 */
export function renderAbilityDescription(ability: LoreAbility, level: number): string {
  const row = ability.params[Math.min(Math.max(level, 1), ability.params.length) - 1]
  if (!row) return ability.template
  return ability.template.replace(/#(\d+)\[(i|f\d)\](%?)/g, (_, idxStr: string, fmt: string, pct: string) => {
    const value = row[Number(idxStr) - 1]
    if (value == null) return ''
    const v = pct ? value * 100 : value
    const text = fmt === 'i' ? String(Math.round(v * 100) / 100) : v.toFixed(Number(fmt.slice(1)))
    return text + pct
  })
}

export const ABILITY_SLOTS: { key: keyof CharacterLore['abilities'], label: string }[] = [
  { key: 'basic_atk', label: 'Basic ATK' },
  { key: 'skill', label: 'Skill' },
  { key: 'ultimate', label: 'Ultimate' },
  { key: 'talent', label: 'Talent' },
  { key: 'technique', label: 'Technique' },
]
