import {
  Chip,
  Group,
  SegmentedControl,
  Slider,
  TextInput,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconSearch,
  IconX,
} from '@tabler/icons-react'
import { Assets } from 'lib/rendering/assets'
import { getGameMetadata } from 'lib/state/gameMetadata'
import { CharacterBuild } from 'lib/tabs/tabDatabase/CharacterBuild'
import styles from 'lib/tabs/tabDatabase/DatabaseTab.module.css'
import {
  ABILITY_SLOTS,
  getCharacterLore,
  type LoreAbility,
  type LoreExtraAbility,
  renderDescriptionSegments,
} from 'lib/tabs/tabDatabase/databaseLore'
import React, {
  useMemo,
  useState,
} from 'react'
import { type CharacterId } from 'types/character'

const STAT_KEYS = ['HP', 'ATK', 'DEF', 'SPD', 'CRIT Rate', 'CRIT DMG'] as const

function formatStat(key: string, value: number | undefined) {
  if (value == null) return '—'
  if (key.startsWith('CRIT')) return `${(value * 100).toFixed(1)}%`
  return String(Math.round(value))
}

function rarityClass(rarity: number) {
  if (rarity === 5) return styles.rarity5
  if (rarity === 4) return styles.rarity4
  return styles.rarity3
}

function rarityIconClass(rarity: number) {
  if (rarity === 5) return styles.iconR5
  if (rarity === 4) return styles.iconR4
  return styles.iconR3
}

// Max skill level reachable without eidolons: Basic ATK caps at 6, the rest at
// 10. Sliders open at that cap so descriptions show real end-game numbers.
function defaultAbilityLevel(tag: string, maxLevel: number) {
  const cap = /basic\s*atk/i.test(tag) ? 6 : 10
  return Math.min(maxLevel || 1, cap)
}

