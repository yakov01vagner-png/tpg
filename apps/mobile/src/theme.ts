/**
 * Язык оформления.
 *
 * Один файл отвечает за то, как выглядит всё: экраны не выдумывают своих
 * цветов и отступов, а берут отсюда. Тёмное фэнтези, текст — главный носитель,
 * поэтому первое, что здесь задано, — шкала шрифта и воздух вокруг него.
 *
 * Цвета собраны палитрой, а не россыпью: слои фона (от самого глубокого к
 * поднятому), линии, текст по силе, акцент и четыре смысловых цвета. Смысловой
 * цвет никогда не единственный носитель смысла (DESIGN.md, п.10): рядом всегда
 * слово или число.
 */
export const palette = {
  // Слои: чем выше элемент, тем светлее подложка.
  bg: '#12100e',
  surface: '#1b1815',
  surfaceAlt: '#221e1a',
  raised: '#2a2521',
  // Линии.
  line: '#2e2924',
  lineStrong: '#3d362f',
  // Текст по силе.
  text: '#e8e0d4',
  dim: '#9a8f80',
  faint: '#6d6459',
  // Акцент — золото, и его тень для второстепенного.
  gold: '#c9a227',
  goldDim: '#8a7020',
  // Смысловые.
  danger: '#b5493a',
  good: '#7f9350',
  warn: '#c58a2a',
  info: '#6f8fbf',
} as const

/** Обратная совместимость: старые экраны читали `colors`. */
export const colors = palette

/** Шкала отступов. Между ними — ничего: расстояние либо из шкалы, либо ноль. */
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

export const radius = 10
export const radii = { sm: 6, md: 10, lg: 16, pill: 999 } as const

/** Шкала шрифта: шесть ступеней, у каждой своя высота строки. */
export const font = {
  display: 26,
  title: 21,
  heading: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const

export const lineHeight = {
  display: 32,
  title: 27,
  heading: 23,
  body: 21,
  small: 18,
  tiny: 14,
} as const

/** Высота, до которой дотягивается палец: меньше не делаем. */
export const touch = { min: 44, comfortable: 48 } as const

/**
 * Тон времени суток: шапка едва заметно меняет цвет, и игрок чувствует час,
 * не читая его. Тон — подложка, слово «рассвет» остаётся рядом.
 */
export const dayTint = {
  night: '#141621',
  dawn: '#241d16',
  morning: '#1f1b16',
  noon: '#1d1a17',
  evening: '#211a18',
  dusk: '#221a1f',
} as const

export type Tone = 'neutral' | 'gold' | 'danger' | 'good' | 'warn' | 'info'

export const toneColor: Record<Tone, string> = {
  neutral: palette.dim,
  gold: palette.gold,
  danger: palette.danger,
  good: palette.good,
  warn: palette.warn,
  info: palette.info,
}
