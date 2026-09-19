import { courtOf, lordHere, lordTemper } from './castle'
import { following } from './companion'
import { LORD_TEMPERS } from './content/castle'
import { TEMPERS } from './content/companions'
import { CRAFT_MASTERS } from './content/craft'
import { PRIEST_TEMPERS } from './content/faith'
import { GOODS } from './content/goods'
import { MERCHANT_TEMPERS } from './content/merchants'
import type { SpeakerKind, TalkTone, TopicDef, TopicId, Truth } from './content/talk'
import { TONES, TOPICS, TOPICS_BY_ID } from './content/talk'
import { cechAt, masterOf } from './craft'
import { priceOf } from './economy'
import { feastAt } from './fair'
import { foodSecurity } from './life'
import { merchantsAt } from './merchant'
import { ordersAt } from './order'
import { jobsAt } from './place'
import { schoolAt } from './school'
import type { GameState } from './state'
import { priestAt } from './temple'
import { SEASON_LABELS, formatDate, seasonOf } from './time'
import { warsOf } from './war'
import { lanesFrom } from './world/lanes'
import { addressOf, kingdomOf, neighbourSettlements } from './world/queries'
import { isSettlement } from './world/types'

/**
 * Разговор (этап 53).
 *
 * До 0.6 говорили репликами: у лорда восемь строк, у наставника четыре, у
 * купца ни одной. Теперь говорят темами: с каждым — о том, что он знает, а
 * ответ собирается из мира, а не берётся из таблицы. Нрав слышен в том, как
 * человек начинает и чем заканчивает; он же решает, сколько тем выдержит и
 * склонен ли приврать.
 *
 * В состоянии — только счёт разговоров за день (`GameState.talked`): кто
 * сколько выдержал и кому надоел.
 */
export interface Speaker {
  readonly id: string
  readonly name: string
  readonly kind: SpeakerKind
  readonly tone: TalkTone
  /** Чем он занят: по этому видно, о чём с ним говорить. */
  readonly about: string
}

/** Нравы мира сводятся к десяти голосам. */
const MERCHANT_TONES: Record<string, TalkTone> = {
  stingy: 'greedy',
  generous: 'warm',
  proud: 'proud',
  shrewd: 'sly',
  jovial: 'merry',
  sour: 'gloomy',
}

const MASTER_TONES: Record<string, TalkTone> = {
  strict: 'curt',
  fair: 'plain',
  drunk: 'merry',
  greedy: 'greedy',
  old: 'tired',
}

const PRIEST_TONES: Record<string, TalkTone> = {
  stern: 'curt',
  meek: 'warm',
  worldly: 'greedy',
  zealous: 'pious',
}

const LORD_TONES: Record<string, TalkTone> = {
  proud: 'proud',
  shrewd: 'sly',
  jovial: 'merry',
  grim: 'gloomy',
  pious: 'pious',
  greedy: 'greedy',
}

const COMPANION_TONES: Record<string, TalkTone> = {
  honest: 'plain',
  greedy: 'greedy',
  proud: 'proud',
  devout: 'pious',
  grim: 'gloomy',
  loyal: 'warm',
}

/**
 * С кем здесь можно говорить.
 *
 * Все, кто уже есть в месте: купцы (этап 49), мастера (этап 50), священник
 * (этап 51), лорд и его двор (этап 52), свои спутники. Никого нового здесь не
 * заводится — разговор только даёт им голос.
 */
export function speakersAt(state: GameState, locationId: string = state.locationId): Speaker[] {
  const out: Speaker[] = []
  for (const merchant of merchantsAt(state.world, state.settlements, locationId)) {
    out.push({
      id: merchant.id,
      name: merchant.name,
      kind: 'merchant',
      tone: MERCHANT_TONES[merchant.temper] ?? 'plain',
      about: `купец, ${MERCHANT_TEMPERS[merchant.temper].label}`,
    })
  }
  for (const job of jobsAt(state, locationId).slice(0, 2)) {
    const master = masterOf(locationId, job)
    out.push({
      id: master.id,
      name: master.name,
      kind: 'master',
      tone: MASTER_TONES[master.temper] ?? 'plain',
      about: `${job.label.toLowerCase()}, ${CRAFT_MASTERS[master.temper].label}`,
    })
  }
  const priest = priestAt(state.world, state.settlements, locationId)
  if (priest) {
    out.push({
      id: priest.id,
      name: priest.name,
      kind: 'priest',
      tone: PRIEST_TONES[priest.temper] ?? 'pious',
      about: `${PRIEST_TEMPERS[priest.temper].label} служитель`,
    })
  }
  const lord = lordHere(state, locationId)
  if (lord) {
    out.push({
      id: lord.id,
      name: `${lord.title} ${lord.name}`,
      kind: 'lord',
      tone: LORD_TONES[lordTemper(lord)] ?? 'proud',
      about: LORD_TEMPERS[lordTemper(lord)].label,
    })
    for (const courtier of courtOf(state, lord)) {
      out.push({
        id: courtier.id,
        name: courtier.name,
        kind: 'courtier',
        tone: courtier.mood < -10 ? 'curt' : courtier.mood > 20 ? 'warm' : 'plain',
        about: 'при дворе',
      })
    }
  }
  for (const companion of following(state.companions)) {
    out.push({
      id: companion.id,
      name: companion.name,
      kind: 'companion',
      tone: COMPANION_TONES[companion.temper] ?? 'plain',
      about: TEMPERS[companion.temper]?.label ?? 'спутник',
    })
  }
  return out
}

