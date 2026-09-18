import {
  ARCHETYPE_LABELS,
  CARAVAN_COST,
  type Command,
  GOODS,
  GOOD_IDS,
  type GameState,
  type GoodId,
  type GridCell,
  KINGDOM_COLORS,
  MAP_SIZE,
  PLAYER,
  TERRAIN_COLORS,
  TERRAIN_LABELS,
  addressOf,
  canApply,
  dayOf,
  foodSecurity,
  formatDuration,
  holderOf,
  hours,
  layoutOf,
  lordById,
  plagueAt,
  regionColors,
  roadsFrom,
  worldGrid,
} from '@tpg/engine'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { GestureResponderEvent } from 'react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg'
import { openSheet } from '../game/nav'
import { dispatch } from '../game/store'
import { colors, font, radius, spacing } from '../theme'
import { Button, Chip, Chips } from '../ui/parts'

/**
 * Карта мира.
 *
 * Земля рисуется клетками (см. `world/grid.ts`), а не схемой связей: клетка
 * принадлежит тому, чьё поселение к ней ближе. Поэтому одно и то же полотно
 * читается по-разному — короны, рельеф, области, — меняется только то, чем
 * красить клетку. Ни сетка, ни положение мест в сейве не лежат: и то и другое
 * выводится из неизменного скелета мира.
 */
const MODES = [
  { id: 'crowns', label: 'Короны' },
  { id: 'land', label: 'Земля' },
  { id: 'regions', label: 'Области' },
] as const

const ZOOMS = [
  { id: 'world', label: 'Мир' },
  { id: 'realm', label: 'Край' },
  { id: 'near', label: 'Вблизи' },
] as const

type ModeId = (typeof MODES)[number]['id']
type ZoomId = (typeof ZOOMS)[number]['id']

