import { campaignOf, dispatchesOf, frontsOf, hostsOf, supplyOf } from './campaign'
import { churchLedger } from './church'
import { citiesOf, cityLedger } from './city'
import type { Command } from './commands'
import { companyLedger } from './company'
import { OFFICES, type OfficeId } from './content/offices'
import { vassalsOf } from './court'
import { lawOf } from './estate'
import { PLAYER, holdingsOf } from './holding'
import { claimantsOf, heirLawOf, heirUnder, partitionOf, regencyFor, strifeOf } from './inherit'
import { playStyle, worldOpinion } from './memory'
import { seaLedger } from './navy'
import { officerAt } from './office'
import { isLiar, overturesOf, wordOf } from './overture'
import { peaceChronicle, talksOf } from './peace'
import { courtMood, plotAgainst } from './revolt'
import type { GameState } from './state'
import { dayOf } from './time'
import { ledger } from './treasury'
import { atWar, warsOf } from './war'
import type { World } from './world/types'

/**
 * Интерфейс власти (этап 97).
 *
 * К 0.7 у державы стало больше вещей, чем помещается в голове: казна, закон,
 * вассалы, роты, флот, посольства, кампании, наследство, города и церковь. Всё
 * это лежит в состоянии и считается функциями — но игроку нужно не состояние, а
 * пять ответов на пять вопросов: чем я владею, с кем я говорю, как идёт война,
 * кто у меня при дворе и что будет, когда меня не станет.
 *
 * Экран здесь — не разметка, а модель: строки с числами и действия, которые
 * можно сделать прямо отсюда. Разметка живёт в приложении и может быть любой;
 * правило одно — экран кончается действием, а не таблицей (У6).
 */

export interface Line {
  readonly label: string
  readonly value: string
  /** Пояснение словами: число без объяснения — не решение. */
  readonly hint?: string
}

export interface Deed {
  readonly label: string
  readonly command: Command
  readonly can: boolean
  readonly why: string
}

export interface Screen {
  readonly id: 'realm' | 'talks' | 'war' | 'court' | 'house'
  readonly title: string
  readonly lines: readonly Line[]
  readonly deeds: readonly Deed[]
  readonly says: string
}

/** Экран державы (У1): земли, люди, казна, войско, закон. */
export function realmScreen(state: GameState, world: World): Screen {
  const day = dayOf(state.time)
  const mine = holdingsOf(state.settlements, PLAYER)
  const people = mine.reduce((sum, one) => sum + one.population, 0)
  const purse = ledger(state, world, day)
  const law = lawOf(state)
  const cities = cityLedger(state, world)
  const sea = seaLedger(state, day)
  const companies = companyLedger(state)
  const lines: Line[] = [
    { label: 'Земли', value: `${mine.length} мест`, hint: `${people} душ под твоей рукой` },
    {
      label: 'Казна',
      value: `${state.character.money}`,
      hint: `в сутки приходит ${Math.round(purse.income)}, уходит ${Math.round(purse.spent)}, итого ${Math.round(purse.net)}`,
    },
    { label: 'Закон', value: law.tax, hint: `суд — ${law.justice}, ополчение — ${law.levy}` },
    { label: 'Города', value: `${cities.cities}`, hint: cities.says },
    { label: 'Флот', value: `${sea.ships}`, hint: sea.says },
    { label: 'Роты', value: `${companies.served}`, hint: companies.says },
    {
      label: 'Церковь',
      value: `${churchLedger(state, world, day).anger}`,
      hint: churchLedger(state, world, day).says,
    },
  ]
  const deeds: Deed[] = []
  const city = citiesOf(state, world)[0]
  if (city) {
    deeds.push({
      label: `Дать вольность: ${city.name}`,
      command: { type: 'grantPact', locationId: city.locationId },
      can: !city.free,
      why: city.free
        ? 'У этого города вольность уже есть.'
        : 'Город заплатит разом и станет платить вполовину.',
    })
  }
  deeds.push({
    label: 'Ответить церкви',
    command: { type: 'answerChurch', yield: true },
    can: true,
    why: 'Уступка стоит того, чем просят; отказ — счёта, который она ведёт.',
  })
  return {
    id: 'realm',
    title: 'Держава',
    lines,
    deeds,
    says: state.realm
      ? `${state.realm.name}: ${mine.length} мест, ${people} душ.`
      : 'Своей державы у тебя нет.',
  }
}

