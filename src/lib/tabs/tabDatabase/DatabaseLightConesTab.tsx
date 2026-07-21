import {
  Chip,
  Group,
  TextInput,
} from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { Assets } from 'lib/rendering/assets'
import { getGameMetadata } from 'lib/state/gameMetadata'
import styles from 'lib/tabs/tabDatabase/DatabaseTab.module.css'
import { getLightConeLore } from 'lib/tabs/tabDatabase/databaseLore'
import React, {
  useMemo,
  useState,
} from 'react'
import { type LightConeId } from 'types/lightCone'

const STAT_KEYS = ['HP', 'ATK', 'DEF'] as const

function rarityClass(rarity: number) {
  if (rarity === 5) return styles.rarity5
  if (rarity === 4) return styles.rarity4
  return styles.rarity3
}

export function DatabaseLightConesTab() {
  const lightCones = useMemo(() =>
    Object.values(getGameMetadata().lightCones)
      .filter((lc) => !lc.unreleased)
      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)), [])

  const paths = useMemo(() => [...new Set(lightCones.map((lc) => lc.path))], [lightCones])

  const [search, setSearch] = useState('')
  const [path, setPath] = useState('')
  const [selectedId, setSelectedId] = useState(() => lightCones[0]?.id ?? '')

  const filtered = useMemo(() => lightCones.filter((lc) => {
    if (search && !lc.name.toLowerCase().includes(search.toLowerCase())) return false
    if (path && lc.path !== path) return false
    return true
  }), [lightCones, search, path])

  const selected = lightCones.find((lc) => lc.id === selectedId) ?? filtered[0]

  return (
    <div className={styles.root}>
      <h2 className={styles.pageTitle}>Light Cone Database</h2>
      <div className={styles.layout}>
        <div className={styles.listPane}>
          <div className={styles.filters}>
            <TextInput
              placeholder='Search light cones'
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={200}
            />
            <Chip.Group multiple={false} value={path} onChange={(v) => setPath(v === path ? '' : (v ?? ''))}>
              <Group gap={4}>
                {paths.map((p) => <Chip key={p} value={p} size='xs'>{p}</Chip>)}
              </Group>
            </Chip.Group>
          </div>

          {filtered.length === 0
            ? <div className={styles.empty}>No light cones match the filters</div>
            : (
              <div className={styles.grid}>
                {filtered.map((lc) => (
                  <button
                    key={lc.id}
                    className={`${styles.card} ${lc.id === selected?.id ? styles.cardActive : ''}`}
                    onClick={() => setSelectedId(lc.id)}
                  >
                    <img src={Assets.getLightConeIconById(lc.id)} className={styles.cardIcon} loading='lazy' />
                    <span className={styles.cardName}>
                      <span className={rarityClass(lc.rarity)}>{'★'.repeat(lc.rarity)}</span>
                      <br />
                      {lc.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>

        {selected && <LightConeDetails id={selected.id} />}
      </div>
    </div>
  )
}

function LightConeDetails({ id }: { id: LightConeId }) {
  const meta = getGameMetadata().lightCones[id]
  const lore = getLightConeLore(id)
  const [superimposition, setSuperimposition] = useState('1')

  const description = lore?.passive.superimpositions
    .find((s) => s.level === Number(superimposition))?.description

  return (
    <div className={styles.detailPane}>
      <div className={styles.detailHeader}>
        <img src={Assets.getLightConeIconById(id)} className={styles.detailPortrait} />
        <div>
          <h3 className={styles.detailName}>{meta.name}</h3>
          <div className={styles.detailMeta}>
            <span className={rarityClass(meta.rarity)}>{'★'.repeat(meta.rarity)}</span>
          </div>
          <div className={styles.detailMeta}>
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
            <div className={styles.statValue}>
              {meta.stats?.[key] != null ? Math.round(meta.stats[key]) : '—'}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>Passive</div>
      {lore?.passive.name || description
        ? (
          <div className={styles.entryBlock}>
            <div className={styles.entryName}>{lore?.passive.name}</div>
            <Chip.Group multiple={false} value={superimposition} onChange={(v) => setSuperimposition(v ?? '1')}>
              <Group gap={4} mb={8} mt={4}>
                {['1', '2', '3', '4', '5'].map((level) => (
                  <Chip key={level} value={level} size='xs'>S{level}</Chip>
                ))}
              </Group>
            </Chip.Group>
            <p className={styles.entryDesc}>{description ?? ''}</p>
          </div>
        )
        : <div className={styles.placeholder}>Text not available yet</div>}
    </div>
  )
}
