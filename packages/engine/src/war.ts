import type { BattleSide } from './battle'
import { type Casus, casusFor, casusWords, stubbornOf, termsFor } from './casus'
import type { PeaceTermKind } from './content/casus'
import { LORD_DEATH_AGE, LORD_START_AGE } from './content/heal'
import { ARCHMAGE_DEED_LABELS, ARCHMAGE_NAMES, type ArchmageDeed, DEED_DAYS } from './content/lore'
import type { TroopId } from './content/troops'
import { LORD_NAMES, LORD_TITLES } from './content/world'
import type { Settlement } from './economy'
import { PLAYER } from './holding'
import { foodSecurity } from './life'
import { crownWarlust, temperDeeds } from './lordlife'
import { crownFoe, opensSecondWar } from './plans'
import type { Rng } from './rng'
import { nextFloat, nextInt, rollChance } from './rng'
import { DAYS_PER_YEAR } from './time'
import { kingdomOf } from './world/queries'
import type { World } from './world/types'

/**
 * Война и разбой (DESIGN.md, п.8).
 *
 * Войны объявляются по причинам, а не броском кубика, и бьют не по строчке в
 * журнале, а по хлебу: разорённая провинция теряет людей и запасы, враждующие
 * королевства перестают делиться зерном, а голод рождает шайки. Разбой, в свою
 * очередь, душит подвоз — и круг замыкается.
 */

export interface War {
  readonly a: string
  readonly b: string
  readonly since: number
  readonly reason: string
  /**
   * Повод как вещь (этап 65, Т1): из-за какой земли, из-за кого и какого рода.
   * Необязательно — сейвы до 0.6 знают только строку.
   */
  readonly casus?: Casus
}

/**
 * Лорд — держатель земель (DESIGN.md, п.3.2 и п.8).
 *
 * Именных спутников в игре нет, но именные владетели есть: без них некому
 * ссориться с короной и не с кем воевать за землю.
 */
export interface Lord {
  readonly id: string
  readonly name: string
  readonly title: string
  /** Кому служит. Для мятежника — пусто. */
  readonly kingdomId: string | null
  /** Верность короне, 0..100. */
  readonly loyalty: number
  /** Сила дружины — условное число, из него собирается отряд в бою. */
  readonly strength: number
  /**
   * Сколько ему лет (этап 64, Ж6).
   *
   * Лорды не вечны: они старятся и умирают, а на их место садятся наследники —
   * с именами, своей силой и своей верностью. Необязательно: сейвы до 0.6
   * возраста лордов не знают, и такой считается сорокалетним.
   */
  readonly age?: number
  /**
   * Что за ним числится на войне (этап 65, Т4): сколько мест разорил и сколько
   * пощадил. У войны есть полководцы, и их знают по этому, а не по числу побед.
   */
  readonly sacked?: number
  readonly spared?: number
}

/**
 * Архимаг короны (DESIGN.md, п.8): естественный ограничитель мятежей.
 * Своеволен — бывает свободен, занят или вовсе отказался служить.
 *
 * С версии 0.6 (этап 60, А1) у него есть имя и дело: «занят» значит чем-то.
 * Он отводит мор, зовёт ветер над полями своей короны, идёт при войске — или
 * уходит в затвор, и тогда его нет ни для кого. Дело решает, что он делает с
 * миром, а `state` остаётся тем же, чем был: свободен, занят, отказался.
 */
export interface Archmage {
  readonly kingdomId: string
  readonly state: 'free' | 'busy' | 'refused'
  /** До какого дня он в этом состоянии. */
  readonly untilDay: number
  /** Чем занят. Необязательно — сейвы до 0.6 дел архимага не знают. */
  readonly deed?: ArchmageDeed
  /** Как его зовут. */
  readonly name?: string
  /** Где он сейчас, если дело привязано к месту. */
  readonly locationId?: string | null
}

/** Что делает дело со `state`: свободен только тот, кто при дворе. */
export function stateOfDeed(deed: ArchmageDeed): Archmage['state'] {
  if (deed === 'court') return 'free'
  if (deed === 'retreat') return 'refused'
  return 'busy'
}

/** Договор о дани: проигравший платит победителю, пока срок не вышел. */
export interface Tribute {
  readonly from: string
  readonly to: string
  readonly perDay: number
  readonly untilDay: number
}

/** Союз: два королевства входят в войны друг друга. */
export interface Alliance {
  readonly a: string
  readonly b: string
  readonly since: number
  /** Скреплён браком — такой держится крепче. */
  readonly byMarriage: boolean
}

export interface Politics {
  readonly wars: readonly War[]
  /** День, до которого политика уже посчитана. */
  readonly lastDay: number
  readonly lords: readonly Lord[]
  readonly archmages: Readonly<Record<string, Archmage>>
  /** Отношение корон друг к другу, −100..100. Ключ — два имени через «|». */
  readonly relations: Readonly<Record<string, number>>
  readonly alliances: readonly Alliance[]
  readonly tributes: readonly Tribute[]
}

