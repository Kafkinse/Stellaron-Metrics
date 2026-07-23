import { Parts } from 'lib/constants/constants'
import { getCharacterConfig } from 'lib/conditionals/resolver/characterConfigRegistry'
import { Assets } from 'lib/rendering/assets'
import { getGameMetadata } from 'lib/state/gameMetadata'
import { getScoringMetadata } from 'lib/stores/scoring/scoringStore'
import styles from 'lib/tabs/tabDatabase/DatabaseTab.module.css'
import { type CharacterId } from 'types/character'
import { type LightConeId } from 'types/lightCone'

const statIcon = (stat: string) => Assets.getStatIcon(stat, stat.includes('%'))

const MAIN_STAT_PARTS: { part: string, label: string }[] = [
  { part: Parts.Body, label: 'Body' },
  { part: Parts.Feet, label: 'Feet' },
  { part: Parts.PlanarSphere, label: 'Sphere' },
  { part: Parts.LinkRope, label: 'Rope' },
]

function InlineStat({ stat }: { stat: string }) {
  return (
    <span className={styles.inlineStat}>
      <img src={statIcon(stat)} className={styles.inlineStatIcon} />
      {stat}
    </span>
  )
}

/** Recommended light cone, relics, main/substats and teammates for a character,
 * sourced from the same scoring metadata the optimizer's DPS benchmark uses. */
export function CharacterBuild({ id }: { id: CharacterId }) {
  const meta = getGameMetadata()
  const config = getCharacterConfig(id)
  const scoring = getScoringMetadata(id)
  const sim = scoring.simulation
  const sigLc = config?.defaultLightCone

  if (!sim && !sigLc) {
    return <div className={styles.placeholder}>No build recommendations yet</div>
  }

  const lcName = (lcId?: LightConeId) => (lcId ? meta.lightCones[lcId]?.name ?? '' : '')

  return (
    <>
      {sigLc && (
        <>
          <div className={styles.sectionTitle}>Light cone</div>
          <div className={styles.setRow}>
            <img src={Assets.getLightConeIconById(sigLc)} className={styles.setIcon} />
            <span className={styles.setName}>{lcName(sigLc)}</span>
          </div>
        </>
      )}

      {sim?.relicSets && sim.relicSets.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Relic sets</div>
          {sim.relicSets.map((combo, i) => {
            // A combo of one set (or the same set twice) is a 4-piece; two
            // different sets is a 2+2 split.
            const unique = [...new Set(combo)]
            const fourPiece = unique.length === 1
            return (
              <div key={i} className={styles.setRow}>
                <span className={styles.setIcons}>
                  {unique.map((set, j) => (
                    <img key={j} src={Assets.getSetImage(set, Parts.Head, true)} className={styles.setIcon} title={set} />
                  ))}
                </span>
                <span className={styles.setName}>{unique.join(' + ')}</span>
                <span className={styles.setPieces}>{fourPiece ? '4PC' : '2+2'}</span>
              </div>
            )
          })}
        </>
      )}

      {sim?.ornamentSets && sim.ornamentSets.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Planar ornaments</div>
          {sim.ornamentSets.map((set, i) => (
            <div key={i} className={styles.setRow}>
              <img src={Assets.getSetImage(set, Parts.PlanarSphere, true)} className={styles.setIcon} title={set} />
              <span className={styles.setName}>{set}</span>
              <span className={styles.setPieces}>2PC</span>
            </div>
          ))}
        </>
      )}

      {scoring.parts && (
        <>
          <div className={styles.sectionTitle}>Main stats</div>
          {MAIN_STAT_PARTS.map(({ part, label }) => {
            const stats = scoring.parts[part as keyof typeof scoring.parts]
            if (!stats || stats.length === 0) return null
            return (
              <div key={part} className={styles.mainStatRow}>
                <span className={styles.mainStatPart}>{label}</span>
                <span className={styles.mainStatValues}>
                  {stats.map((stat) => <InlineStat key={stat} stat={stat} />)}
                </span>
              </div>
            )
          })}
        </>
      )}

      {sim?.substats && sim.substats.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Substat priority</div>
          <div className={styles.substatRow}>
            {sim.substats.map((stat) => (
              <span key={stat} className={styles.substatChip}>
                <img src={statIcon(stat)} className={styles.inlineStatIcon} />
                {stat}
              </span>
            ))}
          </div>
        </>
      )}

      {sim?.teammates && sim.teammates.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Recommended teammates</div>
          <div className={styles.teammateGrid}>
            {sim.teammates.map((tm, i) => (
              <div key={i} className={styles.teammateCard}>
                <span className={styles.teammatePortrait}>
                  <img src={Assets.getCharacterAvatarById(tm.characterId)} className={styles.teammateIcon} loading='lazy' />
                  {tm.lightCone && (
                    <img src={Assets.getLightConeIconById(tm.lightCone)} className={styles.teammateLcBadge} loading='lazy' />
                  )}
                </span>
                <span>
                  <div className={styles.teammateName}>{meta.characters[tm.characterId]?.name ?? tm.characterId}</div>
                  {tm.lightCone && <div className={styles.teammateLcName}>{lcName(tm.lightCone)}</div>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
