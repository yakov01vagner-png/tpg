import type { Band, GarrisonOrder } from './band'
import { musterBands } from './band'
import type { Battle } from './battle'
import type { Behest } from './behest'
import { startSway } from './brother'
import type { OrderSway } from './brother'
import type { Brotherhood } from './brotherhood'
import type { Campaign, Dispatch } from './campaign'
import type { Captive } from './captive'
import type { ChainProgress } from './chain'
import type { Character } from './character'
import type { Generation, Marks } from './chronicle'
import type { Censure } from './church'
import type { Pact } from './city'
import type { Companion } from './companion'
import type { Commission, Company } from './company'
import type { Congress, CongressRecord } from './congress'
import type { BuildingId } from './content/buildings'
import { COMPANIES } from './content/companies'
import type { IntentId } from './content/dispatch'
import { PLAIN_LAW } from './content/estate'
import type { PlayerAim } from './content/guess'
import type { Ailment } from './content/heal'
import type { LordDeedId } from './content/lords'
import type { QuarterId } from './content/quarters'
import type { HostRole } from './content/scout'
import type { CechMembership } from './craft'
import type { FieldOrder } from './dispatch'
import type { Settlement } from './economy'
import { createSettlements } from './economy'
import type { Embassy } from './embassy'
import type { Enterprise } from './enterprise'
import type { Law } from './estate'
import type { GameEvent, LogKind } from './events'
import { describeEvent, kindOf } from './events'
import type { Fame, Shame } from './fame'
import type { Talk } from './gossip'
import type { Home } from './home'
import type { LawId } from './inherit'
import type { Journey } from './journey'
import type { Knowledge } from './knowledge'
import { startKnowledge } from './knowledge'
import type { Word } from './known'
import type { Artifact, Spellcraft, Weather } from './lore'
import { EMPTY_PRICE_LOG, type PriceLog } from './market'
import type { Dealing } from './merchant'
import type { Blockade, Letter, Warship } from './navy'
import type { Offices } from './office'
import type { Interdict, Membership } from './order'
import type { Overture, Pledge } from './overture'
import type { Party } from './party'
import { EMPTY_PARTY } from './party'
import type { Grievance, PeaceRecord, Talks } from './peace'
import type { Plague } from './plague'
import type { Proof } from './proof'
import { arrivalQuarter } from './quarter'
import type { Quest } from './quest'
import type { Charters } from './realm'
import type { Reputation } from './reputation'
import { NO_REPUTATION } from './reputation'
import type { Resident } from './resident'
import type { Rng } from './rng'
import { createRng } from './rng'
import type { RoyalMarriage } from './royal'
import type { Ruse } from './ruse'
import type { Ship } from './ship'
import type { Siege } from './siege'
import type { Look } from './sight'
import type { Spy } from './spy'
import type { GameTime } from './time'
import { WORLD_START } from './time'
import type { Claim, Crowning } from './title'
import type { Debt, QueuedWork } from './treasury'
import type { Treaty } from './treaty'
import type { Oath } from './vassal'
import type { Politics } from './war'
import { createPolitics } from './war'
import type { WildMemory } from './wild'
import { generateWorld, startLocationFor } from './world/generate'
import type { World } from './world/types'

/** Версия схемы сейва. Растёт при любом несовместимом изменении GameState. */
export const SCHEMA_VERSION = 24

/** Сколько строк лога держим в состоянии. Остальное — история, она не нужна. */
export const LOG_LIMIT = 200

export interface LogEntry {
  readonly time: GameTime
  readonly text: string
  readonly kind: LogKind
}

/**
 * Полное состояние игры: сериализуемые данные и ничего больше.
 * Никаких функций, классов, ссылок на UI — иначе сейв и будущий сервер отпадут.
 */