/** Ключ пары королевств: порядок не важен, ключ один. */
/** Сколько мест держит эта сторона: по держателю, а не по скелету мира. */
function heldBy(settlements: Readonly<Record<string, Settlement>>, side: string): number {
  let count = 0
  const crown = `crown:${side}`
  for (const settlement of Object.values(settlements)) {
    if (settlement.population <= 0) continue
    if (settlement.owner === crown || settlement.owner === side) count += 1
    else if (settlement.owner?.startsWith(`lord:${side}:`)) count += 1
  }
  return count
}

export function pairOf(a: string, b: string): string {
  return [a, b].sort().join('|')
}

export function relationOf(politics: Politics, a: string, b: string): number {
  return politics.relations[pairOf(a, b)] ?? 0
}

export function allied(politics: Politics, a: string, b: string): boolean {
  if (a === b) return true
  return politics.alliances.some(
    (pact) => (pact.a === a && pact.b === b) || (pact.a === b && pact.b === a),
  )
}

export const NO_POLITICS: Politics = {
  wars: [],
  lastDay: 0,
  lords: [],
  archmages: {},
  relations: {},
  alliances: [],
  tributes: [],
}

export function lordById(politics: Politics, id: string): Lord | null {
  return politics.lords.find((lord) => lord.id === id) ?? null
}

export function lordsOf(politics: Politics, kingdomId: string): readonly Lord[] {
  return politics.lords.filter((lord) => lord.kingdomId === kingdomId)
}

/** Мятежник — лорд, оставшийся без сюзерена. */
export function isRebel(lord: Lord): boolean {
  return lord.kingdomId === null
}

export const WAR_REASONS: readonly string[] = [
  'старые претензии на пограничные земли',
  'оскорбление, нанесённое послу',
  'спор о вере',
  'набеги, оставленные без ответа',
  'перехваченный караван с податью',
  'брак, который расторгли со скандалом',
]

/**
 * Раздать землю: корона держит столицу, остальное — лорды по провинциям.
 *
 * Делается один раз при создании мира. Дальше земля переходит из рук в руки
 * только по итогам войн, мятежей и пожалований.
 */
export function createPolitics(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  rng: Rng,
): [Politics, Record<string, Settlement>, Rng] {
  let generator = rng
  const lords: Lord[] = []
  const owned: Record<string, Settlement> = { ...settlements }
  const archmages: Record<string, Archmage> = {}
  const usedNames = new Set<string>()

  for (const kingdom of Object.values(world.kingdoms)) {
    // Имя даётся раз и навсегда: архимаг — человек, а не должность (этап 60).
    const name =
      ARCHMAGE_NAMES[
        Object.keys(world.kingdoms).indexOf(kingdom.id) % Math.max(1, ARCHMAGE_NAMES.length)
      ] ?? 'Безымянный'
    archmages[kingdom.id] = {
      kingdomId: kingdom.id,
      state: 'free',
      untilDay: 0,
      deed: 'court',
      name,
      locationId: kingdom.capitalId,
    }
    const crown = `crown:${kingdom.id}`
    const titles = LORD_TITLES[kingdom.id] ?? LORD_TITLES.reEstiz ?? ['барон']
    let index = 0

    for (const regionId of kingdom.regionIds) {
      const region = world.regions[regionId]
      if (!region) continue
      for (const provinceId of region.provinceIds) {
        const province = world.provinces[provinceId]
        if (!province) continue

        // Домен короны: провинция со столицей держится сюзереном напрямую
        // (DESIGN.md, п.3.2). Из неё же потом и жалуют землю за службу.
        if (province.locationIds.includes(kingdom.capitalId)) {
          for (const locationId of province.locationIds) {
            const settlement = owned[locationId]
            if (settlement) owned[locationId] = { ...settlement, owner: crown }
          }
          continue
        }

        const [nameIndex, afterName] = nextInt(generator, 0, LORD_NAMES.length - 1)
        const [titleIndex, afterTitle] = nextInt(afterName, 0, titles.length - 1)
        const [loyalty, afterLoyalty] = nextInt(afterTitle, 55, 85)
        generator = afterLoyalty

        let name = LORD_NAMES[nameIndex] ?? 'Безымянный'
        while (usedNames.has(name)) name = `${name} Младший`
        usedNames.add(name)

        const id = `lord:${kingdom.id}:${index}`
        index += 1
        let people = 0

        for (const locationId of province.locationIds) {
          const settlement = owned[locationId]
          if (!settlement) continue
          owned[locationId] = { ...settlement, owner: id }
          people += settlement.population
        }

        // Возраст даётся сразу (этап 64, Ж6): мир начинается не с одного
        // поколения, а с живых людей разных лет.
        const [age, afterAge] = nextInt(generator, LORD_START_AGE[0], LORD_START_AGE[1])
        generator = afterAge
        lords.push({
          id,
          name,
          title: titles[titleIndex] ?? 'барон',
          kingdomId: kingdom.id,
          loyalty,
          strength: Math.max(8, Math.round(people / 60)),
          age,
        })
      }
    }
  }

  return [
    { wars: [], lastDay: 0, lords, archmages, relations: {}, alliances: [], tributes: [] },
    owned,
    generator,
  ]
}

