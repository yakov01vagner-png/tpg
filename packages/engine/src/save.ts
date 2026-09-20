import { musterBands } from './band'
import { startSway } from './brother'
import { COMPANIES } from './content/companies'
import { PLAIN_LAW } from './content/estate'
import { NO_FAMILY, START_AGE, birthDayFor } from './dynasty'
import { createSettlements, initialStock, recruitPool } from './economy'
import type { Settlement } from './economy'
import { EMPTY_PARTY } from './party'
import { NO_REPUTATION } from './reputation'
import { createRng } from './rng'
import type { GameState } from './state'
import { SCHEMA_VERSION } from './state'
import type { Politics } from './war'
import { NO_POLITICS, createPolitics } from './war'
import { defaultStartLocationId, generateWorld } from './world/generate'
import { MAP_SIZE, placeLocations } from './world/layout'
import type { World } from './world/types'

/**
 * Сохранение и загрузка.
 *
 * Сейв — это JSON состояния со своей версией схемы. Миграции заведены с первого
 * дня (п.2 дизайн-документа): баланс и структура будут меняться каждую неделю, и
 * без миграций каждое изменение ломало бы чужие сейвы.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>

/** Миграции с версии N на N+1. Ключ — версия, С которой мигрируем. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  /**
   * v1 → v2: в состоянии появился мир. Старые сейвы его не знали, поэтому мир
   * генерируется по зерну из сохранённого ГПСЧ, а герой оказывается в стартовой
   * деревне. Прогресс персонажа при этом сохраняется целиком.
   */
  1: (data) => {
    const rng = data.rng as { state?: number } | undefined
    const world = generateWorld(rng?.state ?? 1)
    return { ...data, world, locationId: defaultStartLocationId(world) }
  },
  /**
   * v2 → v3: появились товары. Поселениям раздаются обычные для них запасы, а
   * герою — пустая котомка: в прошлой версии носить было нечего.
   */
  2: (data) => {
    const world = data.world as World
    const character = (data.character ?? {}) as Record<string, unknown>
    return {
      ...data,
      settlements: createSettlements(world),
      character: { ...character, inventory: character.inventory ?? {} },
    }
  },
  /**
   * v5 → v6: появились снаряжение, имя и поручения. Герой при этом остаётся
   * гол как сокол, а мир его ещё не знает — это честнее, чем раздавать вещи.
   */
  5: (data) => {
    const character = (data.character ?? {}) as Record<string, unknown>
    const party = (data.party ?? {}) as Record<string, unknown>
    return {
      ...data,
      character: { ...character, equipment: character.equipment ?? {} },
      party: { ...party, gear: party.gear ?? 0 },
      reputation: data.reputation ?? NO_REPUTATION,
      realm: data.realm ?? null,
      quests: data.quests ?? [],
    }
  },
  /**
   * v14 → v15: у провинции появились места без жителей. Выдумать их задним
   * числом нельзя — мир лежит в сейве целиком и уже разложен по карте, а новый
   * перевал сдвинул бы соседей. Поэтому старый герой доигрывает на старой
   * земле: у его провинций список мест без жителей пуст, и это честнее, чем
   * подсунуть ему другой мир под тем же именем.
   */
  14: (data) => {
    const world = (data.world ?? {}) as Record<string, unknown>
    const provinces = (world.provinces ?? {}) as Record<string, Record<string, unknown>>
    const filled: Record<string, unknown> = {}
    for (const [id, province] of Object.entries(provinces)) {
      filled[id] = { ...province, siteIds: province.siteIds ?? [] }
    }
    return { ...data, world: { ...world, provinces: filled } }
  },
  /** v15 → v16: в глуши стало что искать. Старый герой ещё нигде не искал. */
  15: (data) => ({ ...data, searchedSites: data.searchedSites ?? [] }),
  /**
   * v18 → v19: путь перестал быть мгновенным. Старый герой стоит там, где
   * стоял: в дороге его застать нельзя, потому что дороги как состояния раньше
   * не существовало.
   */
  18: (data) => ({ ...data, journey: data.journey ?? null }),
  /**
   * v17 → v18: у места появилась координата на карте.
   *
   * Раньше положение выводилось из скелета при каждом обращении; теперь оно
   * лежит в самом месте, потому что от него считаются дороги. Старому миру
   * координаты проставляются той же раскладкой, какой он рисовался до сих пор,
   * — карта у старого героя не сдвинется ни на пиксель. А вот дороги остаются
   * его прежние: мир лежит в сейве целиком, и перекладывать тракты под ногами
   * идущего нечестно. Старый герой доигрывает на старых дорогах.
   */
  17: (data) => {
    const world = (data.world ?? {}) as Record<string, unknown>
    const locations = (world.locations ?? {}) as Record<string, Record<string, unknown>>
    const points = placeLocations({
      kingdoms: (world.kingdoms ?? {}) as World['kingdoms'],
      regions: (world.regions ?? {}) as World['regions'],
      provinces: (world.provinces ?? {}) as World['provinces'],
    })
    const placed: Record<string, unknown> = {}
    for (const [id, location] of Object.entries(locations)) {
      const point = points[id] ?? { x: MAP_SIZE / 2, y: MAP_SIZE / 2 }
      placed[id] = { ...location, x: location.x ?? point.x, y: location.y ?? point.y }
    }
    return { ...data, world: { ...world, locations: placed } }
  },
  /**
   * v16 → v17: у года появился урожай. Старому сейву достаётся обычный год:
   * выдумывать задним числом, что где-то был недород, значит объявить голод в
   * месте, где игрок только что торговал хлебом.
   */
  16: (data) => {
    const settlements = (data.settlements ?? {}) as Record<string, Record<string, unknown>>
    const fed: Record<string, unknown> = {}
    for (const [id, settlement] of Object.entries(settlements)) {
      fed[id] = { ...settlement, harvest: settlement.harvest ?? 1 }
    }
    return { ...data, settlements: fed }
  },
  /** v13 → v14: поручения руками и счёт побед. Старый герой ничего не брал. */
  13: (data) => ({
    ...data,
    chains: data.chains ?? [],
    doneChains: data.doneChains ?? [],
    battlesWon: data.battlesWon ?? 0,
  }),
  /**
   * v12 → v13: пять новых товаров и записная книжка цен. Старым местам
   * досыпаем запас новых товаров по их норме; книжка пуста — её ещё не вели.
   */
  12: (data) => {
    const world = data.world as World
    const settlements = (data.settlements ?? {}) as Record<string, Record<string, unknown>>
    const filled: Record<string, unknown> = {}
    for (const [id, settlement] of Object.entries(settlements)) {
      const population = (settlement.population as number) ?? 0
      const stock = { ...initialStock(world, id, population), ...(settlement.stock as object) }
      filled[id] = { ...settlement, stock }
    }
    return { ...data, settlements: filled, priceLog: data.priceLog ?? {} }
  },
  /**
   * v11 → v12: у героя появились рана и плен, у боя — поединок, свои стены и
   * тот, кто стоит напротив. Старый герой здоров и на воле.
   */
  11: (data) => {
    const character = (data.character ?? {}) as Record<string, unknown>
    const battle = (data.battle ?? null) as Record<string, unknown> | null
    return {
      ...data,
      character: {
        ...character,
        wound: character.wound ?? null,
        captivity: character.captivity ?? null,
      },
      battle: battle
        ? {
            ...battle,
            ownWalls: battle.ownWalls ?? 1,
            foeId: battle.foeId ?? null,
            duel: battle.duel ?? 'none',
          }
        : null,
    }
  },
  /** v10 → v11: у мест появились ворота, которые можно закрыть от мора. */
  10: (data) => {
    const settlements = (data.settlements ?? {}) as Record<string, Record<string, unknown>>
    const opened: Record<string, unknown> = {}
    for (const [id, settlement] of Object.entries(settlements)) {
      opened[id] = { ...settlement, quarantined: settlement.quarantined ?? false }
    }
    return { ...data, settlements: opened }
  },
  /**
   * v9 → v10: у записей журнала появился вид. Старым записям он неизвестен —
   * пусть будут просто событиями, лента их покажет без знака.
   */
  9: (data) => {
    const log = Array.isArray(data.log) ? (data.log as Record<string, unknown>[]) : []
    return { ...data, log: log.map((entry) => ({ ...entry, kind: entry.kind ?? 'notice' })) }
  },
  /**
   * v8 → v9: земля стала уставать, а места — появляться и умирать. Старым
   * поселениям приписывается свежая земля: сколько её вытоптали до сих пор,
   * узнать неоткуда, а начинать с усталости было бы наказанием ни за что.
   */
  8: (data) => {
    const settlements = (data.settlements ?? {}) as Record<string, Record<string, unknown>>
    const rested: Record<string, unknown> = {}
    for (const [id, settlement] of Object.entries(settlements)) {
      rested[id] = { ...settlement, strain: settlement.strain ?? 0 }
    }
    return { ...data, settlements: rested, plagues: data.plagues ?? [] }
  },
  /**
   * v7 → v8: появились спутники, дела, возраст и договоры между коронами.
   * Герою приписывается двадцать лет от начала мира: точнее из старого сейва
   * не узнать, а без возраста он не сможет ни состариться, ни оставить имя.
   */
  7: (data) => {
    const character = (data.character ?? {}) as Record<string, unknown>
    const politics = (data.politics ?? {}) as Record<string, unknown>
    const name = typeof character.name === 'string' ? character.name : 'Безымянный'
    return {
      ...data,
      character: {
        ...character,
        bornDay: character.bornDay ?? birthDayFor(1, START_AGE),
        age: character.age ?? START_AGE,
        family: character.family ?? { ...NO_FAMILY, house: `дом ${name.split(' ')[0]}а` },
      },
      politics: {
        ...politics,
        relations: politics.relations ?? {},
        alliances: politics.alliances ?? [],
        tributes: politics.tributes ?? [],
      },
      companions: data.companions ?? [],
      enterprises: data.enterprises ?? [],
    }
  },
  /**
   * v6 → v7: у лордов появились дружины. Войско собирается заново из их силы и
   * встаёт по домам: где именно оно стояло в старом сейве, знать неоткуда —
   * там его просто не было.
   */
  6: (data) => {
    const politics = data.politics as Politics
    const settlements = (data.settlements ?? {}) as Record<string, Settlement>
    const rng = data.rng as { state?: number } | undefined
    const [bands] = musterBands(politics, settlements, createRng((rng?.state ?? 1) + 7))
    return { ...data, bands }
  },
  /**
   * v4 → v5: появились держатели земли, постройки и гарнизоны. Землю
   * переразбиваем между лордами заново: прежние сейвы про них не знали.
   */
  4: (data) => {
    const world = data.world as World
    const settlements = (data.settlements ?? {}) as Record<string, Record<string, unknown>>
    const withHoldings: Record<string, unknown> = {}
    for (const [id, settlement] of Object.entries(settlements)) {
      withHoldings[id] = {
        ...settlement,
        owner: settlement.owner ?? null,
        buildings: settlement.buildings ?? [],
        building: settlement.building ?? null,
        garrison: settlement.garrison ?? {},
      }
    }
    const rng = data.rng as { state?: number } | undefined
    const [politics, owned] = createPolitics(
      world,
      withHoldings as never,
      createRng(rng?.state ?? 1),
    )
    return { ...data, settlements: owned, politics, siege: null, renown: 0 }
  },
  /**
   * v3 → v4: появились отряды, бои и войны. Поселениям добавляются рекруты и
   * спокойная округа, герою — пустой отряд и мирное небо.
   */
  3: (data) => {
    const settlements = (data.settlements ?? {}) as Record<string, Record<string, unknown>>
    const patched: Record<string, unknown> = {}
    for (const [id, settlement] of Object.entries(settlements)) {
      patched[id] = {
        ...settlement,
        recruits: settlement.recruits ?? recruitPool(Number(settlement.population ?? 0)),
        banditry: settlement.banditry ?? 0,
      }
    }
    return {
      ...data,
      settlements: patched,
      party: data.party ?? EMPTY_PARTY,
      battle: data.battle ?? null,
      politics: data.politics ?? NO_POLITICS,
      service: data.service ?? null,
      over: data.over ?? false,
    }
  },
  /**
   * v19 → v20: у героя появилось судно (этап 35). У старого героя его нет и
   * быть не может: он доигрывает в мире без моря — а если море в его мире
   * есть, корабль он купит сам.
   */
  19: (data) => ({ ...data, ship: data.ship ?? null }),
  /**
   * v20 → v21: появились ордена и гильдии (этап 42). Старый герой ни в чём не
   * состоит — вступить он может и сам, там, где орден стоит.
   */
  20: (data) => ({ ...data, guild: data.guild ?? null }),
  /**
   * v21 → v22: вся глубина версии 0.6 (этапы 49–72).
   *
   * Тридцать полей появились за версию, и до сих пор каждое читалось через
   * `?? по умолчанию`: сейв 0.5 работал, но состояние в нём было неполным, и
   * всякий новый читатель обязан был помнить про «а если поля нет». Здесь они
   * дописываются разом, как в новорождённой игре, — кроме двух мест, где
   * честнее не молчание, а прямое решение.
   *
   * Первое — знание мира: с этапа 55 герой знает не всю карту, а то, где был.
   * Отнимать это у старого героя нельзя — он по этой карте ходил, — поэтому
   * ему записываются все провинции его мира.
   *
   * Второе — люди, дом и летопись: их не выдумывают. Дома у него нет (купит),
   * колен в летописи нет (его колено — первое), память купцов и лордов пуста
   * (в его мире их ещё не было). Семья остаётся та, что была, — с версии 0.4 у
   * неё есть место в сейве.
   */
  21: (data) => {
    const world = (data.world ?? {}) as Record<string, unknown>
    const provinces = Object.keys((world.provinces ?? {}) as Record<string, unknown>)
    const character = (data.character ?? {}) as Record<string, unknown>
    const family = (character.family ?? NO_FAMILY) as Record<string, unknown>
    return {
      ...data,
      character: {
        ...character,
        family: {
          ...NO_FAMILY,
          ...family,
          children: family.children ?? [],
        },
      },
      // Где он стоит внутри места: квартал считается при входе, а старый герой
      // стоит посреди места, как и стоял.
      quarter: data.quarter ?? null,
      knowledge: data.knowledge ?? { provinces },
      // Люди, которые теперь помнят: у старого героя с ними ещё не было дел.
      dealings: data.dealings ?? {},
      talked: data.talked ?? {},
      lordDeeds: data.lordDeeds ?? {},
      factions: data.factions ?? {},
      visits: data.visits ?? {},
      // Ремесло, вера, книги и ученик.
      craft: data.craft ?? {},
      cech: data.cech ?? null,
      piety: data.piety ?? 0,
      books: data.books ?? {},
      upbringing: data.upbringing ?? {},
      student: data.student ?? null,
      // Дом, владение и летопись рода.
      home: data.home ?? null,
      law: data.law ?? PLAIN_LAW,
      pleas: data.pleas ?? {},
      works: data.works ?? {},
      house: data.house ?? [],
      marks: data.marks ?? {},
      goal: data.goal ?? null,
      milestones: data.milestones ?? [],
      // Слава, стыд и павшие.
      fame: data.fame ?? {},
      shames: data.shames ?? [],
      fallen: data.fallen ?? [],
      // Война, осада и пленные.
      captives: data.captives ?? [],
      // Ордена, чары и глушь.
      orderSway: data.orderSway ?? startSway(),
      interdicts: data.interdicts ?? [],
      brotherhood: data.brotherhood ?? null,
      spellcraft: data.spellcraft ?? {},
      weather: data.weather ?? [],
      artifacts: data.artifacts ?? [],
      wilds: data.wilds ?? {},
      // Хворь, зелья и увечья.
      potions: data.potions ?? {},
      ailment: data.ailment ?? null,
      maims: data.maims ?? [],
      cleansed: data.cleansed ?? null,
    }
  },
  /**
   * v22 → v23: вся глубина версии 0.7 (этапы 74–98).
   *
   * Версия добавила державу: присягу вассалов, должности, казну, титулы,
   * посольства, договоры, королевские дома, соглядатаев, съезды, кампании,
   * флот, роты, мир как торг, наследство, города и счёт церкви. Каждое поле до
   * сих пор читалось через `?? по умолчанию`; здесь они дописываются разом —
   * как в новорождённой игре, потому что ничего из этого у героя 0.6 и правда
   * не было.
   *
   * Два поля пишутся не пустыми, а осмысленными. Закон о наследстве — это
   * решение, и молчание здесь хуже выбора: старой державе ставится
   * первородство, как самое частое. Роты в мире были и до игрока: они
   * дописываются из содержимого целыми, никому не служащими, — иначе мир после
   * загрузки окажется беднее, чем новый.
   */
  22: (data) => {
    const world = (data.world ?? {}) as Record<string, unknown>
    const locations = (world.locations ?? {}) as Record<string, { population?: number }>
    const places = Object.entries(locations)
      .filter(([, one]) => (one.population ?? 0) > 0)
      .map(([id]) => id)
    return {
      ...data,
      // Держава: присяга, должности, казна, титул.
      oaths: data.oaths ?? {},
      offices: data.offices ?? {},
      charters: data.charters ?? {},
      debts: data.debts ?? [],
      queue: data.queue ?? [],
      crowned: data.crowned ?? null,
      claims: data.claims ?? [],
      // Дипломатия: посольства, договоры, браки, соглядатаи, съезды.
      embassies: data.embassies ?? [],
      treaties: data.treaties ?? [],
      marriages: data.marriages ?? [],
      spies: data.spies ?? [],
      rumours: data.rumours ?? [],
      congress: data.congress ?? null,
      congresses: data.congresses ?? [],
      overtures: data.overtures ?? [],
      pledges: data.pledges ?? [],
      // Война: кампания, донесения, гарнизоны, флот, запоры, грамота.
      campaign: data.campaign ?? null,
      dispatches: data.dispatches ?? [],
      garrisons: data.garrisons ?? {},
      navy: data.navy ?? [],
      blockades: data.blockades ?? [],
      letter: data.letter ?? null,
      // Роты: они были в мире и до тебя.
      companies:
        data.companies ??
        COMPANIES.map((def, index) => ({
          id: def.id,
          men: def.men,
          hiredBy: null,
          untilDay: 0,
          owed: 0,
          unpaidDays: 0,
          fame: 0,
          locationId: places[(index * 37 + def.men) % Math.max(1, places.length)] ?? '',
        })),
      commission: data.commission ?? null,
      // Мир как торг и память о нём.
      talks: data.talks ?? null,
      peaces: data.peaces ?? [],
      grievances: data.grievances ?? [],
      // Наследство, города, церковь.
      heirLaw: data.heirLaw ?? 'eldest',
      pacts: data.pacts ?? [],
      churchAnger: data.churchAnger ?? 0,
      censure: data.censure ?? null,
    }
  },
  /**
   * v23 → v24: знание, туман войны и картины мира (версия 0.8).
   *
   * Всё, что добавила версия, — необязательные поля: сейв 0.7 читается и без
   * них. Миграция проставляет их явно по правилу репозитория (CLAUDE.md, п.5):
   * одна миграция на закрытие версии, а не по одной на этап. Знание при этом
   * начинается с чистого листа — и это верно по смыслу: государь, о котором
   * сейв не помнит, что он знал, не знает ничего и узнаёт заново.
   */
  23: (data) => ({
    ...data,
    // Знание (99–103): вести, ревизии, молва, объезды, доверие.
    words: data.words ?? [],
    audits: data.audits ?? {},
    gossip: data.gossip ?? [],
    looks: data.looks ?? [],
    trust: data.trust ?? {},
    // Двор и день государя (104–108).
    favours: data.favours ?? {},
    ruleLog: data.ruleLog ?? { heard: 0, handed: 0, missed: 0 },
    settled: data.settled ?? {},
    behests: data.behests ?? [],
    behestLog: data.behestLog ?? { sent: 0, full: 0, twisted: 0, none: 0 },
    // Туман войны (109–113): роли частей, приказы в поле, обманы, осады.
    roles: data.roles ?? {},
    scoutLog: data.scoutLog ?? { learned: 0, spent: 0 },
    fieldOrders: data.fieldOrders ?? [],
    intents: data.intents ?? {},
    orderLog: data.orderLog ?? { sent: 0, onTime: 0, stale: 0, ownWay: 0 },
    ruses: data.ruses ?? [],
    ruseLog: data.ruseLog ?? { made: 0, worked: 0, seen: 0 },
    siegeLog: data.siegeLog ?? { byKnowing: 0, byWalls: 0, bluffs: 0, defectors: 0 },
    // Дипломатия вслепую (114–117): гости, тайны, доказательства, резиденты.
    showing: data.showing ?? {},
    envoyLog: data.envoyLog ?? { sent: 0, brought: 0, offSum: 0, guests: 0 },
    hushed: data.hushed ?? {},
    secretLog: data.secretLog ?? { made: 0, leaked: 0, hushed: 0, caught: 0 },
    learned: data.learned ?? {},
    proofs: data.proofs ?? [],
    proofLog: data.proofLog ?? { got: 0, shown: 0, forged: 0, caught: 0 },
    residents: data.residents ?? [],
    residentLog: data.residentLog ?? { seated: 0, words: 0, lost: 0 },
    // ИИ, который тоже не видит (118–121).
    guesses: data.guesses ?? {},
    tellSeen: data.tellSeen ?? {},
    guessLog: data.guessLog ?? { made: 0, right: 0, wrong: 0, confused: 0 },
    beliefs: data.beliefs ?? {},
    biasLog: data.biasLog ?? { held: 0, woke: 0, warsByError: 0 },
    deceitLog: data.deceitLog ?? { made: 0, worked: 0, caught: 0 },
    // Рост (124–126): пути, испытания, ржавчина.
    usedDay: data.usedDay ?? {},
    pathLog: data.pathLog ?? { byDoing: 0, byTeacher: 0, byBook: 0, byTrial: 0, byService: 0 },
    trials: data.trials ?? {},
  }),
  // 0.9 «Добыча»: пути, равновесие, век, поражение и конец (130–160).
  24: (data) => ({
    ...data,
    // Пути (130–134): объединение, дом, долги корон, помазание.
    union: data.union ?? null,
    recognitions: data.recognitions ?? {},
    houseBest: data.houseBest ?? { places: 0, titleTier: 0, shames: 0, day: 0 },
    raised: data.raised ?? 0,
    crownDebts: data.crownDebts ?? {},
    anointed: data.anointed ?? null,
    deeds: data.deeds ?? {},
    // Равновесие (135–139): страх, коалиции, поручительства, признание, тишина.
    dreadLog: data.dreadLog ?? {},
    league: data.league ?? null,
    leagueBought: data.leagueBought ?? {},
    leagueLog: data.leagueLog ?? { formed: 0, bought: 0, against: [] },
    guarantees: data.guarantees ?? [],
    hands: data.hands ?? [],
    given: data.given ?? {},
    recalls: data.recalls ?? [],
    quiet: data.quiet ?? null,
    wrongCalls: data.wrongCalls ?? [],
    // Короны идут к своему (140–144): пути корон, гонка, чужой конец, колена.
    crownWays: data.crownWays ?? {},
    raceLog: data.raceLog ?? { steps: 0, done: [], shares: {} },
    theirEnd: data.theirEnd ?? null,
    balanceLog: data.balanceLog ?? { betrayals: 0, wars: 0 },
    reigns: data.reigns ?? {},
    heirLog: data.heirLog ?? { kept: 0, changed: 0 },
    // Век (145–149): кривые, эпохи, летопись как счёт.
    curves: data.curves ?? {},
    era: data.era ?? null,
    eraLog: data.eraLog ?? [],
    annals: data.annals ?? { added: 0, lastDay: 0 },
    // Поражение, которое не смерть (150–153), и предания (157).
    taken: data.taken ?? [],
    ransomLog: data.ransomLog ?? { taken: 0, freed: 0, paid: 0 },
    fallenLog: data.fallenLog ?? [],
    exile: data.exile ?? null,
    legends: data.legends ?? [],
  }),
  /**
   * v25 → v26: казна короны как вещь (этап 165).
   *
   * Одно новое поле на всю версию 1.0: чужое серебро. Пустая запись — верный
   * старт: такт сведёт казну по земле в первый же свой день, ровно тем же
   * счётом, каким её оценивали до 1.0, и сейв 0.9 от этого не дрогнет.
   */
  25: (data) => ({
    ...data,
    crownCoin: data.crownCoin ?? {},
    coinLog: data.coinLog ?? {},
  }),
}

