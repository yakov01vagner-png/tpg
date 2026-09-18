import {
  ARMY_PACE,
  CARAVAN_COST,
  type Command,
  FRONTIER,
  GOODS,
  GOOD_IDS,
  type GameState,
  type GoodId,
  type GridCell,
  KINGDOM_COLORS,
  KINGDOM_SHORT,
  MAP_SIZE,
  PLACE_LABELS,
  PLAYER,
  type Passage,
  SITES,
  TERRAIN_COLORS,
  TERRAIN_LABELS,
  addressOf,
  canApply,
  dayOf,
  foodSecurity,
  formatDuration,
  holderOf,
  hours,
  isSettlement,
  isSite,
  journeyProgress,
  lanesFrom,
  layoutOf,
  legHoursFor,
  lordById,
  paceOf,
  partySize,
  passageCost,
  plagueAt,
  pointBetween,
  regionColors,
  riverAt,
  riversOf,
  roadsFrom,
  routeTo,
  seaHours,
  worldGrid,
} from '@tpg/engine'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { GestureResponderEvent } from 'react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
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
        const fill = grid.water[row * grid.size + column]
          ? SEA_COLOR
          : colorOf(cell, mode, regionPaint, cell?.locationId ? held[cell.locationId] : undefined)
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

  // Подпись ставится в середину земли, а не в геометрический центр: так она
  // стоит там, где земля и правда есть, и не спорит с именами мест. Вблизи
  // подписаны провинции, издали — области: при двух сотнях мест провинции на
  // общем виде слипаются в кашу, а области читаются.
  const labels = useMemo(() => {
    const gather = (by: (cell: GridCell) => string) => {
      const sums = new Map<string, { x: number; y: number; n: number }>()
      for (let row = 0; row < grid.size; row += 1) {
        for (let column = 0; column < grid.size; column += 1) {
          const cell = grid.cells[row * grid.size + column]
          if (!cell) continue
          const key = by(cell)
          const sum = sums.get(key) ?? { x: 0, y: 0, n: 0 }
          sum.x += (column + 0.5) * grid.cell
          sum.y += (row + 0.5) * grid.cell
          sum.n += 1
          sums.set(key, sum)
        }
      }
      return sums
    }
    const named = (
      sums: Map<string, { x: number; y: number; n: number }>,
      name: (id: string) => string | undefined,
    ) => {
      const out: { id: string; name: string; x: number; y: number }[] = []
      for (const [id, sum] of sums) {
        const label = name(id)
        if (!label || sum.n === 0) continue
        out.push({ id, name: label, x: sum.x / sum.n, y: sum.y / sum.n })
      }
      return out
    }
    return {
      provinces: named(
        gather((cell) => cell.provinceId),
        (id) => game.world.provinces[id]?.name,
      ),
      regions: named(
        gather((cell) => cell.regionId),
        (id) => game.world.regions[id]?.name,
      ),
      // Издали подписаны короны и марки: двадцать имён областей на общем виде
      // слипаются в кашу, а десять держав и пограничий читаются.
      crowns: named(
        gather((cell) => (cell.kingdomId === FRONTIER ? cell.regionId : cell.kingdomId)),
        (id) => KINGDOM_SHORT[id] ?? game.world.kingdoms[id]?.name ?? game.world.regions[id]?.name,
      ),
    }
  }, [grid, game.world])

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

  // Реки: то, что было на земле до всех дорог. Рисуются под дорогами и видны
  // на всех уровнях — река не перестаёт быть рекой оттого, что смотришь на
  // мир целиком (этап 34).
  const rivers = useMemo(
    () =>
      riversOf(game.world).map((river) => ({
        id: river.id,
        d: river.points
          .map((knee, index) => `${index === 0 ? 'M' : 'L'} ${knee.x} ${knee.y}`)
          .join(' '),
      })),
    [game.world],
  )

  // Морские пути: те же отрезки, только по воде. Рисуются пунктиром — тракт
  // лежит на земле, а путь по морю только держат в уме (этап 35).
  const lanes = useMemo(() => {
    const out: { id: string; x1: number; y1: number; x2: number; y2: number }[] = []
    for (const [fromId, list] of Object.entries(game.world.lanes ?? {})) {
      const from = points[fromId]
      if (!from) continue
      for (const lane of list) {
        if (fromId > lane.to) continue
        const to = points[lane.to]
        if (!to) continue
        out.push({ id: `${fromId}~${lane.to}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y })
      }
    }
    return out
  }, [game.world.lanes, points])

  // Дороги: отрезок между соседями. Рисуются один раз на пару, цвет — от того,
  // чего он стоит: тракт по равнине бледный и тонкий, гать через топь толще и
  // темнее. До 0.4 карта дорог не показывала вовсе — а дорога и есть земля.
  const legs = useMemo(() => {
    const out: { id: string; x1: number; y1: number; x2: number; y2: number; hours: number }[] = []
    for (const [fromId, roads] of Object.entries(game.world.roads)) {
      const from = points[fromId]
      if (!from) continue
      for (const road of roads) {
        if (fromId > road.to) continue
        const to = points[road.to]
        if (!to) continue
        out.push({
          id: `${fromId}|${road.to}`,
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          hours: road.hours,
        })
      }
    }
    return out
  }, [game.world.roads, points])

  // Где герой сейчас: в пути — между местами, иначе в месте.
  const heroAt = useMemo(() => {
    if (!game.journey) return points[game.locationId] ?? null
    return pointBetween(
      game.world,
      game.journey.fromId,
      game.journey.toId,
      journeyProgress(game.journey),
    )
  }, [game.journey, game.locationId, game.world, points])

  // Кто сейчас на дороге: войско между двумя местами видно там, где оно идёт.
  const marching = useMemo(() => {
    const out: { id: string; x: number; y: number; size: number }[] = []
    for (const band of game.bands) {
      if (!band.travel) continue
      const size = Object.values(band.units).reduce((sum, n) => sum + (n ?? 0), 0)
      if (size <= 0) continue
      const road = roadsFrom(game.world, band.locationId).find(
        (one) => one.to === band.travel?.toLocationId,
      )
      const total = legHoursFor(road?.hours ?? 12, ARMY_PACE)
      const share = total > 0 ? 1 - band.travel.hoursLeft / total : 0
      const at = pointBetween(game.world, band.locationId, band.travel.toLocationId, share)
      if (at) out.push({ id: band.id, x: at.x, y: at.y, size })
    }
    return out
  }, [game.bands, game.world])

  // Путь до выбранного места: из каких отрезков сложится и сколько будет стоить
  // этому отряду. Дальнее место — это маршрут, а не одно нажатие.
  const route = useMemo(() => {
    if (!selected || selected === game.locationId) return null
    return routeTo(
      game.world,
      game.locationId,
      selected,
      paceOf(game.party, game.character.wound !== null),
    )
  }, [selected, game.world, game.locationId, game.party, game.character.wound])

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
  // Есть ли отсюда морской путь именно сюда: карта предлагает уйти морем там,
  // где море есть (этап 35).
  const lane = selected
    ? lanesFrom(game.world, game.locationId).find((one) => one.to === selected)
    : undefined
  // Почему туда нельзя пойти прямо сейчас: весной брод под водой, и кнопка
  // «идти» должна не молчать, а сказать это (этап 34).
  const travelGate =
    selected && road ? canApply(game, { type: 'travel', toLocationId: selected }) : null

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

              <G>
                {rivers.map((river) => (
                  <Path
                    key={`bank${river.id}`}
                    d={river.d}
                    stroke={SEA_COLOR}
                    strokeWidth={5 * mark}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
                {rivers.map((river) => (
                  <Path
                    key={river.id}
                    d={river.d}
                    stroke={RIVER_COLOR}
                    strokeWidth={2.4 * mark}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
              </G>

              <G opacity={0.55}>
                {lanes.map((lane) => (
                  <Line
                    key={lane.id}
                    x1={lane.x1}
                    y1={lane.y1}
                    x2={lane.x2}
                    y2={lane.y2}
                    stroke={LANE_COLOR}
                    strokeWidth={1.1 * mark}
                    strokeDasharray={`${4 * mark},${5 * mark}`}
                    strokeLinecap="round"
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

              {level === 'world' ? null : (
                <G opacity={0.5}>
                  {legs.map((leg) => (
                    <Line
                      key={leg.id}
                      x1={leg.x1}
                      y1={leg.y1}
                      x2={leg.x2}
                      y2={leg.y2}
                      stroke={leg.hours >= 8 ? '#4b3b2a' : '#5d5140'}
                      strokeWidth={(leg.hours >= 8 ? 1.6 : 1) * mark}
                      strokeLinecap="round"
                    />
                  ))}
                </G>
              )}

              {route && route.steps.length > 0 ? (
                <G opacity={0.85}>
                  {[game.locationId, ...route.steps].slice(0, -1).map((stepId, index) => {
                    const from = points[stepId]
                    const to = points[[game.locationId, ...route.steps][index + 1] ?? '']
                    if (!from || !to) return null
                    return (
                      <Line
                        key={`route${stepId}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#c9a227"
                        strokeWidth={1.8 * mark}
                        strokeLinecap="round"
                      />
                    )
                  })}
                </G>
              ) : null}

              <G>
                {(level === 'world'
                  ? labels.crowns
                  : level === 'realm'
                    ? labels.regions
                    : labels.provinces
                ).map((label) => (
                  <SvgText
                    key={label.id}
                    x={label.x}
                    y={label.y}
                    fill="#efe6d6"
                    fillOpacity={level === 'world' ? 0.5 : 0.32}
                    fontSize={(level === 'world' ? 19 : 13) * mark}
                    textAnchor="middle"
                  >
                    {label.name.toUpperCase()}
                  </SvgText>
                ))}
              </G>

              {level === 'world' ? null : (
                <G>
                  {Object.values(game.world.locations).map((location) => {
                    const point = points[location.id]
                    if (!point || isSettlement(location.archetype)) return null
                    // Место без жителей — ромб вполовину меньше деревни: оно
                    // есть на земле, но не спорит с поселением за внимание.
                    const half = 3.4 * mark
                    const picked = selected === location.id
                    return (
                      <G key={location.id}>
                        <Rect
                          x={point.x - half}
                          y={point.y - half}
                          width={half * 2}
                          height={half * 2}
                          fill={picked ? '#efe6d6' : '#9a8f7c'}
                          stroke="#17140f"
                          strokeWidth={0.8 * mark}
                          transform={`rotate(45 ${point.x} ${point.y})`}
                        />
                        <Rect
                          x={point.x - 12 * mark}
                          y={point.y - 12 * mark}
                          width={24 * mark}
                          height={24 * mark}
                          fill="transparent"
                          onPress={() => setSelected(location.id)}
                          onPressIn={() => setSelected(location.id)}
                        />
                      </G>
                    )
                  })}
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

              {/* Идущие видны там, где идут: войско между двумя местами — это
                  то, что можно перехватить, а не то, что появится потом. */}
              <G>
                {marching.map((host) => (
                  <Circle
                    key={host.id}
                    cx={host.x}
                    cy={host.y}
                    r={Math.max(2, Math.min(5, host.size / 12)) * mark}
                    fill="#b4452f"
                    fillOpacity={0.75}
                    stroke="#17140f"
                    strokeWidth={0.6 * mark}
                  />
                ))}
              </G>

              {heroAt ? (
                <Rect
                  x={heroAt.x - 11 * mark}
                  y={heroAt.y - 11 * mark}
                  width={22 * mark}
                  height={22 * mark}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={2 * mark}
                  // В пути метка героя идёт по дороге, а не ждёт в месте выхода.
                  transform={game.journey ? `rotate(45 ${heroAt.x} ${heroAt.y})` : undefined}
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

      {chosen ? (
        <View style={styles.panel}>
          <Text style={styles.name}>
            {chosen.name} · {PLACE_LABELS[chosen.archetype]}
          </Text>
          <Text style={styles.dim}>{addressOf(game.world, chosen.id)}</Text>
          {chosenSettlement ? (
            <>
              <Text style={styles.dim}>
                {chosenSettlement.population > 0
                  ? `${Math.round(chosenSettlement.population)} чел. · ${ownerWord(game, chosenSettlement.owner)}`
                  : 'заброшено'}
              </Text>
              <Text style={styles.dim}>
                {TERRAIN_LABELS[chosen.terrain]} · {foodWord(foodSecurity(chosenSettlement))}
                {chosenSettlement.banditry > 0.3 ? ' · неспокойно' : ''}
                {chosenSettlement.strain > 0.4 ? ' · земля истощена' : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.dim}>{`${TERRAIN_LABELS[chosen.terrain]} · здесь не живут`}</Text>
              {isSite(chosen.archetype) ? (
                <Text style={styles.dim}>{SITES[chosen.archetype].description}</Text>
              ) : null}
            </>
          )}
          {riverAt(game.world, chosen) ? (
            <Text style={styles.dim}>{`На реке ${riverAt(game.world, chosen)?.name ?? ''}`}</Text>
          ) : null}
          {route && route.steps.length > 0 ? (
            <Text style={styles.dim}>
              {`Путь: ${route.steps.length} ${stepWord(route.steps.length)} · ${formatDuration(hours(route.hours))}${
                route.steps.length > 1
                  ? ` · через ${game.world.locations[route.steps[0] as string]?.name ?? '…'}`
                  : ''
              }`}
            </Text>
          ) : null}
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
          {lane ? (
            <Button
              label={`Морем сюда — ${formatDuration(hours(seaHours(lane.hours, seaManner(game), game.ship)))}${
                seaManner(game) === 'own'
                  ? ' (своим судном)'
                  : ` (${passageCost(seaManner(game), seaHours(lane.hours, seaManner(game), game.ship), partySize(game.party) + 1)} монет)`
              }`}
              tone="primary"
              onPress={() => {
                const command: Command = {
                  type: 'sail',
                  toLocationId: chosen.id,
                  manner: seaManner(game),
                }
                if (canApply(game, command).ok) dispatch(command)
              }}
            />
          ) : null}
          {road && travelGate && !travelGate.ok && travelGate.code === 'flood' ? (
            <Text style={styles.plague}>{travelGate.message}</Text>
          ) : road ? (
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

/**
 * Каким способом карта предлагает уйти морем.
 *
 * Своим судном, если оно есть, — оно уже оплачено; иначе нанятым: на карте
 * выбирают куда, а не на чём. Все три способа лежат на домашнем экране, в
 * гавани (этап 35).
 */
function seaManner(game: GameState): Passage {
  return game.ship ? 'own' : 'hire'
}

/** Чем красить клетку: в этом вся разница между режимами карты. */
/** Мятежник и сам игрок — такие же силы на карте, как короны. */
const REBEL_COLOR = '#8c5a3c'
const PLAYER_COLOR = '#c9a227'
const NOBODY_COLOR = '#4a453e'

/**
 * Цвет воды.
 *
 * Один на все разбивки: море не принадлежит ни короне, ни области, и красить
 * его по владельцу нечем. Тёмно-синий глуше суши — карта остаётся картой земли,
 * а вода на ней фон, но фон, у которого есть край.
 */
const SEA_COLOR = '#1b2a38'

/**
 * Цвет реки.
 *
 * Русло рисуется дважды: тёмный берег цветом моря и светлая вода поверх него.
 * Одной линией река терялась — на карте корон земля бывает синей, и русло
 * сливалось с ней в тень под холмами.
 */
const RIVER_COLOR = '#5f9dc0'

/** Цвет морского пути: светлее воды, чтобы пунктир читался на тёмном море. */
const LANE_COLOR = '#7fa9c4'

function colorOf(
  cell: GridCell | null | undefined,
  mode: ModeId,
  regionPaint: Readonly<Record<string, string>>,
  holder: string | undefined,
): string | null {
  if (!cell) return null
  const base = baseColorOf(cell, mode, regionPaint, holder)
  // Глушь темнее околицы: видно, докуда дотянулись люди, а где земля сама по
  // себе. В разбивке по областям провинции внутри области ещё и чуть разные —
  // иначе область читается одним пятном, а провинция, которую держит лорд,
  // не читается вовсе.
  const shade = (cell.wilds ? 0.74 : 1) * (mode === 'regions' ? provinceTint(cell.provinceId) : 1)
  return shade === 1 ? base : darken(base, shade)
}

function baseColorOf(
  cell: GridCell,
  mode: ModeId,
  regionPaint: Readonly<Record<string, string>>,
  holder: string | undefined,
): string {
  if (mode === 'land') return TERRAIN_COLORS[cell.terrain]
  if (mode === 'regions') return regionPaint[cell.regionId] ?? '#6b6257'
  if (holder === 'rebel') return REBEL_COLOR
  if (holder === 'player') return PLAYER_COLOR
  if (holder === 'nobody') return NOBODY_COLOR
  return KINGDOM_COLORS[holder ?? cell.kingdomId] ?? '#6b6257'
}

/** Устойчивый лёгкий сдвиг яркости: соседние провинции области не сливаются. */
function provinceTint(provinceId: string): number {
  let hash = 2166136261
  for (let i = 0; i < provinceId.length; i += 1) {
    hash ^= provinceId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return 0.9 + ((hash >>> 12) % 100) / 500
}

function darken(color: string, factor: number): string {
  const value = Number.parseInt(color.slice(1), 16)
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * factor)))
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`
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

/** «переход», «перехода», «переходов» — по числу. */
function stepWord(count: number): string {
  const ten = count % 10
  const hundred = count % 100
  if (ten === 1 && hundred !== 11) return 'переход'
  if (ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14)) return 'перехода'
  return 'переходов'
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
