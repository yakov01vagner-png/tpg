import { type Rng, nextInt, rollChance } from './rng'
import type { Alliance, Politics, Tribute, War } from './war'
import { allied, atWar, pairOf } from './war'
import type { World } from './world/types'

/**
 * Договор и союз.
 *
 * Прогон на век показал войну, которая кончается ничем: сто с лишним объявлений
 * и столько же «миров», после которых всё как было. Мир должен чего-то стоить —
 * данью, землёй или союзом, — иначе воевать незачем и мириться незачем тоже.
 */
export type DiplomacyEvent =
  | { readonly type: 'tributeAgreed'; readonly tribute: Tribute }
  | { readonly type: 'allianceMade'; readonly alliance: Alliance }
  | { readonly type: 'allianceBroken'; readonly a: string; readonly b: string }
  | { readonly type: 'joinedWar'; readonly ally: string; readonly against: string }

export interface DiplomacyResult {
  readonly politics: Politics
  readonly rng: Rng
  readonly events: readonly DiplomacyEvent[]
}

/** Отношение, ниже которого союз распадается. */
const ALLIANCE_FLOOR = -20
/** Сколько дней союзник раздумывает, вступать ли в чужую войну. */
const JOIN_WINDOW = 20

/** Отношение, выше которого о союзе вообще заговаривают. */
const ALLIANCE_FLOOR_TO_MAKE = 35

export function tickDiplomacy(
  world: World,
  politics: Politics,
  day: number,
  rng: Rng,
): DiplomacyResult {
  let generator = rng
  const events: DiplomacyEvent[] = []
  const kingdoms = Object.keys(world.kingdoms)
  if (kingdoms.length < 2) return { politics, rng: generator, events }

  const relations: Record<string, number> = { ...politics.relations }
  let alliances = [...politics.alliances]
  let wars = [...politics.wars]

  // Отношение движется само: война портит, мир лечит. Медленно — чтобы старые
  // обиды помнились дольше одной кампании.
  for (let i = 0; i < kingdoms.length; i += 1) {
    for (let j = i + 1; j < kingdoms.length; j += 1) {
      const a = kingdoms[i] as string
      const b = kingdoms[j] as string
      const key = pairOf(a, b)
      const current = relations[key] ?? 0
      const shift = atWar(politics, a, b) ? -0.25 : 0.05
      relations[key] = Math.max(-100, Math.min(100, current + shift))
    }
  }

  // Дань: срок вышел — платить перестают.
  const tributes = politics.tributes.filter((one) => one.untilDay > day)

  // Союз заключают те, кто давно в ладу и ни с кем из своих не воюет.
  const [wantsPact, afterPact] = rollChance(generator, 0.002)
  generator = afterPact
  if (wantsPact) {
    const [first, afterFirst] = nextInt(generator, 0, kingdoms.length - 1)
    const [second, afterSecond] = nextInt(afterFirst, 0, kingdoms.length - 1)
    generator = afterSecond
    const a = kingdoms[first] as string
    const b = kingdoms[second] as string
    if (
      a !== b &&
      !allied(politics, a, b) &&
      !atWar(politics, a, b) &&
      (relations[pairOf(a, b)] ?? 0) > ALLIANCE_FLOOR_TO_MAKE
    ) {
      const alliance: Alliance = { a, b, since: day, byMarriage: false }
      alliances = [...alliances, alliance]
      events.push({ type: 'allianceMade', alliance })
    }
  }

  // Союз держится на отношении: разонравились — разошлись. Скреплённый браком
  // терпит дольше, на то он и брак.
  alliances = alliances.filter((pact) => {
    const value = relations[pairOf(pact.a, pact.b)] ?? 0
    const floor = pact.byMarriage ? ALLIANCE_FLOOR - 25 : ALLIANCE_FLOOR
    if (value >= floor) return true
    events.push({ type: 'allianceBroken', a: pact.a, b: pact.b })
    return false
  })

  // Союзник входит в чужую войну: за это союзы и заключают.
  for (const pact of alliances) {
    for (const war of politics.wars) {
      const [ally, friend] =
        war.a === pact.a ? [pact.b, pact.a] : war.a === pact.b ? [pact.a, pact.b] : [null, null]
      if (!ally || !friend) continue
      const enemy = war.b
      if (ally === enemy || atWar({ ...politics, wars }, ally, enemy)) continue
      // Решают один раз, в начале: пока бросок повторялся каждые сутки, за век
      // союзники входили в чужие войны четыреста шестьдесят семь раз на
      // четырнадцать союзов, и мир не вылезал из войны вовсе.
      if (day - war.since > JOIN_WINDOW) continue
      const [joins, afterJoin] = rollChance(generator, 0.04)
      generator = afterJoin
      if (!joins) continue
      const joined: War = {
        a: ally,
        b: enemy,
        since: day,
        reason: `союзный долг перед ${world.kingdoms[friend]?.name ?? friend}`,
      }
      wars = [...wars, joined]
      events.push({ type: 'joinedWar', ally, against: enemy })
    }
  }

  return {
    politics: { ...politics, wars, relations, alliances, tributes },
    rng: generator,
    events,
  }
}