export function MapScreen({ game }: { game: GameState }) {
  const [mode, setMode] = useState<ModeId>('crowns')
  const [level, setLevel] = useState<ZoomId>('realm')
  const [selected, setSelected] = useState<string | null>(game.locationId)
  // Щипок: масштаб между «миром» и «вблизи» непрерывный, ступени — только
  // отправные точки. Двойное касание — прыжок «край ↔ вблизи».
  const [pinch, setPinch] = useState<number>(1)
  const pinching = useRef<{ start: number; base: number } | null>(null)
  const lastTap = useRef<number>(0)

  const points = useMemo(() => layoutOf(game.world), [game.world])
  const grid = useMemo(() => worldGrid(game.world, MAP_SIZE), [game.world])
  const regionPaint = useMemo(() => regionColors(game.world, grid), [game.world, grid])

  // Чья земля — по держателю, а не по тому, в каком королевстве место было
  // заведено. Скелет мира не меняется, а владельцы меняются осадой и мятежом.
  const held = useMemo(() => {
    const byPlace: Record<string, string> = {}
    for (const [id, settlement] of Object.entries(game.settlements)) {
      const holder = holderOf(game.politics, settlement.owner, PLAYER)
      byPlace[id] =
        holder.kind === 'crown' || holder.kind === 'lord'
          ? holder.kingdomId
          : holder.kind === 'rebel'
            ? 'rebel'
            : holder.kind === 'player'
              ? 'player'
              : 'nobody'
    }
    return byPlace
  }, [game.settlements, game.politics])

  // Одноцветные клетки в строке сливаются в один прямоугольник: рисовать три
  // тысячи квадратов по одному телефон не обязан.
  const bands = useMemo(() => {
    const result: { x: number; y: number; width: number; fill: string }[] = []
    for (let row = 0; row < grid.size; row += 1) {
      let startColumn = 0
      let running: string | null = null
      const flush = (endColumn: number) => {
        if (running === null) return
        result.push({
          x: startColumn * grid.cell,
          y: row * grid.cell,
          width: (endColumn - startColumn) * grid.cell,
          fill: running,
        })
      }
      for (let column = 0; column < grid.size; column += 1) {
        const cell = grid.cells[row * grid.size + column]
        const fill = colorOf(cell, mode, regionPaint, cell ? held[cell.locationId] : undefined)
        if (fill !== running) {
          flush(column)
          running = fill
          startColumn = column
        }
      }
      flush(grid.size)
    }
    return result
  }, [grid, mode, regionPaint, held])

  // Однотонная заливка вблизи превращается в пустое поле: глазу не за что
  // зацепиться. Часть клеток притемняем — тогда земля читается клетками, а
  // издали, где клетка мельче значка, текстура только мешала бы.
  const texture = useMemo(() => {
    const out: { x: number; y: number }[] = []
    for (let row = 0; row < grid.size; row += 1) {
      for (let column = 0; column < grid.size; column += 1) {
        if (!grid.cells[row * grid.size + column]) continue
        if (speckle(column, row) > 0.62) out.push({ x: column * grid.cell, y: row * grid.cell })
      }
    }
    return out
  }, [grid])

  const horizontal = useRef<ScrollView>(null)
  const vertical = useRef<ScrollView>(null)
  const [view, setView] = useState({ width: 0, height: 0 })

  // Войска: где стоят и куда идут. Идущее по дороге показываем в точке, откуда
  // оно вышло, — на полотне это ближе к правде, чем прятать его до прихода.
  const hosts = useMemo(() => {
    const byPlace = new Map<string, { size: number; side: string; marching: boolean }>()
    for (const band of game.bands) {
      const at = band.locationId
      const size = Object.values(band.units).reduce((sum, n) => sum + (n ?? 0), 0)
      if (size <= 0) continue
      const side = band.kingdomId ?? 'rebel'
      const seen = byPlace.get(at)
      byPlace.set(at, {
        size: (seen?.size ?? 0) + size,
        side: seen?.side ?? side,
        marching: (seen?.marching ?? false) || band.travel !== null,
      })
    }
    return byPlace
  }, [game.bands])

  // Свои дела на полотне: мастерская дымит у места, караван идёт по дороге.
  const ventures = useMemo(() => {
    const out: { id: string; x: number; y: number; kind: 'caravan' | 'workshop' }[] = []
    for (const enterprise of game.enterprises) {
      const at = points[enterprise.locationId]
      if (!at) continue
      const to = enterprise.travel ? points[enterprise.travel.toLocationId] : null
      out.push({
        id: enterprise.id,
        kind: enterprise.kind,
        x: to ? (at.x + to.x) / 2 : at.x,
        y: to ? (at.y + to.y) / 2 : at.y,
      })
    }
    return out
  }, [game.enterprises, points])

  const here = points[game.locationId]
  const neighbours = useMemo(
    () => new Set(roadsFrom(game.world, game.locationId).map((road) => road.to)),
    [game.world, game.locationId],
  )
  const chosen = selected ? game.world.locations[selected] : null
  const chosenSettlement = selected ? game.settlements[selected] : null
  const road = selected
    ? roadsFrom(game.world, game.locationId).find((candidate) => candidate.to === selected)
    : undefined

  // «Мир» — это всё полотно целиком в окне, поэтому масштаб считается от окна, а
  // не назначается числом: на узком телефоне и на широком он разный.
  const fit = view.width > 0 ? Math.min(view.width, view.height) / MAP_SIZE : 0.3
  const stepZoom = level === 'world' ? fit : level === 'realm' ? 1 : 1.7
  const zoom = Math.min(3, Math.max(fit, stepZoom * pinch))
  const size = MAP_SIZE * zoom

  const chooseLevel = (next: ZoomId) => {
    setLevel(next)
    setPinch(1)
  }

  // Два пальца: расстояние между ними — множитель к текущему масштабу.
  const touchDistance = (touches: readonly { pageX: number; pageY: number }[]): number => {
    const [a, b] = touches
    if (!a || !b) return 0
    return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)
  }
  const onTouchStart = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches
    if (touches.length === 2) {
      pinching.current = { start: touchDistance(touches), base: pinch }
      return
    }
    if (touches.length === 1) {
      const now = Date.now()
      if (now - lastTap.current < 300) {
        // Двойное касание: вблизи, если далеко; край, если уже близко.
        if (zoom >= 1.5) chooseLevel('realm')
        else chooseLevel('near')
      }
      lastTap.current = now
    }
  }
  const onTouchMove = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches
    if (touches.length !== 2 || !pinching.current || pinching.current.start === 0) return
    const scale = touchDistance(touches) / pinching.current.start
    setPinch(Math.min(3, Math.max(0.2, pinching.current.base * scale)))
  }
  const onTouchEnd = () => {
    pinching.current = null
  }
  // Чем дальше отодвинут мир, тем крупнее должны быть значки: иначе на общем
  // виде поселения превращаются в пыль.
  const mark = Math.max(1, 0.85 / zoom)

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
      <Chips>
        {MODES.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            active={option.id === mode}
            onPress={() => setMode(option.id)}
          />
        ))}
        <Chip label="Сводка" onPress={() => openSheet('world')} />
      </Chips>
      <Chips>
        {ZOOMS.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            active={option.id === level}
            onPress={() => chooseLevel(option.id)}
          />
        ))}
        <Chip label="К себе" onPress={() => centerOn(here)} />
      </Chips>

      <View
        style={styles.touch}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <ScrollView
          ref={horizontal}
          horizontal
          contentContainerStyle={styles.canvas}
          scrollEnabled={pinching.current === null}
          onLayout={(event) =>
            setView({
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height,
            })
          }
        >
          <ScrollView
            ref={vertical}
            contentContainerStyle={styles.canvas}
            scrollEnabled={pinching.current === null}
          >
            <Svg width={size} height={size} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}>
              <G>
                {bands.map((band) => (
                  <Rect
                    key={`${band.x}|${band.y}`}
                    x={band.x}
                    y={band.y}
                    width={band.width}
                    height={grid.cell}
                    fill={band.fill}
                  />
                ))}
              </G>

              {level === 'world' ? null : (
                <G opacity={0.14}>
                  {texture.map((spot) => (
                    <Rect
                      key={`t${spot.x}|${spot.y}`}
                      x={spot.x}
                      y={spot.y}
                      width={grid.cell}
                      height={grid.cell}
                      fill="#000000"
                    />
                  ))}
                </G>
              )}

              <G>
                {Object.values(game.world.locations).map((location) => {
                  const point = points[location.id]
                  const settlement = game.settlements[location.id]
                  if (!point || !settlement) return null
                  const mine = settlement.owner === PLAYER
                  const dead = settlement.population <= 0
                  const starving = foodSecurity(settlement) < 0.3
                  const isHere = location.id === game.locationId
                  // На общем виде мелкие деревни сливаются в кашу — показываем то,
                  // по чему мир читается: города, крепости и своё.
                  if (level === 'world' && !notable(location.archetype) && !mine && !isHere) {
                    return null
                  }
                  const half = (sizeFor(location.archetype) * mark) / 2
                  const outline = mine
                    ? '#c9a227'
                    : starving
                      ? '#c0533a'
                      : neighbours.has(location.id)
                        ? '#d8cdbb'
                        : '#17140f'
                  return (
                    <G key={location.id}>
                      <Rect
                        x={point.x - half}
                        y={point.y - half}
                        width={half * 2}
                        height={half * 2}
                        fill={dead ? '#2b2620' : '#efe6d6'}
                        stroke={outline}
                        strokeWidth={
                          (mine || starving || neighbours.has(location.id) ? 2 : 1) * mark
                        }
                      />
                      {labelled(location.archetype, level) ? (
                        // Вблизи подписей много, и сбоку они наезжают друг на друга —
                        // там имя идёт под значком. Издали их единицы: сбоку компактнее,
                        // а у правого края подпись разворачивается внутрь полотна.
                        <SvgText
                          x={
                            level === 'near'
                              ? point.x
                              : point.x > MAP_SIZE * 0.78
                                ? point.x - half - 3 * mark
                                : point.x + half + 3 * mark
                          }
                          y={level === 'near' ? point.y + half + 10 * mark : point.y + 3 * mark}
                          fill="#efe6d6"
                          fontSize={9 * mark}
                          textAnchor={
                            level === 'near'
                              ? 'middle'
                              : point.x > MAP_SIZE * 0.78
                                ? 'end'
                                : 'start'
                          }
                        >
                          {location.name}
                        </SvgText>
                      ) : null}
                      {/* Палец толще значка: мишень для нажатия шире квадрата и лежит поверх. */}
                      <Rect
                        x={point.x - Math.max(half + 5 * mark, 13 * mark)}
                        y={point.y - Math.max(half + 5 * mark, 13 * mark)}
                        width={Math.max(half + 5 * mark, 13 * mark) * 2}
                        height={Math.max(half + 5 * mark, 13 * mark) * 2}
                        fill="transparent"
                        onPress={() => setSelected(location.id)}
                        onPressIn={() => setSelected(location.id)}
                      />
                    </G>
                  )
                })}
              </G>

              <G>
                {[...hosts].map(([placeId, host]) => {
                  const point = points[placeId]
                  if (!point) return null
                  const side =
                    host.side === 'rebel' ? REBEL_COLOR : (KINGDOM_COLORS[host.side] ?? '#8a8172')
                  // Войско — копьё рядом с местом: узкая метка, которая не спорит
                  // с квадратом поселения и растёт от числа людей.
                  const height = Math.min(26, 8 + host.size * 0.22) * mark
                  return (
                    <G key={`host:${placeId}`}>
                      <Rect
                        x={point.x + 7 * mark}
                        y={point.y - height / 2}
                        width={4 * mark}
                        height={height}
                        fill={side}
                        stroke={host.marching ? '#efe6d6' : '#17140f'}
                        strokeWidth={0.8 * mark}
                      />
                    </G>
                  )
                })}
              </G>

              <G>
                {ventures.map((venture) => {
                  // Мастерская — жёлтый квадрат слева от места; караван — ромб,
                  // на дороге между двумя местами, пока идёт.
                  const r = 3.5 * mark
                  return venture.kind === 'workshop' ? (
                    <Rect
                      key={venture.id}
                      x={venture.x - 8 * mark - r}
                      y={venture.y - r}
                      width={r * 2}
                      height={r * 2}
                      fill="#c9a227"
                      stroke="#17140f"
                      strokeWidth={0.8 * mark}
                    />
                  ) : (
                    <Rect
                      key={venture.id}
                      x={venture.x - r}
                      y={venture.y - r}
                      width={r * 2}
                      height={r * 2}
                      fill="#c9a227"
                      stroke="#17140f"
                      strokeWidth={0.8 * mark}
                      transform={`rotate(45 ${venture.x} ${venture.y})`}
                    />
                  )
                })}
              </G>

              {here ? (
                <Rect
                  x={here.x - 11 * mark}
                  y={here.y - 11 * mark}
                  width={22 * mark}
                  height={22 * mark}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={2 * mark}
                />
              ) : null}

              {selected && points[selected] ? (
                <Rect
                  x={(points[selected]?.x ?? 0) - 15 * mark}
                  y={(points[selected]?.y ?? 0) - 15 * mark}
                  width={30 * mark}
                  height={30 * mark}
                  fill="none"
                  stroke="#c9a227"
                  strokeWidth={1.5 * mark}
                />
              ) : null}
            </Svg>
          </ScrollView>
        </ScrollView>
      </View>

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
            {TERRAIN_LABELS[chosen.terrain]} · {foodWord(foodSecurity(chosenSettlement))}
            {chosenSettlement.banditry > 0.3 ? ' · неспокойно' : ''}
            {chosenSettlement.strain > 0.4 ? ' · земля истощена' : ''}
          </Text>
          {plagueAt(game.plagues, chosen.id) ? (
            <Text style={styles.plague}>Здесь мор. Ехать туда — своей волей.</Text>
          ) : null}
          {game.enterprises
            .filter((one) => one.locationId === chosen.id || one.homeId === chosen.id)
            .map((one) => (
              <Text key={one.id} style={styles.venture}>
                {one.kind === 'workshop'
                  ? `Твоя мастерская · принесла ${one.earned}`
                  : `Твой караван${one.travel ? ` · в пути к ${game.world.locations[one.travelTarget ?? '']?.name ?? '…'}` : ' · стоит здесь'} · принёс ${one.earned}`}
              </Text>
            ))}
          {knownPrice(game, chosen.id) ? (
            <Text style={styles.dim}>{knownPrice(game, chosen.id)}</Text>
          ) : null}
          {hosts.get(chosen.id) ? (
            <Text style={styles.host}>
              {`Войско: ${hosts.get(chosen.id)?.size ?? 0} чел.${
                hosts.get(chosen.id)?.marching ? ' (в походе)' : ''
              }`}
            </Text>
          ) : null}
          {chosen.id === game.locationId
            ? game.bands
                .filter((band) => band.locationId === game.locationId && !band.travel)
                .map((band) => {
                  const command: Command = { type: 'attackBand', bandId: band.id }
                  const size = Object.values(band.units).reduce((sum, n) => sum + (n ?? 0), 0)
                  if (size <= 0 || !canApply(game, command).ok) return null
                  const lord = lordById(game.politics, band.lordId)
                  return (
                    <Button
                      key={band.id}
                      label={`Напасть: ${lord ? `${lord.title} ${lord.name}` : 'рать короны'} (${size})`}
                      onPress={() => dispatch(command)}
                    />
                  )
                })
            : null}
          {chosen.id !== game.locationId &&
          canApply(game, { type: 'foundCaravan', awayId: chosen.id }).ok ? (
            <Button
              label={`Пустить сюда караван — ${CARAVAN_COST}`}
              onPress={() => dispatch({ type: 'foundCaravan', awayId: chosen.id })}
            />
          ) : null}
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

