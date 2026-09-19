import { brotherSays, brotherTitle, brothersAt } from './brother'
import { courtOf, courtierAbout, lordHere, lordTemper } from './castle'
import { following } from './companion'
import { LORD_TEMPERS } from './content/castle'
import { TEMPERS } from './content/companions'
import { CRAFT_MASTERS } from './content/craft'
import { PRIEST_TEMPERS } from './content/faith'
import { MERCHANT_TEMPERS } from './content/merchants'
import type { SpeakerKind } from './content/talk'
import { masterOf } from './craft'
import { seneschalDef, seneschalOf } from './estate'
import { healerAt, healerDef } from './heal'
import { isOwnedByPlayer } from './holding'
import { lordRecalls } from './lordlife'
import { dealingWith, merchantsAt } from './merchant'
import { ordersAt } from './order'
import { jobsAt } from './place'
import { lordCall, lordPlan, lordWantLabel } from './plans'
import { attitudeWord, lordRep, placeRep } from './reputation'
import { caravanMaster, caravanTemperDef, shipsAt, skipperDef, skipperOf } from './road'
import type { GameState } from './state'
import { priestAt } from './temple'
import { dayOf } from './time'
import { denizenOf, hermitGiftDef, hermitOf } from './wild'

/**
 * Люди этого места (этап 71, У1).
 *
 * До сих пор каждый экран собирал своих: рынок — купцов, замок — двор, школа —
 * наставника. Человек при этом выглядел по-разному в зависимости от того, с
 * какой стороны на него смотрят. Здесь один список на всех: кто здесь есть, чем
 * занят, как к тебе и что о тебе помнит.
 *
 * Ничего нового не считается — все эти люди уже выводятся из места (этапы
 * 49–66). Это способ спросить их разом.
 */
export interface PersonCard {
  readonly id: string
  readonly name: string
  readonly kind: SpeakerKind | 'healer' | 'seneschal' | 'caravan' | 'skipper' | 'hermit'
  /** Чем занят: одной строкой. */
  readonly about: string
  /** Как к тебе: словом, а не числом. */
  readonly attitude: string
  /** Что он говорит или что о нём говорят. */
  readonly says: string
  /** Где его искать: квартал места, если у места есть кварталы. */
  readonly quarter?: string
}

/**
 * Кто здесь есть.
 *
 * Порядок не случаен: сперва те, кто при тебе (спутники), потом хозяева места
 * (лорд, двор, управляющий), потом те, к кому приходят по делу (купцы, мастера,
 * лекарь, священник, братья), потом проезжие.
 */
