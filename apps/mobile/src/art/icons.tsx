import type { ReactNode } from 'react'
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg'
import { palette } from '../theme'

/**
 * Знаки.
 *
 * Правило стиля — до второй иконки, а не после девяностой:
 * - сетка 24×24, живая область 3..21;
 * - линия 1.7, концы и стыки круглые, заливок нет — кроме одной плашки на
 *   знак, и та на четверть прозрачности, чтобы читалась на тёмном;
 * - один цвет: знак берёт цвет текста рядом, а не носит свой;
 * - силуэт узнаваем в 16 пикселей, детали — в 24. Что не читается в 16,
 *   вычёркивается.
 *
 * Всё векторное и своё: девяносто знаков — это килобайты, а не мегабайты.
 */
export type IconName =
  // товары
  | 'grain'
  | 'fish'
  | 'salt'
  | 'timber'
  | 'iron'
  | 'herbs'
  | 'cloth'
  | 'wine'
  | 'tools'
  | 'weapons'
  | 'honey'
  | 'leather'
  | 'furs'
  | 'silver'
  | 'spices'
  // слоты
  | 'weapon'
  | 'shield'
  | 'armor'
  | 'helmet'
  | 'horse'
  // воины
  | 'militia'
  | 'spearman'
  | 'archer'
  | 'manAtArms'
  | 'horseman'
  | 'mage'
  // постройки
  | 'granary'
  | 'mill'
  | 'walls'
  | 'barracks'
  | 'smithy'
  | 'market'
  | 'well'
  | 'chapel'
  | 'tavern'
  | 'watchtower'
  | 'warehouse'
  | 'bathhouse'
  // навыки
  | 'heavyWeapons'
  | 'hardLabour'
  | 'lightWeapons'
  | 'archery'
  | 'sleight'
  | 'athletics'
  | 'riding'
  | 'survival'
  | 'magic'
  | 'scholarship'
  | 'healing'
  | 'engineering'
  | 'concentration'
  | 'fortitude'
  | 'trade'
  | 'persuasion'
  | 'command'
  // атрибуты
  | 'strength'
  | 'agility'
  | 'endurance'
  | 'mind'
  | 'will'
  | 'charisma'
  // виды мест
  | 'capital'
  | 'city'
  | 'town'
  | 'village'
  | 'port'
  | 'fortress'
  | 'mine'
  | 'monastery'
  // местность
  | 'plains'
  | 'forest'
  | 'hills'
  | 'mountains'
  | 'marsh'
  | 'coast'
  | 'steppe'
  | 'desert'
  // нравы
  | 'honest'
  | 'greedy'
  | 'proud'
  | 'devout'
  | 'grim'
  | 'loyal'
  // гербы
  | 'crestReEstiz'
  | 'crestRobl'
  | 'crestBoharut'
  | 'crestDurHazad'
  | 'crestTribes'
  | 'crestHlad'
  | 'crestRahim'
  | 'crestLeague'
  | 'crestPlayer'
  // знаки на карте и состояния
  | 'army'
  | 'plague'
  | 'siege'
  | 'famine'
  | 'ruins'
  | 'war'
  | 'caravan'
  | 'banditry'
  // интерфейс
  | 'map'
  | 'back'
  | 'clock'
  | 'coin'
  | 'fatigue'
  | 'road'
  | 'people'
  | 'journal'
  | 'home'
  | 'learn'
  | 'earn'
  | 'own'
  | 'rest'
  | 'wound'
  | 'captive'
  // --- места без жителей ----------------------------------------------------
  | 'pass'
  | 'ford'
  | 'crossing'
  | 'bridge'
  | 'oasis'
  | 'lodge'
  | 'grove'
  | 'wilds'
  | 'barrow'
  | 'outpost'
  | 'quarry'
  | 'shrine'
  | 'spring'
  | 'causeway'

type Glyph = (c: string, f: string) => ReactNode
const W = 1.7

/** Обводка одним словом: все знаки рисуются ею. */
const s = (c: string) => ({
  stroke: c,
  strokeWidth: W,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
})

