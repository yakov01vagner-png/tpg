import { musterBands } from './band'
import { NO_FAMILY, START_AGE, birthDayFor } from './dynasty'
import { createSettlements, recruitPool } from './economy'
import type { Settlement } from './economy'
import { EMPTY_PARTY } from './party'
import { NO_REPUTATION } from './reputation'
import { createRng } from './rng'
import type { GameState } from './state'
import { SCHEMA_VERSION } from './state'
import type { Politics } from './war'
import { NO_POLITICS, createPolitics } from './war'
import { defaultStartLocationId, generateWorld } from './world/generate'
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
}

export type LoadResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: string }

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

export function deserialize(json: string): LoadResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Файл сохранения повреждён.' }
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