export function atWar(politics: Politics, a: string, b: string): boolean {
  if (a === b) return false
  return politics.wars.some((war) => (war.a === a && war.b === b) || (war.a === b && war.b === a))
}

export function warsOf(politics: Politics, kingdomId: string): readonly War[] {
  return politics.wars.filter((war) => war.a === kingdomId || war.b === kingdomId)
}

export function enemyOf(war: War, kingdomId: string): string {
  return war.a === kingdomId ? war.b : war.a
}

export type WarEvent =
  | { readonly type: 'warDeclared'; readonly war: War }
  | { readonly type: 'peace'; readonly war: War }
  | { readonly type: 'rebellion'; readonly lordId: string }
  | { readonly type: 'archmage'; readonly kingdomId: string; readonly state: Archmage['state'] }
  | { readonly type: 'archmageDeed'; readonly kingdomId: string; readonly deed: ArchmageDeed }
  /** Чем кончилась война (этап 65, Т3 и Т6): земля, дань, брак, выдача. */
  | { readonly type: 'peaceTerms'; readonly war: War; readonly term: PeaceTermKind }
  /** Лорд умер, и земля перешла наследнику (этап 64, Ж6). */
  | {
      readonly type: 'lordDied'
      readonly lordId: string
      readonly heirId: string
      readonly name: string
    }
  | { readonly type: 'tribute'; readonly tribute: Tribute }

export interface PoliticsResult {
  readonly politics: Politics
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly rng: Rng
  readonly events: readonly WarEvent[]
}

/** Шанс, что за сутки кто-то кому-то объявит войну. */
const DECLARE_CHANCE = 0.004
/** Шанс, что за сутки война закончится миром. */
const PEACE_CHANCE = 0.006

