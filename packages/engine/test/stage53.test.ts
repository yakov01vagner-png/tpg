import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { TONES, TONE_IDS, TOPICS, TRUTH_LABELS } from '../src/content/talk'
import { isKnown } from '../src/knowledge'
import { priceHistory } from '../src/market'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { answerOf, speakersAt, stillTalks, talkedTo, topicsFor } from '../src/talk'
import { MINUTES_PER_DAY } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 53: разговор.
 *
 * Говорят темами, а не репликами: ответ собирается из мира, нрав слышен в том,
 * как человек говорит, терпение кончается, а сказанное бывает и враньём.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}
const capital = world.kingdoms.reEstiz?.capitalId ?? ''

function at(locationId: string): GameState {
  const base = createGame(createCharacter({ name: 'Т', money: 900 }), 1, world)
  return { ...base, locationId, quarter: 'market' }
}

describe('Г1 и Г6: темы вместо реплик', () => {
  it('сорок тем, десять голосов, и с каждым говорят о своём', () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(40)
    expect(TONE_IDS).toHaveLength(10)
    for (const tone of TONE_IDS) {
      const def = TONES[tone]
      expect(def.opens.length + def.closes.length + def.shrugs.length + def.tires.length).toBe(8)
    }
    const state = at(capital)
    const speakers = speakersAt(state)
    expect(speakers.length).toBeGreaterThan(4)
    const kinds = new Set(speakers.map((one) => one.kind))
    expect(kinds.size).toBeGreaterThan(1)
    // У каждого звания свой круг тем, и он не совпадает с чужим.
    const byKind = new Map<string, number>()
    for (const speaker of speakers) byKind.set(speaker.kind, topicsFor(state, speaker).length)
    console.log(
      `тем ${TOPICS.length}, голосов ${TONE_IDS.length}; здесь говорят ${speakers.length} человек: ${[...byKind].map(([kind, count]) => `${kind} ${count} тем`).join(', ')}`,
    )
    expect(new Set([...byKind.values()]).size).toBeGreaterThan(1)
    // О том, что не его дело, человек не говорит.
    const merchant = speakers.find((one) => one.kind === 'merchant')
    if (merchant) {
      expect(applyCommand(state, { type: 'talk', speakerId: merchant.id, topicId: 'sin' }).ok).toBe(
        false,
      )
    }
  })
})

describe('Г2: знание из уст', () => {
  it('рассказанное о дорогах открывает землю, о ценах — ложится в книжку', () => {
    const state = at(capital)
    const merchant = speakersAt(state).find((one) => one.kind === 'merchant')
    expect(merchant).toBeDefined()
    if (!merchant) return
    const roads = world.roads[capital] ?? []
    const unknown = roads
      .map((road) => world.locations[road.to]?.provinceId)
      .find((id) => id && !isKnown(state, id))
    const told = ok(applyCommand(state, { type: 'talk', speakerId: merchant.id, topicId: 'roads' }))
    if (unknown) expect(isKnown(told, unknown)).toBe(true)
    const prices = ok(
      applyCommand(state, { type: 'talk', speakerId: merchant.id, topicId: 'prices' }),
    )
    expect(priceHistory(prices.priceLog, capital, 'grain').length).toBeGreaterThan(
      priceHistory(state.priceLog, capital, 'grain').length,
    )
  })
})

describe('Г3: нрав в речи', () => {
  it('один и тот же ответ звучит по-разному у разных нравов', () => {
    const state = at(capital)
    const speakers = speakersAt(state)
    const answers = new Map<string, string>()
    for (const speaker of speakers) {
      if (!topicsFor(state, speaker).some((one) => one.id === 'place')) continue
      answers.set(speaker.tone, answerOf(state, speaker, 'place', 0.3).text)
    }
    expect(answers.size).toBeGreaterThan(2)
    // Тело ответа одно — обрамление разное.
    expect(new Set(answers.values()).size).toBe(answers.size)
    for (const text of answers.values()) expect(text).toContain('душ')
    console.log([...answers].map(([tone, text]) => `${tone}: ${text.slice(0, 48)}…`).join('\n'))
  })
})

describe('Г4: разговор стоит', () => {
  it('время идёт, терпение кончается, а наутро человек снова говорит', () => {
    const state = at(capital)
    const speaker = speakersAt(state).find((one) => TONES[one.tone].patience <= 4)
    expect(speaker).toBeDefined()
    if (!speaker) return
    const topics = topicsFor(state, speaker)
    let current = state
    let spoken = 0
    for (const topic of topics) {
      const result = applyCommand(current, {
        type: 'talk',
        speakerId: speaker.id,
        topicId: topic.id,
      })
      if (!result.ok) break
      current = result.state
      spoken += 1
    }
    console.log(
      `${speaker.name} (${speaker.tone}, терпение ${TONES[speaker.tone].patience}): выдержал ${spoken} тем, времени ушло ${Math.round((current.time - state.time) / 60)} ч`,
    )
    expect(spoken).toBeGreaterThan(0)
    expect(current.time).toBeGreaterThan(state.time)
    expect(talkedTo(current, speaker.id)).toBeGreaterThan(0)
    expect(stillTalks(current, speaker)).toBe(false)
    const refused = applyCommand(current, {
      type: 'talk',
      speakerId: speaker.id,
      topicId: topics[0]?.id ?? 'place',
    })
    expect(refused.ok).toBe(false)
    // Наутро терпение возвращается.
    const tomorrow = ok(applyCommand(current, { type: 'tick', minutes: MINUTES_PER_DAY }))
    expect(talkedTo(tomorrow, speaker.id)).toBe(0)
    expect(stillTalks(tomorrow, speaker)).toBe(true)
  })
})

describe('Г5: ложь и правда', () => {
  it('иные врут, и у ответа есть цена доверия', () => {
    const state = at(capital)
    const sly = speakersAt(state).find((one) => TONES[one.tone].lies >= 0.15)
    expect(sly, 'нет ни одного склонного приврать').toBeDefined()
    if (!sly) return
    const honest = speakersAt(state).find((one) => TONES[one.tone].lies <= 0.05)
    const outcomes = Array.from({ length: 40 }, (_, i) =>
      answerOf(state, sly, 'danger', i / 40),
    ).map((one) => one.truth)
    const lies = outcomes.filter((one) => one === 'lie').length
    console.log(`из 40 ответов ${sly.tone}: враньё ${lies}, ${TRUTH_LABELS.lie}`)
    expect(lies).toBeGreaterThan(0)
    if (honest) {
      const honestLies = Array.from({ length: 40 }, (_, i) =>
        answerOf(state, honest, 'danger', i / 40),
      ).filter((one) => one.truth === 'lie').length
      expect(honestLies).toBeLessThan(lies)
    }
    // У вранья ответ другой, чем у правды.
    const lie = Array.from({ length: 40 }, (_, i) => answerOf(state, sly, 'danger', i / 40)).find(
      (one) => one.truth === 'lie',
    )
    const truth = answerOf(state, sly, 'danger', 0.5)
    expect(lie?.text).not.toBe(truth.text)
    // И враньё ничего не открывает: по лжи земля не узнаётся.
    expect(lie?.reveals).toBeUndefined()
  })
})