const GLYPHS: Record<IconName, Glyph> = {
  // --- товары ---------------------------------------------------------------
  grain: (c) => (
    <>
      <Path d="M12 21V9" {...s(c)} />
      <Path d="M12 9c-3 0-4-2-4-5 3 0 4 2 4 5zm0 0c3 0 4-2 4-5-3 0-4 2-4 5z" {...s(c)} />
      <Path d="M12 14c-3 0-4-2-4-4 3 0 4 1 4 4zm0 0c3 0 4-2 4-4-3 0-4 1-4 4z" {...s(c)} />
    </>
  ),
  fish: (c, f) => (
    <>
      <Path d="M4 12c3-4 7-6 12-5 2 2 2 8 0 10-5 1-9-1-12-5z" {...s(c)} fill={f} />
      <Path d="M16 7l4-3v16l-4-3" {...s(c)} />
      <Circle cx="8" cy="11" r="1" fill={c} />
    </>
  ),
  salt: (c) => (
    <>
      <Path d="M8 4h8l1 6H7z" {...s(c)} />
      <Path d="M7 10h10v8a2 2 0 01-2 2H9a2 2 0 01-2-2z" {...s(c)} />
      <Circle cx="10" cy="14" r="0.8" fill={c} />
      <Circle cx="14" cy="16" r="0.8" fill={c} />
      <Circle cx="12" cy="13" r="0.8" fill={c} />
    </>
  ),
  timber: (c, f) => (
    <>
      <Rect x="3" y="9" width="14" height="6" rx="3" {...s(c)} fill={f} />
      <Circle cx="17" cy="12" r="3" {...s(c)} />
      <Circle cx="17" cy="12" r="1" {...s(c)} />
    </>
  ),
  iron: (c, f) => (
    <>
      <Path d="M4 16l4-8h8l4 8z" {...s(c)} fill={f} />
      <Path d="M4 16h16" {...s(c)} />
    </>
  ),
  herbs: (c) => (
    <>
      <Path d="M12 21V8" {...s(c)} />
      <Path d="M12 12c-4 0-6-2-6-6 4 0 6 2 6 6z" {...s(c)} />
      <Path d="M12 16c4 0 6-2 6-6-4 0-6 2-6 6z" {...s(c)} />
    </>
  ),
  cloth: (c) => (
    <>
      <Path d="M4 6h16v4H4zM4 10c4 0 4 4 8 4s4-4 8-4v8H4z" {...s(c)} />
    </>
  ),
  wine: (c, f) => (
    <>
      <Path d="M8 4h8v5a4 4 0 01-8 0z" {...s(c)} fill={f} />
      <Path d="M12 13v6M9 19h6" {...s(c)} />
    </>
  ),
  tools: (c) => (
    <>
      <Path d="M5 19L15 9" {...s(c)} />
      <Path d="M13 5l4-1 2 2-1 4-4-4z" {...s(c)} />
      <Path d="M6 4l4 4-2 2-4-4z" {...s(c)} />
    </>
  ),
  weapons: (c) => (
    <>
      <Path d="M5 19L17 7" {...s(c)} />
      <Path d="M15 5l4 4" {...s(c)} />
      <Path d="M7 13l4 4" {...s(c)} />
      <Path d="M4 20l2-2" {...s(c)} />
    </>
  ),
  honey: (c, f) => (
    <>
      <Path d="M12 4l6 3.5v7L12 18l-6-3.5v-7z" {...s(c)} fill={f} />
      <Path d="M12 8l3 1.75v3.5L12 15l-3-1.75v-3.5z" {...s(c)} />
    </>
  ),
  leather: (c, f) => (
    <>
      <Path d="M5 6l4-2 3 2 3-2 4 2-1 6 1 6-4 2-3-2-3 2-4-2 1-6z" {...s(c)} fill={f} />
    </>
  ),
  furs: (c) => (
    <>
      <Path
        d="M6 5c2 2 2 12 0 14M18 5c-2 2-2 12 0 14M6 5c4 1 8 1 12 0M6 19c4-1 8-1 12 0"
        {...s(c)}
      />
      <Path d="M12 8v8" {...s(c)} />
    </>
  ),
  silver: (c, f) => (
    <>
      <Circle cx="12" cy="12" r="7" {...s(c)} fill={f} />
      <Circle cx="12" cy="12" r="3.5" {...s(c)} />
    </>
  ),
  spices: (c) => (
    <>
      <Path d="M6 20c-1-6 2-11 6-14 4 3 7 8 6 14z" {...s(c)} />
      <Path d="M12 6v14" {...s(c)} />
    </>
  ),
  // --- слоты ----------------------------------------------------------------
  weapon: (c) => (
    <>
      <Path d="M6 18L18 6" {...s(c)} />
      <Path d="M16 4l4 4M5 15l4 4M3 21l3-3" {...s(c)} />
    </>
  ),
  shield: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M12 3v18" {...s(c)} />
    </>
  ),
  armor: (c, f) => (
    <>
      <Path d="M8 4l4 2 4-2 3 4-2 3v9H7v-9L5 8z" {...s(c)} fill={f} />
      <Path d="M12 6v14" {...s(c)} />
    </>
  ),
  helmet: (c, f) => (
    <>
      <Path d="M5 13a7 7 0 0114 0v5H5z" {...s(c)} fill={f} />
      <Path d="M5 13h14M12 13v5" {...s(c)} />
    </>
  ),
  horse: (c) => (
    <>
      <Path d="M5 20v-7l3-5 3 1 3-4 3 1 2 4-2 2v8" {...s(c)} />
      <Path d="M11 20v-5M8 13l-3 2" {...s(c)} />
    </>
  ),
  // --- воины ----------------------------------------------------------------
  militia: (c) => (
    <>
      <Circle cx="12" cy="6" r="2.5" {...s(c)} />
      <Path d="M8 21v-8a4 4 0 018 0v8" {...s(c)} />
      <Path d="M17 4v10" {...s(c)} />
    </>
  ),
  spearman: (c) => (
    <>
      <Circle cx="10" cy="6" r="2.5" {...s(c)} />
      <Path d="M6 21v-8a4 4 0 018 0v8" {...s(c)} />
      <Path d="M18 3v18M17 6l1-3 1 3" {...s(c)} />
    </>
  ),
  archer: (c) => (
    <>
      <Circle cx="10" cy="6" r="2.5" {...s(c)} />
      <Path d="M6 21v-8a4 4 0 018 0v8" {...s(c)} />
      <Path d="M17 5c3 3 3 9 0 12M17 5v12" {...s(c)} />
    </>
  ),
  manAtArms: (c, f) => (
    <>
      <Path d="M9 4h6v3a3 3 0 01-6 0z" {...s(c)} fill={f} />
      <Path d="M7 21v-8a5 5 0 0110 0v8" {...s(c)} fill={f} />
      <Path d="M12 13v8" {...s(c)} />
    </>
  ),
  horseman: (c) => (
    <>
      <Path d="M4 19v-6l3-4 3 1 3-4 3 1 2 4-2 2v6" {...s(c)} />
      <Circle cx="11" cy="5" r="2" {...s(c)} />
      <Path d="M11 7v4" {...s(c)} />
    </>
  ),
  mage: (c) => (
    <>
      <Path d="M12 3l3 6H9z" {...s(c)} />
      <Path d="M8 21v-7a4 4 0 018 0v7" {...s(c)} />
      <Path d="M17 9l2 2-2 2-2-2z" {...s(c)} />
    </>
  ),
  // --- постройки ------------------------------------------------------------
  granary: (c, f) => (
    <>
      <Path d="M5 11l7-6 7 6v9H5z" {...s(c)} fill={f} />
      <Path d="M9 20v-5h6v5" {...s(c)} />
    </>
  ),
  mill: (c) => (
    <>
      <Path d="M9 21l3-10 3 10" {...s(c)} />
      <Path d="M12 11l6-6M12 11l6 6M12 11L6 5M12 11l-6 6" {...s(c)} />
    </>
  ),
  walls: (c, f) => (
    <>
      <Path d="M4 20v-9h3V8h3v3h4V8h3v3h3v9z" {...s(c)} fill={f} />
      <Path d="M10 20v-4h4v4" {...s(c)} />
    </>
  ),
  barracks: (c, f) => (
    <>
      <Rect x="4" y="9" width="16" height="11" {...s(c)} fill={f} />
      <Path d="M4 9l8-5 8 5M8 20v-5h3v5M13 20v-5h3v5" {...s(c)} />
    </>
  ),
  smithy: (c, f) => (
    <>
      <Path d="M5 14h14l-2 3H7z" {...s(c)} fill={f} />
      <Path d="M9 17v3h6v-3M14 5l4 4-3 3-4-4z" {...s(c)} />
    </>
  ),
  market: (c, f) => (
    <>
      <Path
        d="M4 9l2-4h12l2 4c0 2-2 2-3 2s-2 0-3-2c-1 2-2 2-3 2s-2 0-3-2c-1 2-2 2-3 2s-3 0-3-2z"
        {...s(c)}
        fill={f}
      />
      <Path d="M6 11v9h12v-9M10 20v-5h4v5" {...s(c)} />
    </>
  ),
  well: (c) => (
    <>
      <Path d="M6 20v-6h12v6M5 14l7-6 7 6" {...s(c)} />
      <Path d="M9 10v10M15 10v10" {...s(c)} />
    </>
  ),
  chapel: (c, f) => (
    <>
      <Path d="M6 20v-9l6-5 6 5v9z" {...s(c)} fill={f} />
      <Path d="M12 3v5M10 5h4M10 20v-4h4v4" {...s(c)} />
    </>
  ),
  tavern: (c, f) => (
    <>
      <Path d="M4 10l8-6 8 6v10H4z" {...s(c)} fill={f} />
      <Path d="M8 14h4v6H8zM14 13h3v3h-3z" {...s(c)} />
    </>
  ),
  watchtower: (c, f) => (
    <>
      <Path d="M8 21V7h8v14z" {...s(c)} fill={f} />
      <Path d="M7 7V4h2v2h2V4h2v2h2V4h2v3M11 21v-5h2v5" {...s(c)} />
    </>
  ),
  warehouse: (c, f) => (
    <>
      <Path d="M3 20V9l9-5 9 5v11z" {...s(c)} fill={f} />
      <Path d="M7 20v-6h4v6M13 20v-6h4v6" {...s(c)} />
    </>
  ),
  bathhouse: (c) => (
    <>
      <Path d="M5 13h14v3a4 4 0 01-4 4H9a4 4 0 01-4-4z" {...s(c)} />
      <Path d="M8 10c0-2 2-2 2-4M12 10c0-2 2-2 2-4M16 10c0-2 2-2 2-4" {...s(c)} />
    </>
  ),
  // --- навыки ---------------------------------------------------------------
  heavyWeapons: (c) => (
    <>
      <Path d="M6 20l6-9" {...s(c)} />
      <Path d="M10 6l6-2 3 3-2 6-5-1z" {...s(c)} />
    </>
  ),
  hardLabour: (c) => (
    <>
      <Path d="M5 19l7-7" {...s(c)} />
      <Path d="M10 8l6-2 3 3-2 6z" {...s(c)} />
      <Path d="M4 21l2-2" {...s(c)} />
    </>
  ),
  lightWeapons: (c) => (
    <>
      <Path d="M5 19L16 8M14 6l4 4" {...s(c)} />
      <Path d="M7 17l2 2" {...s(c)} />
    </>
  ),
  archery: (c) => (
    <>
      <Path d="M7 4c5 3 5 13 0 16M7 4v16" {...s(c)} />
      <Path d="M7 12h12M16 9l3 3-3 3" {...s(c)} />
    </>
  ),
  sleight: (c) => (
    <>
      <Path d="M8 20v-6l-3-4 3-1 3 3 1-7 3 1-1 6 4-2 1 3-5 3v4z" {...s(c)} />
    </>
  ),
  athletics: (c) => (
    <>
      <Circle cx="14" cy="5" r="2" {...s(c)} />
      <Path d="M4 20l5-6 3 2 2-5 5 3M9 14l-2-4 5-2" {...s(c)} />
    </>
  ),
  riding: (c) => (
    <>
      <Path d="M4 19v-6l3-4 3 1 3-4 3 1 2 4-2 2v6M11 20v-4" {...s(c)} />
    </>
  ),
  survival: (c) => (
    <>
      <Path d="M12 21c-4-3-5-6-5-9a5 5 0 0110 0c0 3-1 6-5 9z" {...s(c)} />
      <Path d="M12 21V9" {...s(c)} />
    </>
  ),
  magic: (c) => (
    <>
      <Path d="M12 3l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" {...s(c)} />
      <Path d="M12 17v4" {...s(c)} />
    </>
  ),
  scholarship: (c) => (
    <>
      <Path
        d="M4 5h6a2 2 0 012 2v13a2 2 0 00-2-2H4zM20 5h-6a2 2 0 00-2 2v13a2 2 0 012-2h6z"
        {...s(c)}
      />
    </>
  ),
  healing: (c) => (
    <>
      <Path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" {...s(c)} />
    </>
  ),
  engineering: (c) => (
    <>
      <Circle cx="12" cy="12" r="3" {...s(c)} />
      <Path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"
        {...s(c)}
      />
    </>
  ),
  concentration: (c) => (
    <>
      <Circle cx="12" cy="12" r="8" {...s(c)} />
      <Circle cx="12" cy="12" r="4" {...s(c)} />
      <Circle cx="12" cy="12" r="1" fill={c} />
    </>
  ),
  fortitude: (c) => (
    <>
      <Path d="M6 20V9l6-5 6 5v11" {...s(c)} />
      <Path d="M6 20h12M12 20v-6" {...s(c)} />
    </>
  ),
  trade: (c) => (
    <>
      <Path d="M12 4v16M6 8c0-2 12-2 12 0s-12 2-12 4 12 2 12 4-12 2-12 0" {...s(c)} />
    </>
  ),
  persuasion: (c) => (
    <>
      <Path d="M4 6h12v8H9l-4 3v-3H4z" {...s(c)} />
      <Path d="M18 10h2v8h-1l-3 2v-2h-4v-3" {...s(c)} />
    </>
  ),
  command: (c) => (
    <>
      <Path d="M6 21V4h10l-2 3 2 3H6" {...s(c)} />
      <Path d="M4 21h4" {...s(c)} />
    </>
  ),
  // --- атрибуты -------------------------------------------------------------
  strength: (c) => (
    <>
      <Path d="M5 14l2-6 3 2 2 3 2-3 3-2 2 6-3 3H8z" {...s(c)} />
      <Path d="M8 17v3M16 17v3" {...s(c)} />
    </>
  ),
  agility: (c) => (
    <>
      <Path d="M4 16c4 0 4-8 8-8s4 8 8 8" {...s(c)} />
      <Path d="M4 16l3-1M20 16l-3-1" {...s(c)} />
    </>
  ),
  endurance: (c) => (
    <>
      <Path d="M12 20c-5-4-8-7-8-11a4 4 0 018-1 4 4 0 018 1c0 4-3 7-8 11z" {...s(c)} />
    </>
  ),
  mind: (c) => (
    <>
      <Path d="M9 20v-3a7 7 0 116 0v3" {...s(c)} />
      <Path d="M9 20h6M10 9c1 2 3 2 4 0" {...s(c)} />
    </>
  ),
  will: (c) => (
    <>
      <Path d="M12 4l7 4v5c0 4-3 6-7 8-4-2-7-4-7-8V8z" {...s(c)} />
      <Path d="M12 8v5l3 2" {...s(c)} />
    </>
  ),
  charisma: (c) => (
    <>
      <Circle cx="12" cy="12" r="4" {...s(c)} />
      <Path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M18 18l-1.5-1.5M6 18l1.5-1.5M18 6l-1.5 1.5"
        {...s(c)}
      />
    </>
  ),
  // --- виды мест ------------------------------------------------------------
  capital: (c, f) => (
    <>
      <Path d="M4 20v-9l2-2 2 2 2-4 2 3 2-3 2 4 2-2 2 2v9z" {...s(c)} fill={f} />
      <Path d="M12 3v5M10 20v-4h4v4" {...s(c)} />
    </>
  ),
  city: (c, f) => (
    <>
      <Path d="M3 20v-8h5V6h4v4h4v-3h5v13z" {...s(c)} fill={f} />
      <Path d="M10 20v-4h4v4" {...s(c)} />
    </>
  ),
  town: (c, f) => (
    <>
      <Path d="M3 20v-7l4-4 4 4v7zM11 20v-9l4-4 4 4v9z" {...s(c)} fill={f} />
    </>
  ),
  village: (c, f) => (
    <>
      <Path d="M4 20v-7l5-5 5 5v7z" {...s(c)} fill={f} />
      <Path d="M14 20v-5l3-3 3 3v5zM7 20v-4h4v4" {...s(c)} />
    </>
  ),
  port: (c) => (
    <>
      <Path d="M12 4v13M8 8h8M6 14a6 6 0 0012 0" {...s(c)} />
      <Circle cx="12" cy="4" r="1.5" {...s(c)} />
      <Path d="M3 20c3-2 6 2 9 0s6 2 9 0" {...s(c)} />
    </>
  ),
  fortress: (c, f) => (
    <>
      <Path d="M4 20v-9h2V8h3v3h6V8h3v3h2v9z" {...s(c)} fill={f} />
      <Path d="M10 20v-5h4v5" {...s(c)} />
    </>
  ),
  mine: (c) => (
    <>
      <Path d="M4 20l8-10 8 10z" {...s(c)} />
      <Path d="M9 20v-5a3 3 0 016 0v5" {...s(c)} />
      <Path d="M14 6l3-3 1 1-3 3" {...s(c)} />
    </>
  ),
  monastery: (c, f) => (
    <>
      <Path d="M5 20V10l7-6 7 6v10z" {...s(c)} fill={f} />
      <Path d="M12 2v5M10 4h4M10 20v-5h4v5" {...s(c)} />
    </>
  ),
  // --- местность ------------------------------------------------------------
  plains: (c) => (
    <>
      <Path d="M3 14c3-2 6-2 9 0s6 2 9 0M3 18c3-2 6-2 9 0s6 2 9 0" {...s(c)} />
    </>
  ),
  forest: (c, f) => (
    <>
      <Path d="M8 3l5 8H3zM8 9l5 8H3z" {...s(c)} fill={f} />
      <Path d="M8 17v4M16 7l4 6h-8zM16 13v8" {...s(c)} />
    </>
  ),
  hills: (c) => (
    <>
      <Path d="M2 18c3-6 6-6 9-2 2-5 6-5 11 2" {...s(c)} />
    </>
  ),
  mountains: (c, f) => (
    <>
      <Path d="M2 20l6-11 4 6 3-4 7 9z" {...s(c)} fill={f} />
      <Path d="M8 9l2 3-1 2" {...s(c)} />
    </>
  ),
  marsh: (c) => (
    <>
      <Path d="M3 18c3-2 6-2 9 0s6 2 9 0M8 15V8M12 15V6M16 15V9" {...s(c)} />
    </>
  ),
  coast: (c) => (
    <>
      <Path
        d="M3 10c3-2 6-2 9 0s6 2 9 0M3 15c3-2 6-2 9 0s6 2 9 0M3 20c3-2 6-2 9 0s6 2 9 0"
        {...s(c)}
      />
    </>
  ),
  steppe: (c) => (
    <>
      <Path d="M3 17h18M6 17c0-3 1-5 3-6M12 17c0-4 1-7 3-9M17 17c0-3 1-4 2-5" {...s(c)} />
    </>
  ),
  // Пустыня: барханы и солнце.
  desert: (c) => (
    <>
      <Path d="M3 17c3-3 6-3 9 0s6 3 9 0" {...s(c)} />
      <Circle cx="17" cy="8" r="2.5" {...s(c)} />
    </>
  ),
  // --- нравы ----------------------------------------------------------------
  honest: (c) => (
    <>
      <Path d="M12 3v18M5 8h14M7 8l-3 6c2 2 4 2 6 0zM17 8l-3 6c2 2 4 2 6 0z" {...s(c)} />
    </>
  ),
  greedy: (c) => (
    <>
      <Circle cx="12" cy="12" r="7" {...s(c)} />
      <Path d="M12 7v10M9.5 10c0-1 5-1 5 0s-5 1-5 2 5 1 5 2-5 1-5 0" {...s(c)} />
    </>
  ),
  proud: (c) => (
    <>
      <Path d="M5 19l2-11 5 5 5-5 2 11z" {...s(c)} />
      <Path d="M5 19h14" {...s(c)} />
    </>
  ),
  devout: (c) => (
    <>
      <Path d="M12 3v18M7 8h10" {...s(c)} />
      <Circle cx="12" cy="14" r="5" {...s(c)} />
    </>
  ),
  grim: (c) => (
    <>
      <Circle cx="12" cy="12" r="8" {...s(c)} />
      <Path d="M8 16c2-2 6-2 8 0M9 10h2M13 10h2" {...s(c)} />
    </>
  ),
  loyal: (c) => (
    <>
      <Path d="M6 6h12v10l-6 4-6-4z" {...s(c)} />
      <Path d="M9 11l2 2 4-4" {...s(c)} />
    </>
  ),
  // --- гербы ----------------------------------------------------------------
  crestReEstiz: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M12 7l2 4h-4zM12 17l-3-5h6z" {...s(c)} />
    </>
  ),
  crestRobl: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M12 6v11M8 9h8" {...s(c)} />
    </>
  ),
  crestBoharut: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Circle cx="12" cy="11" r="3" {...s(c)} />
      <Path d="M12 5v3M12 14v3M7 11h2M15 11h2" {...s(c)} />
    </>
  ),
  crestDurHazad: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M8 15l4-7 4 7zM10 15h4" {...s(c)} />
    </>
  ),
  crestTribes: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M8 8l4 3 4-3M8 12l4 3 4-3" {...s(c)} />
    </>
  ),
  // Хладь: ель под звездой. Рахим: полумесяц над колодцем. Лига: башня и волна.
  crestHlad: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M12 7l-3 5h2l-2 3h6l-2-3h2z" {...s(c)} />
    </>
  ),
  crestRahim: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M14 8a3 3 0 1 0 0 6 4 4 0 0 1 0-6zM9 16h6" {...s(c)} />
    </>
  ),
  crestLeague: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M10 7h4v6h-4zM7 16c2-2 3 1 5 0s3-2 5 0" {...s(c)} />
    </>
  ),
  crestPlayer: (c, f) => (
    <>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" {...s(c)} fill={f} />
      <Path d="M12 7l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L8 10.5l3.5-.5z" {...s(c)} />
    </>
  ),
  // --- знаки на карте и состояния -------------------------------------------
  army: (c, f) => (
    <>
      <Path d="M6 21V4h9l-2 3 2 3H6" {...s(c)} fill={f} />
      <Path d="M4 21h5" {...s(c)} />
    </>
  ),
  plague: (c) => (
    <>
      <Circle cx="12" cy="12" r="5" {...s(c)} />
      <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" {...s(c)} />
    </>
  ),
  siege: (c) => (
    <>
      <Path d="M4 20v-7h3V9h3v4h4V9h3v4h3v7z" {...s(c)} />
      <Path d="M2 6l4-2 2 3-4 2z" {...s(c)} />
    </>
  ),
  famine: (c) => (
    <>
      <Path d="M12 21V9M12 9c-3 0-4-2-4-5 3 0 4 2 4 5z" {...s(c)} />
      <Path d="M5 5l14 14" {...s(c)} />
    </>
  ),
  ruins: (c) => (
    <>
      <Path d="M4 20v-6h3v-4h3v6h4v-8h3v4h3v8z" {...s(c)} />
      <Path d="M3 20h18M9 6l2-3 2 3" {...s(c)} />
    </>
  ),
  // --- места без жителей: то, что лежит между деревнями ---------------------
  pass: (c) => (
    <>
      <Path d="M2 20l7-12 4 7 3-5 6 10z" {...s(c)} />
      <Path d="M9 8l-2 4h4z" {...s(c)} />
    </>
  ),
  ford: (c) => (
    <>
      <Path d="M2 10h20M2 15h20" {...s(c)} />
      <Path d="M7 6v13M13 6v13M18 8v9" {...s(c)} strokeDasharray="2 3" />
    </>
  ),
  crossing: (c, f) => (
    <>
      <Path d="M2 16h20" {...s(c)} />
      <Path d="M6 16l1-4h10l1 4z" {...s(c)} fill={f} />
      <Path d="M12 12V4M12 6h6" {...s(c)} />
    </>
  ),
  // Оазис: пальма над колодцем. Зимовье: изба под снегом.
  oasis: (c, f) => (
    <>
      <Path
        d="M8 20h8M12 20V10M12 10c-3 0-5-2-5-4 3 0 5 1 5 4zM12 10c3 0 5-2 5-4-3 0-5 1-5 4z"
        {...s(c)}
      />
      <Path d="M5 20c2-2 4-2 7 0s5 2 7 0" {...s(c)} fill={f} />
    </>
  ),
  lodge: (c, f) => (
    <>
      <Path d="M4 12l8-7 8 7v8H4z" {...s(c)} fill={f} />
      <Path d="M10 20v-5h4v5M3 12h18" {...s(c)} />
    </>
  ),
  // Мост: быки из камня и настил поверх воды.
  bridge: (c, f) => (
    <>
      <Path d="M2 13h20" {...s(c)} />
      <Path d="M2 13c4 0 4-5 10-5s6 5 10 5" {...s(c)} fill={f} />
      <Path d="M7 13v7M17 13v7M12 11v9" {...s(c)} />
      <Path d="M2 20h20" {...s(c)} />
    </>
  ),
  grove: (c, f) => (
    <>
      <Path d="M8 19l-4-6h2.5L4 8h2.5L8 4l1.5 4H12L9.5 13H12z" {...s(c)} fill={f} />
      <Path d="M17 19l-3-4.5h2L14 11h1.7L17 8l1.3 3H20l-2 3.5h2z" {...s(c)} />
      <Path d="M8 19v2M17 19v2" {...s(c)} />
    </>
  ),
  wilds: (c) => (
    <>
      <Path
        d="M3 20c2-3 3-6 2-9M9 20c-1-5 0-9 2-12M15 20c1-4 1-8-1-11M21 20c-2-3-3-6-2-9"
        {...s(c)}
      />
      <Path d="M2 20h20" {...s(c)} />
    </>
  ),
  barrow: (c, f) => (
    <>
      <Path d="M3 19a9 6 0 0118 0z" {...s(c)} fill={f} />
      <Path d="M12 13V7M9 9h6M2 19h20" {...s(c)} />
    </>
  ),
  outpost: (c, f) => (
    <>
      <Path d="M7 20v-9l5-4 5 4v9z" {...s(c)} fill={f} />
      <Path d="M2 14h5M17 14h5M12 7V3" {...s(c)} />
    </>
  ),
  quarry: (c) => (
    <>
      <Path d="M2 20l5-7h6l4 7z" {...s(c)} />
      <Path d="M8 13l3-5 4 3" {...s(c)} />
      <Path d="M16 5l4 4M18 3l3 3" {...s(c)} />
    </>
  ),
  shrine: (c, f) => (
    <>
      <Path d="M8 20V9l4-5 4 5v11z" {...s(c)} fill={f} />
      <Path d="M12 4V1M10 12h4M6 20h12" {...s(c)} />
    </>
  ),
  spring: (c) => (
    <>
      <Path d="M12 3s5 6 5 9a5 5 0 01-10 0c0-3 5-9 5-9z" {...s(c)} />
      <Path d="M4 20h16M10 12c0 2 1 3 2 3" {...s(c)} />
    </>
  ),
  causeway: (c) => (
    <>
      <Path d="M2 9h20M2 15h20" {...s(c)} />
      <Path d="M5 9v6M9 9v6M13 9v6M17 9v6M21 9v6" {...s(c)} />
      <Path d="M2 5c3 2 5-2 8 0s5-2 8 0" {...s(c)} strokeDasharray="3 2" />
    </>
  ),
  war: (c) => (
    <>
      <Path d="M5 19L17 7M7 7l12 12M15 5l4 4M5 15l4 4" {...s(c)} />
    </>
  ),
  caravan: (c, f) => (
    <>
      <Path d="M4 16V9h10v7zM14 11h4l2 3v2h-6" {...s(c)} fill={f} />
      <Circle cx="7" cy="18" r="2" {...s(c)} />
      <Circle cx="17" cy="18" r="2" {...s(c)} />
    </>
  ),
  banditry: (c) => (
    <>
      <Circle cx="12" cy="10" r="5" {...s(c)} />
      <Path d="M8 10h8M8 20c1-3 7-3 8 0" {...s(c)} />
      <Path d="M9 13l3 2 3-2" {...s(c)} />
    </>
  ),
  // --- интерфейс ------------------------------------------------------------
  map: (c) => (
    <>
      <Path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" {...s(c)} />
      <Path d="M9 4v14M15 6v14" {...s(c)} />
    </>
  ),
  back: (c) => (
    <>
      <Path d="M15 5l-7 7 7 7" {...s(c)} />
    </>
  ),
  clock: (c) => (
    <>
      <Circle cx="12" cy="12" r="8" {...s(c)} />
      <Path d="M12 7v5l3 2" {...s(c)} />
    </>
  ),
  coin: (c, f) => (
    <>
      <Circle cx="12" cy="12" r="8" {...s(c)} fill={f} />
      <Circle cx="12" cy="12" r="4" {...s(c)} />
    </>
  ),
  fatigue: (c) => (
    <>
      <Path d="M5 12c2-4 5-4 7 0s5 4 7 0" {...s(c)} />
      <Path d="M12 4v3M12 17v3" {...s(c)} />
    </>
  ),
  road: (c) => (
    <>
      <Path d="M4 20L10 4h4l6 16" {...s(c)} />
      <Path d="M12 8v2M12 13v2M12 18v2" {...s(c)} />
    </>
  ),
  people: (c) => (
    <>
      <Circle cx="9" cy="8" r="3" {...s(c)} />
      <Circle cx="16" cy="9" r="2.5" {...s(c)} />
      <Path d="M3 20v-3a6 6 0 0112 0v3M15 20v-3a4 4 0 016-3" {...s(c)} />
    </>
  ),
  journal: (c) => (
    <>
      <Path d="M6 3h12v18H6z" {...s(c)} />
      <Path d="M9 8h6M9 12h6M9 16h4" {...s(c)} />
    </>
  ),
  home: (c) => (
    <>
      <Path d="M4 11l8-7 8 7v9H4z" {...s(c)} />
      <Path d="M10 20v-6h4v6" {...s(c)} />
    </>
  ),
  learn: (c) => (
    <>
      <Path d="M3 9l9-4 9 4-9 4z" {...s(c)} />
      <Path d="M7 11v5c3 2 7 2 10 0v-5M21 9v6" {...s(c)} />
    </>
  ),
  earn: (c, f) => (
    <>
      <Circle cx="10" cy="14" r="6" {...s(c)} fill={f} />
      <Path d="M10 11v6M8 13c0-1 4-1 4 0s-4 1-4 2 4 1 4 0M14 4a6 6 0 016 6" {...s(c)} />
    </>
  ),
  own: (c) => (
    <>
      <Path d="M6 21V4h9l-2 3 2 3H6" {...s(c)} />
      <Path d="M4 21h5M15 14l3 3 3-3" {...s(c)} />
    </>
  ),
  rest: (c) => (
    <>
      <Path d="M20 14a8 8 0 01-10-10 8 8 0 1010 10z" {...s(c)} />
    </>
  ),
  wound: (c) => (
    <>
      <Path d="M12 4l7 4v5c0 4-3 6-7 8-4-2-7-4-7-8V8z" {...s(c)} />
      <Path d="M9 9l6 6M15 9l-6 6" {...s(c)} />
    </>
  ),
  captive: (c) => (
    <>
      <Path d="M5 4v16M9 4v16M13 4v16M17 4v16M3 8h18M3 16h18" {...s(c)} />
    </>
  ),
}

export const ICON_NAMES = Object.keys(GLYPHS) as IconName[]

export function Icon({
  name,
  size = 20,
  color = palette.dim,
}: {
  name: IconName
  size?: number
  color?: string
}) {
  const glyph = GLYPHS[name]
  // Плашка — тот же цвет на четверть: знак остаётся одноцветным.
  const fill = `${color}40`
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {glyph(color, fill)}
    </Svg>
  )
}

/** Гербы корон по их идентификатору; своё владение — своя звезда. */
export function crestOf(kingdomId: string | null | undefined): IconName {
  switch (kingdomId) {
    case 'reEstiz':
      return 'crestReEstiz'
    case 'robl':
      return 'crestRobl'
    case 'boharut':
      return 'crestBoharut'
    case 'durHazad':
      return 'crestDurHazad'
    case 'tribes':
      return 'crestTribes'
    case 'hlad':
      return 'crestHlad'
    case 'rahim':
      return 'crestRahim'
    case 'league':
      return 'crestLeague'
    default:
      return 'crestPlayer'
  }
}

// Типы примитивов, которыми нарисованы знаки, — чтобы линтер видел, что они в деле.
export const PRIMITIVES = { Circle, Ellipse, Line, Polygon, Polyline, Rect }
