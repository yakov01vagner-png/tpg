import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { HEARTH, HOME_TALK_DEFS } from '../src/content/hearth'
import { createSettlements } from '../src/economy'
import { accordOf, childNow, hearthRoll, houseRift, kinAbroad, spouseView } from '../src/hearth'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { houseScreen } from '../src/screens'
import { SCHEMA_VERSION } from '../src/state'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 170: семья, с которой говорят.
 *
 * Жена встречала одной и той же строкой, дети росли долей умения, наследник не
 * мог быть против тебя, а родня в чужих домах была строкой в политике. Здесь
 * дом говорит — и всё это выводится из того, что в доме уже есть.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

function household(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START + 365 * 20 * 24 * 60,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
    marriages: [{ kingdomId: kingdoms[1] as string, sinceDay: 200 }],
    character: {
      ...game.character,
      family: {
        house: 'Заречные',
        spouse: { name: 'Велена', lordId: null, kingdomId: kingdoms[1] as string, sinceDay: 100 },
        children: [
          { name: 'Мирослав', bornDay: 1, heir: true },
          { name: 'Ждана', bornDay: 1500, heir: false },
        ],
      },
    },
  } as unknown as GameState
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Сем1 и Сем2: жена и дети — люди', () => {
  it('у жены своё мерило и свой двор, у детей — свой склад', () => {
    const state = household()
    const day = 7300
    const wife = spouseView(state, world, day)
    console.log(wife?.says)
    expect(wife).toBeTruthy()
    expect(wife?.house).toBe(kingdoms[1])
    expect(wife?.can.length ?? 0).toBeGreaterThan(10)
    for (const child of state.character.family.children) {
      console.log(childNow(state, child, day).says)
    }
    const heir = childNow(state, state.character.family.children[0] as never, day)
    expect(heir.age).toBe(19)
    expect(heir.heir).toBe(true)
    // Вложенное в ребёнка видно, и оно не выдумывается.
    const raised: GameState = { ...state, upbringing: { Мирослав: 4 } }
    expect(childNow(raised, raised.character.family.children[0] as never, day).raised).toBe(4)
  })
})

describe('Сем3 и Сем4: в доме говорят, и в доме спорят', () => {
  it('разговор стоит времени и двигает лад', () => {
    const state = household()
    const day = 7300
    const before = accordOf(state, day)
    const after = ok(applyCommand(state, { type: 'speakHome', with: 'Велена', talk: 'calm' }))
    const now = accordOf(after, day)
    console.log(`лад в доме ${before} → ${now}`)
    expect(now).toBeGreaterThan(before)
    // Дом не двор: каждый день не просят.
    const again = applyCommand(after, { type: 'speakHome', with: 'Велена', talk: 'calm' })
    expect(again.ok).toBe(false)
    // День, отданный сыну, — это воспитание, а не разговор впустую.
    const taught = ok(applyCommand(after, { type: 'speakHome', with: 'Мирослав', talk: 'teach' }))
    console.log(`вложено в Мирослава: ${taught.upbringing?.Мирослав}`)
    expect(taught.upbringing?.Мирослав).toBe(1)
    for (const def of Object.values(HOME_TALK_DEFS)) expect(def.about.length).toBeGreaterThan(15)
  })

  it('выросший наследник тянет своё, и это не смута', () => {
    const state = household()
    const day = 7300
    const rift = houseRift(state, world, day, 'crown')
    console.log(rift.why)
    expect(rift.accord).toBeGreaterThanOrEqual(0)
    // Малолетний своего мнения не имеет.
    const small: GameState = {
      ...state,
      character: {
        ...state.character,
        family: {
          ...state.character.family,
          children: [{ name: 'Мирослав', bornDay: day - 365 * 5, heir: true }],
        },
      },
    }
    const quiet = houseRift(small, world, day, 'crown')
    console.log(quiet.why)
    expect(quiet.who).toBe(null)
    expect(HEARTH.ownMindAt).toBeGreaterThan(5)
  })
})

describe('Сем5 и Сем6: родня чужих домов и дом в числах', () => {
  it('брак даёт живых родственников при чужом дворе', () => {
    const state = household()
    const kin = kinAbroad(state, world, 7300)
    for (const one of kin) console.log(one.says)
    expect(kin).toHaveLength(1)
    expect(kin[0]?.kingdomId).toBe(kingdoms[1])
    expect(kin[0]?.who.length ?? 0).toBeGreaterThan(2)
  })

  it('дом виден одним взглядом и считан', () => {
    const state = household()
    const day = 7300
    const rolled = hearthRoll(state, world, day)
    console.log(rolled.says)
    expect(rolled.children).toBe(2)
    expect(rolled.kin).toBe(1)
    const screen = houseScreen(state, world)
    const labels = screen.lines.map((one) => one.label)
    console.log(labels.join(', '))
    expect(labels).toContain('Дом')
    expect(labels).toContain('Дети')
    expect(labels).toContain('Родня при чужих дворах')
    // Схема растёт с каждой версией: проверяется, что поле этого этапа
    // в ней уже есть, а не точное число — иначе следующий этап ломает
    // чужую проверку.
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(31)
  })
})
