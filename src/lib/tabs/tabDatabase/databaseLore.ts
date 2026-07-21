import loreData from 'data/database_lore.json' with { type: 'json' }

// Typed access to the generated lore dataset (see scripts/gen-database-lore.mjs).
// Entries may be missing or empty for brand-new content — consumers must treat
// every lookup as optional and render a placeholder instead of crashing.

export interface LoreAbility {
  name: string,
  description: string,
}

export interface LoreExtraAbility extends LoreAbility {
  type: string,
}

export interface LoreEidolon {
  level: number,
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

export const ABILITY_SLOTS: { key: keyof CharacterLore['abilities'], label: string }[] = [
  { key: 'basic_atk', label: 'Basic ATK' },
  { key: 'skill', label: 'Skill' },
  { key: 'ultimate', label: 'Ultimate' },
  { key: 'talent', label: 'Talent' },
  { key: 'technique', label: 'Technique' },
]