export interface GameState {
  readonly schemaVersion: number
  readonly time: GameTime
  readonly rng: Rng
  readonly character: Character
  /**
   * Скелет мира. Генерируется один раз при создании игры и дальше не меняется
   * (DESIGN.md, п.3.1) — поэтому лежит прямо в состоянии и уходит в сейв.
   */
  readonly world: World
  /**
   * Живая часть поселений: население и запасы товаров. Скелет мира неизменен,
   * а вот это меняется каждый игровой день.
   */
  readonly settlements: Readonly<Record<string, Settlement>>
  /**
   * Где сейчас находится игрок. Пока идёт путь (`journey`) — место, откуда он
   * вышел: герой числится в дороге от него, а не в пустоте.
   */
  readonly locationId: string
  /**
   * Путь между местами, если герой в дороге.
   *
   * До 0.4 перемещение было мгновенным, и «где ты» всегда было точкой. Теперь
   * между точками можно находиться, и почти всё, что спрашивает место, в пути
   * отвечает отказом: работать, торговать и говорить с людьми под открытым
   * небом не с кем (`ROAD_COMMANDS`).
   */
  readonly journey: Journey | null
  /** Люди под началом игрока. */
  readonly party: Party
  /**
   * Своё судно, если куплено (этап 35).
   *
   * Лежит в состоянии, а не в мире: корабль — имущество героя, как деньги и
   * снаряжение. Пустое почти всю игру: своё судно стоит как три каравана.
   */
  readonly ship: Ship | null
  /**
   * Орден или гильдия, в которой состоит герой (этап 42). Ордена ревнивы:
   * состоять можно в одном. Пусто — сам по себе.
   */
  readonly guild: Membership | null
  /** Когда в последний раз держали двор (этап 43). Необязательно: сейвы до 0.5 двора не знают. */
  readonly courtDay?: number
  /**
   * Где в городе стоит герой (этап 45): квартал большого места. Пусто — место
   * без кварталов или сейв до 0.5. Сам список кварталов не хранится: он
   * выводится из места (`quarter.ts`).
   */
  readonly quarter?: QuarterId | null
  /**
   * Что герой знает о мире (этап 46): открытые провинции. Необязательно —
   * сейв до 0.5 знания не ведёт и знает всё.
   */
  readonly knowledge?: Knowledge
  /**
   * Память купцов о тебе (этап 49): кто как встречает и что помнит. Сами
   * купцы выводятся из места (`merchant.ts`) — в сейве только память.
   * Необязательно: сейвы до 0.6 купцов не знают.
   */
  readonly dealings?: Readonly<Record<string, Dealing>>
  /**
   * Выучка в ремёслах (этап 50): сколько смен отстоял на каждой работе. Из
   * этого числа выводится ступень — подёнщик, подмастерье, работник, мастер.
   */
  readonly craft?: Readonly<Record<string, number>>
  /** Членство в цехе города (этап 50): одно на героя, как и орден. */
  readonly cech?: CechMembership | null
  /**
   * Благочестие (этап 51): как на тебя смотрит церковь. Растёт от обрядов и
   * паломничества, падает от разорения и святотатства. Ниже −50 — отлучение.
   */
  readonly piety?: number
  /** Когда в последний раз ходил к святому месту: паломничество не еженедельно. */
  readonly pilgrimDay?: number
  /**
   * С кем сколько говорили нынче (этап 53): у всякого нрава своё терпение.
   * Обнуляется с новым днём — разговор помнится, но не копится.
   */
  readonly talked?: Readonly<Record<string, number>>
  /**
   * Павшие спутники (этап 54): имя, день и место. Их помнят и о них говорят;
   * встретить их снова нельзя.
   */
  /**
   * Книги на руках (этап 55): что куплено и найдено, и что уже прочитано.
   */
  readonly books?: Readonly<Record<string, { readonly read: boolean; readonly days: number }>>
  /** Свой ученик (этап 55, Н5): кто идёт следом и с какого дня. */
  /** Свой дом (этап 56): где он, какой и что в нём оставлено. */
  readonly home?: Home | null
  /** Что вложено в детей (этап 56): по имени ребёнка. */
  readonly upbringing?: Readonly<Record<string, number>>
  readonly student?: {
    readonly id: string
    readonly name: string
    readonly since: number
    readonly learned: number
  } | null
  readonly fallen?: readonly {
    readonly id: string
    readonly name: string
    readonly day: number
    readonly locationId: string
  }[]
  /**
   * Отведённый мор (этап 41): где и до какого дня чары держат смерть вполовину.
   * Необязательно — сейвы до 0.5 чар не знают.
   */
  readonly cleansed?: { readonly locationId: string; readonly untilDay: number } | null
  /** Идущий бой. Пока он есть, мир стоит: время боя своё (DESIGN.md, п.2). */
  readonly battle: Battle | null
  /** Кто с кем воюет. */
  readonly politics: Politics
  /**
   * Дружины лордов на карте. Войну ведут они: пока никто не дошёл до места,
   * объявленная война остаётся бумагой (band.ts).
   */
  readonly bands: readonly Band[]
  /** Королевство, которому игрок служит за жалованье. */
  readonly service: string | null
  /**
   * Идущая осада: место, сутки под стенами, подкоп и пролом (этап 58).
   * Подкоп и пролом необязательны — сейвы до 0.6 осад без подкопа не знают.
   */
  readonly siege: Siege | null
  /**
   * Взятые в бою лорды (этап 58, Б6): за них платят, им навязывают присягу,
   * их отпускают или вешают. Необязательно — сейвы до 0.6 плена не знают.
   */
  readonly captives?: readonly Captive[]
  /** Слава: победы, за которые корона может пожаловать землю. */
  readonly renown: number
  /**
   * Слава по кругам (этап 68, Ф3): простой люд, купцы, знать, церковь, воины.
   * Одно число славы не годилось: они считают доброе и дурное по-своему.
   * Необязательно — сейвы до 0.6 кругов не знают.
   */
  readonly fame?: Fame
  /** Позор: история, которую надо перекрыть делом (этап 68, Ф6). */
  readonly shames?: readonly Shame[]
  /** Что о тебе помнят места и лорды. */
  readonly reputation: Reputation
  /**
   * Влияние орденов в мире (этап 59, О3): шесть чисел, которые живут без
   * игрока. Необязательно — сейвы до 0.6 орденской жизни не знают.
   */
  readonly orderSway?: OrderSway
  /** Наложенные запреты: где и до какого дня место живёт без ордена. */
  readonly interdicts?: readonly Interdict[]
  /** Своё братство, если основано (этап 59, О6). */
  readonly brotherhood?: Brotherhood | null
  /**
   * Заклинание как ремесло (этап 60, А5): сколько раз творили каждое и когда в
   * последний раз. Необязательно — сейвы до 0.6 мастерства не знают.
   */
  readonly spellcraft?: Spellcraft
  /** Позванная погода: где, какая и до какого дня (этап 60, А3). */
  readonly weather?: readonly Weather[]
  /** Вещи с чарами: найденные и сделанные (этап 60, А6). */
  readonly artifacts?: readonly Artifact[]
  /**
   * Своя земля изнутри (этап 61). Закон, который ты поставил; просьбы, о
   * которых помнят; постройки, которые встали; когда ты был в каждом своём
   * месте. Всё необязательно — сейвы до 0.6 своей земли изнутри не знают.
   */
  readonly law?: Law
  readonly pleas?: Readonly<Record<string, { readonly askId: string; readonly askedDay: number }>>
  readonly works?: Readonly<Record<string, readonly BuildingId[]>>
  readonly visits?: Readonly<Record<string, number>>
  /**
   * Что ты сделал с глушью (этап 63): какое логово вывел, какой схрон обобрал,
   * с каким отшельником говорил. Сама глушь выводится из места и времени — тут
   * лежит только память. Необязательно: сейвы до 0.6 её не знают.
   */
  readonly wilds?: Readonly<Record<string, WildMemory>>
  /**
   * Мор, раны и лекари (этап 64). Сваренные зелья, болезнь отряда и запертые
   * места. Всё необязательно — сейвы до 0.6 этого не знают.
   */
  readonly potions?: Readonly<Record<string, number>>
  readonly ailment?: { readonly kind: Ailment; readonly since: number } | null
  /** Увечья: что осталось от плохо заживших ран. */
  readonly maims?: readonly string[]
  /**
   * Лорды как люди (этап 66). Что лорды о тебе помнят и как к тебе придворные
   * партии. Необязательно — сейвы до 0.6 этого не знают.
   */
  readonly lordDeeds?: Readonly<Record<string, readonly LordDeedId[]>>
  /**
   * Присяги своих вассалов (этап 74): чем каждый платит, что ему оставлено и
   * сколько людей он обязан привести. Сам вассал — обычный лорд с
   * `kingdomId === PLAYER`; в состоянии лежит только договор с ним.
   */
  readonly oaths?: Readonly<Record<string, Oath>>
  /**
   * Двор (этап 75): кто какую должность держит и с какого дня. Умение и имя —
   * у самого человека, а не у должности.
   */
  readonly offices?: Offices
  /**
   * Грамоты державы (этап 76): вольности городов и послабления местам. Лежит
   * только то, что ты кому-то обещал; всё остальное выводится из мира.
   */
  readonly charters?: Charters
  /**
   * Долги державы (этап 77): у кого занято, сколько выросло и когда платили.
   * Счёт прихода и расхода не хранится — он считается из мира.
   */
  readonly debts?: readonly Debt[]
  /** Очередь строек державы (этап 77, К5): что и где строится по порядку. */
  readonly queue?: readonly QueuedWork[]
  /**
   * Венчание на царство (этап 78, Т4): день, титул и то, кто приехал. Сам титул
   * не хранится — он растёт от земли и людей и считается из мира.
   */
  readonly crowned?: Crowning | null
  /** Свои претензии на чужую землю (этап 78, Т5). */
  readonly claims?: readonly Claim[]
  /**
   * Свои посольства в пути (этап 79): к кому, с чем, кто поехал и когда вернётся
   * с ответом. Сам ответ не хранится — он считается в день возвращения.
   */
  readonly embassies?: readonly Embassy[]
  /**
   * Договоры (этап 80): вид, срок, свидетель и тайная статья. Само действие
   * договора живёт там же, где и прежде (союзы и дань в политике); здесь —
   * бумага, которая объясняет, почему оно там.
   */
  readonly treaties?: readonly Treaty[]
  /**
   * Браки с чужими домами (этап 81): единственное, что в родстве корон надо
   * помнить. Сами дома — супруги, дети, наследники — выводятся из короны и дня.
   */
  readonly marriages?: readonly RoyalMarriage[]
  /**
   * Свои соглядатаи (этап 82): кто где сидит и с какого дня. Донесения не
   * хранятся — они считаются из мира в день, когда их спросили.
   */
  readonly spies?: readonly Spy[]
  /** Пущенные слухи (этап 82, С6): против кого и до какого дня. */
  readonly rumours?: readonly { readonly against: string; readonly untilDay: number }[]
  /**
   * Созванный съезд корон (этап 83): он живёт в состоянии, пока не собрался, —
   * и там же лежит то, что уплачено за голоса.
   */
  readonly congress?: Congress | null
  /** Чем кончались съезды: для летописи века. */
  readonly congresses?: readonly CongressRecord[]
  /**
   * Кампания (этап 84): против кого воюем и зачем. Фронты и снабжение не
   * хранятся — они считаются из того, где стоят твои части.
   */
  readonly campaign?: Campaign | null
  /** Донесения, которые ещё идут: весть от войска приходит не в тот же день. */
  readonly dispatches?: readonly Dispatch[]
  /**
   * Что велено своим гарнизонам (этап 85, О5): держать, ходить на вылазки или
   * открыть ворота. Приказ даётся заранее — под стенами спрашивать некогда.
   */
  readonly garrisons?: Readonly<Record<string, GarrisonOrder>>
  /**
   * Вольные роты (этап 86): кому служат, сколько их осталось и сколько им
   * должны. Сами роты — содержимое; здесь только то, что меняется.
   */
  readonly companies?: readonly Company[]
  /** Своя рота: сговор с короной, у которой ты в наёмниках. */
  readonly commission?: Commission | null
  /** Военный флот (этап 87): суда на плаву и на стапеле. */
  readonly navy?: readonly Warship[]
  /** Запертые тобой гавани. */
  readonly blockades?: readonly Blockade[]
  /** Корсарская грамота: чей разбой на воде считается службой. */
  readonly letter?: Letter | null
  /** Идущие переговоры о мире (этап 88). */
  readonly talks?: Talks | null
  /** Заключённые миры: для летописи и для памяти об обиде. */
  readonly peaces?: readonly PeaceRecord[]
  /** Обиды, которые зреют в повод новой войны. */
  readonly grievances?: readonly Grievance[]
  /** Чужие предложения, которые ждут ответа (этап 91). */
  readonly overtures?: readonly Overture[]
  /** Обещания корон: то, что можно сдержать и нарушить. */
  readonly pledges?: readonly Pledge[]
  /** Закон о наследстве (этап 93): что станет с державой без тебя. */
  readonly heirLaw?: LawId
  /** Городские вольности по договору (этап 95). */
  readonly pacts?: readonly Pact[]
  /** Счёт недовольства церкви тобой и её кара (этап 96). */
  readonly churchAnger?: number
  readonly censure?: Censure | null
  /**
   * Вести (этап 99): то, что кому-то принесли о мире.
   *
   * Знание не хранится вторым состоянием — хранятся только вести, из которых оно
   * выводится вместе с правдой. Поэтому знание нельзя рассогласовать с миром.
   */
  readonly words?: readonly Word[]
  /** Когда какое своё место проверяли ревизией (этап 100). */
  readonly audits?: Readonly<Record<string, number>>
  /** Молва, которая ходит по миру (этап 101). */
  readonly gossip?: readonly Talk[]
  /** Посланные смотреть: ещё не вернулись (этап 102). */
  readonly looks?: readonly Look[]
  /** Кто как с тобой говорил: сколько раз и сколько раз солгал (этап 103). */
  readonly trust?: Readonly<Record<string, { readonly said: number; readonly lied: number }>>
  /** Кому из своих ты что исполнил, а в чём отказал (этап 104). */
  readonly favours?: Readonly<Record<string, number>>
  /**
   * На что уходит твоё внимание (этап 107): сколько дел ты разобрал сам,
   * сколько передал своим и сколько решилось без тебя.
   */
  readonly ruleLog?: {
    readonly heard: number
    readonly handed: number
    readonly missed: number
  }
  /** Дела, которые ты уже разобрал или передал: чтобы не звали дважды. */
  readonly settled?: Readonly<Record<string, number>>
  /**
   * Лучшее, что было у дома (этап 132): земля, титул и честь в лучший его день.
   *
   * Потеря считается против этого, и потому лучшее приходится помнить: вывести
   * прошлое из настоящего нельзя.
   */
  readonly houseBest?: {
    readonly places: number
    readonly titleTier: number
    readonly shames: number
    readonly day: number
  }
  /** Сколько вложено в воспитание наследника: доля отцовского умения сверх трети. */
  readonly raised?: number
  /**
   * Кто признал тебя не по силе (этап 131): дверью договора, родства или дара.
   *
   * Хранится день признания, потому что вывести его нельзя: дар был или не был.
   * Признание можно и отозвать (этап 138) — тогда запись уходит.
   */
  readonly recognitions?: Readonly<Record<string, number>>
  /**
   * Объединение (этап 131): с какого дня тебя признали все.
   *
   * Хранится один день, потому что вывести его нельзя: срок — это история, а не
   * состояние. Отвалился кто-нибудь — день сбрасывается, и круг идёт заново.
   */
  readonly union?: { readonly sinceDay: number } | null
  /**
   * Короны, которые у тебя в долгу (этап 133): сколько и с какого дня.
   *
   * Заём — история, а не состояние: вывести из мира, что ты дал Роблу двадцать
   * тысяч на его войну, нельзя. Долг растёт процентом от дня займа и потому
   * помнит день.
   */
  readonly crownDebts?: Readonly<
    Record<string, { readonly owed: number; readonly sinceDay: number }>
  >
  /**
   * Помазание (этап 134): с какого дня церковь зовёт тебя своим государем.
   *
   * Как и срок объединения, это история: день, когда назвали. Перестали звать —
   * запись уходит, и круг идёт заново.
   */
  readonly anointed?: { readonly sinceDay: number } | null
  /** Когда за каждое дело веры брались в последний раз (этап 134): второй раз не сразу. */
  readonly deeds?: Readonly<Record<string, number>>
  /**
   * Кто тебя боится и с какого дня (этап 135).
   *
   * Само число страха считается из мира и не хранится; хранится только день, с
   * которого эта корона боится, — история, которую из состояния не вывести.
   */
  readonly dreadLog?: Readonly<
    Record<string, { readonly score: number; readonly sinceDay: number }>
  >
  /**
   * Коалиция, которая уже стоит (этап 136): против кого, кто в ней и с какого дня.
   *
   * Сложиться она может и заново, но пока стоит — держится сроком, а не
   * сегодняшним страхом: войну не распускают оттого, что испуг прошёл.
   */
  readonly league?: {
    readonly against: string
    readonly members: readonly string[]
    readonly sinceDay: number
  } | null
  /** Кого из коалиции выкупили и когда: ключ сработал один раз, и это помнится. */
  readonly leagueBought?: Readonly<Record<string, number>>
  /** Коалиции за игру: сколько сложилось, сколько разобрано и против кого. */
  readonly leagueLog?: {
    readonly formed: number
    readonly bought: number
    readonly against: readonly string[]
  }
  /**
   * Поручительства (этап 137): кто за кого поручился, с какого дня и кто не пришёл.
   *
   * Слово — история: из состояния мира не вывести, ручался ли ты за Хладь.
   */
  readonly guarantees?: readonly {
    readonly by: string
    readonly of: string
    readonly sinceDay: number
    readonly brokenDay?: number
    readonly calledDay?: number
    /** Кто пошёл на того, за кого ты поручился: по нему и считается, пришёл ли ты. */
    readonly against?: string
  }[]
  /** Кто под чьей рукой (этап 137): не дань и не вассалитет, а третье. */
  readonly hands?: readonly {
    readonly patron: string
    readonly ward: string
    readonly sinceDay: number
  }[]
  /**
   * Кого признал ты сам (этап 138): чужой путь двигается и твоей рукой.
   *
   * Хранится день: признание — это поступок, а не положение вещей.
   */
  readonly given?: Readonly<Record<string, number>>
  /** Отозванные признания (этап 138): кто, у кого и когда. Это повод к войне. */
  readonly recalls?: readonly {
    readonly by: string
    readonly of: string
    readonly day: number
  }[]
  /**
   * Идёшь ли ты тихо (этап 139): с какого дня.
   *
   * Это решение государя, а не положение вещей: вывести его из мира нельзя.
   * Пока оно в силе, громкие дела закрыты, а молва о тебе идёт хуже.
   */
  readonly quiet?: { readonly sinceDay: number } | null
  /**
   * Пути корон (этап 140): выбранный путь, день и земля на тот день.
   *
   * Выводится путь из нрава и уклада; хранится только то, что нельзя вывести, —
   * смена пути и земля, по убыли которой она считается.
   */
  readonly crownWays?: Readonly<
    Record<string, { readonly way: string; readonly sinceDay: number; readonly places: number }>
  >
  /** Коалиции, собранные не против того (этап 139): день и имя. Это помнят. */
  readonly wrongCalls?: readonly {
    readonly against: string
    readonly day: number
    readonly shown?: number
  }[]
  /** Когда каждый навык трогали в последний раз (этап 125): он ржавеет. */
  readonly usedDay?: Readonly<Record<string, number>>
  /** Чем ты рос на самом деле (этап 124) и какие испытания уже брал. */
  readonly pathLog?: {
    readonly byDoing: number
    readonly byTeacher: number
    readonly byBook: number
    readonly byTrial: number
    readonly byService: number
  }
  readonly trials?: Readonly<Record<string, number>>
  /** Что век записал о чужих обманах (этап 121). */
  readonly deceitLog?: {
    readonly made: number
    readonly worked: number
    readonly caught: number
  }
  /** Во что верит каждая корона о чужой силе (этап 120): «кто:о ком» → число. */
  readonly beliefs?: Readonly<Record<string, { readonly value: number; readonly day: number }>>
  readonly biasLog?: {
    readonly held: number
    readonly woke: number
    readonly warsByError: number
  }
  /** К какому выводу о твоём замысле пришла каждая корона (этап 119). */
  readonly guesses?: Readonly<
    Record<string, { readonly aim: PlayerAim; readonly sinceDay: number; readonly right: boolean }>
  >
  /** Сколько раз она уже видела свои приметы: она учится на повторяющемся. */
  readonly tellSeen?: Readonly<Record<string, number>>
  readonly guessLog?: {
    readonly made: number
    readonly right: number
    readonly wrong: number
    readonly confused: number
  }
  /** Постоянные послы при чужих дворах (этап 117). */
  readonly residents?: readonly Resident[]
  readonly residentLog?: {
    readonly seated: number
    readonly words: number
    readonly lost: number
  }
  /** Доказательства чужих сговоров, что у тебя на руках (этап 116). */
  readonly proofs?: readonly Proof[]
  readonly proofLog?: {
    readonly got: number
    readonly shown: number
    readonly forged: number
    readonly caught: number
  }
  /** За чьё молчание заплачено и до какого дня (этап 115). */
  readonly hushed?: Readonly<Record<string, number>>
  /** Что стало с тайными статьями. */
  readonly secretLog?: {
    readonly made: number
    readonly leaked: number
    readonly hushed: number
    readonly caught: number
  }
  /** Чужие сговоры, о которых ты выведал: день, когда узнал. */
  readonly learned?: Readonly<Record<string, number>>
  /** Чужой посол, который сейчас гостит, и что ему решили показать (этап 114). */
  readonly showing?: Readonly<Record<string, 'plain' | 'strong' | 'poor'>>
  readonly envoyLog?: {
    readonly sent: number
    readonly brought: number
    readonly offSum: number
    readonly guests: number
  }
  /** Чем решались осады: знанием или стенами (этап 113). */
  readonly siegeLog?: {
    readonly byKnowing: number
    readonly byWalls: number
    readonly bluffs: number
    readonly defectors: number
  }
  /** Обманы, которые сейчас живут на карте (этап 112). */
  readonly ruses?: readonly Ruse[]
  readonly ruseLog?: { readonly made: number; readonly worked: number; readonly seen: number }
  /** Приказы, которые ещё едут к своим частям в поле (этап 111). */
  readonly fieldOrders?: readonly FieldOrder[]
  /** Замысел, данный части: он не стареет в дороге. */
  readonly intents?: Readonly<Record<string, IntentId>>
  /** Что стало с приказами в поле. */
  readonly orderLog?: {
    readonly sent: number
    readonly onTime: number
    readonly stale: number
    readonly ownWay: number
  }
  /** Чем занята часть, кроме войны: дозором или завесой (этап 110). */
  readonly roles?: Readonly<Record<string, HostRole>>
  /** Что дала разведка и во что встала. */
  readonly scoutLog?: { readonly learned: number; readonly spent: number }
  /** Приказы, которые сейчас в дороге или в работе (этап 108). */
  readonly behests?: readonly Behest[]
  /** Чем кончались прежние приказы: исполнением, своеволием или ничем. */
  readonly behestLog?: {
    readonly sent: number
    readonly full: number
    readonly twisted: number
    readonly none: number
  }
  readonly factions?: Readonly<Record<string, number>>
  /** Своё владение, если провозглашено. */
  /**
   * Своё имя на карте. С этапа 67 помнит и день, когда оно появилось: у имени
   * бывает годовщина. Необязательно — сейвы до 0.6 дня не знают.
   */
  readonly realm: { readonly name: string; readonly sinceDay?: number } | null
  /** Взятые поручения. */
  readonly quests: readonly Quest[]
  /** Именные люди при герое: с ними идут, им поручают, их теряют. */
  readonly companions: readonly Companion[]
  /** Караваны и мастерские: доход, который идёт без игрока. */
  readonly enterprises: readonly Enterprise[]
  /** Где идёт мор. Пусто почти всегда — и тем страшнее, когда не пусто. */
  readonly plagues: readonly Plague[]
  /** Записная книжка купца: цены там, где ты был или где стоял твой караван. */
  readonly priceLog: PriceLog
  /** Поручения руками: какие идут и какие уже сделаны. */
  readonly chains: readonly ChainProgress[]
  readonly doneChains: readonly string[]
  /** Сколько боёв выиграно: цепочки и лорды считают по этому. */
  readonly battlesWon: number
  /** Где уже искали. Находка одна на место: курган не станок для денег. */
  readonly searchedSites: readonly string[]
  /** Игра кончена: герой погиб. Пермадэт редкий, но настоящий. */
  readonly over: boolean
  /**
   * Летопись рода и карта памяти (этап 69). Колена рода пишутся, когда имя
   * переходит наследнику; места отмечаются тем, что в них было.
   * Необязательно — сейвы до 0.6 этого не знают.
   */
  /**
   * Ради чего (этап 70): выбранная цель жизни и взятые вехи. Цель ничего не
   * запрещает — она называет, ради чего всё это, и по ней видно следующий шаг.
   * Необязательно — сейвы до 0.6 целей не знают.
   */
  readonly goal?: string | null
  readonly milestones?: readonly string[]
  readonly house?: readonly Generation[]
  readonly marks?: Marks
  readonly log: readonly LogEntry[]
}

