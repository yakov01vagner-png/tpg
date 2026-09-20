import { givingCost, hasGiven } from './acclaim'
import { campaignOf, dispatchesOf, frontsOf, hostsOf, supplyOf } from './campaign'
import { churchLedger } from './church'
import { citiesOf, cityLedger } from './city'
import type { Command } from './commands'
import { companyLedger } from './company'
import { KNOWN_WORDS } from './content/known'
import { MOULD_WORDS } from './content/mould'
import { OFFICES, type OfficeId } from './content/offices'
import { vassalsOf } from './court'
import { sideName, whoFears } from './dread'
import { nearestEnding } from './ending'
import { lawOf } from './estate'
import { blindToShare, fogMap } from './fog'
import { ageSays, skillCeiling } from './growth'
import { hallNow } from './hall'
import { PLAYER, holdingsOf } from './holding'
import { claimantsOf, heirLawOf, heirUnder, partitionOf, regencyFor, strifeOf } from './inherit'
import { type Known, askedDef, knownTo, sourceDef, wordsTo } from './known'
import { leagueNow, whoToCall } from './league'
import { playStyle, worldOpinion } from './memory'
import { strengthBoard } from './mind'
import { mouldOf, paysWith } from './mould'
import { seaLedger } from './navy'
import { officerAt } from './office'
import { isLiar, overturesOf, wordOf } from './overture'
import { TRIALS, trialOdds } from './paths'
import { peaceChronicle, talksOf } from './peace'
import { skillXpToNext } from './progression'
import { whoLeads } from './race'
import { courtMood, plotAgainst } from './revolt'
import { SCOUT } from './scout'
import { sheetOf } from './sheet'
import { knowMap, tourPlan } from './sight'
import { SKILLS, type SkillId } from './skills'
import type { GameState } from './state'
import { dayOf } from './time'
import { ledger } from './treasury'
import { atWar, warsOf } from './war'
import { canGuarantee } from './ward'
import { wayOf } from './way'
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
  readonly id: 'realm' | 'talks' | 'war' | 'court' | 'house' | 'growth' | 'news' | 'way'
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
  const board = strengthBoard(state, world, day)
  const lines: Line[] = [
    {
      label: 'Сила',
      value: `${board.mine.score} — ${board.place}-я из ${board.rows.length}`,
      hint: `${board.mine.says} Впереди: ${
        board.rows
          .filter((row) => row.score > board.mine.score)
          .slice(0, 3)
          .map((row) => `${row.side} ${row.score} (со слов)`)
          .join(', ') || 'никого'
      }.`,
    },
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
  const hall = hallNow(state, world, day)
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
    // Двор одним взглядом (этап 168, Дв5): кто с кем, кто чего просит и кто
    // смотрит на сторону — без таблиц и без второго экрана.
    {
      label: 'Кто с кем',
      value: `${hall.ties.length} связей`,
      hint:
        hall.ties.map((one) => one.says).join(' ') || 'Люди двора друг о друге ничего не думают.',
    },
    {
      label: 'Просят и предлагают',
      value: `${hall.asks.length} / ${hall.offers.length}`,
      hint: [...hall.asks, ...hall.offers].join(' ') || 'Сегодня к тебе никто не идёт.',
    },
    {
      label: 'Смотрят на сторону',
      value: `${hall.risky.length}`,
      hint: hall.risky.join(' ') || 'Пока никто.',
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
/**
 * Откуда и когда (этап 128, И1 и И2).
 *
 * Одна строка на всякое число: кто принёс, сколько ему суток и насколько ему
 * верить. Там, где вилка шире полезного, честнее сказать «не знаю», чем
 * показать выдуманную точность.
 */
export function sourceLine(known: Known): string {
  if (known.value === null) return KNOWN_WORDS.unknown
  const def = sourceDef(known.source ?? 'rumour')
  const spread = Math.round(known.spread * 100)
  return `${def.label}${known.from ? ` (${known.from})` : ''}, ${known.age} сут.; ${spread === 0 ? 'точно' : `вилка ${spread} из ста`}${known.clash ? '; источники расходятся' : ''}`
}

/** Число вилкой, а не точкой (И2). */
export function spreadValue(known: Known): string {
  if (known.value === null) return 'неизвестно'
  if (typeof known.value === 'string') return known.value
  const off = Math.round(known.value * known.spread)
  return off <= 0 ? String(known.value) : `${known.value - off}–${known.value + off}`
}

/**
 * Экран вестей (этап 128, И3–И5).
 *
 * Всё, что тебе принесли, в одном месте: кто принёс, когда, чему верить — и
 * что можно сделать, чтобы узнать вернее. Незнание здесь названо вслух: пустой
 * экран означает, что ты не знаешь ничего, а не что всё спокойно.
 */
export function newsScreen(state: GameState, world: World): Screen {
  const day = dayOf(state.time)
  const lines: Line[] = []
  const asked = new Set<string>()
  for (const word of wordsTo(state, PLAYER)) {
    const key = `${word.kind}:${word.about}`
    if (asked.has(key)) continue
    asked.add(key)
    const known = knownTo(state, world, PLAYER, { kind: word.kind, about: word.about }, day)
    const about =
      world.kingdoms[word.about]?.name ?? world.locations[word.about]?.name ?? word.about
    lines.push({
      label: `${askedDef(word.kind).label}: ${about}`,
      value: spreadValue(known),
      hint: sourceLine(known),
    })
  }
  // И3: незнание названо. Своя земля, о которой ты давно не слышал, — это
  // первое, чего не знает всякий государь, и потому она стоит в начале списка.
  for (const row of knowMap(state, world, day).slice(0, 6)) {
    lines.push({
      label: `своё место: ${row.name}`,
      value: row.age >= 999 ? 'не знаешь ничего' : `вестям ${row.age} сут.`,
      hint:
        row.age >= 999
          ? 'Оттуда не приходило ни отчёта, ни слова. Послать человека или объехать самому.'
          : `Последнее известие: ${row.source}${row.fresh ? ', свежее' : ', уже старое'}.`,
    })
  }
  const blind = blindToShare(state, world, day)
  const fog = fogMap(state, world, day)
  for (const row of fog.slice(0, 5)) {
    lines.push({
      label: `войско: ${row.name}`,
      value: row.seenAt ? (world.locations[row.seenAt]?.name ?? row.seenAt) : 'неизвестно',
      hint: row.says,
    })
  }

  const deeds: Deed[] = [
    {
      label: 'Объехать державу самому',
      command: { type: 'rideOut' },
      can: holdingsOf(state.settlements, PLAYER).length > 1,
      why: tourPlan(state, world, day).says,
    },
    {
      label: 'Спросить местных',
      command: { type: 'askLocals' },
      can: (state.settlements[state.locationId]?.population ?? 0) > 0,
      why: `Угощение стоит ${SCOUT.askCost} серебра: что расскажут, зависит от того, как тебя здесь помнят.`,
    },
  ]
  const oldest = knowMap(state, world, day)[0]
  if (oldest) {
    deeds.push({
      label: `Послать человека: ${oldest.name}`,
      command: { type: 'sendLook', locationId: oldest.locationId },
      can: true,
      why: `${oldest.name}: ${oldest.fresh ? `вести свежие (${oldest.source})` : oldest.age >= 999 ? 'о нём ты не знаешь ничего' : `вестям ${oldest.age} сут. (${oldest.source})`}. Поедет и посмотрит сам.`,
    })
  }

  const brought = asked.size
  return {
    id: 'news',
    title: 'Вести',
    lines,
    deeds,
    says:
      brought === 0
        ? `${KNOWN_WORDS.unknown} Вестей к тебе не приходило: ты не знаешь ничего, и это не то же самое, что «всё спокойно».`
        : `Вестей ${brought}.${fog.length > 0 ? ` О ${Math.round(blind * 100)} из ста чужих войск ты не знаешь ничего.` : ''} ${KNOWN_WORDS.stale}`,
  }
}

/**
 * Экран роста (этап 127).
 *
 * Лист героя перестаёт быть списком чисел: против каждой строки её дело, под
 * ней — что даст следующий уровень и чем его брать. Правило этапа 97 держится:
 * экран кончается действием, а не таблицей.
 */
export function growthScreen(state: GameState, world: World): Screen {
  const day = dayOf(state.time)
  const character = state.character
  const mould = mouldOf(character)
  const lines: Line[] = []

  // Э1 и Э2: что у меня есть и что это даёт — числом.
  for (const row of sheetOf(character)) {
    if (row.kind === 'attribute') {
      lines.push({ label: row.label, value: String(row.level), hint: row.does.join('; ') })
    }
  }
  // Навыки — только те, что выше нуля: остальное не строка, а пустое место.
  for (const row of sheetOf(character)) {
    if (row.kind !== 'skill' || row.level <= 0) continue
    const ceiling = skillCeiling(character, row.id as SkillId)
    lines.push({
      label: row.label,
      value: `${row.level}${row.level >= ceiling.cap ? ` (потолок ${ceiling.cap})` : ''}`,
      // Э3: что дальше — сколько стоит следующий уровень и что держит.
      hint: `${row.does.join('; ')}. Следующий уровень: ${Math.round(skillXpToNext(row.level))} опыта${row.level >= ceiling.cap ? `, и ${ceiling.says}` : ''}`,
    })
  }

  // Э4: чем качать — прямо отсюда.
  const deeds: Deed[] = []
  for (const trial of TRIALS) {
    const odds = trialOdds(state, trial)
    const last = state.trials?.[trial.id] ?? 0
    const waited = last === 0 || day - last >= 180
    deeds.push({
      label: `${trial.label} (${SKILLS[trial.skill].label.toLowerCase()})`,
      command: { type: 'takeTrial', trialId: trial.id },
      can: odds.can && waited && state.character.money >= trial.cost,
      why: odds.can
        ? waited
          ? odds.says
          : 'Такое бывает не каждый месяц: жди следующего раза.'
        : odds.says,
    })
  }

  // Э5: куда я иду — склад назван, и названо, чего в нём не хватает.
  const missing = mould.id ? paysWith(character, mould.id).says : MOULD_WORDS.none
  return {
    id: 'growth',
    title: 'Рост',
    lines,
    deeds,
    says: `${mould.says} ${missing} ${ageSays(character.age)}`,
  }
}

export function powerScreens(state: GameState, world: World): readonly Screen[] {
  return [
    realmScreen(state, world),
    talksScreen(state, world),
    warScreen(state, world),
    courtScreen(state, world),
    houseScreen(state, world),
    growthScreen(state, world),
    newsScreen(state, world),
    wayScreen(state, world),
  ]
}

/**
 * Экран пути (этап 158).
 *
 * Восьмой экран власти. Он отвечает на пять вопросов разом: где я, кто рядом,
 * что мешает, кто меня боится и что с этим делать. Чужие числа на нём — не
 * правда, а вести (0.8), и это сказано у каждого.
 */
export function wayScreen(state: GameState, world: World): Screen {
  const day = dayOf(state.time)
  const near = nearestEnding(state, world, day)
  const mine = wayOf(state, world, PLAYER, 'crown', day)
  const leads = whoLeads(state, world, day)
  const fears = whoFears(state, world, PLAYER, day)
  const league = leagueNow(state, world, day)
  const lines: Line[] = [
    {
      label: 'Твой путь',
      value: `${Math.round(near.share * 100)} из ста`,
      hint: near.says,
    },
    {
      label: 'Что мешает',
      value: `${mine.left.length}`,
      hint: mine.left.length > 0 ? (mine.left[0] as string) : 'На этом пути тебе ничего не мешает.',
    },
    {
      label: 'Ведёт',
      value: `${sideName(world, leads.who)} ${leads.seen}`,
      hint: leads.says,
    },
    {
      label: 'Боятся тебя',
      value: `${fears.length}`,
      hint:
        fears.length > 0
          ? `${fears.map((one) => `${sideName(world, one.who)} ${one.score}`).join(', ')} — считается по вестям, а не по правде.`
          : 'Тебя пока не боится никто: продвижение твоё до них не дошло.',
    },
    {
      label: 'Против кого сходятся',
      value: league.against ? sideName(world, league.against) : '—',
      hint: league.says,
    },
  ]
  const deeds: Deed[] = []
  const first = Object.keys(world.kingdoms).find((id) => !hasGiven(state, id))
  if (first) {
    deeds.push({
      label: `Признать: ${sideName(world, first)}`,
      command: { type: 'recogniseCrown', of: first },
      can: !atWar(state.politics, PLAYER, first),
      why: givingCost(state, world, first, day).says,
    })
  }
  const call = whoToCall(state, world, day)
  if (call.against) {
    deeds.push({
      label: `Собрать мир против: ${sideName(world, call.against)}`,
      command: { type: 'callLeague', against: call.against },
      can: call.members.length >= 3,
      why: call.says,
    })
  }
  const weak = Object.keys(world.kingdoms).find(
    (id) => canGuarantee(state, world, PLAYER, id, day).can,
  )
  if (weak) {
    deeds.push({
      label: `Поручиться за: ${sideName(world, weak)}`,
      command: { type: 'giveGuarantee', of: weak },
      can: true,
      why: canGuarantee(state, world, PLAYER, weak, day).says,
    })
  }
  return {
    id: 'way',
    title: 'Путь',
    lines,
    deeds,
    says: `${near.says} ${leads.says}`,
  }
}
