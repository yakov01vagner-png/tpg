import {
  ARCHETYPE_LABELS,
  type Command,
  type GameState,
  KINGDOM_COLORS,
  MAP_SIZE,
  PLAYER,
  addressOf,
  canApply,
  foodSecurity,
  formatDuration,
  hours,
  kingdomOf,
  layoutOf,
  lordById,
  roadsFrom,
} from '@tpg/engine'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg'
import { dispatch } from '../game/store'
import { colors, font, radius, spacing } from '../theme'
import { Button } from '../ui/atoms'

/**
 * Карта мира.
 *
 * Положение мест вычисляется из скелета (см. `world/layout.ts`), а не хранится:
 * география — часть неизменной геометрии мира. Карта показывает то, что важно
 * решать глазами: кто где, где голодно, где твоё и куда отсюда есть дорога.
 */
const ZOOMS = [
  { id: 'world', label: 'Мир' },
  { id: 'realm', label: 'Край' },
  { id: 'near', label: 'Вблизи' },
] as const

type ZoomId = (typeof ZOOMS)[number]['id']

export function MapScreen({ game }: { game: GameState }) {
  const [level, setLevel] = useState<ZoomId>('realm')
  const [selected, setSelected] = useState<string | null>(game.locationId)
  const points = useMemo(() => layoutOf(game.world), [game.world])

  const roads = useMemo(() => {
    const seen = new Set<string>()
    const lines: { from: string; to: string }[] = []
    for (const [id, list] of Object.entries(game.world.roads)) {
      for (const road of list) {
        const key = [id, road.to].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        lines.push({ from: id, to: road.to })
      }
    }
    return lines
  }, [game.world])

  const horizontal = useRef<ScrollView>(null)
  const vertical = useRef<ScrollView>(null)
  const [view, setView] = useState({ width: 0, height: 0 })

  const here = points[game.locationId]
  const chosen = selected ? game.world.locations[selected] : null
  const chosenSettlement = selected ? game.settlements[selected] : null
  const road = selected
    ? roadsFrom(game.world, game.locationId).find((candidate) => candidate.to === selected)
    : undefined
  // «Мир» — это всё полотно целиком в окне, поэтому масштаб считается от окна, а
  // не назначается числом: на узком телефоне и на широком он разный.
  const fit = view.width > 0 ? Math.min(view.width, view.height) / MAP_SIZE : 0.3
  const zoom = level === 'world' ? fit : level === 'realm' ? 1 : 2.2
  const size = MAP_SIZE * zoom
  // Чем дальше отодвинут мир, тем крупнее должны быть значки: иначе на общем
  // виде поселения превращаются в пыль.
  const mark = Math.max(1, 0.85 / zoom)

  // Карта открывается на герое, а не на пустом углу полотна: первым делом надо
  // видеть себя и соседей, а уже потом идти смотреть чужие края.
  const centerOn = (point: { x: number; y: number } | undefined) => {
    if (!point || view.width === 0) return
    horizontal.current?.scrollTo({ x: point.x * zoom - view.width / 2, animated: false })
    vertical.current?.scrollTo({ y: point.y * zoom - view.height / 2, animated: false })
  }

  useEffect(() => {
    if (!here || view.width === 0) return
    horizontal.current?.scrollTo({ x: here.x * zoom - view.width / 2, animated: false })
    vertical.current?.scrollTo({ y: here.y * zoom - view.height / 2, animated: false })
  }, [here, zoom, view.width, view.height])

  return (
    <View style={styles.wrap}>
      <View style={styles.controls}>
        {ZOOMS.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setLevel(option.id)}
            style={[styles.zoom, option.id === level && styles.zoomActive]}
          >
            <Text style={[styles.zoomLabel, option.id === level && styles.zoomLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={() => centerOn(here)} style={styles.zoom}>
          <Text style={styles.zoomLabel}>К себе</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={horizontal}
        horizontal
        contentContainerStyle={styles.canvas}
        onLayout={(event) =>
          setView({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
      >
        <ScrollView ref={vertical} contentContainerStyle={styles.canvas}>
          <Svg width={size} height={size} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}>
            <G>
              {roads.map((line) => {
                const from = points[line.from]
                const to = points[line.to]
                if (!from || !to) return null
                return (
                  <Line
                    key={`${line.from}|${line.to}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#3a332c"
                    strokeWidth={1.6 * mark}
                  />
                )
              })}

              {Object.values(game.world.locations).map((location) => {
                const point = points[location.id]
                const settlement = game.settlements[location.id]
                if (!point || !settlement) return null
                const kingdom = kingdomOf(game.world, location.id)
                const mine = settlement.owner === PLAYER
                const dead = settlement.population <= 0
                const starving = foodSecurity(settlement) < 0.3
                // На общем виде мелкие деревни сливаются в кашу — показываем то,
                // по чему мир читается: города, крепости и своё.
                if (level === 'world' && !notable(location.archetype) && !mine) return null
                const r = radiusFor(location.archetype) * mark
                return (
                  <G key={location.id}>
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={r}
                      fill={dead ? '#2b2620' : (KINGDOM_COLORS[kingdom?.id ?? ''] ?? '#6b6257')}
                      stroke={mine ? '#c9a227' : starving ? '#a8422f' : '#1b1815'}
                      strokeWidth={(mine || starving ? 2.2 : 1) * mark}
                    />
                    {labelled(location.archetype, level) ? (
                      // У правого края подпись уходит за полотно — разворачиваем её внутрь.
                      <SvgText
                        x={
                          point.x > MAP_SIZE * 0.78
                            ? point.x - r - 3 * mark
                            : point.x + r + 3 * mark
                        }
                        y={point.y + 3 * mark}
                        fill="#9a8f80"
                        fontSize={9 * mark}
                        textAnchor={point.x > MAP_SIZE * 0.78 ? 'end' : 'start'}
                      >
                        {location.name}
                      </SvgText>
                    ) : null}
                    {/* Палец толще значка: мишень для нажатия шире кружка и лежит поверх. */}
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={Math.max(r + 6 * mark, 13 * mark)}
                      fill="transparent"
                      onPress={() => setSelected(location.id)}
                      onPressIn={() => setSelected(location.id)}
                    />
                  </G>
                )
              })}

              {here ? (
                <G>
                  <Circle
                    cx={here.x}
                    cy={here.y}
                    r={11 * mark}
                    fill="none"
                    stroke="#e8e0d4"
                    strokeWidth={2 * mark}
                  />
                  <Circle cx={here.x} cy={here.y} r={3 * mark} fill="#e8e0d4" />
                </G>
              ) : null}

              {selected && points[selected] ? (
                <Circle
                  cx={points[selected]?.x}
                  cy={points[selected]?.y}
                  r={14 * mark}
                  fill="none"
                  stroke="#c9a227"
                  strokeWidth={1.5 * mark}
                />
              ) : null}
            </G>
          </Svg>
        </ScrollView>
      </ScrollView>

      {chosen && chosenSettlement ? (
        <View style={styles.panel}>
          <Text style={styles.name}>
            {chosen.name} · {ARCHETYPE_LABELS[chosen.archetype]}
          </Text>
          <Text style={styles.dim}>{addressOf(game.world, chosen.id)}</Text>
          <Text style={styles.dim}>
            {chosenSettlement.population > 0
              ? `${chosenSettlement.population} чел. · ${ownerWord(game, chosenSettlement.owner)}`
              : 'заброшено'}
          </Text>
          <Text style={styles.dim}>
            {foodWord(foodSecurity(chosenSettlement))}
            {chosenSettlement.banditry > 0.3 ? ' · неспокойно' : ''}
          </Text>
          {road ? (
            <Button
              label={`Идти сюда — ${formatDuration(hours(road.hours))}`}
              tone="primary"
              onPress={() => {
                const command: Command = { type: 'travel', toLocationId: chosen.id }
                if (canApply(game, command).ok) dispatch(command)
              }}
            />
          ) : chosen.id === game.locationId ? (
            <Text style={styles.here}>Ты здесь.</Text>
          ) : (
            <Text style={styles.dim}>Прямой дороги отсюда нет.</Text>
          )}
        </View>
      ) : null}
    </View>
  )
}

function radiusFor(archetype: string): number {
  if (archetype === 'capital') return 8
  if (archetype === 'city') return 6
  if (archetype === 'port' || archetype === 'town') return 5
  if (archetype === 'fortress' || archetype === 'mine') return 4
  return 3.2
}

/** Что видно на общем виде мира: по этим местам он и читается. */
function notable(archetype: string): boolean {
  return archetype === 'capital' || archetype === 'city' || archetype === 'fortress'
}

function labelled(archetype: string, level: ZoomId): boolean {
  if (level === 'world') return archetype === 'capital'
  return archetype === 'capital' || archetype === 'city'
}

function ownerWord(game: GameState, owner: string | null): string {
  if (owner === PLAYER) return 'твоё'
  if (!owner) return 'ничьё'
  if (owner.startsWith('crown:')) {
    return `корона ${game.world.kingdoms[owner.slice('crown:'.length)]?.name ?? ''}`.trim()
  }
  const lord = lordById(game.politics, owner)
  return lord ? `${lord.title} ${lord.name}` : 'чужое'
}

function foodWord(security: number): string {
  if (security < 0.25) return 'голод'
  if (security < 0.6) return 'впроголодь'
  return 'сыто'
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  controls: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
  zoom: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  zoomActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.gold },
  zoomLabel: { color: colors.dim, fontSize: font.small },
  zoomLabelActive: { color: colors.gold },
  canvas: { backgroundColor: '#15120f' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  name: { color: colors.text, fontSize: font.heading },
  dim: { color: colors.dim, fontSize: font.small },
  here: { color: colors.gold, fontSize: font.small },
})