export function tickPolitics(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  day: number,
  rng: Rng,
  playerMage: Archmage['state'] = 'busy',
  /**
   * Давление равновесия на эту пару (этап 143, Рв0).
   *
   * Война перестаёт быть броском: кубик остаётся, но множителем к нему идёт
   * расчёт — насколько `a` опасается продвижения `b` и не связан ли он с ним.
   * Считает это не `war.ts` (иначе ядро войны потянет за собой весь слой путей),
   * а тот, кто вызывает такт; по умолчанию давление ровно единица.
   */
  pressure: (a: string, b: string) => number = () => 1,
  /**
   * Счёт войны на этот день (этап 163, Вс1).
   *
   * Кончалась война броском в 0.006, и сто войн за век были одной и той же
   * войной. Счёт — усталость, взятая цель, безнадёжность и чужое давление —
   * считается не здесь (иначе ядро войны потянет за собой пути, поручительства
   * и коалиции), а тем, кто вызывает такт: `tally.ts`. Такту передаётся итог.
   * По умолчанию счёт ровно единица и ничего не решает — старые прогоны
   * повторяются день в день.
   */
  reckon: (
    war: War,
    day: number,
  ) => { haste: number; winner: string | null; term: PeaceTermKind | null } = () => ({
    haste: 1,
    winner: null,
    term: null,
  }),
): PoliticsResult {
  let generator = rng
  let wars = [...politics.wars]
  let tributes = [...politics.tributes]
  let current = settlements
  const events: WarEvent[] = []
  const kingdomIds = Object.keys(world.kingdoms)
  const days = Math.max(0, day - politics.lastDay)

  for (let i = 0; i < days; i += 1) {
    // Мир кончается.
    // Сперва кто с кем, потом — дойдёт ли до объявления: нрав короны входит в
    // тот же бросок (этап 66, Л5), а не в отдельный. Лишний бросок на каждые
    // сутки мира сдвинул бы всю случайность вместе с собой.
    const [first, afterFirst] = nextInt(generator, 0, kingdomIds.length - 1)
    const [second, afterSecond] = nextInt(afterFirst, 0, kingdomIds.length - 1)
    generator = afterSecond
    const a = kingdomIds[first]
    const [declares, afterDeclare] = rollChance(
      generator,
      DECLARE_CHANCE * (a ? crownWarlust(a) : 1),
    )
    generator = afterDeclare
    // Врага выбирает не кубик, а корона (этап 72, Ч2): замысел смотрит на
    // отношения, на дань и на того, кто забрал слишком много. Кубик решает
    // только, дойдёт ли до объявления. Второй жребий остаётся тем, чем был, —
    // им корона пользуется, когда выбирать не из чего.
    const chosen =
      declares && a ? crownFoe(world, { ...politics, wars, tributes }, current, a) : null
    const b = chosen ?? kingdomIds[second]
    // Второй бросок — уже не бросок: он взвешен равновесием (этап 143, Рв0).
    // Связанный с целью не пойдёт на неё и по кубику, а опасающийся пойдёт
    // охотнее — и то и другое считается, а не выпадает.
    const weight = a && b ? pressure(a, b) : 1
    // Лишний бросок берётся только там, где он что-то решает: при давлении в
    // единицу случайность остаётся ровно той же, какой была до этапа 143, и
    // старые прогоны (этап 66, этап 40) повторяются день в день.
    if (weight < 1) {
      const [balanced, afterBalance] = rollChance(generator, Math.max(0, weight))
      generator = afterBalance
      if (!balanced) continue
    }
    // Воюющая корона не открывает второй войны, если не воинственна настолько,
    // что ей всё равно: до этого этого правила не было, и мелкая корона могла
    // получить три войны за месяц.
    if (declares && kingdomIds.length > 1 && a && opensSecondWar({ ...politics, wars }, a)) {
      // На добитого не идут. Пока это было можно, малое королевство доедали
      // вчетвером: Дор-Хазад оставался с одним местом из тринадцати в двух
      // мирах из трёх. Огрызок никому не стоит войны — и соседи не хотят, чтобы
      // победитель поднялся ещё выше.
      // Считать огрызком можно только там, где вообще видно, кто чем владеет:
      // иначе при неразданной земле правило запрещает войну всем сразу, и мир
      // застывает в вечном мире.
      const alive = Object.values(current).filter((one) => one.population > 0).length
      const known = Object.values(current).filter(
        (one) => one.population > 0 && one.owner !== null,
      ).length
      const rump = (side: string) => known > 0 && alive > 0 && heldBy(current, side) / alive < 0.08
      if (a && b && a !== b && !rump(a) && !rump(b) && !wars.some((war) => sameWar(war, a, b))) {
        // Повод берётся из мира, а не из списка (этап 65, Т1): спорная марка —
        // та, которую и правда держат чужие; неплатёж дани — та дань, которая
        // и правда назначена. Честолюбие остаётся на случай, когда повода нет.
        const [casus, afterCasus] = casusFor(
          world,
          { ...politics, wars, tributes },
          current,
          a,
          b,
          generator,
        )
        generator = afterCasus
        const war: War = {
          a,
          b,
          since: politics.lastDay + i,
          reason: casusWords(world, casus),
          casus,
        }
        wars.push(war)
        events.push({ type: 'warDeclared', war })
      }
    }

    // Война кончается — и чем-то кончается. Сто с лишним войн за век не меняли
    // ничего: объявили, помирились, всё как было. Теперь проигравший платит
    // дань, и она видна в состоянии, а не только в журнале.
    for (const war of [...wars]) {
      // Добивать мелкого никто не рвётся: с тем, у кого почти ничего не
      // осталось, мирятся охотнее. Без этого малое королевство доедали до
      // конца — Дор-Хазад терял всю землю на двух зёрнах из трёх.
      const smallest = Math.min(heldBy(current, war.a), heldBy(current, war.b))
      const total = Object.values(current).filter((one) => one.population > 0).length
      const tiny = total > 0 && smallest / total < 0.12
      // За иной повод держатся крепче: спор о вере кончается позже спора о
      // дани (этап 65, Т1).
      // Мирится не всякий одинаково (этап 66, Л5): воинственная корона тянет
      // войну, расчётливая ищет, как её кончить. Считаем по упрямейшей из
      // двух — мир заключают оба, и хватает одного, кто не хочет.
      const willing = Math.max(crownWarlust(war.a), crownWarlust(war.b))
      // Счёт войны (этап 163, Вс1): бросок остался тем же, но его вес берётся
      // из того, как война идёт. Вымотанные и добившиеся своего мирятся вдесятеро
      // охотнее свежих, и ни одна война больше не кончается «просто так».
      const counted = reckon(war, politics.lastDay + i)
      const [peace, afterPeace] = rollChance(
        generator,
        (PEACE_CHANCE * (tiny ? 5 : 1) * Math.max(0, counted.haste)) /
          (stubbornOf(war.casus) * willing),
      )
      generator = afterPeace
      if (!peace) continue
      wars = wars.filter((other) => other !== war)
      events.push({ type: 'peace', war })

      const mine = heldBy(current, war.a)
      const theirs = heldBy(current, war.b)
      if (mine === 0 || theirs === 0) continue
      // Кто вышел с прибытком, решает ход войны, а не размер державы (Вс3):
      // взявший спорную землю победил, даже если он меньше. Когда счёт молчит
      // (старые сейвы, прогоны без слоя счёта), остаётся прежнее правило.
      const bigger: [string, string, number] =
        mine < theirs ? [war.a, war.b, mine / theirs] : [war.b, war.a, theirs / mine]
      const [loser, winner, ratio] =
        counted.winner === null
          ? bigger
          : counted.winner === war.a
            ? [war.b, war.a, Math.min(1, theirs / Math.max(1, mine))]
            : [war.a, war.b, Math.min(1, mine / Math.max(1, theirs))]
      if (counted.winner !== null && counted.term === 'nothing') {
        // Выдохлись оба: мир без условий — тоже исход, и его видно.
        events.push({ type: 'peaceTerms', war, term: 'nothing' })
        continue
      }
      // Условия следуют из повода (этап 65, Т3) и из хода войны (этап 163, Вс3):
      // за землю требуют землю, за набеги — виновного, за честолюбие — что дадут.
      const term = counted.term ?? (war.casus ? termsFor(war.casus, ratio) : 'tribute')
      events.push({ type: 'peaceTerms', war, term })
      if (term === 'land' && war.casus?.provinceId) {
        // Спорная марка переходит победителю целиком: это и есть то, из-за чего
        // воевали.
        const taken: Record<string, Settlement> = { ...current }
        for (const id of world.provinces[war.casus.provinceId]?.locationIds ?? []) {
          const settlement = taken[id]
          if (!settlement || settlement.population <= 0) continue
          if (sideOfOwner(settlement.owner) !== loser) continue
          taken[id] = { ...settlement, owner: `crown:${winner}` }
        }
        current = taken
      }
      if (term === 'tribute' || term === 'land') {
        const terms = peaceTerms(loser, winner, ratio, day)
        if (terms) {
          tributes = [...tributes.filter((one) => one.from !== loser || one.to !== winner), terms]
          events.push({ type: 'tribute', tribute: terms })
        }
      }
    }

    // Разоряет не кубик, а войско: см. band.ts. Пока никто не дошёл до места,
    // война остаётся бумагой — и это правильно.
  }

  const afterLords = tickLords(
    world,
    { ...politics, wars, tributes, lastDay: day },
    current,
    days,
    generator,
    playerMage,
  )
  return {
    politics: afterLords.politics,
    settlements: afterLords.settlements,
    rng: afterLords.rng,
    events: [...events, ...afterLords.events],
  }
}

