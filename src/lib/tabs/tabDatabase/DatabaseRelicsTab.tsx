import {
  Chip,
  Group,
  TextInput,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconSearch,
} from '@tabler/icons-react'
import {
  Parts,
  type Sets,
} from 'lib/constants/constants'
import { Assets } from 'lib/rendering/assets'
import {
  ornamentIndexToSetConfig,
  relicIndexToSetConfig,
} from 'lib/sets/setConfigRegistry'
import { getGameMetadata } from 'lib/state/gameMetadata'
import styles from 'lib/tabs/tabDatabase/DatabaseTab.module.css'
import React, {
  useMemo,
  useState,
} from 'react'

type SetKind = 'cavern' | 'planar'

interface SetEntry {
  set: Sets,
  ingameId: string,
  kind: SetKind,
  name: string,
  skills: string,
}

const CAVERN_PARTS = [Parts.Head, Parts.Hands, Parts.Body, Parts.Feet]
const PLANAR_PARTS = [Parts.PlanarSphere, Parts.LinkRope]

function buildEntries(): SetEntry[] {
  // relicSets carries the set-bonus text in a `skills` field that isn't part of
  // the declared DBMetadataSets type — extend it locally.
  const relicSets = getGameMetadata().relics.relicSets as Record<string, { id: string, name: string, skills?: string }>
  const entries: SetEntry[] = []
  for (const [kind, configs] of [['cavern', relicIndexToSetConfig], ['planar', ornamentIndexToSetConfig]] as const) {
    for (const config of configs) {
      const meta = relicSets[config.info.ingameId]
      if (!meta) continue
      entries.push({
        set: config.id,
        ingameId: config.info.ingameId,
        kind,
        name: meta.name ?? String(config.id),
        skills: meta.skills ?? '',
      })
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

export function DatabaseRelicsTab() {
  const entries = useMemo(buildEntries, [])

  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')
  const [selectedId, setSelectedId] = useState(() => entries[0]?.ingameId ?? '')
  const [detailOpened, setDetailOpened] = useState(false)

  const filtered = useMemo(() => entries.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    if (kind && e.kind !== kind) return false
    return true
  }), [entries, search, kind])

  const selected = entries.find((e) => e.ingameId === selectedId) ?? filtered[0]

  return (
    <div className={styles.root}>
      <h2 className={styles.pageTitle}>Relic Database</h2>
      <div className={`${styles.layout} ${detailOpened ? styles.detailOpened : ''}`}>
        <div className={styles.listPane}>
          <div className={styles.filters}>
            <TextInput
              placeholder='Search relic sets'
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={200}
            />
            <Chip.Group multiple={false} value={kind} onChange={(v) => setKind(v === kind ? '' : (v ?? ''))}>
              <Group gap={4}>
                <Chip value='cavern' size='xs'>Cavern Relics (4pc)</Chip>
                <Chip value='planar' size='xs'>Planar Ornaments (2pc)</Chip>
              </Group>
            </Chip.Group>
          </div>

          {filtered.length === 0
            ? <div className={styles.empty}>No relic sets match the filters</div>
            : (
              <div className={styles.grid}>
                {filtered.map((entry) => (
                  <button
                    key={entry.ingameId}
                    className={`${styles.card} ${entry.ingameId === selected?.ingameId ? styles.cardActive : ''}`}
                    onClick={() => {
                      setSelectedId(entry.ingameId)
                      setDetailOpened(true)
                    }}
                  >
                    <img src={Assets.getSetImage(entry.set, Parts.Head, true)} className={`${styles.cardIcon} ${styles.iconNeutral}`} loading='lazy' />
                    <span className={styles.cardName}>{entry.name}</span>
                  </button>
                ))}
              </div>
            )}
        </div>

        {selected && <RelicSetDetails entry={selected} onBack={() => setDetailOpened(false)} />}
      </div>
    </div>
  )
}

function RelicSetDetails({ entry, onBack }: { entry: SetEntry, onBack: () => void }) {
  const parts = entry.kind === 'cavern' ? CAVERN_PARTS : PLANAR_PARTS

  return (
    <div className={styles.detailPane}>
      <button className={styles.backButton} onClick={onBack}>
        <IconArrowLeft size={16} />
        Back to list
      </button>

      <div className={styles.detailHeader}>
        <img src={Assets.getSetImage(entry.set, Parts.Head, true)} className={`${styles.detailPortrait} ${styles.iconNeutral}`} />
        <div>
          <h3 className={styles.detailName}>{entry.name}</h3>
          <div className={styles.detailMeta}>
            {entry.kind === 'cavern' ? 'Cavern Relic Set · 2pc / 4pc' : 'Planar Ornament Set · 2pc'}
          </div>
        </div>
      </div>

      <div className={styles.sectionTitle}>Set bonuses</div>
      {entry.skills
        ? (
          <div className={styles.entryBlock}>
            <p className={styles.entryDesc}>{entry.skills}</p>
          </div>
        )
        : <div className={styles.placeholder}>Text not available yet</div>}

      <div className={styles.sectionTitle}>Pieces</div>
      <div className={styles.partsRow}>
        {parts.map((part) => (
          <img
            key={part}
            src={Assets.getSetImage(entry.set, part)}
            className={`${styles.partIcon} ${styles.iconNeutral}`}
            title={part}
            loading='lazy'
          />
        ))}
      </div>
    </div>
  )
}
