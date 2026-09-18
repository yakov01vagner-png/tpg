import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg'

/**
 * Лица.
 *
 * Портрет — данные, а не рисунок: форма лица, волосы, борода, глаза, брови,
 * шрам, возраст. Из зерна (имени или идентификатора) черты выводятся
 * детерминированно, поэтому один и тот же лорд всегда с одним лицом, а
 * сейв ничего о лицах не хранит. Спутники и герой получают правки поверх:
 * десять людей должны узнаваться, а гном — выглядеть гномом.
 *
 * Стиль — тот же, что у знаков: линия, два-три плоских цвета, никакой
 * светотени. Возраст виден: седина после сорока пяти, морщины после шестидесяти.
 */
export type FaceShape = 'oval' | 'round' | 'square' | 'long'
export type HairStyle = 'short' | 'long' | 'bald' | 'braids' | 'topknot' | 'curly' | 'cropped'
export type Beard = 'none' | 'stubble' | 'short' | 'full' | 'long'
export type Eyes = 'calm' | 'narrow' | 'wide'
export type Brows = 'flat' | 'arched' | 'heavy'

export interface Face {
  readonly skin: number
  readonly shape: FaceShape
  readonly hair: HairStyle
  readonly hairColor: number
  readonly beard: Beard
  readonly eyes: Eyes
  readonly brows: Brows
  readonly scar: boolean
  readonly hood: boolean
}

const SKINS = ['#f1d3b3', '#e4b98f', '#c9956a', '#a86f4a', '#7a4d33']
const HAIRS = ['#2a1f18', '#4a3122', '#7a4a2a', '#b58a4a', '#a0492a', '#8d8a85', '#d9d4cb']
const SHAPES: readonly FaceShape[] = ['oval', 'round', 'square', 'long']
const STYLES: readonly HairStyle[] = [
  'short',
  'long',
  'bald',
  'braids',
  'topknot',
  'curly',
  'cropped',
]
const BEARDS: readonly Beard[] = ['none', 'stubble', 'short', 'full', 'long']
const EYES: readonly Eyes[] = ['calm', 'narrow', 'wide']
const BROWS: readonly Brows[] = ['flat', 'arched', 'heavy']

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return h >>> 0
}

function pick<T>(list: readonly T[], value: number, shift: number): T {
  return list[((value >>> shift) % 1000) % list.length] as T
}

/**
 * Черты из зерна. Корона сдвигает вероятности, а не назначает: гномы чаще
 * широколицы и бородаты, племена чаще с косами, южане темнее — но не все.
 */
export function faceFor(seed: string, kingdomId: string | null = null): Face {
  const h = hash(seed)
  let face: Face = {
    skin: pick([0, 1, 1, 2, 2, 3, 4], h, 0),
    shape: pick(SHAPES, h, 3),
    hair: pick(STYLES, h, 6),
    hairColor: pick([0, 0, 1, 1, 2, 3, 4], h, 9),
    beard: pick(BEARDS, h, 12),
    eyes: pick(EYES, h, 15),
    brows: pick(BROWS, h, 18),
    scar: (h >>> 21) % 7 === 0,
    hood: false,
  }
  if (kingdomId === 'durHazad') {
    face = {
      ...face,
      shape: 'square',
      beard: (h >>> 2) % 3 === 0 ? 'full' : 'long',
      hair: pick(['long', 'braids', 'short'], h, 4),
    }
  } else if (kingdomId === 'tribes') {
    face = {
      ...face,
      hair: pick(['braids', 'topknot', 'long'], h, 5),
      skin: pick([1, 2, 2, 3], h, 7),
    }
  } else if (kingdomId === 'boharut') {
    face = { ...face, skin: pick([2, 3, 3, 4], h, 7) }
  } else if (kingdomId === 'robl') {
    face = { ...face, hood: (h >>> 8) % 3 === 0 }
  } else if (kingdomId === 'hlad') {
    // Север: светлее, бородатее, волосы длинные — их не стригут в мороз.
    face = {
      ...face,
      skin: pick([0, 0, 1, 1], h, 7),
      hairColor: pick([3, 3, 4, 0], h, 9),
      beard: pick(['short', 'full', 'full', 'long'], h, 2),
      hair: pick(['long', 'short', 'cropped'], h, 4),
    }
  } else if (kingdomId === 'rahim') {
    // Юг: темнее, узкие глаза от солнца, борода коротка и ухожена.
    face = {
      ...face,
      skin: pick([3, 3, 4, 4], h, 7),
      hairColor: pick([0, 0, 1], h, 9),
      eyes: pick(['narrow', 'narrow', 'calm'], h, 15),
      beard: pick(['stubble', 'short', 'short', 'none'], h, 2),
    }
  } else if (kingdomId === 'league') {
    // Вольные города: бритые, стриженые, без капюшонов — купец, а не монах.
    face = {
      ...face,
      beard: pick(['none', 'none', 'stubble', 'short'], h, 2),
      hair: pick(['cropped', 'short', 'curly'], h, 4),
    }
  }
  return face
}