/**
 * Лорды: верность, своеволие архимагов и мятежи.
 *
 * Мятеж — не бросок кубика: верность падает по причинам (голод на его землях,
 * проигранные войны, разорение), а решается лорд тогда, когда архимаг короны
 * не под рукой. Это открытая информация, как и договаривались в п.8: игрок
 * видит состояние архимагов и считает момент сам.
 */
function tickLords(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  days: number,
  rng: Rng,
  playerMage: Archmage['state'],
): {
  politics: Politics
  settlements: Readonly<Record<string, Settlement>>
  rng: Rng
  events: readonly WarEvent[]
} {
  if (days <= 0) return { politics, settlements, rng, events: [] }
  let generator = rng
  const events: WarEvent[] = []
  const archmages: Record<string, Archmage> = { ...politics.archmages }
  let wars = [...politics.wars]
  let places = settlements

  // Архимаг берётся за дело, кончает его и берётся за следующее (этап 60, А1).
  // «Занят» больше не бросок кубика: у занятости есть имя и есть последствия.
  for (const kingdomId of Object.keys(archmages)) {
    const current = archmages[kingdomId]
    if (!current || politics.lastDay + days < current.untilDay) continue
    const [roll, afterRoll] = nextFloat(generator)
    generator = afterRoll
    // Мор зовёт сильнее прочего: где умирают, туда он и идёт.
    const sick = Object.values(places).find(
      (one) =>
        one.population > 0 &&
        kingdomOf(world, one.locationId)?.id === kingdomId &&
        one.strain > 0.6,
    )
    // Доли те же, что были до этапа 60: при дворе 55 из ста, занят 35, в
    // затворе 10. Архимаг при дворе — то, что держит вассалов от мятежа, и
    // менять это число значило бы менять политику мира, а не магию в нём.
    const deed: ArchmageDeed =
      roll < 0.55
        ? 'court'
        : roll < 0.68
          ? sick
            ? 'plague'
            : 'wind'
          : roll < 0.8
            ? 'wind'
            : roll < 0.9
              ? 'war'
              : 'retreat'
    const [span, afterSpan] = nextInt(generator, DEED_DAYS.min, DEED_DAYS.max)
    generator = afterSpan
    const state = stateOfDeed(deed)
    const where =
      deed === 'plague'
        ? (sick?.locationId ?? world.kingdoms[kingdomId]?.capitalId ?? null)
        : deed === 'retreat'
          ? null
          : (world.kingdoms[kingdomId]?.capitalId ?? null)
    if (state !== current.state) events.push({ type: 'archmage', kingdomId, state })
    if (deed !== current.deed) events.push({ type: 'archmageDeed', kingdomId, deed })
    archmages[kingdomId] = {
      ...current,
      kingdomId,
      state,
      untilDay: politics.lastDay + days + span,
      deed,
      locationId: where,
    }
  }

  // Лорды старятся и умирают (этап 64, Ж6). На место умершего садится
  // наследник — человек с именем, своей силой и своей верностью, а не строка:
  // земля переходит к нему, и корона это отмечает.
  const aged: Lord[] = []
  const inherited: Record<string, string> = {}
  for (const lord of politics.lords) {
    const age = (lord.age ?? 40) + days / DAYS_PER_YEAR
    const [dies, afterDeath] = rollChance(generator, lordDeathChance(age) * days)
    generator = afterDeath
    if (!dies) {
      aged.push({ ...lord, age })
      continue
    }
    const [heirName, afterName] = nextInt(generator, 0, LORD_NAMES.length - 1)
    generator = afterName
    const [heirAge, afterHeirAge] = nextInt(generator, 18, 40)
    generator = afterHeirAge
    // Сын не наследует отцовой ссоры (этап 64, Ж6): наследник мятежника
    // возвращается к той короне, из которой род вышел, — с малой верностью, но
    // не с войной. Иначе мятеж становился наследственным званием и мятежники
    // копились бы без конца.
    const wasRebel = lord.kingdomId === null
    const homeland = wasRebel ? (lord.id.split(':')[1] ?? null) : lord.kingdomId
    const heir: Lord = {
      id: `${lord.id}:heir${Math.round(politics.lastDay + days)}`,
      name: LORD_NAMES[heirName] ?? 'Безымянный',
      title: lord.title,
      kingdomId: homeland,
      // Наследник не отец: верность своя, и её ещё надо заслужить.
      loyalty: wasRebel ? 40 : Math.max(20, Math.min(90, Math.round(lord.loyalty * 0.7 + 15))),
      strength: Math.max(6, Math.round(lord.strength * 0.85)),
      age: heirAge,
    }
    aged.push(heir)
    inherited[lord.id] = heir.id
    if (wasRebel) wars = wars.filter((war) => war.a !== lord.id && war.b !== lord.id)
    events.push({ type: 'lordDied', lordId: lord.id, heirId: heir.id, name: lord.name })
  }
  if (Object.keys(inherited).length > 0) {
    const passed: Record<string, Settlement> = { ...places }
    for (const [id, settlement] of Object.entries(passed)) {
      const heirId = settlement.owner ? inherited[settlement.owner] : undefined
      if (heirId) passed[id] = { ...settlement, owner: heirId }
    }
    places = passed
  }

  // Кто чем владеет — один проход по миру на такт, а не по проходу на лорда.
  const ownedBy = new Map<string, string[]>()
  for (const [id, settlement] of Object.entries(places)) {
    if (!settlement.owner || settlement.population <= 0) continue
    const list = ownedBy.get(settlement.owner) ?? []
    list.push(id)
    ownedBy.set(settlement.owner, list)
  }
  const smallestOf = (owner: string): string | null => {
    let pick: string | null = null
    let least = Number.POSITIVE_INFINITY
    for (const id of ownedBy.get(owner) ?? []) {
      const people = places[id]?.population ?? 0
      if (people < least) {
        least = people
        pick = id
      }
    }
    return pick
  }

  const lords: Lord[] = []
  // Идём по постаревшему списку (этап 64, Ж6): в нём вместо умерших уже сидят
  // их наследники, и земля переписана на них выше.
  for (const lord of aged) {
    if (lord.kingdomId === null) {
      // Мятежник без земли — не владетель, а беглец: его никто не считает
      // лордом, и в списке его держать незачем.
      if (holdsAnything(places, lord.id)) lords.push(lord)
      continue
    }

    // Безземельный лорд — не лорд: ни дружины, ни причин служить. Корона
    // жалует ему место из домена (DESIGN.md, п.3.2), а если жаловать нечего —
    // род уходит в тень. Без этого знать вымирала: за век оставалось семь
    // владетелей из шестнадцати, и воевать становилось некому.
    if ((ownedBy.get(lord.id)?.length ?? 0) === 0) {
      const crown = `crown:${lord.kingdomId}`
      const granted = smallestOf(crown)
      if (!granted) continue
      const settlement = places[granted]
      if (!settlement) continue
      places = { ...places, [granted]: { ...settlement, owner: lord.id } }
      ownedBy.set(lord.id, [granted])
      ownedBy.set(
        crown,
        (ownedBy.get(crown) ?? []).filter((id) => id !== granted),
      )
    }
    const holdings = Object.values(settlements).filter((settlement) => settlement.owner === lord.id)
    const hunger =
      holdings.length > 0
        ? holdings.reduce((sum, s) => sum + foodSecurity(s), 0) / holdings.length
        : 1
    const unrest =
      holdings.length > 0 ? holdings.reduce((sum, s) => sum + s.banditry, 0) / holdings.length : 0
    const kingdomAtWar = warsOf({ ...politics, wars }, lord.kingdomId).length > 0

    // Причины недовольства — голод и разбой на своей земле: за них лорд винит
    // корону справедливо. Сама по себе война теперь идёт почти всегда (дружины
    // ходят по-настоящему), и прежняя пеня за неё сводила верность к нулю всем
    // подряд — мятеж становился нормой, а не событием.
    // Свой вассал живёт по своей присяге (этап 74, В4): его верность двигает
    // то, что он видит у сюзерена, — подать, суд, зов на войну, — и считает её
    // `tickVassals`. Здесь она не трогается: иначе корона прибавляла бы ему
    // ровно столько, сколько отнимает тяжёлая подать, и закон переставал бы
    // что-либо значить. Всё остальное — голод, земля, старость и решение о
    // мятеже — у него общее со всеми.
    const own = lord.kingdomId === PLAYER
    let drift = own ? 0 : 0.02
    // Сытость 0.5 — это не голод, а обычная жизнь: амбар редко бывает полон, и
    // ниже половины сидит большинство мест во все времена (замерено: 50 из 62 к
    // пятнадцатому году). При прежнем пороге недовольство было включено всегда,
    // верность съезжала к нулю у всех подряд, и мятеж становился судьбой, а не
    // выбором. Голод — это 0.3, как и написано игроку на экране.
    // Держится год кряду — лорд дозреет до мятежа; пережитый неурожай или
    // прошедшая мимо шайка его не поднимут. Копится медленнее, чем восстанавливается
    // за спокойные годы, иначе мятеж снова станет судьбой всякого владетеля.
    if (!own && hunger < 0.3) drift -= 0.08
    if (!own && unrest > 0.3) drift -= 0.04
    if (!own && kingdomAtWar) drift -= 0.015

    // Честолюбие. Пока верность держалась на одном голоде, она качалась из
    // крайности в крайность вместе с урожаем: сытый век — ни одного мятежа за
    // сто лет, голодный — пятьсот. Между тем вассалы восстают не только от
    // нужды: тот, кто держит земли больше своего сюзерена, рано или поздно
    // спросит, почему он вассал.
    const crownLand = (ownedBy.get(`crown:${lord.kingdomId}`) ?? []).length
    const ownLand = (ownedBy.get(lord.id) ?? []).length
    if (!own && ownLand >= 3 && ownLand >= crownLand) drift -= 0.035
    // Нрав держит корону крепче или слабее (этап 66, Л1): набожный терпит, где
    // корыстный уже считает свои выгоды.
    const held = temperDeeds(lord).loyal
    const loyalty = Math.max(
      0,
      Math.min(100, lord.loyalty + (drift > 0 ? drift * held : drift / held) * days),
    )

    // Момент для мятежа: верности нет, а архимаг короны занят своим.
    // Мятеж — событие, а не погода. Пока война считалась кубиком, лорды
    // бунтовали редко; с живыми дружинами голод и разбой стали постоянными, и
    // при прежних числах за век бунтовала сотня владетелей — к концу корон не
    // оставалось вовсе. Порог ниже, бросок реже: восстают единицы и по делу.
    // У игрока архимага нет — если только он сам не дорос до архимага (этап
    // 43): тогда его вассалы так же не решаются, как вассалы корон.
    const crownMage =
      lord.kingdomId === PLAYER ? playerMage : (archmages[lord.kingdomId]?.state ?? 'free')
    if (loyalty < 12 && crownMage !== 'free') {
      const [rebels, afterRebel] = rollChance(generator, 0.004 * days)
      generator = afterRebel
      if (rebels) {
        const war: War = {
          a: lord.kingdomId,
          b: lord.id,
          since: politics.lastDay + days,
          reason: 'мятеж: корона не слышала своих вассалов',
        }
        wars = [...wars, war]
        events.push({ type: 'rebellion', lordId: lord.id })
        events.push({ type: 'warDeclared', war })

        // С мятежником уходит его гнездо, а не вся провинция: держатели
        // помельче остаются при короне. Когда уходило всё, каждый мятеж
        // отрезал от королевства кусок навсегда — за век короны теряли всю
        // землю, вместе с нею рать, и унимать мятеж становилось некому.
        let nest: string | null = null
        let biggest = -1
        for (const [id, settlement] of Object.entries(places)) {
          if (settlement.owner !== lord.id) continue
          if (settlement.population > biggest) {
            biggest = settlement.population
            nest = id
          }
        }
        const reverted: Record<string, Settlement> = { ...places }
        for (const [id, settlement] of Object.entries(reverted)) {
          if (settlement.owner === lord.id && id !== nest) {
            reverted[id] = { ...settlement, owner: `crown:${lord.kingdomId}` }
          }
        }
        places = reverted

        lords.push({ ...lord, kingdomId: null, loyalty: 0 })
        continue
      }
    }
    lords.push({ ...lord, loyalty })
  }

  // Корона, у которой земли много, а вассалов мало, сажает нового человека.
  // Иначе после большой войны королевство остаётся доменом без знати — землю
  // держать некому, дружин нет, и мир замирает во второй раз.
  for (const kingdomId of Object.keys(archmages)) {
    const crown = `crown:${kingdomId}`
    const vassals = lords.filter((lord) => lord.kingdomId === kingdomId).length
    const demesne = (ownedBy.get(crown) ?? []).filter((id) => (places[id]?.population ?? 0) > 0)
    if (vassals >= 3 || demesne.length < 4) continue
    // Не каждый день: жалование лена — дело месяцев, а не утра. Без броска
    // корона сажала нового человека ежедневно, и за век мир видел сотни
    // наспех посаженных владетелей.
    const [grants, afterGrant] = rollChance(generator, 0.02 * days)
    generator = afterGrant
    if (!grants) continue
    const granted = smallestOf(crown)
    if (!granted) continue
    const settlement = places[granted]
    if (!settlement) continue
    const [nameIndex, afterName] = nextInt(generator, 0, LORD_NAMES.length - 1)
    generator = afterName
    const titles = LORD_TITLES[kingdomId] ?? LORD_TITLES.reEstiz ?? ['барон']
    const id = `lord:${kingdomId}:n${politics.lastDay + days}`
    places = { ...places, [granted]: { ...settlement, owner: id } }
    ownedBy.set(id, [granted])
    ownedBy.set(
      crown,
      demesne.filter((held) => held !== granted),
    )
    lords.push({
      id,
      name: LORD_NAMES[nameIndex] ?? 'Безымянный',
      title: titles[0] ?? 'барон',
      kingdomId,
      loyalty: 65,
      strength: Math.max(8, Math.round(settlement.population / 60)),
      age: 30,
    })
  }

  return {
    politics: { ...politics, wars, lastDay: politics.lastDay, lords, archmages },
    settlements: places,
    rng: generator,
    events,
  }
}