export function speakerById(state: GameState, id: string): Speaker | null {
  return speakersAt(state).find((one) => one.id === id) ?? null
}

/** О чём с ним говорить: темы его звания, и только те, о которых есть что сказать. */
export function topicsFor(state: GameState, speaker: Speaker): readonly TopicDef[] {
  return TOPICS.filter((topic) => topic.kinds.includes(speaker.kind))
}

/** Сколько раз с ним уже говорили сегодня. */
export function talkedTo(state: Pick<GameState, 'talked'>, speakerId: string): number {
  return state.talked?.[speakerId] ?? 0
}

/** Выдержит ли он ещё разговор: у всякого нрава своё терпение. */
export function stillTalks(state: Pick<GameState, 'talked'>, speaker: Speaker): boolean {
  return talkedTo(state, speaker.id) < TONES[speaker.tone].patience
}

export interface Answer {
  readonly text: string
  readonly truth: Truth
  /** Что этот ответ открывает: провинции, цены. */
  readonly reveals?: {
    readonly provinceIds?: readonly string[]
    readonly prices?: readonly {
      readonly locationId: string
      readonly good: string
      readonly price: number
    }[]
  }
}

/**
 * Что он ответит.
 *
 * Ответ собирается из мира: сколько тут людей, кто держит землю, почём хлеб,
 * с кем воюют. Нрав даёт обрамление; знание — правду, полуправду или враньё.
 */
export function answerOf(
  state: GameState,
  speaker: Speaker,
  topicId: TopicId,
  roll: number,
): Answer {
  const topic = TOPICS_BY_ID[topicId]
  const tone = TONES[speaker.tone]
  if (!topic || !topic.kinds.includes(speaker.kind)) {
    return { text: pick(tone.shrugs, roll), truth: 'known' }
  }
  const facts = factsFor(state, speaker, topic)
  if (!facts) return { text: pick(tone.shrugs, roll), truth: 'known' }
  // Врать склонны не все и не всегда: дошлый купец и алчный придворный чаще.
  const lies = roll < tone.lies
  const body = lies ? twist(facts.text, roll) : facts.text
  const truth: Truth = lies ? 'lie' : facts.sure ? 'known' : 'guess'
  return {
    text: `${pick(tone.opens, roll)} ${body} ${pick(tone.closes, roll * 1.7)}`.replace(/\s+/g, ' '),
    truth,
    ...(facts.reveals && !lies ? { reveals: facts.reveals } : {}),
  }
}

interface Facts {
  readonly text: string
  /** Знает наверняка или говорит по слухам. */
  readonly sure: boolean
  readonly reveals?: Answer['reveals']
}

