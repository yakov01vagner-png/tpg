import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Сейв на устройстве. Один слот: игра одна, мир на паузе, пока приложение
 * закрыто (DESIGN.md, п.2), поэтому ничего сложнее не нужно.
 *
 * Ошибки записи не роняют игру: лучше потерять последний ход, чем вылететь
 * посреди смены.
 */
const SAVE_KEY = 'tpg.save'

export async function readSave(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SAVE_KEY)
  } catch {
    return null
  }
}

export async function writeSave(data: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVE_KEY, data)
  } catch {
    // Молча: игрок узнает о проблеме при следующем запуске, а не посреди хода.
  }
}

export async function clearSave(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY)
  } catch {
    // см. выше
  }
}