function sameWar(war: War, a: string, b: string): boolean {
  return (war.a === a && war.b === b) || (war.a === b && war.b === a)
}

/**
 * Шайка, поджидающая на дороге.
 * Чем беднее и голоднее округа, тем их больше: разбой — следствие, а не декорация.
 */
export function banditBand(banditry: number, population: number, rng: Rng): [BattleSide, Rng] {
  const base = 3 + banditry * 14 + Math.min(8, population / 400)
  const [roll, next] = nextFloat(rng)
  const size = Math.max(2, Math.round(base * (0.6 + roll * 0.8)))
  const archers = Math.round(size * 0.3)
  const units: Partial<Record<TroopId, number>> = { militia: size - archers }
  if (archers > 0) units.archer = archers
  return [{ name: 'Разбойники', units, morale: 45 + Math.round(banditry * 25), fatigue: 0 }, next]
}

/** Отряд враждебного лорда: настоящее войско, а не шайка. */
export function warband(strength: number, rng: Rng): [BattleSide, Rng] {
  const [roll, next] = nextFloat(rng)
  const size = Math.max(6, Math.round(strength * (0.7 + roll * 0.7)))
  const units: Partial<Record<TroopId, number>> = {
    militia: Math.round(size * 0.4),
    spearman: Math.round(size * 0.3),
    archer: Math.round(size * 0.2),
    manAtArms: Math.max(1, Math.round(size * 0.1)),
  }
  return [{ name: 'Вражеский отряд', units, morale: 70, fatigue: 0 }, next]
}

