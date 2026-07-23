import {
  SegmentedControl,
  TextInput,
} from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { Assets } from 'lib/rendering/assets'
import { getGameMetadata } from 'lib/state/gameMetadata'
import { CharacterDetails } from 'lib/tabs/tabDatabase/DatabaseCharactersTab'
import {
  getCharacterLore,
  getLightConeLore,
} from 'lib/tabs/tabDatabase/databaseLore'
import { LightConeDetails } from 'lib/tabs/tabDatabase/DatabaseLightConesTab'
import styles from 'lib/tabs/tabDatabase/DatabaseTab.module.css'
import {
  useMemo,
  useState,
} from 'react'
import { type CharacterId } from 'types/character'
import { type LightConeId } from 'types/lightCone'

type Kind = 'characters' | 'lightCones'

function rarityIconClass(rarity: number) {
  if (rarity === 5) return styles.iconR5
  if (rarity === 4) return styles.iconR4
  return styles.iconR3
}

function rarityClass(rarity: number) {
  if (rarity === 5) return styles.rarity5
  if (rarity === 4) return styles.rarity4
  return styles.rarity3
}

/**
 * Leaks: datamined / unreleased (beta) characters and light cones, kept out of
 * the main Database so beta numbers are clearly separated. Entries appear here
 * automatically once their datamined kit is available.
 */
export function DatabaseLeaksTab() {
  const meta = getGameMetadata()

  const betaCharacters = useMemo(() =>
    Object.values(meta.characters)
      .filter((c) => c.unreleased && getCharacterLore(c.id))
      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)), [meta])

  const betaLightCones = useMemo(() =>
    Object.values(meta.lightCones)
      .filter((lc) => lc.unreleased && getLightConeLore(lc.id))
      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)), [meta])

  const hasChars = betaCharacters.length > 0
  const hasLightCones = betaLightCones.length > 0

  const [kind, setKind] = useState<Kind>(hasChars ? 'characters' : 'lightCones')
  const [search, setSearch] = useState('')
  const [charId, setCharId] = useState(() => betaCharacters[0]?.id ?? '')
  const [lcId, setLcId] = useState(() => betaLightCones[0]?.id ?? '')
  const [detailOpened, setDetailOpened] = useState(false)

  if (!hasChars && !hasLightCones) {
    return (
      <div className={styles.root}>
        <h2 className={styles.pageTitle}>Leaks</h2>
        <div className={styles.empty}>
          No beta content right now. Datamined characters and light cones from
          upcoming versions appear here automatically during beta cycles.
        </div>
      </div>
    )
  }

  const list = kind === 'characters' ? betaCharacters : betaLightCones
  const filtered = list.filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))

  const iconFor = (id: string) =>
    kind === 'characters' ? Assets.getCharacterAvatarById(id as CharacterId) : Assets.getLightConeIconById(id as LightConeId)
  const selectedId = kind === 'characters' ? charId : lcId
  const selectEntry = (id: string) => {
    if (kind === 'characters') setCharId(id as CharacterId)
    else setLcId(id as LightConeId)
    setDetailOpened(true)
  }

  return (
    <div className={styles.root}>
      <h2 className={styles.pageTitle}>Leaks</h2>
      <div className={`${styles.layout} ${detailOpened ? styles.detailOpened : ''}`}>
        <div className={styles.listPane}>
          <div className={styles.filters}>
            <TextInput
              placeholder='Search'
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={200}
            />
            <SegmentedControl
              value={kind}
              onChange={(v) => {
                setKind(v as Kind)
                setDetailOpened(false)
              }}
              data={[
                ...(hasChars ? [{ label: 'Characters', value: 'characters' }] : []),
                ...(hasLightCones ? [{ label: 'Light Cones', value: 'lightCones' }] : []),
              ]}
            />
          </div>

          {filtered.length === 0
            ? <div className={styles.empty}>Nothing matches the search</div>
            : (
              <div className={styles.grid}>
                {filtered.map((e) => (
                  <button
                    key={e.id}
                    className={`${styles.card} ${e.id === selectedId ? styles.cardActive : ''}`}
                    onClick={() => selectEntry(e.id)}
                  >
                    <span className={styles.betaBadge}>BETA</span>
                    <img src={iconFor(e.id)} className={`${styles.cardIcon} ${rarityIconClass(e.rarity)}`} loading='lazy' />
                    <span className={styles.cardName}>
                      <span className={rarityClass(e.rarity)}>{'★'.repeat(e.rarity)}</span>
                      <br />
                      {e.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>

        {kind === 'characters' && charId
          ? <CharacterDetails id={charId as CharacterId} onBack={() => setDetailOpened(false)} />
          : null}
        {kind === 'lightCones' && lcId
          ? <LightConeDetails id={lcId as LightConeId} onBack={() => setDetailOpened(false)} />
          : null}
      </div>
    </div>
  )
}