export function peopleAt(state: GameState, locationId: string = state.locationId): PersonCard[] {
  const out: PersonCard[] = []
  const day = dayOf(state.time)

  for (const companion of following(state.companions)) {
    out.push({
      id: companion.id,
      name: companion.name,
      kind: 'companion',
      about: TEMPERS[companion.temper]?.label ?? 'спутник',
      attitude: attitudeWord(companion.mood),
      says: '',
    })
  }

  const lord = lordHere(state, locationId)
  if (lord) {
    const temper = LORD_TEMPERS[lordTemper(lord)]
    // Чем он занят — это его замысел, а не «лорд»: видно, чего он хочет и
    // почему (этап 72, Ч1 и Ч6). Зовёт ли он тебя — там же, в его словах (Ч5).
    const plan = lordPlan(state.world, state.politics, state.settlements, lord)
    const call = lordCall(state.world, state.politics, state.settlements, state, lord)
    out.push({
      id: lord.id,
      name: `${lord.title} ${lord.name}`,
      kind: 'lord',
      about: `${temper.label}, хочет ${lordWantLabel(plan.want)}. ${plan.why}`,
      attitude: attitudeWord(lordRep(state.reputation, lord.id)),
      says: call?.why ?? lordRecalls(state, lord.id) ?? temper.greets[0] ?? '',
      quarter: 'castle',
    })
    for (const courtier of courtOf(state, lord)) {
      out.push({
        id: courtier.id,
        name: courtier.name,
        kind: 'courtier',
        about: courtierAbout(courtier.role),
        attitude: attitudeWord(courtier.mood),
        says: '',
        quarter: 'castle',
      })
    }
  }

  const settlement = state.settlements[locationId]
  if (settlement && isOwnedByPlayer(settlement)) {
    const seneschal = seneschalOf(locationId)
    const def = seneschalDef(seneschal.temper)
    out.push({
      id: seneschal.id,
      name: seneschal.name,
      kind: 'seneschal',
      about: `управляющий, ${def.label}`,
      attitude: attitudeWord(placeRep(state.reputation, locationId)),
      says: def.about,
    })
  }

  for (const merchant of merchantsAt(state.world, state.settlements, locationId, state)) {
    out.push({
      id: merchant.id,
      name: merchant.name,
      kind: 'merchant',
      about: `купец, ${MERCHANT_TEMPERS[merchant.temper].label}`,
      attitude: attitudeWord(dealingWith(state, merchant.id).standing),
      says: MERCHANT_TEMPERS[merchant.temper].greets[0] ?? '',
      quarter: 'market',
    })
  }

  for (const job of jobsAt(state, locationId).slice(0, 3)) {
    const master = masterOf(locationId, job)
    out.push({
      id: master.id,
      name: master.name,
      kind: 'master',
      about: `${job.label.toLowerCase()}, ${CRAFT_MASTERS[master.temper].label}`,
      attitude: attitudeWord(placeRep(state.reputation, locationId)),
      says: CRAFT_MASTERS[master.temper].hires[0] ?? '',
      quarter: 'craft',
    })
  }

  const healer = healerAt(state.world, state.settlements, locationId)
  if (healer) {
    const def = healerDef(healer.kind)
    out.push({
      id: healer.id,
      name: healer.name,
      kind: 'healer',
      about: `${def.label}, умение ${healer.skill}`,
      attitude: attitudeWord(placeRep(state.reputation, locationId)),
      says: def.about,
    })
  }

  const priest = priestAt(state.world, state.settlements, locationId)
  if (priest) {
    out.push({
      id: priest.id,
      name: priest.name,
      kind: 'priest',
      about: `${PRIEST_TEMPERS[priest.temper].label} служитель`,
      attitude: attitudeWord(state.piety ?? 0),
      says: PRIEST_TEMPERS[priest.temper].greets[0] ?? '',
      quarter: 'temple',
    })
  }

  // Братья — только своего ордена и только там, где он стоит (этап 59).
  const own = state.guild
    ? ordersAt(state.world, locationId).find((one) => one.id === state.guild?.orderId)
    : null
  if (own) {
    for (const brother of brothersAt(state, own, locationId)) {
      out.push({
        id: brother.id,
        name: brother.name,
        kind: 'brother',
        about: `${brotherTitle(own, brother.role)}, ${own.name.toLowerCase()}`,
        attitude: attitudeWord(brother.mood),
        says: brotherSays(brother, own),
      })
    }
  }

  // Свой обоз, стоящий здесь же, и своё судно — тоже люди (этап 62).
  for (const venture of state.enterprises) {
    if (venture.kind !== 'caravan' || venture.locationId !== locationId || venture.travel) continue
    const master = caravanMaster(venture.id)
    out.push({
      id: master.id,
      name: master.name,
      kind: 'caravan',
      about: `караванщик, ${caravanTemperDef(master.temper).label}`,
      attitude: 'свой',
      says: caravanTemperDef(master.temper).about,
    })
  }
  if (state.ship && state.locationId === locationId) {
    const skipper = skipperOf(state.ship)
    out.push({
      id: skipper.id,
      name: skipper.name,
      kind: 'skipper',
      about: `шкипер «${state.ship.name}», ${skipperDef(skipper.temper).label}`,
      attitude: 'свой',
      says: skipperDef(skipper.temper).about,
      quarter: 'harbour',
    })
  }
  for (const ship of shipsAt(state.world, locationId, day)) {
    out.push({
      id: ship.id,
      name: ship.skipper,
      kind: 'skipper',
      about: `шкипер «${ship.name}»`,
      attitude: 'проезжий',
      says: `Пришёл из ${state.world.locations[ship.fromId]?.name ?? 'моря'}.`,
      quarter: 'harbour',
    })
  }

  // И тот, кто живёт один: в глуши человек — событие (этап 63).
  if (denizenOf(state.world, state, locationId, day) === 'hermit') {
    const hermit = hermitOf(locationId, day)
    out.push({
      id: hermit.id,
      name: hermit.name,
      kind: 'hermit',
      about: 'отшельник',
      attitude: 'не ждал гостей',
      says: hermitGiftDef(hermit.gift).says,
    })
  }

  return out
}