export type LoadResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: string }

export function serialize(state: GameState): string {
  // Маска моря — пятьдесят тысяч нулей и единиц — в сейве лежит отрезками
  // (этап 48): полосы одного цвета длинные, и пятьдесят килобайт становятся
  // тремя. В памяти она прежняя: `isWater` читает по индексу.
  return JSON.stringify(state, (key, value) =>
    key === 'mask' && typeof value === 'string' && value.length > 256 ? packMask(value) : value,
  )
}

/** Маска отрезками: «~» и длины полос нулей и единиц по очереди, начиная с нулей. */
export function packMask(mask: string): string {
  const runs: number[] = []
  let current = '0'
  let length = 0
  for (const one of mask) {
    if (one === current) {
      length += 1
      continue
    }
    runs.push(length)
    current = one
    length = 1
  }
  runs.push(length)
  return `~${runs.join(',')}`
}

export function unpackMask(packed: string): string {
  if (!packed.startsWith('~')) return packed
  const parts: string[] = []
  let current = '0'
  for (const run of packed.slice(1).split(',')) {
    parts.push(current.repeat(Number(run)))
    current = current === '0' ? '1' : '0'
  }
  return parts.join('')
}

export function deserialize(json: string): LoadResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Файл сохранения повреждён.' }
  }
  // Маска моря в сейве лежит отрезками — разворачиваем до миграций: они её
  // читают как есть.
  const sea = (data as { world?: { sea?: { mask?: unknown } } })?.world?.sea
  if (sea && typeof sea.mask === 'string' && sea.mask.startsWith('~')) {
    sea.mask = unpackMask(sea.mask)
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Файл сохранения повреждён.' }
  }

  let record = data as Record<string, unknown>
  let version = record.schemaVersion
  if (typeof version !== 'number') {
    return { ok: false, error: 'В сохранении не указана версия схемы.' }
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Сохранение сделано более новой версией игры (${version} > ${SCHEMA_VERSION}).`,
    }
  }
  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version]
    if (!migration) {
      return { ok: false, error: `Нет миграции сейва с версии ${version}.` }
    }
    record = migration(record)
    version += 1
    record.schemaVersion = version
  }

  const problem = validate(record)
  if (problem) return { ok: false, error: problem }
  return { ok: true, state: record as unknown as GameState }
}

/** Грубая проверка формы: ловит чужой JSON, а не опечатки в балансе. */
function validate(record: Record<string, unknown>): string | null {
  if (typeof record.time !== 'number') return 'В сохранении нет игрового времени.'
  const rng = record.rng
  if (
    typeof rng !== 'object' ||
    rng === null ||
    typeof (rng as { state?: unknown }).state !== 'number'
  ) {
    return 'В сохранении нет состояния генератора случайных чисел.'
  }
  const character = record.character
  if (typeof character !== 'object' || character === null) return 'В сохранении нет персонажа.'
  const world = record.world
  if (typeof world !== 'object' || world === null) return 'В сохранении нет мира.'
  if (typeof record.locationId !== 'string') return 'В сохранении не сказано, где находится герой.'
  if (typeof record.settlements !== 'object' || record.settlements === null) {
    return 'В сохранении нет состояния поселений.'
  }
  if (!Array.isArray(record.log)) return 'В сохранении нет журнала.'
  return null
}