/** Экран дипломатии (У2): кто с кем, что висит, кому нельзя верить. */
export function talksScreen(state: GameState, world: World): Screen {
  const day = dayOf(state.time)
  const opinion = worldOpinion(state, world, day)
  const standing = overturesOf(state).filter((one) => one.untilDay >= day)
  const liars = Object.keys(world.kingdoms).filter((one) => isLiar(state, one, day))
  const chronicle = peaceChronicle(state, day)
  const lines: Line[] = [
    { label: 'Войны', value: `${warsOf(state.politics, PLAYER).length}`, hint: opinion.says },
    {
      label: 'Послы у дверей',
      value: `${standing.length}`,
      hint: standing.map((one) => one.says).join(' ') || 'Никто не ждёт ответа.',
    },
    {
      label: 'Нельзя верить',
      value: `${liars.length}`,
      hint:
        liars.map((one) => `${one} — слово ${wordOf(state, one, day)}`).join(', ') ||
        'Слово держат все.',
    },
    { label: 'Миры', value: `${chronicle.made}`, hint: chronicle.says },
    { label: 'Твой стиль', value: playStyle(state, day).label, hint: playStyle(state, day).answer },
  ]
  const deeds: Deed[] = []
  const first = standing[0]
  if (first) {
    deeds.push({
      label: `Принять: ${first.fromKingdom}`,
      command: { type: 'answerOverture', id: first.id, answer: 'accept' },
      can: true,
      why: first.says,
    })
    deeds.push({
      label: `Торговаться: ${first.fromKingdom}`,
      command: { type: 'answerOverture', id: first.id, answer: 'counter' },
      can: true,
      why: 'Уступят или уедут — считается положением, а не красноречием.',
    })
  }
  const war = warsOf(state.politics, PLAYER)[0]
  const foe = war ? (war.a === PLAYER ? war.b : war.a) : null
  if (foe) {
    deeds.push({
      label: `Сесть за стол: ${foe}`,
      command: { type: 'openTalks', against: foe },
      can: talksOf(state) === null,
      why: talksOf(state) ? 'Переговоры уже идут.' : 'Мир — торг, и счёт войны виден обоим.',
    })
  }
  return { id: 'talks', title: 'Дипломатия', lines, deeds, says: opinion.says }
}

/** Экран кампании (У3): фронты, силы, снабжение, цели. */
export function warScreen(state: GameState, world: World): Screen {
  const day = dayOf(state.time)
  const campaign = campaignOf(state)
  const fronts = frontsOf(state, world)
  const hosts = hostsOf(state)
  const lines: Line[] = [
    {
      label: 'Кампания',
      value: campaign ? campaign.aim : 'нет',
      hint: campaign
        ? `против ${campaign.against}, с ${campaign.sinceDay} дня`
        : 'Война без цели — это поход, а не война.',
    },
    {
      label: 'Фронты',
      value: `${fronts.length}`,
      hint:
        fronts
          .map((one) => `${one.name}: ${one.men} человек, чужих мест ${one.enemyPlaces}`)
          .join('; ') || 'Твоих частей на карте нет.',
    },
    {
      label: 'Снабжение',
      value: `${hosts.length} частей`,
      hint:
        hosts.map((one) => `${one.id}: ${supplyOf(state, world, one, day).says}`).join(' ') ||
        'Кормить некого.',
    },
    {
      label: 'Донесения',
      value: `${dispatchesOf(state).length}`,
      hint: 'Весть от войска приходит не в тот же день.',
    },
  ]
  const deeds: Deed[] = []
  const host = hosts[0]
  if (host) {
    deeds.push({
      label: 'Приказ части: держать',
      command: { type: 'orderHost', hostId: host.id, order: 'hold' },
      can: true,
      why: 'Своё войско ведут приказы, а не замысел.',
    })
  }
  const war = warsOf(state.politics, PLAYER)[0]
  if (war) {
    const against = war.a === PLAYER ? war.b : war.a
    deeds.push({
      label: `Назначить цель войны: ${against}`,
      command: { type: 'setCampaign', against },
      can: campaign === null && atWar(state.politics, PLAYER, against),
      why: campaign ? 'Кампания уже идёт.' : 'Цель берётся из повода и видна обеим сторонам.',
    })
  }
  return {
    id: 'war',
    title: 'Война',
    lines,
    deeds,
    says: campaign ? `Война против ${campaign.against}.` : 'Войны как замысла сейчас нет.',
  }
}