function factsFor(state: GameState, speaker: Speaker, topic: TopicDef): Facts | null {
  const world = state.world
  const here = world.locations[state.locationId]
  const settlement = state.settlements[state.locationId]
  const day = Math.floor(state.time / 1440) + 1
  if (!here) return null

  switch (topic.id) {
    case 'place': {
      const people = settlement?.population ?? here.population
      return {
        text: `${here.name} — это ${addressOf(world, here.id)}. Живёт тут около ${Math.round(people / 100) * 100} душ.`,
        sure: true,
      }
    }
    case 'roads': {
      const roads = world.roads[state.locationId] ?? []
      const named = roads
        .slice(0, 3)
        .map((road) => `${world.locations[road.to]?.name ?? '?'} (${road.hours} ч)`)
        .join(', ')
      return {
        text: named ? `Отсюда ходят: ${named}.` : 'Отсюда никуда не ходят, и это правда.',
        sure: speaker.kind !== 'priest',
        reveals: {
          provinceIds: roads
            .map((road) => world.locations[road.to]?.provinceId)
            .filter((id): id is string => Boolean(id)),
        },
      }
    }
    case 'danger': {
      const banditry = settlement?.banditry ?? 0
      const word =
        banditry > 0.5
          ? 'шалят так, что купцы ездят с охраной'
          : banditry > 0.25
            ? 'пошаливают'
            : 'тихо'
      return { text: `В округе ${word}.`, sure: true }
    }
    case 'neighbours': {
      const near = neighbourSettlements(world, state.locationId, 4).slice(0, 3)
      if (near.length === 0) return { text: 'Соседей отсюда не видать.', sure: true }
      return {
        text: `Ближе всего: ${near
          .map((one) => `${world.locations[one.id]?.name ?? '?'} — ${one.hops} перехода`)
          .join(', ')}.`,
        sure: true,
        reveals: {
          provinceIds: near
            .map((one) => world.locations[one.id]?.provinceId)
            .filter((id): id is string => Boolean(id)),
        },
      }
    }
    case 'far': {
      const kingdoms = Object.values(world.kingdoms).filter(
        (one) => one.id !== kingdomOf(world, state.locationId)?.id,
      )
      const one = kingdoms[Math.floor(Math.abs(Math.sin(day)) * kingdoms.length) % kingdoms.length]
      return one ? { text: `Говорят про ${one.name}: ${one.flavor}`, sure: false } : null
    }
    case 'sea': {
      const lanes = lanesFrom(world, state.locationId)
      return {
        text:
          lanes.length > 0
            ? `Отсюда плывут в ${world.locations[lanes[0]?.to ?? '']?.name ?? 'дальние гавани'} — ${lanes[0]?.hours ?? 0} часов ходу.`
            : 'Моря тут нет, и слава богам: солёная вода хлеба не родит.',
        sure: speaker.kind === 'merchant',
      }
    }
    case 'weather': {
      const harvest = settlement?.harvest ?? 1
      const word = harvest < 0.8 ? 'недород' : harvest > 1.05 ? 'урожайный год' : 'год как год'
      return {
        text: `Нынче ${SEASON_LABELS[seasonOf(day)]}, ${formatDate(day)}. Год — ${word}.`,
        sure: true,
      }
    }
    case 'prices': {
      if (!settlement) return null
      const goods = ['grain', 'cloth', 'iron'] as const
      return {
        text: goods
          .map(
            (good) => `${GOODS[good].label.toLowerCase()} по ${priceOf(world, settlement, good)}`,
          )
          .join(', '),
        sure: speaker.kind === 'merchant',
        reveals: {
          prices: goods.map((good) => ({
            locationId: state.locationId,
            good,
            price: priceOf(world, settlement, good),
          })),
        },
      }
    }
    case 'trade': {
      const merchants = merchantsAt(world, state.settlements, state.locationId)
      return {
        text:
          merchants.length > 0
            ? `Торгуют тут ${merchants.map((one) => one.name).join(', ')}.`
            : 'Торг тут с воза: приехал, продал, уехал.',
        sure: true,
      }
    }
    case 'work': {
      const jobs = jobsAt(state, state.locationId)
      return {
        text:
          jobs.length > 0
            ? `Берут на работу: ${jobs
                .slice(0, 3)
                .map((one) => one.label.toLowerCase())
                .join(', ')}.`
            : 'Работы тут нет, ищи в другом месте.',
        sure: true,
      }
    }
    case 'craft': {
      const jobs = jobsAt(state, state.locationId).filter((one) => one.practice.engineering)
      return {
        text:
          jobs.length > 0
            ? `Руками тут учат: ${jobs.map((one) => one.label.toLowerCase()).join(', ')}.`
            : 'Ремесла тут не держат.',
        sure: true,
      }
    }
    case 'cech': {
      const cech = cechAt(world, state.settlements, state.locationId)
      return {
        text: cech
          ? `${cech.label} держит здешнее дело. Без него выше подмастерья не станешь.`
          : 'Цеха тут нет: работают всяк за себя.',
        sure: speaker.kind === 'master',
      }
    }
    case 'hunger': {
      if (!settlement) return null
      const security = foodSecurity(settlement)
      const word = security < 0.3 ? 'голодно' : security < 0.6 ? 'небогато' : 'хлеб есть'
      return { text: `С хлебом нынче ${word}.`, sure: true }
    }
    case 'lord': {
      const lord = lordHere(state, state.locationId)
      return {
        text: lord
          ? `Землю держит ${lord.title} ${lord.name}, человек ${LORD_TEMPERS[lordTemper(lord)].label}.`
          : 'Эту землю держит корона, а не человек.',
        sure: speaker.kind !== 'merchant',
      }
    }
    case 'crown': {
      const kingdom = kingdomOf(world, state.locationId)
      if (!kingdom) return null
      const wars = warsOf(state.politics, kingdom.id)
      return {
        text:
          wars.length > 0
            ? `${kingdom.name} воюет: ${wars.length} войн на дворе.`
            : `${kingdom.name} нынче ни с кем не воюет. Пока.`,
        sure: speaker.kind === 'courtier' || speaker.kind === 'lord',
      }
    }
    case 'court': {
      const lord = lordHere(state, state.locationId)
      if (!lord) return null
      const court = courtOf(state, lord)
      return {
        text: `При лорде: ${court.map((one) => one.name).join(', ')}.`,
        sure: true,
      }
    }
    case 'war': {
      const wars = state.politics.wars
      return {
        text:
          wars.length > 0
            ? `Воюют нынче: ${wars
                .slice(0, 2)
                .map((war) => `${sideName(state, war.a)} с ${sideName(state, war.b)}`)
                .join('; ')}.`
            : 'Нынче везде мир, и от этого тревожно.',
        sure: speaker.kind === 'lord' || speaker.kind === 'courtier',
      }
    }
    case 'feud': {
      const orders = ordersAt(world, state.locationId)
      return {
        text:
          orders.length > 0
            ? `${orders[0]?.name ?? 'Орден'} не в ладах с теми, кого не назову вслух.`
            : 'Ссорятся тут, как везде: за межу и за наследство.',
        sure: false,
      }
    }
    case 'rebels': {
      const rebels = state.politics.lords.filter((one) => one.kingdomId === null)
      return {
        text:
          rebels.length > 0
            ? `Говорят, ${rebels[0]?.name ?? 'кое-кто'} вышел из-под руки короны. И не он один.`
            : 'Мятежников нынче не слыхать.',
        sure: speaker.kind === 'courtier',
      }
    }
    case 'bands': {
      const near = state.bands.filter((band) => band.locationId === state.locationId)
      return {
        text:
          near.length > 0
            ? `У стен стоит дружина, и не одна: ${near.length}.`
            : 'Войск рядом не видать.',
        sure: true,
      }
    }
    case 'faith': {
      const priest = priestAt(world, state.settlements, state.locationId)
      return {
        text: priest
          ? `Служит ${priest.name}. Храм стоит, свечи есть.`
          : 'Храма тут нет, молятся по домам.',
        sure: true,
      }
    }
    case 'feast': {
      const feast = feastAt(world, state.locationId, day)
      return {
        text: feast ? `Нынче ${feast.name}: ${feast.flavor}` : 'Праздника нынче нет, работаем.',
        sure: true,
      }
    }
    case 'holy': {
      const holy = neighbourSettlements(world, state.locationId, 4)
      return {
        text:
          holy.length > 0
            ? 'Молиться ходят в рощи и к родникам — там, где тихо и никто не мешает.'
            : 'Молятся дома.',
        sure: speaker.kind === 'priest',
      }
    }
    case 'sin':
      return {
        text:
          (settlement?.banditry ?? 0) > 0.3
            ? 'Грешат тут разбоем и укрывательством. И не только чужие.'
            : 'Грешат как везде: скупостью да злым языком.',
        sure: true,
      }
    case 'orders': {
      const orders = ordersAt(world, state.locationId)
      return {
        text:
          orders.length > 0
            ? `Тут стоят: ${orders.map((one) => one.name).join(', ')}.`
            : 'Братьев тут нет, только приход.',
        sure: true,
      }
    }
    case 'magic':
      return {
        text:
          schoolAt(world, state.locationId) !== null
            ? 'Маги тут ходят открыто, и никого этим не удивишь.'
            : 'Магов тут не видали, а видали — так не скажут.',
        sure: speaker.kind !== 'merchant',
      }
    case 'school': {
      const school = schoolAt(world, state.locationId)
      return {
        text: school
          ? `${school.name}: учат тут, и принимают тут же.`
          : 'Чарам тут не учат. Ищи при престоле.',
        sure: true,
      }
    }
    case 'archmage': {
      const kingdom = kingdomOf(world, state.locationId)
      const mage = kingdom ? state.politics.archmages[kingdom.id] : undefined
      return {
        text: mage
          ? mage.state === 'free'
            ? 'Архимаг при короне и в добром расположении.'
            : mage.state === 'busy'
              ? 'Архимаг занят своим и короне нынче не слуга.'
              : 'Архимаг отказал короне. Об этом говорят шёпотом.'
          : 'Об архимаге ничего не слышно.',
        sure: speaker.kind === 'courtier' || speaker.kind === 'lord',
      }
    }
    case 'rumour': {
      const near = neighbourSettlements(world, state.locationId, 5)[0]
      const place = near ? world.locations[near.id] : null
      return {
        text: place
          ? `Говорят, в ${place.name} нынче неспокойно. А может, и врут.`
          : 'Ничего нового не говорят.',
        sure: false,
        ...(place ? { reveals: { provinceIds: [place.provinceId] } } : {}),
      }
    }
    case 'strangers':
      return {
        text: 'Проезжих было двое: один с обозом, другой при оружии. Не назвались.',
        sure: false,
      }
    case 'me': {
      const renown = state.renown
      return {
        text:
          renown > 5
            ? `О тебе говорят. Славы за тобой на ${renown} дел.`
            : 'О тебе не говорят ничего. Это к лучшему.',
        sure: true,
      }
    }
    case 'himself':
      return {
        text: `Я ${speaker.about}. Живу тут, тем и кормлюсь.`,
        sure: true,
      }
    case 'family':
      return {
        text:
          speaker.kind === 'priest'
            ? 'Моя родня — приход. Другой не нажил.'
            : 'Родня есть, да разъехалась. Пишут редко.',
        sure: true,
      }
    case 'past':
      return {
        text: 'Начинал не тут и не с этого. Дорога длинная вышла.',
        sure: true,
      }
    case 'wish':
      return {
        text:
          speaker.kind === 'merchant'
            ? 'Хочу, чтоб дороги были тихие и пошлины низкие. Много ли надо.'
            : 'Хочу дожить до старости в своём доме. Вот и всё желание.',
        sure: true,
      }
    case 'work_offer': {
      const jobs = jobsAt(state, state.locationId)
      return {
        text:
          jobs.length > 0
            ? `Дело найдётся: ${jobs[0]?.label.toLowerCase()}. Спрашивай у того, кто платит.`
            : 'Дела для тебя нет.',
        sure: true,
      }
    }
    case 'hire':
      return {
        text: isSettlement(here.archetype)
          ? 'Люди тут есть, кто пойдёт за деньги. Спрашивай у ворот.'
          : 'Тут и своих-то нет.',
        sure: true,
      }
    case 'ransom':
      return {
        text: 'За выкуп держат тех, кого взяли в поле. Имён не назову.',
        sure: false,
      }
    case 'ships': {
      const lanes = lanesFrom(world, state.locationId)
      return {
        text:
          lanes.length > 0
            ? `Суда ходят в ${lanes
                .slice(0, 2)
                .map((one) => world.locations[one.to]?.name ?? '?')
                .join(' и ')}.`
            : 'Судов тут не бывает.',
        sure: true,
      }
    }
    case 'plague': {
      const sick = state.plagues.length
      return {
        text:
          sick > 0 ? 'Мор где-то рядом. Держись подальше от больших дорог.' : 'Мора не слыхать.',
        sure: speaker.kind === 'priest',
      }
    }
    default:
      return null
  }
}

function sideName(state: GameState, id: string): string {
  if (id.startsWith('crown:')) {
    return state.world.kingdoms[id.slice('crown:'.length)]?.name ?? id
  }
  return state.politics.lords.find((one) => one.id === id)?.name ?? id
}

/** Враньё — это правда, у которой переставили знак. */
function twist(text: string, roll: number): string {
  const swaps: readonly (readonly [RegExp, string])[] = [
    [/тихо/, 'шалят так, что купцы ездят с охраной'],
    [/пошаливают/, 'тихо'],
    [/голодно/, 'хлеб есть'],
    [/хлеб есть/, 'голодно'],
    [/не воюет/, 'воюет'],
    [/Мора не слыхать/, 'Мор рядом'],
  ]
  for (const [from, to] of swaps) if (from.test(text)) return text.replace(from, to)
  return roll > 0.5 ? `${text} Хотя за это не поручусь.` : `Врут, будто ${text.toLowerCase()}`
}

function pick(lines: readonly string[], roll: number): string {
  if (lines.length === 0) return ''
  return lines[Math.floor(Math.abs(roll) * lines.length) % lines.length] as string
}