export function createGame(character: Character, seed = 1, prebuilt?: World): GameState {
  // Мир можно передать готовым: тестам и прогонам баланса незачем каждый раз
  // собирать семьдесят локаций заново.
  const world = prebuilt ?? generateWorld(seed)
  const locationId = startLocationFor(world, character.tags)
  const home = world.locations[locationId]
  // Землю раздаём сразу: у каждого места есть держатель, иначе отнимать не у кого.
  const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(seed))
  const [bands] = musterBands(politics, settlements, createRng(seed + 7))
  return {
    schemaVersion: SCHEMA_VERSION,
    time: WORLD_START,
    rng: createRng(seed),
    character,
    world,
    settlements,
    locationId,
    journey: null,
    quarter: arrivalQuarter({ world, settlements }, locationId),
    knowledge: startKnowledge(world, locationId),
    dealings: {},
    craft: {},
    cech: null,
    piety: 0,
    talked: {},
    fallen: [],
    books: {},
    home: null,
    upbringing: {},
    student: null,
    party: EMPTY_PARTY,
    ship: null,
    guild: null,
    orderSway: startSway(),
    law: PLAIN_LAW,
    pleas: {},
    works: {},
    visits: {},
    wilds: {},
    potions: {},
    ailment: null,
    maims: [],
    lordDeeds: {},
    oaths: {},
    offices: {},
    charters: {},
    debts: [],
    queue: [],
    crowned: null,
    claims: [],
    embassies: [],
    treaties: [],
    marriages: [],
    spies: [],
    rumours: [],
    congress: null,
    congresses: [],
    campaign: null,
    dispatches: [],
    garrisons: {},
    companies: startingCompanies(world),
    commission: null,
    navy: [],
    blockades: [],
    letter: null,
    talks: null,
    peaces: [],
    grievances: [],
    overtures: [],
    pledges: [],
    heirLaw: 'eldest',
    pacts: [],
    churchAnger: 0,
    censure: null,
    words: [],
    audits: {},
    gossip: [],
    looks: [],
    trust: {},
    favours: {},
    ruleLog: { heard: 0, handed: 0, missed: 0 },
    settled: {},
    houseBest: { places: 0, titleTier: 0, shames: 0, day: 0 },
    raised: 0,
    recognitions: {},
    union: null,
    crownDebts: {},
    anointed: null,
    deeds: {},
    dreadLog: {},
    league: null,
    leagueBought: {},
    leagueLog: { formed: 0, bought: 0, against: [] },
    guarantees: [],
    hands: [],
    given: {},
    recalls: [],
    quiet: null,
    wrongCalls: [],
    crownWays: {},
    usedDay: {},
    pathLog: { byDoing: 0, byTeacher: 0, byBook: 0, byTrial: 0, byService: 0 },
    trials: {},
    deceitLog: { made: 0, worked: 0, caught: 0 },
    beliefs: {},
    biasLog: { held: 0, woke: 0, warsByError: 0 },
    guesses: {},
    tellSeen: {},
    guessLog: { made: 0, right: 0, wrong: 0, confused: 0 },
    residents: [],
    residentLog: { seated: 0, words: 0, lost: 0 },
    proofs: [],
    proofLog: { got: 0, shown: 0, forged: 0, caught: 0 },
    hushed: {},
    secretLog: { made: 0, leaked: 0, hushed: 0, caught: 0 },
    learned: {},
    showing: {},
    envoyLog: { sent: 0, brought: 0, offSum: 0, guests: 0 },
    siegeLog: { byKnowing: 0, byWalls: 0, bluffs: 0, defectors: 0 },
    ruses: [],
    ruseLog: { made: 0, worked: 0, seen: 0 },
    fieldOrders: [],
    intents: {},
    orderLog: { sent: 0, onTime: 0, stale: 0, ownWay: 0 },
    roles: {},
    scoutLog: { learned: 0, spent: 0 },
    behests: [],
    behestLog: { sent: 0, full: 0, twisted: 0, none: 0 },
    factions: {},
    spellcraft: {},
    weather: [],
    artifacts: [],
    interdicts: [],
    brotherhood: null,
    battle: null,
    politics,
    bands,
    service: null,
    siege: null,
    captives: [],
    renown: 0,
    fame: {},
    shames: [],
    house: [],
    marks: {},
    goal: null,
    milestones: [],
    reputation: NO_REPUTATION,
    realm: null,
    quests: [],
    companions: [],
    enterprises: [],
    plagues: [],
    priceLog: EMPTY_PRICE_LOG,
    chains: [],
    doneChains: [],
    battlesWon: 0,
    searchedSites: [],
    over: false,
    log: [
      {
        time: WORLD_START,
        text: `${character.name} начинает свой путь${home ? ` в месте под названием ${home.name}` : ''}.`,
        kind: 'notice',
      },
    ],
  }
}