/** На сколько дней заключают дань. */
const TRIBUTE_DAYS = 365 * 3

/**
 * Условия мира.
 *
 * Слабейший платит дань сильнейшему. Размер — от того, насколько он слабее:
 * мир, который ничего не стоит, ничем и не кончается.
 */
export function peaceTerms(
  loser: string,
  winner: string,
  strengthRatio: number,
  day: number,
): Tribute | null {
  if (strengthRatio >= 0.85) return null
  // С разбитого в прах много не возьмёшь, да и соседи не хотят, чтобы
  // победитель поднялся ещё выше: с совсем слабого берут вполовину меньше.
  const beggared = strengthRatio < 0.2
  const perDay = Math.max(1, Math.round((1 - strengthRatio) * (beggared ? 6 : 12)))
  return {
    from: loser,
    to: winner,
    perDay,
    untilDay: day + (beggared ? Math.round(TRIBUTE_DAYS / 2) : TRIBUTE_DAYS),
  }
}

/**
 * Насколько вероятно, что лорд умрёт в эти сутки (этап 64, Ж6).
 *
 * До пятидесяти пяти — почти никогда: лорды гибнут на войне, а не в постели. А
 * дальше — тем вероятнее, чем дальше, и к восьмидесяти доживают единицы.
 */
export function lordDeathChance(age: number): number {
  if (age < LORD_DEATH_AGE) return 0.00002
  // Не обрыв, а склон: после пятидесяти пяти смерть подступает по квадрату лет.
  // На линейном счёте за шестьдесят пятый год не переваливал почти никто, и
  // знать сменялась вдвое чаще, чем следует, — старики в мире нужны.
  const over = (age - LORD_DEATH_AGE) / 100
  return Math.min(0.01, 0.00002 + over * over * 0.01)
}

/** Есть ли у этого держателя хоть одно место — пусть и разорённое. */
function holdsAnything(settlements: Readonly<Record<string, Settlement>>, lordId: string): boolean {
  for (const settlement of Object.values(settlements)) {
    if (settlement.owner === lordId) return true
  }
  return false
}

/** Чья это корона: по владельцу места. */
function sideOfOwner(owner: string | null): string | null {
  if (!owner) return null
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  const parts = owner.split(':')
  return parts[0] === 'lord' ? (parts[1] ?? null) : null
}
