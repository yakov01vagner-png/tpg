import type { LocationArchetype, TimeOfDay } from '@tpg/engine'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

/**
 * Сцены мест: по одной на вид, с тонировкой по времени суток.
 *
 * Сцена — силуэт, а не картина: столица шпилями, рудник копром, порт мачтами.
 * Небо и земля меняют цвет по часу дня; силуэт остаётся один. Всё векторное,
 * ширина подстраивается под экран.
 */
const SKY: Record<TimeOfDay, [string, string]> = {
  night: ['#0e1120', '#171a2c'],
  dawn: ['#3a2a2c', '#7a5a3c'],
  morning: ['#4a5c74', '#a9b7c2'],
  noon: ['#5b7a9c', '#c4cfd6'],
  evening: ['#6d4a3c', '#c98a4a'],
  dusk: ['#2c2033', '#6a3e4c'],
}

const GROUND: Record<TimeOfDay, string> = {
  night: '#121614',
  dawn: '#2c2a20',
  morning: '#3a4a30',
  noon: '#46553a',
  evening: '#3e3a28',
  dusk: '#26222a',
}

export function Scene({
  archetype,
  timeOfDay,
  width,
  height = 96,
}: {
  archetype: LocationArchetype
  timeOfDay: TimeOfDay
  width: number
  height?: number
}) {
  const [skyTop, skyBottom] = SKY[timeOfDay]
  const ground = GROUND[timeOfDay]
  const dark = '#14110f'
  const night = timeOfDay === 'night'
  return (
    <Svg width={width} height={height} viewBox="0 0 200 96" preserveAspectRatio="none">
      <Rect x="0" y="0" width="200" height="96" fill={skyTop} />
      <Rect x="0" y="40" width="200" height="56" fill={skyBottom} opacity={0.6} />
      {night ? (
        <>
          <Circle cx="160" cy="18" r="7" fill="#e8e0c4" opacity={0.9} />
          <Circle cx="30" cy="12" r="1" fill="#fff" />
          <Circle cx="70" cy="22" r="0.8" fill="#fff" />
          <Circle cx="120" cy="10" r="1" fill="#fff" />
        </>
      ) : timeOfDay === 'dawn' || timeOfDay === 'evening' ? (
        <Circle cx={timeOfDay === 'dawn' ? 40 : 160} cy="58" r="10" fill="#e9b35a" opacity={0.85} />
      ) : null}
      <Rect x="0" y="70" width="200" height="26" fill={ground} />
      {silhouette(archetype, dark)}
      {night ? windows(archetype) : null}
    </Svg>
  )
}

function silhouette(archetype: LocationArchetype, fill: string) {
  switch (archetype) {
    case 'capital':
      return (
        <Path
          d="M0 72h20v-14l6-8 6 8v14h12v-24l5-6 5 6v24h14v-30l4-10 4 10v30h12v-20l6-8 6 8v20h16v-14l6-6 6 6v14h26v-10l5-5 5 5v10h22v-16l4-4 4 4v16h20v24H0z"
          fill={fill}
        />
      )
    case 'city':
      return (
        <Path
          d="M0 72h14v-12l5-5 5 5v12h10v-20h12v20h10v-16l6-6 6 6v16h12v-24h14v24h10v-14l5-5 5 5v14h12v-18h14v18h12v-10h22v10h32v24H0z"
          fill={fill}
        />
      )
    case 'town':
      return (
        <Path
          d="M0 74h16v-10l8-8 8 8v10h10v-8l7-7 7 7v8h12v-14l6-6 6 6v14h14v-8l7-7 7 7v8h14v-10l8-8 8 8v10h18v-6l6-6 6 6v6h32v22H0z"
          fill={fill}
        />
      )
    case 'village':
      return (
        <Path
          d="M0 76h24v-8l8-7 8 7v8h20v-6l7-6 7 6v6h30v-8l8-7 8 7v8h24v-5l6-5 6 5v5h44v20H0z"
          fill={fill}
        />
      )
    case 'port':
      return (
        <>
          <Path d="M0 74h30v-8l7-6 7 6v8h20v-6l6-6 6 6v6h124v22H0z" fill={fill} />
          <Path
            d="M110 74V30M110 34l14 10-14 4M150 74V38M150 42l-12 8 12 4M130 74V46"
            stroke={fill}
            strokeWidth={2.5}
          />
          <Rect x="100" y="74" width="60" height="4" fill={fill} />
        </>
      )
    case 'fortress':
      return (
        <Path
          d="M0 74h30v-24h6v6h8v-6h6v6h8v-6h6v24h12v-34h8v6h8v-6h8v34h12v-24h6v6h8v-6h6v6h8v-6h6v24h44v22H0z"
          fill={fill}
        />
      )
    case 'mine':
      return (
        <>
          <Path d="M0 60l40-20 30 16 30-24 40 20 30-12 30 20v36H0z" fill={fill} />
          <Path d="M92 74V40l16-10 16 10v34" stroke={fill} strokeWidth={3} fill="none" />
          <Path d="M96 52h24M94 62h28" stroke={fill} strokeWidth={2.5} />
        </>
      )
    case 'monastery':
      return (
        <Path
          d="M0 76h40v-14l8-8 8 8v14h16v-30l6-6 6 6v10h4v-6h4v6h4v20h20v-14l8-8 8 8v14h68v20H0z"
          fill={fill}
        />
      )
  }
}

function windows(archetype: LocationArchetype) {
  const spots =
    archetype === 'capital' || archetype === 'city'
      ? [
          [28, 62],
          [52, 56],
          [80, 58],
          [118, 60],
          [150, 66],
        ]
      : archetype === 'village' || archetype === 'monastery'
        ? [
            [30, 70],
            [104, 70],
          ]
        : [
            [40, 66],
            [96, 62],
            [140, 66],
          ]
  return (
    <>
      {spots.map(([x, y]) => (
        <Rect key={`${x}-${y}`} x={x} y={y} width="3" height="4" fill="#e9b35a" opacity={0.85} />
      ))}
    </>
  )
}