/** Что делает с лицом возраст: седина, потом морщины. */
function aged(face: Face, age: number): Face {
  if (age >= 45 && face.hairColor < 5) return { ...face, hairColor: age >= 60 ? 6 : 5 }
  return face
}

export function Portrait({
  seed,
  age = 30,
  kingdomId = null,
  size = 48,
  overrides,
}: {
  seed: string
  age?: number
  kingdomId?: string | null
  size?: number
  overrides?: Partial<Face>
}) {
  const face = aged({ ...faceFor(seed, kingdomId), ...overrides }, age)
  const skin = SKINS[face.skin] ?? SKINS[1]
  const hair = HAIRS[face.hairColor] ?? HAIRS[1]
  const line = '#1a1512'
  const cloth = face.hood ? '#3a3230' : '#3d3129'
  const wrinkles = age >= 60
  // Голова — эллипс: полуоси по форме лица. Всё остальное кладётся на него
  // абсолютными координатами, чтобы борода сидела на подбородке, а не рядом.
  const rx =
    face.shape === 'round' ? 19 : face.shape === 'square' ? 18 : face.shape === 'long' ? 15 : 17
  const ry = face.shape === 'long' ? 23 : face.shape === 'round' ? 19 : 21
  const cx = 32
  const cy = 30
  const chin = cy + ry
  const left = cx - rx
  const right = cx + rx
  const top = cy - ry

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* плечи и шея — под головой */}
      <Path d="M6 64c0-13 11-19 26-19s26 6 26 19z" fill={cloth} />
      <Rect x={cx - 6} y={chin - 6} width={12} height={12} fill={skin} />
      {/* волосы сзади: длинные и косы шире головы */}
      {face.hair === 'long' ? (
        <Path
          d={`M${left - 3} ${cy + 14}V${cy - 8}C${left - 3} ${top - 2} ${right + 3} ${top - 2} ${right + 3} ${cy - 8}V${cy + 14}z`}
          fill={hair}
        />
      ) : null}
      {face.hair === 'braids' ? (
        <>
          <Path
            d={`M${left - 2} ${cy + 4}V${cy - 8}C${left - 2} ${top - 2} ${right + 2} ${top - 2} ${right + 2} ${cy - 8}V${cy + 4}z`}
            fill={hair}
          />
          <Path
            d={`M${left} ${cy + 2}l-3 20M${right} ${cy + 2}l3 20`}
            stroke={hair}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : null}
      {/* уши */}
      <Ellipse
        cx={left - 1}
        cy={cy + 1}
        rx={2.5}
        ry={4}
        fill={skin}
        stroke={line}
        strokeWidth={1}
      />
      <Ellipse
        cx={right + 1}
        cy={cy + 1}
        rx={2.5}
        ry={4}
        fill={skin}
        stroke={line}
        strokeWidth={1}
      />
      {/* голова */}
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={skin} stroke={line} strokeWidth={1.2} />
      {face.shape === 'square' ? (
        <Path
          d={`M${left + 2} ${cy + 6}V${chin - 4}Q${cx} ${chin + 4} ${right - 2} ${chin - 4}V${cy + 6}`}
          fill={skin}
          stroke={line}
          strokeWidth={1.2}
        />
      ) : null}
      {/* волосы спереди: шапка над лбом */}
      {face.hair === 'short' || face.hair === 'long' || face.hair === 'braids' ? (
        <Path
          d={`M${left} ${cy - 6}C${left} ${top - 3} ${right} ${top - 3} ${right} ${cy - 6}C${right - 3} ${cy - 10} ${left + 3} ${cy - 10} ${left} ${cy - 6}z`}
          fill={hair}
        />
      ) : null}
      {face.hair === 'cropped' ? (
        <Path
          d={`M${left + 1} ${cy - 9}C${left + 1} ${top - 1} ${right - 1} ${top - 1} ${right - 1} ${cy - 9}C${right - 4} ${cy - 12} ${left + 4} ${cy - 12} ${left + 1} ${cy - 9}z`}
          fill={hair}
        />
      ) : null}
      {face.hair === 'curly' ? (
        <>
          <Circle cx={left + 3} cy={cy - 8} r={6} fill={hair} />
          <Circle cx={left + 11} cy={cy - 15} r={6} fill={hair} />
          <Circle cx={cx} cy={top - 1} r={7} fill={hair} />
          <Circle cx={right - 11} cy={cy - 15} r={6} fill={hair} />
          <Circle cx={right - 3} cy={cy - 8} r={6} fill={hair} />
        </>
      ) : null}
      {face.hair === 'topknot' ? (
        <>
          <Path
            d={`M${left + 1} ${cy - 8}C${left + 1} ${top - 1} ${right - 1} ${top - 1} ${right - 1} ${cy - 8}C${right - 4} ${cy - 11} ${left + 4} ${cy - 11} ${left + 1} ${cy - 8}z`}
            fill={hair}
          />
          <Circle cx={cx} cy={top - 4} r={5} fill={hair} />
        </>
      ) : null}
      {face.hood ? (
        <Path
          d={`M${left - 5} ${cy + 12}C${left - 7} ${top - 6} ${right + 7} ${top - 6} ${right + 5} ${cy + 12}C${right + 1} ${cy - 2} ${left - 1} ${cy - 2} ${left - 5} ${cy + 12}z`}
          fill={cloth}
        />
      ) : null}
      {/* брови */}
      {face.brows === 'heavy' ? (
        <Path
          d={`M${cx - 11} ${cy - 5}h8M${cx + 3} ${cy - 5}h8`}
          stroke={hair}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      ) : face.brows === 'arched' ? (
        <Path
          d={`M${cx - 11} ${cy - 4}q4-4 8-1M${cx + 3} ${cy - 5}q4-3 8 1`}
          stroke={line}
          strokeWidth={1.4}
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <Path
          d={`M${cx - 11} ${cy - 5}h8M${cx + 3} ${cy - 5}h8`}
          stroke={line}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      )}
      {/* глаза */}
      {face.eyes === 'narrow' ? (
        <Path
          d={`M${cx - 10} ${cy}h6M${cx + 4} ${cy}h6`}
          stroke={line}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      ) : (
        <>
          <Ellipse
            cx={cx - 7}
            cy={cy}
            rx={face.eyes === 'wide' ? 2.6 : 2}
            ry={face.eyes === 'wide' ? 2 : 1.4}
            fill="#f4efe6"
            stroke={line}
            strokeWidth={1}
          />
          <Ellipse
            cx={cx + 7}
            cy={cy}
            rx={face.eyes === 'wide' ? 2.6 : 2}
            ry={face.eyes === 'wide' ? 2 : 1.4}
            fill="#f4efe6"
            stroke={line}
            strokeWidth={1}
          />
          <Circle cx={cx - 7} cy={cy} r={1} fill={line} />
          <Circle cx={cx + 7} cy={cy} r={1} fill={line} />
        </>
      )}
      {/* нос и рот */}
      <Path
        d={`M${cx} ${cy + 1}l-2 6h4`}
        stroke={line}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={`M${cx - 4} ${cy + 11}q4 2.5 8 0`}
        stroke={line}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
      {/* морщины */}
      {wrinkles ? (
        <Path
          d={`M${cx - 10} ${cy + 5}l2 2M${cx + 10} ${cy + 5}l-2 2M${cx - 6} ${cy - 9}h12`}
          stroke={line}
          strokeWidth={0.8}
          strokeLinecap="round"
          opacity={0.7}
        />
      ) : null}
      {/* шрам */}
      {face.scar ? (
        <Path
          d={`M${cx + 8} ${cy - 7}l-3 8`}
          stroke="#8a4a3a"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      ) : null}
      {/* борода: по контуру подбородка */}
      {face.beard === 'stubble' ? (
        <Path
          d={`M${left + 3} ${cy + 6}Q${cx} ${chin + 4} ${right - 3} ${cy + 6}`}
          stroke={hair}
          strokeWidth={2}
          strokeDasharray="1 2"
          fill="none"
        />
      ) : null}
      {face.beard === 'short' ? (
        <Path
          d={`M${left + 2} ${cy + 4}Q${cx} ${chin + 8} ${right - 2} ${cy + 4}Q${cx} ${cy + 16} ${left + 2} ${cy + 4}z`}
          fill={hair}
        />
      ) : null}
      {face.beard === 'full' ? (
        <Path
          d={`M${left + 1} ${cy + 2}Q${cx} ${chin + 14} ${right - 1} ${cy + 2}Q${cx} ${cy + 15} ${left + 1} ${cy + 2}z`}
          fill={hair}
        />
      ) : null}
      {face.beard === 'long' ? (
        <Path
          d={`M${left + 1} ${cy + 2}Q${cx - 4} ${chin + 24} ${cx} ${chin + 26}Q${cx + 4} ${chin + 24} ${right - 1} ${cy + 2}Q${cx} ${cy + 15} ${left + 1} ${cy + 2}z`}
          fill={hair}
        />
      ) : null}
    </Svg>
  )
}

