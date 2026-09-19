import type { BookDef } from './content/books'
import { BOOKS, BOOKS_BY_ID, STUDENT_DAYS, STUDENT_NAMES } from './content/books'
import { MAGIC_RANKS, rankTier } from './magic'
import { schoolAt } from './school'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Учение (этап 55).
 *
 * Школа была местом, где принимают испытание; теперь это место, где есть
 * ученики, споры, книги — и то, чего не даст наставник. А тот, кто дорос сам,
 * может взять ученика и вести его, пока тот не уйдёт своей дорогой.
 *
 * В состоянии — книги на руках и свой ученик. Всё остальное (какие книги
 * продают здесь, кто спорит в школе) выводится из места.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Какие книги продают здесь.
 *
 * В школе — свои, по её рангу: неофиту не продадут того, чего он не поймёт.
 * В большом городе есть лавка с мирскими книгами; в деревне книг нет.
 */
export function booksAt(
  state: GameState,
  locationId: string = state.locationId,
): readonly BookDef[] {
  const place = state.world.locations[locationId]
  if (!place) return []
  const school = schoolAt(state.world, locationId)
  const population = state.settlements[locationId]?.population ?? place.population
  const hash = hashOf(locationId)
  const out: BookDef[] = []
  for (const [index, book] of BOOKS.entries()) {
    const magical = book.needsMagic !== undefined
    if (magical && !school) continue
    if (!magical && population < 2500) continue
    // Не вся книжная лавка разом: у каждого места свои две-три книги.
    if ((hash + index) % 3 !== 0 && !magical) continue
    if (magical && school && (book.needsMagic ?? 0) > rankTier(school.topRank) * 12) continue
    out.push(book)
  }
  return out
}

/** Есть ли книга на руках и прочитана ли. */
export function hasBook(state: Pick<GameState, 'books'>, bookId: string): boolean {
  return state.books?.[bookId] !== undefined
}

export function bookRead(state: Pick<GameState, 'books'>, bookId: string): boolean {
  return state.books?.[bookId]?.read === true
}

/** Сколько суток чтения уже позади. */
export function bookProgress(state: Pick<GameState, 'books'>, bookId: string): number {
  return state.books?.[bookId]?.days ?? 0
}

export function bookById(bookId: string): BookDef | null {
  return BOOKS_BY_ID[bookId] ?? null
}

/** Поймёшь ли написанное: у иных книг есть порог. */
export function canRead(
  state: Pick<GameState, 'character'>,
  book: BookDef,
): { readonly can: boolean; readonly why: string } {
  if (book.needsMagic === undefined) return { can: true, why: '' }
  const magic = state.character.skills.magic.level
  if (magic < book.needsMagic) {
    return {
      can: false,
      why: `Для этой книги нужна «Магия» не ниже ${book.needsMagic} (у тебя ${magic}).`,
    }
  }
  return { can: true, why: '' }
}

/**
 * Свой ученик (этап 55, Н5).
 *
 * Взять ученика может тот, кто сам дорос: ниже магистра учить нечему. Ученик
 * идёт следом, ест твой хлеб и учится — а через год с лишним уходит своей
 * дорогой, и это правильно.
 */
export const STUDENT_RANK = 'magister'

export function canTakeStudent(state: GameState): { readonly can: boolean; readonly why: string } {
  if (state.student) return { can: false, why: 'У тебя уже есть ученик.' }
  if (rankTier(state.character.magicRank) < rankTier(STUDENT_RANK)) {
    return {
      can: false,
      why: `Учить может магистр и выше, а ты ${MAGIC_RANKS[state.character.magicRank ?? 'neophyte']?.label ?? 'никто'}.`,
    }
  }
  if (!schoolAt(state.world, state.locationId)) {
    return { can: false, why: 'Учеников берут при школе, а не на дороге.' }
  }
  return { can: true, why: '' }
}

export function studentNameFor(world: World, locationId: string, day: number): string {
  const hash = hashOf(`${locationId}|${day}`)
  return STUDENT_NAMES[hash % STUDENT_NAMES.length] ?? 'ученик'
}

/** Пора ли ученику уходить: он выучился, и держать его больше нечестно. */
export function studentDone(state: Pick<GameState, 'student'>, day: number): boolean {
  const student = state.student
  return student !== null && student !== undefined && day - student.since >= STUDENT_DAYS
}

/**
 * Спор в школе (этап 55, Н3).
 *
 * Не урок и не испытание: ученики и магистры спорят о том, чего никто не
 * знает наверняка. Проигравший узнаёт больше победителя, но перед главой
 * выглядит хуже.
 */
export function canDebate(state: GameState): boolean {
  return schoolAt(state.world, state.locationId) !== null
}
