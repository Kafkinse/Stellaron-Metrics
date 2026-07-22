import {
  Chip,
  Group,
  Slider,
  TextInput,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconSearch,
} from '@tabler/icons-react'
import { Assets } from 'lib/rendering/assets'
import { getGameMetadata } from 'lib/state/gameMetadata'
import styles from 'lib/tabs/tabDatabase/DatabaseTab.module.css'
import {
  ABILITY_SLOTS,
  getCharacterLore,
  type LoreAbility,
  renderAbilityDescription,
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
      .filter((c) => !c.unreleased && !deprecated.has(c.id))
      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
  }, [])

  const elements = useMemo(() => [...new Set(characters.map((c) => c.element))], [characters])
  const paths = useMemo(() => [...new Set(characters.map((c) => c.path))], [characters])

  const [search, setSearch] = useState('')
  const [element, setElement] = useState('')
  const [path, setPath] = useState('')
  const [selectedId, setSelectedId] = useState(() => characters[0]?.id ?? '')
  // On narrow screens only one pane is shown at a time; opening a character
  // hides the list so the details page can be read comfortably.
  const [detailOpened, setDetailOpened] = useState(false)

  const filtered = useMemo(() => characters.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (element && c.element !== element) return false
    if (path && c.path !== path) return false
    return true
  }), [characters, search, element, path])

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
            <Chip.Group multiple={false} value={element} onChange={(v) => setElement(v === element ? '' : (v ?? ''))}>
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
            <Chip.Group multiple={false} value={path} onChange={(v) => setPath(v === path ? '' : (v ?? ''))}>
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
                    <img src={Assets.getCharacterAvatarById(c.id)} className={styles.cardIcon} loading='lazy' />
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

function CharacterDetails({ id, onBack }: { id: CharacterId, onBack: () => void }) {
  const meta = getGameMetadata().characters[id]
  const lore = getCharacterLore(id)

  return (
    <div className={styles.detailPane}>
      <button className={styles.backButton} onClick={onBack}>
        <IconArrowLeft size={16} />
        Back to list
      </button>

      <div className={styles.detailHeader}>
        <img src={Assets.getCharacterAvatarById(id)} className={styles.detailPortrait} />
        <div>
          <h3 className={styles.detailName}>{meta.name}</h3>
          <div className={styles.detailMeta}>
            <span className={rarityClass(meta.rarity)}>{'★'.repeat(meta.rarity)}</span>
          </div>
          <div className={styles.detailMeta}>
            <img src={Assets.getElement(meta.element)} className={styles.metaIcon} />
            {meta.element}
            <img src={Assets.getPath(meta.path)} className={styles.metaIcon} />
            {meta.path}
          </div>
        </div>
      </div>

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
      {lore?.extraAbilities?.map((ability, i) => (
        <AbilityBlock key={`${id}-extra-${i}`} tag={ability.type} ability={ability} />
      ))}

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
        <div className={styles.entryBlock}>
          <div className={styles.entryTag}>Minor traces total</div>
          <p className={styles.entryDesc}>
            {Object.entries(meta.traces)
              .map(([stat, value]) => `${stat} +${value < 1 ? `${+(value * 100).toFixed(1)}%` : value}`)
              .join(' · ')}
          </p>
        </div>
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
    </div>
  )
}

function AbilityBlock({ tag, ability }: { tag: string, ability: LoreAbility | undefined }) {
  const [level, setLevel] = useState(1)
  const maxLevel = ability?.params.length ?? 0

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
      <div className={styles.entryName}>{ability.name}</div>
      {maxLevel > 1 && (
        <div className={styles.levelRow}>
          <span className={styles.levelLabel}>Lv. {level}/{maxLevel}</span>
          <Slider
            value={level}
            onChange={setLevel}
            min={1}
            max={maxLevel}
            step={1}
            label={null}
            className={styles.levelSlider}
          />
        </div>
      )}
      <p className={styles.entryDesc}>{renderAbilityDescription(ability, level)}</p>
    </div>
  )
}