/** Экран двора (У4): должности, вассалы, заговоры. */
export function courtScreen(state: GameState, world: World): Screen {
  const day = dayOf(state.time)
  const vassals = vassalsOf(state)
  const plot = plotAgainst(state, world, day)
  const seats = OFFICES.map((id: OfficeId) => ({ id, officer: officerAt(state, id) }))
  const lines: Line[] = [
    {
      label: 'Вассалы',
      value: `${vassals.length}`,
      hint:
        vassals
          .map((one) => `${one.title} ${one.name} — верность ${Math.round(one.loyalty)}`)
          .join('; ') || 'Своей знати у тебя нет.',
    },
    {
      label: 'Должности',
      value: `${seats.filter((one) => one.officer !== null).length} из ${seats.length}`,
      hint: seats.map((one) => `${one.id}: ${one.officer?.name ?? 'пусто'}`).join(', '),
    },
    {
      label: 'Настроение двора',
      value: plot ? 'заговор' : 'спокойно',
      hint: courtMood(state, world, day),
    },
  ]
  const deeds: Deed[] = []
  if (plot) {
    deeds.push({
      label: 'Дать вольность зачинщику',
      command: { type: 'appeasePlot', concession: 'liberty' },
      can: true,
      why: 'Унимает 35 счёта; платишь доходом и властью — навсегда.',
    })
    deeds.push({
      label: 'Унять силой',
      command: { type: 'crushPlot' },
      can: true,
      why: 'Земля зачинщика отходит тебе; остальные боятся и верят меньше.',
    })
  }
  return { id: 'court', title: 'Двор', lines, deeds, says: courtMood(state, world, day) }
}

/** Экран рода (У5): права, наследство, регентство. */
export function houseScreen(state: GameState, world: World): Screen {
  const day = dayOf(state.time)
  const heir = heirUnder(state, day)
  const plan = partitionOf(state, day)
  const strife = strifeOf(state, day)
  const regency = heir ? regencyFor(state, heir, day) : null
  const lines: Line[] = [
    { label: 'Закон', value: heirLawOf(state), hint: plan.says },
    {
      label: 'Наследник',
      value: heir ? `${heir.name} (${heir.age})` : 'нет',
      hint: regency ? regency.says : 'Наследник в летах: регент не нужен.',
    },
    {
      label: 'Права',
      value: `${claimantsOf(state, day).length}`,
      hint: claimantsOf(state, day)
        .slice(0, 3)
        .map((one) => `${one.name}: ${one.claim}`)
        .join('; '),
    },
    { label: 'Спор', value: `${strife.risk}`, hint: strife.says },
  ]
  const deeds: Deed[] = [
    {
      label: 'Закон: первородство',
      command: { type: 'setHeirLaw', law: 'eldest' },
      can: heirLawOf(state) !== 'eldest',
      why: 'Держава цела, младшие помнят, что им не досталось.',
    },
    {
      label: 'Закон: раздел',
      command: { type: 'setHeirLaw', law: 'split' },
      can: heirLawOf(state) !== 'split',
      why: 'Род доволен, держава — нет.',
    },
  ]
  return { id: 'house', title: 'Род', lines, deeds, says: plan.says }
}

/** Все пять экранов власти разом: порядок тот же, что и в жизни державы. */
export function powerScreens(state: GameState, world: World): readonly Screen[] {
  return [
    realmScreen(state, world),
    talksScreen(state, world),
    warScreen(state, world),
    courtScreen(state, world),
    houseScreen(state, world),
  ]
}
