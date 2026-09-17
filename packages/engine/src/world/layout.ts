import { KINGDOM_CENTERS } from '../content/world'
import type { World } from './types'

/**
 * Где что лежит на карте.
 *
 * Координаты не хранятся в сейве: скелет мира неизменен (DESIGN.md, п.3.1),
 * значит положение однозначно выводится из него самого. Королевства стоят там,
 * где им положено по сеттингу, области расходятся от столицы веером, провинции
 * — от центра области, а поселения рассыпаны внутри провинции с небольшим
 * разбросом, чтобы карта не выглядела чертежом.
 */
export interface Point {
  readonly x: number
  readonly y: number
}

export const MAP_SIZE = 1400

/** Устойчивый разброс: одно и то же место всегда оказывается в одной точке. */
function jitter(seed: string, spread: number): Point {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const a = ((hash >>> 8) % 1000) / 1000
  const b = ((hash >>> 18) % 1000) / 1000
  const angle = a * Math.PI * 2
  const radius = Math.sqrt(b) * spread
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

export function layoutOf(world: World): Readonly<Record<string, Point>> {
  const points: Record<string, Point> = {}
  const taken: Point[] = []

  for (const kingdom of Object.values(world.kingdoms)) {
    const center = KINGDOM_CENTERS[kingdom.id] ?? { x: MAP_SIZE / 2, y: MAP_SIZE / 2 }
    const regions = kingdom.regionIds

    regions.forEach((regionId, regionIndex) => {
      const region = world.regions[regionId]
      if (!region) return
      // Области расходятся от столицы веером.
      const regionAngle = (regionIndex / Math.max(1, regions.length)) * Math.PI * 2 + 0.6
      const regionCenter = {
        x: center.x + Math.cos(regionAngle) * 90,
        y: center.y + Math.sin(regionAngle) * 90,
      }

      region.provinceIds.forEach((provinceId, provinceIndex) => {
        const province = world.provinces[provinceId]
        if (!province) return
        const provinceAngle =
          (provinceIndex / Math.max(1, region.provinceIds.length)) * Math.PI * 2 + regionAngle
        const provinceCenter = {
          x: regionCenter.x + Math.cos(provinceAngle) * 58,
          y: regionCenter.y + Math.sin(provinceAngle) * 58,
        }

        province.locationIds.forEach((locationId, locationIndex) => {
          const spot = jitter(locationId, 30)
          const ring = (locationIndex / Math.max(1, province.locationIds.length)) * Math.PI * 2
          points[locationId] = separate(taken, {
            x: clamp(provinceCenter.x + Math.cos(ring) * 24 + spot.x),
            y: clamp(provinceCenter.y + Math.sin(ring) * 24 + spot.y),
          })
        })
      })
    })
  }

  return points
}

/**
 * Два поселения в одной точке — это поселение, которого на карте нет. Слишком
 * близкую точку отводим по спирали, пока она не встанет отдельно; порядок обхода
 * мира неизменен, поэтому результат остаётся тем же от запуска к запуску.
 */
const MIN_GAP = 16

function separate(taken: Point[], wanted: Point): Point {
  let point = wanted
  for (let step = 0; step < 64 && crowded(taken, point); step += 1) {
    const angle = step * 2.399963 // золотой угол: витки не ложатся друг на друга
    const radius = MIN_GAP * (1 + step * 0.35)
    point = {
      x: clamp(wanted.x + Math.cos(angle) * radius),
      y: clamp(wanted.y + Math.sin(angle) * radius),
    }
  }
  taken.push(point)
  return point
}

function crowded(taken: Point[], point: Point): boolean {
  return taken.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < MIN_GAP)
}

function clamp(value: number): number {
  return Math.max(12, Math.min(MAP_SIZE - 12, Math.round(value)))
}

/** Цвет королевства на карте: свой у каждого, чтобы границы читались без линий. */
export const KINGDOM_COLORS: Record<string, string> = {
  reEstiz: '#6f8fbf',
  robl: '#c8b56a',
  boharut: '#a86a6a',
  durHazad: '#7e7f8c',
  tribes: '#7f9a63',
}
