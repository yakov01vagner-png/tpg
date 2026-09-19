import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { hireCompanion } from '../src/companion'
import { COMPANIONS } from '../src/content/companions'
import { EMBASSY_DEFS, HOST_DEFS, LETTER } from '../src/content/embassy'
import { createSettlements } from '../src/economy'
import {
  embassiesOf,
  embassyCost,
  embassyDays,
  embassyPossible,
  embassyWeight,
  envoyChoices,
  pending,
} from '../src/embassy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { allied, createPolitics, relationOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 79: посольства.
 *
 * Дипломатия была чужой: к тебе приезжали и просили. Свой ход — посольство: оно
 * стоит денег, идёт днями и возвращается с ответом, на который ты уже не
 * влияешь. Ответ не бросок вслепую: корона отвечает по своему замыслу (этап 72).
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(places = 14): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 6000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 900)
    .sort((a, b) => b.population - a.population)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  const first = taken[0]
  if (!first) throw new Error('нет мест')
  const friend = Object.values(COMPANIONS)[0]
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
    companions: friend ? [{ ...hireCompanion(friend), mood: 70 }] : [],
  }
}

const other = (): string => Object.keys(world.kingdoms)[1] as string

describe('П1 и П2: свой посол и то, с чем его шлют', () => {
  it('посольство стоит денег, идёт днями и висит без ответа', () => {
    const state = ruler()
    const to = other()
    const choices = envoyChoices(state, 1)
    console.log(
      `послать можно: ${choices.map((one) => `${one.name} (${one.kind}, ${one.skill})`).join(', ')}`,
    )
    expect(choices.length).toBeGreaterThan(0)
    const sent = ok(
      applyCommand(state, { type: 'sendEnvoy', to, errand: 'alliance', envoyId: choices[0]?.id }),
    )
    const embassy = embassiesOf(sent)[0]
    console.log(
      `${embassy?.envoyName} → ${world.kingdoms[to]?.name}: ${EMBASSY_DEFS.alliance.label}, вернётся на ${embassy?.backDay} день`,
    )
    expect(embassiesOf(sent)).toHaveLength(1)
    expect(sent.character.money).toBe(state.character.money - embassyCost('alliance', false))
    expect(pending(sent, 1)).toHaveLength(1)
    // Второго туда же не шлют, пока первый не вернулся.
    expect(applyCommand(sent, { type: 'sendEnvoy', to, errand: 'passage' }).ok).toBe(false)
  })

  it('у каждого дела своя цена и своя трудность', () => {
    const state = ruler()
    const to = other()
    const rows = (['alliance', 'marriage', 'passage', 'threat'] as const).map((errand) => ({
      errand,
      cost: embassyCost(errand, false),
      weight: embassyWeight(state, world, to, errand, envoyChoices(state, 1)[0] ?? null, false, 1),
    }))
    for (const row of rows) {
      console.log(`${EMBASSY_DEFS[row.errand].label}: ${row.cost} серебром, вес ${row.weight}`)
    }
    const passage = rows.find((one) => one.errand === 'passage')
    const marriage = rows.find((one) => one.errand === 'marriage')
    // Проход — дело пустяковое, брак — дело долгое.
    expect(passage?.weight ?? 0).toBeGreaterThan(marriage?.weight ?? 1)
  })
})

describe('П3 и П5: кто поехал и живое слово против письма', () => {
  it('дурной посол и письмо слабее хорошего посла', () => {
    const state = ruler()
    const to = other()
    // Канцлер, который умеет говорить, против человека, который не умеет.
    const silver = { id: 'x', name: 'Канцлер', skill: 7, kind: 'chancellor' as const }
    const mute = { id: 'y', name: 'Молчун', skill: 0, kind: 'companion' as const }
    const good = embassyWeight(state, world, to, 'alliance', silver, false, 1)
    const nobody = embassyWeight(state, world, to, 'alliance', mute, false, 1)
    const letter = embassyWeight(state, world, to, 'alliance', silver, true, 1)
    console.log(
      `союз: с ${silver.name} ${good}, с ${mute.name} ${nobody}, письмом ${letter}; письмо идёт ${embassyDays(true)} суток против ${embassyDays(false)}`,
    )
    expect(good).toBeGreaterThan(nobody)
    expect(Math.abs(letter)).toBeLessThan(Math.abs(good))
    expect(embassyDays(true)).toBeGreaterThan(embassyDays(false))
    expect(embassyCost('alliance', true)).toBe(Math.round(EMBASSY_DEFS.alliance.cost * LETTER.cost))
  })

  it('ответ приходит в день возвращения и что-то меняет', () => {
    const state = ruler()
    const to = other()
    const sent = ok(applyCommand(state, { type: 'sendEnvoy', to, errand: 'alliance' }))
    const before = relationOf(sent.politics, PLAYER, to)
    let later = sent
    for (let day = 0; day < embassyDays(false) + 1; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const answered = later.log.find((entry) => entry.text.includes('вернулся из'))
    console.log(`${answered?.text}`)
    console.log(
      `отношение ${before} → ${relationOf(later.politics, PLAYER, to)}; союз ${allied(later.politics, PLAYER, to) ? 'есть' : 'нет'}`,
    )
    expect(embassiesOf(later)).toHaveLength(0)
    expect(answered).toBeDefined()
    expect(relationOf(later.politics, PLAYER, to)).not.toBe(before)
  })
})

describe('П4: чужие послы', () => {
  it('тянуть и унизить — тоже ответы, и они стоят разного', () => {
    expect(HOST_DEFS.delay.relation).toBeGreaterThan(HOST_DEFS.humiliate.relation)
    expect(HOST_DEFS.yes.relation).toBeGreaterThan(HOST_DEFS.no.relation)
    console.log(
      Object.entries(HOST_DEFS)
        .map(([id, def]) => `${def.label}: ${def.relation}`)
        .join(', '),
    )
  })
})

describe('П6: что висит без ответа', () => {
  it('нельзя слать послов туда, где воюешь, и мирить тех, кто не воюет', () => {
    const state = ruler()
    const to = other()
    const atWarState: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: to, since: 1, reason: 'проба' }],
      },
    }
    console.log(`во время войны: ${embassyPossible(atWarState, to, 'alliance').why}`)
    expect(embassyPossible(atWarState, to, 'alliance').can).toBe(false)
    // А угрозу и выкуп — можно: с этим послов шлют и на войне.
    expect(embassyPossible(atWarState, to, 'threat').can).toBe(true)
    expect(embassyPossible(state, to, 'mediation').can).toBe(false)
  })
})
