import lightConeRankings from 'data/lightcone_rankings.json' with { type: 'json' }
import { Parts } from 'lib/constants/constants'
import { getCharacterConfig } from 'lib/conditionals/resolver/characterConfigRegistry'
import { Assets } from 'lib/rendering/assets'
import { getGameMetadata } from 'lib/state/gameMetadata'
import { getScoringMetadata } from 'lib/stores/scoring/scoringStore'
import styles from 'lib/tabs/tabDatabase/DatabaseTab.module.css'
import { useMemo } from 'react'
import { type CharacterId } from 'types/character'
import { type LightConeId } from 'types/lightCone'

// Prydwen light-cone rankings (used with permission, credited in the UI):
// { [characterId]: [{ id: lightConeId, percent }] }, best first.
const rankings = lightConeRankings as Record<string, { id: string, percent: number }[]>

const statIcon = (stat: string) => Assets.getStatIcon(stat, stat.includes('%'))

const MAIN_STAT_PARTS: { part: string, label: string }[] = [
  { part: Parts.Body, label: 'Body' },
  { part: Parts.Feet, label: 'Feet' },
  { part: Parts.PlanarSphere, label: 'Sphere' },
  { part: Parts.LinkRope, label: 'Rope' },
]

const MAX_SETS = 4

function InlineStat({ stat }: { stat: string }) {
  return (
    <span className={styles.inlineStat}>
      <img src={statIcon(stat)} className={styles.inlineStatIcon} />
      {stat}
    </span>
  )
}

// Collapse relic-set combos to unique picks (a 4pc and the same set as a 2+2
// count once) and cap the list.
function uniqueRelicCombos(combos: string[][]): string[][] {
  const seen = new Set<string>()
  const out: string[][] = []
  for (const combo of combos) {
    const unique = [...new Set(combo)]
    const key = [...unique].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(unique)
    if (out.length >= MAX_SETS) break
  }
  return out
}

/** Recommended light cone(s), relics, main/substats and teams for a character,
 * from the same scoring metadata the optimizer's DPS benchmark uses. */
export function CharacterBuild({ id }: { id: CharacterId }) {
  const meta = getGameMetadata()
  const config = getCharacterConfig(id)
  const scoring = getScoringMetadata(id)
  const sim = scoring.simulation
  const sigLc = config?.defaultLightCone
  const charPath = meta.characters[id]?.path

  const lcName = (lcId?: LightConeId) => (lcId ? meta.lightCones[lcId]?.name ?? '' : '')

  // Light cones: prefer Prydwen's ranked list (by relative DMG %); otherwise
  // fall back to the signature plus same-path 5★ alternatives.
  const ranked = rankings[id]
  const usesPrydwen = !!ranked && ranked.length > 0
  const lightCones = useMemo(() => {
    if (usesPrydwen) {
      return ranked
        .filter((r) => meta.lightCones[r.id as LightConeId])
        .map((r) => ({ id: r.id as LightConeId, signature: r.id === sigLc, percent: r.percent }))
    }
    const list: { id: LightConeId, signature: boolean, percent?: number }[] = []
    if (sigLc) list.push({ id: sigLc, signature: true })
    Object.values(meta.lightCones)
      .filter((lc) => lc.path === charPath && lc.rarity === 5 && !lc.unreleased && lc.id !== sigLc)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 3)
      .forEach((lc) => list.push({ id: lc.id as LightConeId, signature: false }))
    return list
  }, [id, sigLc, charPath, meta, usesPrydwen, ranked])

  const relicSets = uniqueRelicCombos(sim?.relicSets ?? [])
  const ornaments = [...new Set(sim?.ornamentSets ?? [])].slice(0, MAX_SETS)

  // Team variations: prefer the curated leaderboard teams, else the single
  // recommended team.
  const teams: { characterId: CharacterId, lightCone?: LightConeId }[][] = useMemo(() => {
    if (sim?.leaderboardTeams?.length) {
      return sim.leaderboardTeams.map((team) =>
        team.teammates.map((tm) => ({ characterId: tm.characterId, lightCone: tm.lightCones?.[0] })))
    }
    if (sim?.teammates?.length) {
      return [sim.teammates.map((tm) => ({ characterId: tm.characterId, lightCone: tm.lightCone }))]
    }
    return []
  }, [sim])

  if (lightCones.length === 0 && !sim) {
    return <div className={styles.placeholder}>No build recommendations yet</div>
  }

  return (
    <>
      {lightCones.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Light cones</div>
          {lightCones.map(({ id: lcId, signature, percent }) => (
            <div key={lcId} className={styles.setRow}>
              <img src={Assets.getLightConeIconById(lcId)} className={styles.setIcon} />
              <span className={styles.setName}>{lcName(lcId)}</span>
              {signature && <span className={styles.setPieces}>SIG</span>}
              {percent != null && <span className={styles.setPieces}>{percent}%</span>}
            </div>
          ))}
          {usesPrydwen && (
            <a className={styles.attribution} href='https://www.prydwen.gg/star-rail/' target='_blank' rel='noreferrer'>
              Light cone rankings by Prydwen
            </a>
          )}
        </>
      )}

      {relicSets.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Relic sets</div>
          {relicSets.map((combo, i) => (
            <div key={i} className={styles.setRow}>
              <span className={styles.setIcons}>
                {combo.map((set, j) => (
                  <img key={j} src={Assets.getSetImage(set, Parts.Head, true)} className={styles.setIcon} title={set} />
                ))}
              </span>
              <span className={styles.setName}>{combo.join(' + ')}</span>
              <span className={styles.setPieces}>{combo.length === 1 ? '4PC' : '2+2'}</span>
            </div>
          ))}
        </>
      )}

      {ornaments.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Planar ornaments</div>
          {ornaments.map((set, i) => (
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

      {teams.length > 0 && (
        <>
          <div className={styles.sectionTitle}>{teams.length > 1 ? 'Team variations' : 'Recommended team'}</div>
          {teams.map((team, i) => (
            <div key={i} className={styles.teamBlock}>
              {teams.length > 1 && <div className={styles.teamLabel}>Team {i + 1}</div>}
              <div className={styles.teammateGrid}>
                {team.map((tm, j) => (
                  <div key={j} className={styles.teammateCard}>
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
            </div>
          ))}
        </>
      )}
    </>
  )
}