/** Чем красить клетку: в этом вся разница между режимами карты. */
/** Мятежник и сам игрок — такие же силы на карте, как короны. */
const REBEL_COLOR = '#8c5a3c'
const PLAYER_COLOR = '#c9a227'
const NOBODY_COLOR = '#4a453e'

function colorOf(
  cell: GridCell | null | undefined,
  mode: ModeId,
  regionPaint: Readonly<Record<string, string>>,
  holder: string | undefined,
): string | null {
  if (!cell) return null
  if (mode === 'land') return TERRAIN_COLORS[cell.terrain]
  if (mode === 'regions') return regionPaint[cell.regionId] ?? '#6b6257'
  if (holder === 'rebel') return REBEL_COLOR
  if (holder === 'player') return PLAYER_COLOR
  if (holder === 'nobody') return NOBODY_COLOR
  return KINGDOM_COLORS[holder ?? cell.kingdomId] ?? '#6b6257'
}

function sizeFor(archetype: string): number {
  if (archetype === 'capital') return 13
  if (archetype === 'city') return 10
  if (archetype === 'port' || archetype === 'town') return 8
  if (archetype === 'fortress' || archetype === 'mine') return 7
  return 5.5
}

/** Что видно на общем виде мира: по этим местам он и читается. */
function notable(archetype: string): boolean {
  return archetype === 'capital' || archetype === 'city' || archetype === 'fortress'
}