/** Дописать в лог строки, которые породили события. */
export function appendLog(
  log: readonly LogEntry[],
  time: GameTime,
  events: readonly GameEvent[],
): readonly LogEntry[] {
  const entries: LogEntry[] = []
  for (const event of events) {
    const text = describeEvent(event)
    if (text !== null) entries.push({ time, text, kind: kindOf(event) })
  }
  if (entries.length === 0) return log
  return [...log, ...entries].slice(-LOG_LIMIT)
}

/**
 * Роты, с которых начинается мир (этап 86, Н1).
 *
 * Они есть до игрока и живут без него: стоят там, где их застали, никому не
 * служат и кормятся чем придётся. Наниматель — дело наживное.
 */
function startingCompanies(world: World): readonly Company[] {
  // Роту застают там, где она стояла: место выводится из её имени и мира, а не
  // из броска, — как купцы (этап 49) и крепости (этап 85).
  const places = Object.values(world.locations)
    .filter((one) => one.population > 0)
    .map((one) => one.id)
  return COMPANIES.map((def, index) => ({
    id: def.id,
    men: def.men,
    hiredBy: null,
    untilDay: 0,
    owed: 0,
    unpaidDays: 0,
    fame: 0,
    locationId: places[(index * 37 + def.men) % Math.max(1, places.length)] ?? '',
  }))
}
