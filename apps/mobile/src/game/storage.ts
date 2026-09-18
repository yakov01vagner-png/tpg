import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Сейвы на устройстве.
 *
 * Слотов несколько: игра одна, но игроков в семье бывает больше одного, и
 * «попробовать другого героя, не теряя этого» — обычное желание. Автосейв
 * пишет в текущий слот; переключение слота — ручное. Перенос между
 * устройствами — строкой: сейв целиком сериализуем (правило репозитория №3),
 * и его можно скопировать и вставить.
 *
 * Ошибки записи не роняют игру: лучше потерять последний ход, чем вылететь
 * посреди смены.
 */
const LEGACY_KEY = 'tpg.save'
const SLOT_KEY = 'tpg.slot'
const slotKey = (slot: number) => `tpg.save.${slot}`

export const SLOTS = [1, 2, 3] as const
export type Slot = (typeof SLOTS)[number]

export interface SlotInfo {
  readonly slot: Slot
  readonly name: string
  readonly day: number
  readonly savedAt: number
}

async function currentSlot(): Promise<Slot> {
  try {
    const raw = await AsyncStorage.getItem(SLOT_KEY)
    const slot = Number(raw)
    return (SLOTS as readonly number[]).includes(slot) ? (slot as Slot) : 1
  } catch {
    return 1
  }
}

export async function selectSlot(slot: Slot): Promise<void> {
  try {
    await AsyncStorage.setItem(SLOT_KEY, String(slot))
  } catch {
    // Молча: см. выше.
  }
}

/** Прочитать текущий слот. Старый одиночный сейв переезжает в первый слот. */
export async function readSave(): Promise<string | null> {
  try {
    const slot = await currentSlot()
    const raw = await AsyncStorage.getItem(slotKey(slot))
    if (raw !== null) return raw
    const legacy = await AsyncStorage.getItem(LEGACY_KEY)
    if (legacy !== null && slot === 1) {
      await AsyncStorage.setItem(slotKey(1), legacy)
      await AsyncStorage.removeItem(LEGACY_KEY)
      return legacy
    }
    return null
  } catch {
    return null
  }
}

export async function readSlot(slot: Slot): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(slotKey(slot))
  } catch {
    return null
  }
}

export async function writeSave(data: string): Promise<void> {
  try {
    const slot = await currentSlot()
    await AsyncStorage.setItem(slotKey(slot), data)
  } catch {
    // Молча: игрок узнает о проблеме при следующем запуске, а не посреди хода.
  }
}

export async function writeSlot(slot: Slot, data: string): Promise<void> {
  try {
    await AsyncStorage.setItem(slotKey(slot), data)
  } catch {
    // см. выше
  }
}

export async function clearSave(): Promise<void> {
  try {
    const slot = await currentSlot()
    await AsyncStorage.removeItem(slotKey(slot))
  } catch {
    // см. выше
  }
}

export async function clearSlot(slot: Slot): Promise<void> {
  try {
    await AsyncStorage.removeItem(slotKey(slot))
  } catch {
    // см. выше
  }
}

/** Что лежит в слотах — для списка на экране, без разбора всего сейва. */
export async function listSlots(): Promise<readonly (SlotInfo | { slot: Slot; name: null })[]> {
  const out: (SlotInfo | { slot: Slot; name: null })[] = []
  for (const slot of SLOTS) {
    const raw = await readSlot(slot)
    if (raw === null) {
      out.push({ slot, name: null })
      continue
    }
    try {
      const data = JSON.parse(raw) as {
        character?: { name?: string }
        time?: number
        savedAt?: number
      }
      out.push({
        slot,
        name: data.character?.name ?? '…',
        day: Math.floor((data.time ?? 0) / 1440) + 1,
        savedAt: data.savedAt ?? 0,
      })
    } catch {
      out.push({ slot, name: null })
    }
  }
  return out
}

export async function activeSlot(): Promise<Slot> {
  return currentSlot()
}