/** Правки для спутников: десять людей должны узнаваться. */
export const COMPANION_FACES: Record<string, Partial<Face>> = {
  hedwar: { hair: 'cropped', beard: 'short', eyes: 'calm', brows: 'flat', hairColor: 5 },
  marta: { hair: 'long', beard: 'none', eyes: 'narrow', brows: 'arched', hairColor: 1, skin: 1 },
  bran: { hair: 'short', beard: 'full', eyes: 'narrow', brows: 'heavy', scar: true, hairColor: 0 },
  sigvald: { hair: 'long', beard: 'stubble', eyes: 'calm', brows: 'arched', hairColor: 3, skin: 0 },
  alina: { hair: 'long', beard: 'none', eyes: 'wide', brows: 'flat', hairColor: 2, hood: true },
  kerim: { hair: 'topknot', beard: 'short', eyes: 'narrow', brows: 'heavy', hairColor: 0, skin: 3 },
  torvald: {
    hair: 'cropped',
    beard: 'full',
    eyes: 'calm',
    brows: 'heavy',
    scar: true,
    hairColor: 4,
  },
  yfka: { hair: 'cropped', beard: 'none', eyes: 'narrow', brows: 'flat', hairColor: 0, skin: 2 },
  ostap: { hair: 'curly', beard: 'short', eyes: 'wide', brows: 'arched', hairColor: 1 },
  vela: { hair: 'braids', beard: 'none', eyes: 'wide', brows: 'flat', hairColor: 6, skin: 1 },
  grimbold: {
    shape: 'square',
    hair: 'short',
    beard: 'full',
    eyes: 'narrow',
    brows: 'heavy',
    hairColor: 1,
  },
  dagna: {
    shape: 'square',
    hair: 'braids',
    beard: 'none',
    eyes: 'calm',
    brows: 'heavy',
    hairColor: 1,
    scar: true,
  },
  ashan: {
    hair: 'topknot',
    beard: 'stubble',
    eyes: 'narrow',
    brows: 'flat',
    hairColor: 0,
    skin: 2,
  },
  saule: { hair: 'braids', beard: 'none', eyes: 'wide', brows: 'arched', hairColor: 0, skin: 2 },
  nadir: { hair: 'cropped', beard: 'short', eyes: 'calm', brows: 'arched', hairColor: 0, skin: 3 },
  zaira: {
    hair: 'long',
    beard: 'none',
    eyes: 'narrow',
    brows: 'flat',
    hairColor: 0,
    skin: 3,
    scar: true,
  },
  brother_ilar: {
    hair: 'cropped',
    beard: 'short',
    eyes: 'calm',
    brows: 'flat',
    hairColor: 3,
    hood: true,
  },
  kassia: { hair: 'long', beard: 'none', eyes: 'wide', brows: 'arched', hairColor: 2, hood: true },
  radan: {
    hair: 'short',
    beard: 'stubble',
    eyes: 'calm',
    brows: 'heavy',
    hairColor: 4,
    scar: true,
  },
  lisava: { hair: 'long', beard: 'none', eyes: 'calm', brows: 'flat', hairColor: 5, skin: 1 },
}