function labelled(archetype: string, level: ZoomId): boolean {
  if (level === 'world') return archetype === 'capital'
  if (level === 'near') return true
  return archetype === 'capital' || archetype === 'city'
}

/** Устойчивая крапина: одна и та же клетка всегда одного оттенка. */
function speckle(x: number, y: number): number {
  let hash = 2166136261
  hash = Math.imul(hash ^ (x + 17), 16777619)
  hash = Math.imul(hash ^ (y + 31), 16777619)
  return ((hash >>> 11) % 1000) / 1000
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

/** Что помнишь о ценах этого места: когда был и что тогда стоило дороже всего. */
function knownPrice(game: GameState, locationId: string): string | null {
  const known = game.priceLog[locationId]
  if (!known) return null
  let best: { good: GoodId; ratio: number } | null = null
  let lastDay = 0
  for (const good of GOOD_IDS) {
    const samples = known[good]
    const last = samples?.[samples.length - 1]
    if (!last) continue
    lastDay = Math.max(lastDay, last.day)
    const ratio = last.price / GOODS[good].basePrice
    if (!best || ratio > best.ratio) best = { good, ratio }
  }
  if (!best) return null
  const ago = dayOf(game.time) - lastDay
  return `Цены помнишь${ago > 0 ? ` (${ago} сут. назад)` : ''}: дороже всего ${GOODS[best.good].label.toLowerCase()}`
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  touch: { flex: 1 },
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
  host: { color: '#d8cdbb', fontSize: font.small },
  venture: { color: '#c9a227', fontSize: font.small },
  plague: { color: '#c0533a', fontSize: font.small },
})