export function DatabaseCharactersTab() {
  const characters = useMemo(() => {
    const all = getGameMetadata().characters
    // Skip unreleased entries and base ids superseded by a released b1 revamp.
    const ids = Object.keys(all) as CharacterId[]
    const deprecated = new Set(
      ids
        .filter((id) => /b\d+$/.test(id) && !all[id].unreleased)
        .map((id) => id.replace(/b\d+$/, '')),
    )
    return Object.values(all)
      .filter((c) => {
        if (deprecated.has(c.id)) return false
        // Show beta (unreleased) characters only once their datamined kit is
        // available, so the entry isn't an empty shell.
        if (c.unreleased && !getCharacterLore(c.id)) return false
        return true
      })
      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
  }, [])

  const elements = useMemo(() => [...new Set(characters.map((c) => c.element))], [characters])
  const paths = useMemo(() => [...new Set(characters.map((c) => c.path))], [characters])

  const [search, setSearch] = useState('')
  const [elementFilter, setElementFilter] = useState<string[]>([])
  const [pathFilter, setPathFilter] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState(() => characters[0]?.id ?? '')
  // On narrow screens only one pane is shown at a time; opening a character
  // hides the list so the details page can be read comfortably.
  const [detailOpened, setDetailOpened] = useState(false)

  const hasFilters = elementFilter.length > 0 || pathFilter.length > 0

  const filtered = useMemo(() => characters.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (elementFilter.length && !elementFilter.includes(c.element)) return false
    if (pathFilter.length && !pathFilter.includes(c.path)) return false
    return true
  }), [characters, search, elementFilter, pathFilter])

  const selected = characters.find((c) => c.id === selectedId) ?? filtered[0]

  return (
    <div className={styles.root}>
      <h2 className={styles.pageTitle}>Character Database</h2>
      <div className={`${styles.layout} ${detailOpened ? styles.detailOpened : ''}`}>
        <div className={styles.listPane}>
          <div className={styles.filters}>
            <TextInput
              placeholder='Search characters'
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={200}
            />
            <Chip.Group multiple value={elementFilter} onChange={setElementFilter}>
              <Group gap={4}>
                {elements.map((e) => (
                  <Chip key={e} value={e} size='xs'>
                    <span className={styles.chipContent}>
                      <img src={Assets.getElement(e)} className={styles.chipIcon} />
                      {e}
                    </span>
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            <Chip.Group multiple value={pathFilter} onChange={setPathFilter}>
              <Group gap={4}>
                {paths.map((p) => (
                  <Chip key={p} value={p} size='xs'>
                    <span className={styles.chipContent}>
                      <img src={Assets.getPath(p)} className={styles.chipIcon} />
                      {p}
                    </span>
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            {hasFilters && (
              <button
                className={styles.clearTags}
                onClick={() => {
                  setElementFilter([])
                  setPathFilter([])
                }}
                title='Clear filters'
              >
                <IconX size={14} />
                Clear
              </button>
            )}
          </div>

          {filtered.length === 0
            ? <div className={styles.empty}>No characters match the filters</div>
            : (
              <div className={styles.grid}>
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    className={`${styles.card} ${c.id === selected?.id ? styles.cardActive : ''}`}
                    onClick={() => {
                      setSelectedId(c.id)
                      setDetailOpened(true)
                    }}
                  >
                    {c.unreleased && <span className={styles.betaBadge}>BETA</span>}
                    <img src={Assets.getCharacterAvatarById(c.id)} className={`${styles.cardIcon} ${rarityIconClass(c.rarity)}`} loading='lazy' />
                    <span className={styles.cardName}>
                      <span className={rarityClass(c.rarity)}>{'★'.repeat(c.rarity)}</span>
                      <br />
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>

        {selected && <CharacterDetails id={selected.id} onBack={() => setDetailOpened(false)} />}
      </div>
    </div>
  )
}

export function CharacterDetails({ id, onBack }: { id: CharacterId, onBack: () => void }) {
  const meta = getGameMetadata().characters[id]
  const lore = getCharacterLore(id)
  const [view, setView] = useState<'overview' | 'build'>('overview')

  // Abilities that buff a named ally (e.g. Cyrene's "Ode to ...") get their own
  // per-ally picker; the rest render inline like normal extra abilities.
  const targetedExtras = lore?.extraAbilities?.filter((a) => a.target) ?? []
  const regularExtras = lore?.extraAbilities?.filter((a) => !a.target) ?? []

  return (
    <div className={styles.detailPane}>
      <button className={styles.backButton} onClick={onBack}>
        <IconArrowLeft size={16} />
        Back to list
      </button>

      <div className={styles.detailHeader}>
        <img src={Assets.getCharacterAvatarById(id)} className={`${styles.detailPortrait} ${rarityIconClass(meta.rarity)}`} />
        <div>
          <h3 className={styles.detailName}>
            {meta.name}
            {meta.unreleased && <span className={styles.betaBadgeInline}>BETA</span>}
          </h3>
          <div className={styles.detailMeta}>
            <span className={rarityClass(meta.rarity)}>{'★'.repeat(meta.rarity)}</span>
          </div>
          {meta.unreleased && <div className={styles.betaNote}>Datamined — numbers may change</div>}
          <div className={styles.detailMeta}>
            <img src={Assets.getElement(meta.element)} className={styles.metaIcon} />
            {meta.element}
            <img src={Assets.getPath(meta.path)} className={styles.metaIcon} />
            {meta.path}
          </div>
        </div>
      </div>

      <SegmentedControl
        className={styles.detailTabs}
        fullWidth
        value={view}
        onChange={(v) => setView(v as 'overview' | 'build')}
        data={[{ label: 'Overview', value: 'overview' }, { label: 'Build', value: 'build' }]}
      />

      {view === 'build' ? <CharacterBuild id={id} /> : (
        <>
      <div className={styles.sectionTitle}>Base stats (Lv. 80)</div>
      <div className={styles.statsTable}>
        {STAT_KEYS.map((key) => (
          <div key={key} className={styles.statCell}>
            <div className={styles.statLabel}>{key}</div>
            <div className={styles.statValue}>{formatStat(key, meta.stats?.[key])}</div>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>Abilities</div>
      {ABILITY_SLOTS.map(({ key, label }) => (
        <AbilityBlock key={`${id}-${key}`} tag={label} ability={lore?.abilities[key]} />
      ))}
      {regularExtras.map((ability, i) => (
        <AbilityBlock key={`${id}-extra-${i}`} tag={ability.type} ability={ability} />
      ))}

      {targetedExtras.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Buffs by ally</div>
          <HeirBuffPicker abilities={targetedExtras} />
        </>
      )}

      <div className={styles.sectionTitle}>Traces</div>
      {lore?.majorTraces?.length
        ? lore.majorTraces.map((trace) => (
          <div key={trace.unlock + trace.name} className={styles.entryBlock}>
            <div className={styles.entryTag}>{trace.unlock}</div>
            <div className={styles.entryName}>{trace.name}</div>
            <p className={styles.entryDesc}>{trace.description}</p>
          </div>
        ))
        : <div className={styles.placeholder}>Text not available yet</div>}
      {meta.traces && Object.keys(meta.traces).length > 0 && (
        <>
          <div className={styles.sectionTitle}>Minor trace bonus</div>
          <div className={styles.statBonusGrid}>
            {Object.entries(meta.traces).map(([stat, value]) => (
              <div key={stat} className={styles.statBonusCard}>
                <img src={Assets.getStatIcon(stat, (value as number) < 1)} className={styles.statBonusIcon} />
                <div className={styles.statBonusLabel}>{stat}</div>
                <div className={styles.statBonusValue}>
                  +{(value as number) < 1 ? `${+((value as number) * 100).toFixed(1)}%` : value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.sectionTitle}>Eidolons</div>
      {lore?.eidolons?.length
        ? lore.eidolons.map((eidolon) => (
          <div key={eidolon.level} className={`${styles.entryBlock} ${styles.eidolonRow}`}>
            <img
              src={Assets.getCharacterRankImageById(id, eidolon.level)}
              className={styles.eidolonIcon}
              loading='lazy'
            />
            <div>
              <div className={styles.entryTag}>E{eidolon.level}</div>
              <div className={styles.entryName}>{eidolon.name}</div>
              <p className={styles.entryDesc}>{eidolon.description}</p>
            </div>
          </div>
        ))
        : <div className={styles.placeholder}>Text not available yet</div>}
        </>
      )}
    </div>
  )
}

/**
 * Picker for abilities that buff a specific ally (e.g. Cyrene's "Ode to ..."
 * set). Pick an ally by their portrait to read that ally's buff.
 */
// Targets whose name isn't unique in metadata (every Trailblazer path shares
// the name "Trailblazer") need an explicit id. Stelle's Remembrance portrait.
const TARGET_ID_ALIASES: Record<string, CharacterId> = {
  'trailblazer (remembrance)': '8008' as CharacterId,
}

function HeirBuffPicker({ abilities }: { abilities: LoreExtraAbility[] }) {
  const [index, setIndex] = useState(0)
  const idByName = useMemo(() => {
    const map = new Map<string, CharacterId>()
    for (const c of Object.values(getGameMetadata().characters)) {
      if (c.name) map.set(c.name.toLowerCase(), c.id)
    }
    return map
  }, [])

  const resolveTargetId = (name: string | undefined) => {
    if (!name) return undefined
    const key = name.toLowerCase()
    return TARGET_ID_ALIASES[key] ?? idByName.get(key)
  }

  const selected = abilities[Math.min(index, abilities.length - 1)]

  return (
    <div className={styles.entryBlock}>
      <div className={styles.heirPicker}>
        {abilities.map((ability, i) => {
          const cid = resolveTargetId(ability.target)
          return (
            <button
              key={ability.name}
              className={`${styles.heirIconBtn} ${i === index ? styles.heirIconActive : ''}`}
              onClick={() => setIndex(i)}
              title={ability.target}
            >
              {cid
                ? <img src={Assets.getCharacterAvatarById(cid)} className={styles.heirIcon} loading='lazy' />
                : <span className={styles.heirIconFallback}>{ability.target?.[0] ?? '?'}</span>}
            </button>
          )
        })}
      </div>
      <div className={styles.entryTag}>{selected.target}</div>
      {/* No key: the same body persists across ally switches so the chosen
          level is kept instead of resetting. Opens at 10 (non-eidolon cap). */}
      <AbilityBlockBody ability={selected} defaultLevel={Math.min(10, selected.params.length || 1)} />
    </div>
  )
}

function AbilityBlock({ tag, ability }: { tag: string, ability: LoreAbility | undefined }) {
  if (!ability?.name && !ability?.template) {
    return (
      <div className={styles.entryBlock}>
        <div className={styles.entryTag}>{tag}</div>
        <div className={styles.placeholder}>Text not available yet</div>
      </div>
    )
  }

  return (
    <div className={styles.entryBlock}>
      <div className={styles.entryTag}>{tag}</div>
      <AbilityBlockBody ability={ability} defaultLevel={defaultAbilityLevel(tag, ability.params.length)} />
    </div>
  )
}

/** Ability name, level slider and description — the body shared by the ability
 * block and the per-ally buff picker. Owns its own level state, opening at
 * `defaultLevel`; the shown level is clamped so switching abilities never
 * exceeds a shorter one's range. */
function AbilityBlockBody({ ability, defaultLevel = 1 }: { ability: LoreAbility, defaultLevel?: number }) {
  const [level, setLevel] = useState(defaultLevel)
  const maxLevel = ability.params.length
  const shown = Math.min(level, maxLevel || 1)

  return (
    <>
      <div className={styles.entryName}>{ability.name}</div>
      {maxLevel > 1 && (
        <div className={styles.levelRow}>
          <span className={styles.levelLabel}>Lv. {shown}/{maxLevel}</span>
          <Slider
            value={shown}
            onChange={setLevel}
            min={1}
            max={maxLevel}
            step={1}
            label={null}
            className={styles.levelSlider}
          />
        </div>
      )}
      <AbilityDescription ability={ability} level={shown} />
    </>
  )
}

/** Ability text with the level-dependent values highlighted in the accent color. */
export function AbilityDescription({ ability, level }: { ability: LoreAbility, level: number }) {
  return (
    <p className={styles.entryDesc}>
      {renderDescriptionSegments(ability, level).map((segment, i) =>
        segment.param
          ? <span key={i} className={styles.paramValue}>{segment.text}</span>
          : <React.Fragment key={i}>{segment.text}</React.Fragment>)}
    </p>
  )
}
