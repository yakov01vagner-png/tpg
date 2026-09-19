import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { SECRET_DEFS, TREATY_DEFS } from '../src/content/treaties'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import {
  breachCost,
  guarantorFee,
  leakChance,
  liveTreaties,
  treatiesOf,
  treatyBetween,
  treatyWords,
} from '../src/treaty'
import type { Treaty } from '../src/treaty'
import { allied, createPolitics, relationOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 80: договоры.
 *
 * Согласие посольства было строкой в списке. Договор — бумага: вид, срок,
 * свидетель и то, о чём договорились не вслух. Проверяется то, ради чего он
 * заведён: срок кончается сам, разрыв виден всем, свидетель делает бумагу
 * крепче, а тайное однажды становится явным.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const kingdoms = Object.keys(world.kingdoms)

function ruler(): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 900)
    .sort((a, b) => b.population - a.population)
    .slice(0, 12)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  const first = taken[0]
  if (!first) throw new Error('нет мест')
  return {
    ...base,
    politics,
    settlements: map,
    locationId: first.locationId,
    quarter: null,
    time: WORLD_START,
    realm: { name: 'Заречье', sinceDay: 1 },
    renown: 40,
    fame: { noble: 70 },
  }
}

/** Готовая бумага: так удобнее проверять срок, разрыв и тайну. */
function withTreaty(
  state: GameState,
  treaty: Partial<Treaty> & { kind: Treaty['kind'] },
): GameState {
  const full: Treaty = {
    id: 'treaty:проба',
    a: PLAYER,
    b: kingdoms[1] as string,
    sinceDay: 1,
    untilDay: 0,
    ...treaty,
  }
  return { ...state, treaties: [...treatiesOf(state), full] }
}

describe('Г1, Г2 и Г6: виды, сроки и сводка', () => {
  it('у каждого вида свой срок и своя цена разрыва', () => {
    for (const def of Object.values(TREATY_DEFS)) {
      console.log(
        `${def.label}: ${def.days === 0 ? 'бессрочно' : `${Math.round(def.days / 365)} лет`}, разрыв ${def.breach}, позор ${def.shame}`,
      )
    }
    expect(TREATY_DEFS.alliance.days).toBe(0)
    expect(TREATY_DEFS.peace.breach).toBeLessThan(TREATY_DEFS.passage.breach)
  })

  it('срок выходит сам, и это видно', () => {
    const state = withTreaty(ruler(), { kind: 'passage', untilDay: 3 })
    const paper = treatiesOf(state)[0] as Treaty
    console.log(treatyWords(world, paper, 1))
    expect(treatyBetween(state, PLAYER, paper.b, 1, 'passage')).not.toBeNull()
    let later = state
    for (let day = 0; day < 5; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(later.log.find((one) => one.text.startsWith('Срок вышел'))?.text ?? 'молчит')
    expect(liveTreaties(later, 6)).toHaveLength(0)
    expect(later.log.some((one) => one.text.startsWith('Срок вышел'))).toBe(true)
  })
})

describe('Г3 и Г4: разрыв и свидетель', () => {
  it('разрыв стоит отношения со всеми, а со свидетелем — дороже', () => {
    const plain = withTreaty(ruler(), { kind: 'alliance', id: 'treaty:простая' })
    const witnessed = withTreaty(ruler(), {
      kind: 'alliance',
      id: 'treaty:свидетель',
      guarantor: kingdoms[2] as string,
    })
    const bare = breachCost(treatiesOf(plain)[0] as Treaty)
    const held = breachCost(treatiesOf(witnessed)[0] as Treaty)
    console.log(
      `разрыв без свидетеля: ${bare.other} и ${bare.world} всем; со свидетелем: ${held.other} и ${held.world}`,
    )
    expect(held.other).toBeLessThan(bare.other)
    console.log(`свидетель берёт ${guarantorFee({ kind: 'alliance' })} вперёд`)

    const third = kingdoms[3] as string
    const before = relationOf(plain.politics, PLAYER, third)
    const broken = ok(applyCommand(plain, { type: 'breakTreaty', treatyId: 'treaty:простая' }))
    console.log(
      `после разрыва: с третьей короной ${before} → ${relationOf(broken.politics, PLAYER, third)}`,
    )
    expect(liveTreaties(broken, 2)).toHaveLength(0)
    expect(relationOf(broken.politics, PLAYER, third)).toBeLessThan(before)
    // Слово, которое не держат, — это позор, а не только отношение.
    expect((broken.shames ?? []).some((one) => one.id === 'broke')).toBe(true)
  })

  it('война против того, с кем мир, — это разрыв', () => {
    const to = kingdoms[1] as string
    const state = withTreaty(ruler(), { kind: 'peace', b: to, untilDay: 900 })
    const war = ok(applyCommand(state, { type: 'declareWar', kingdomId: to }))
    console.log(war.log.find((one) => one.text.includes('порван'))?.text ?? 'молчит')
    expect(liveTreaties(war, 2)).toHaveLength(0)
    expect((war.shames ?? []).some((one) => one.id === 'broke')).toBe(true)
  })
})

describe('Г5: тайные статьи', () => {
  it('тайна стареет и однажды выходит наружу', () => {
    const against = kingdoms[3] as string
    const state = withTreaty(ruler(), {
      kind: 'alliance',
      id: 'treaty:тайна',
      secret: { id: 'partition', against },
    })
    const paper = treatiesOf(state)[0] as Treaty
    const young = leakChance(paper, 1)
    const old = leakChance(paper, 1 + 365 * 5)
    console.log(
      `тайна «${SECRET_DEFS.partition.label}»: в первый день ${(young * 100).toFixed(3)}% в сутки, через пять лет ${(old * 100).toFixed(3)}%`,
    )
    expect(old).toBeGreaterThan(young)

    // На долгом сроке она выходит наружу — и тот, против кого она, не прощает.
    let later = state
    let found = false
    for (let day = 0; day < 400 && !found; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
      found = later.log.some((one) => one.text.startsWith('Тайное стало явным'))
    }
    console.log(found ? 'тайна раскрыта' : 'за четыреста суток так и не узнали')
    if (found) {
      expect(relationOf(later.politics, PLAYER, against)).toBeLessThan(
        relationOf(state.politics, PLAYER, against),
      )
      expect(treatiesOf(later)[0]?.secret?.known).toBe(true)
    }
  })
})

describe('Г1: посольство кладёт согласие на бумагу', () => {
  it('удавшийся союз становится договором со сроком', () => {
    const state = ruler()
    const to = kingdoms[1] as string
    // Союзника выбираем того, кто и сам ищет союза: так посольство доходит.
    const warm: GameState = {
      ...state,
      politics: {
        ...state.politics,
        relations: { ...state.politics.relations, [[PLAYER, to].sort().join('|')]: 90 },
      },
      crowned: { day: 1, titleId: 'duke', guests: [], absent: [] },
    }
    // Человека нет — едет письмо: своё дело оно делает медленнее, но делает.
    const sent = ok(
      applyCommand(warm, { type: 'sendEnvoy', to, errand: 'alliance', byLetter: true }),
    )
    let later = sent
    for (let day = 0; day < 50; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const paper = treatiesOf(later)[0]
    console.log(
      paper
        ? `бумага: ${treatyWords(world, paper, 51)}`
        : `ответа нет: ${later.log.find((one) => one.text.includes('Ответ из'))?.text}`,
    )
    if (paper) {
      expect(paper.kind).toBe('alliance')
      expect(allied(later.politics, PLAYER, to)).toBe(true)
    }
  })
})