/**
 * Лицо героя из биографии: кто ты — видно до первой строки.
 * Теги читаются только те, что что-то говорят о внешности.
 */
export function heroFace(tags: readonly string[]): Partial<Face> {
  const face: Partial<Face> = {}
  if (tags.includes('dwarf')) Object.assign(face, { shape: 'square', beard: 'full', hair: 'short' })
  if (tags.includes('southern')) Object.assign(face, { skin: 3, hair: 'cropped' })
  if (tags.includes('home_robl')) Object.assign(face, { hood: true })
  if (tags.includes('tribe_born')) Object.assign(face, { hair: 'braids', skin: 2 })
  if (tags.includes('noble_born')) Object.assign(face, { hair: 'long', beard: 'none', skin: 0 })
  if (tags.includes('temple_raised') || tags.includes('devout'))
    Object.assign(face, { hair: 'cropped', hood: true })
  if (tags.includes('outlaw')) Object.assign(face, { scar: true, eyes: 'narrow' })
  if (tags.includes('drilled') || tags.includes('guard'))
    Object.assign(face, { hair: 'cropped', beard: 'stubble' })
  if (tags.includes('woodsman')) Object.assign(face, { beard: 'full', hair: 'short' })
  if (tags.includes('literate') && !face.hair) Object.assign(face, { hair: 'short', beard: 'none' })
  return face
}
