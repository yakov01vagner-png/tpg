import type { GameState } from '@tpg/engine'
import { PLAYER, dayOf, holdingsOf, partySize } from '@tpg/engine'

/**
 * Первые десять минут: игра учит сама.
 *
 * Подсказка — не текст-объяснение, а одна строка к тому, что на экране прямо
 * сейчас, и только пока это к месту. Условие читает состояние; показывается
 * первая подходящая; закрытая — не возвращается. Данные, а не код: список
 * можно править, не трогая экран.
 */
export interface Hint {
  readonly id: string
  readonly text: string
  readonly when: (game: GameState) => boolean
}

export const HINTS: readonly Hint[] = [
  {
    id: 'firstJob',
    text: 'Начни с работы: «Заработать» внизу. Деньги — на еду, учёбу и железо.',
    when: (game) => game.character.money < 60 && game.character.level <= 1 && dayOf(game.time) <= 3,
  },
  {
    id: 'sleep',
    text: 'Усталость выше семидесяти — работа не идёт. Спи: полоска сверху покажет, когда.',
    when: (game) => game.character.fatigue >= 70,
  },
  {
    id: 'learn',
    text: 'Работа растит навык медленно, наставник — быстро. «Научиться» есть не везде: ищи города.',
    when: (game) => game.character.money >= 30 && dayOf(game.time) >= 2 && dayOf(game.time) <= 10,
  },
  {
    id: 'skillPoints',
    text: 'Есть нераспределённые очки: «Двор» — нажми на портрет сверху.',
    when: (game) =>
      game.character.unspentSkillPoints > 0 || game.character.unspentAttributePoints > 0,
  },
  {
    id: 'road',
    text: 'Дороги отсюда — под «Кто здесь». Часы — сколько идти; знаки — что ждёт.',
    when: (game) => dayOf(game.time) >= 3 && game.character.money >= 40,
  },
  {
    id: 'gear',
    text: 'Сотня монет — уже кинжал или куртка. Рынок → «Снаряжение».',
    when: (game) => game.character.money >= 100 && !game.character.equipment.weapon,
  },
  {
    id: 'party',
    text: 'Один на дороге — добыча. Два-три ополченца из «Люди» — уже отряд.',
    when: (game) => game.character.money >= 150 && partySize(game.party) === 0,
  },
  {
    id: 'trade',
    text: 'Там, где товар дёшев, его делают. Купи здесь — продай там, где «дорого».',
    when: (game) => game.character.money >= 120 && Object.keys(game.priceLog).length >= 2,
  },
  {
    id: 'service',
    text: 'Со славой можно идти на службу к короне: «Своё» → «Служба». Земля даётся за победы.',
    when: (game) => game.renown >= 2 && game.service === null,
  },
  {
    id: 'holding',
    text: 'Своя земля кормит и требует: «Своё» покажет хлеб, подати, стройку и гарнизон.',
    when: (game) => holdingsOf(game.settlements, PLAYER).length > 0,
  },
  {
    id: 'map',
    text: 'Карта — кнопка сверху справа. Щипок приближает, двойное касание — прыжок.',
    when: (game) => dayOf(game.time) >= 5,
  },
]

export function nextHint(game: GameState, dismissed: ReadonlySet<string>): Hint | null {
  return HINTS.find((hint) => !dismissed.has(hint.id) && hint.when(game)) ?? null
}
