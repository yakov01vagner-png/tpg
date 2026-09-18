import {
  type Command,
  GOODS,
  GOOD_IDS,
  type GameState,
  type GoodId,
  SLOT_IDS,
  SLOT_LABELS,
  buyPrice,
  canApply,
  carried,
  carriedWeight,
  dayOf,
  fairAt,
  isSettlement,
  itemsSoldAt,
  kingdomOf,
  knownMarkets,
  partyCapacity,
  priceAgo,
  priceHistory,
  sellPrice,
  skillLevel,
  tradeSkillAt,
} from '@tpg/engine'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { Polyline } from 'react-native-svg'
import { Icon } from '../art/icons'
import { dispatch } from '../game/store'
import { font, palette, radii, spacing, touch } from '../theme'
import { Card, Chip, Chips, Dim, Empty, Panel, Section, Stat, Stats } from '../ui/parts'

const LOTS = [1, 5, 20] as const

/**
 * Рынок.
 *
 * Главное, что должен показать экран, — где дёшево, а где дорого, без
 * блокнота. Рядом с ценой стоит оценка против обычной цены товара: цифры сами
 * по себе игроку ничего не скажут, пока он не объездил полмира.
 */
export function TradeScreen({ game }: { game: GameState }) {
  const [lot, setLot] = useState<number>(5)
  const [open, setOpen] = useState<GoodId | null>(null)
  const market = game.settlements[game.locationId]
  // С ярмаркой: в дни торга разница между «купить» и «продать» сходится сама
  // (этап 39), и здесь она обязана сойтись так же, как в ядре.
  const tradeSkill = tradeSkillAt(game)
  const fair = fairAt(game.world, game.locationId, dayOf(game.time))
  const weight = carriedWeight(game.character)
  const capacity = partyCapacity(game.character, game.party)

  if (!market) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Empty text="Торговать здесь не с кем." />
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel>
        <Stats>
          <Stat label="Кошель" value={`${game.character.money}`} tone="gold" />
          <Stat label="Поклажа" value={`${weight} из ${capacity}`} />
          <Stat
            label="Торг"
            value={fair ? `${tradeSkill} · ярмарка` : `${tradeSkill}`}
            tone={fair ? 'good' : undefined}
          />
        </Stats>
      </Panel>
      {fair ? (
        <Dim>{`${fair.name}: съехались со всей округи, цены сходятся, товара вдоволь.`}</Dim>
      ) : null}

      <Chips>
        {LOTS.map((size) => (
          <Chip
            key={size}
            label={`по ${size}`}
            active={size === lot}
            onPress={() => setLot(size)}
          />
        ))}
      </Chips>

      <Section title="Товары">
        {GOOD_IDS.map((good: GoodId) => {
          const buy = buyPrice(game.world, market, good, tradeSkill)
          const sell = sellPrice(game.world, market, good, tradeSkill)
          const mine = carried(game.character, good)
          const canBuy = canApply(game, { type: 'buy', good, amount: lot }).ok
          const canSell = canApply(game, { type: 'sell', good, amount: lot }).ok
          const word = verdict(buy, GOODS[good].basePrice)
          return (
            <View key={good}>
              <View style={styles.row}>
                <Pressable
                  accessibilityLabel={`История: ${GOODS[good].label}`}
                  onPress={() => setOpen(open === good ? null : good)}
                  style={styles.info}
                >
                  <View style={styles.nameRow}>
                    <Icon name={good} size={22} color={palette.dim} />
                    <Text style={styles.name}>
                      {GOODS[good].label}
                      {mine > 0 ? <Text style={styles.mine}>{`  у тебя ${mine}`}</Text> : null}
                    </Text>
                  </View>
                  <Text style={styles.prices}>
                    {`купить ${buy} · продать ${sell}`}
                    {word ? (
                      <Text
                        style={word === 'дёшево' ? styles.cheap : styles.dear}
                      >{`  ${word}`}</Text>
                    ) : null}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Купить ${GOODS[good].label}`}
                  disabled={!canBuy}
                  onPress={() => dispatch({ type: 'buy', good, amount: lot })}
                  style={[styles.action, !canBuy && styles.actionOff]}
                >
                  <Text style={styles.actionLabel}>+</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Продать ${GOODS[good].label}`}
                  disabled={!canSell}
                  onPress={() => dispatch({ type: 'sell', good, amount: lot })}
                  style={[styles.action, !canSell && styles.actionOff]}
                >
                  <Text style={styles.actionLabel}>−</Text>
                </Pressable>
              </View>
              {open === good ? <History game={game} good={good} /> : null}
            </View>
          )
        })}
      </Section>

      <Section title="Снаряжение">
        {itemsSoldAtHere(game).map((item) => {
          const command: Command = { type: 'buyItem', itemId: item.id }
          const check = canApply(game, command)
          const worn = game.character.equipment[item.slot]?.id === item.id
          return (
            <Card
              key={item.id}
              glyph={<Icon name={item.slot} size={20} color={palette.dim} />}
              title={`${item.label}${worn ? ' · надето' : ''}`}
              description={item.description}
              meta={`${item.price} · ${SLOT_LABELS[item.slot]}`}
              reason={check.ok ? null : check.message}
              onPress={() => dispatch(command)}
            />
          )
        })}
        {SLOT_IDS.filter((slot) => (game.character.equipment[slot]?.condition ?? 100) < 100).map(
          (slot) => {
            const command: Command = { type: 'repairItem', slot }
            const check = canApply(game, command)
            return (
              <Card
                key={`repair-${slot}`}
                title={`Починить: ${SLOT_LABELS[slot].toLowerCase()}`}
                description={`Состояние ${game.character.equipment[slot]?.condition}%.`}
                meta="починка"
                reason={check.ok ? null : check.message}
                onPress={() => dispatch(command)}
              />
            )
          },
        )}
      </Section>
    </ScrollView>
  )
}

/**
 * История цены: что было здесь, пока ты здесь стоял, и где по памяти дороже.
 * Линия — записная книжка, а не биржа: точек столько, сколько раз ты тут был.
 */
function History({ game, good }: { game: GameState; good: GoodId }) {
  const today = dayOf(game.time)
  const samples = priceHistory(game.priceLog, game.locationId, good)
  const yearAgo = priceAgo(game.priceLog, game.locationId, good, today, 360)
  const monthAgo = priceAgo(game.priceLog, game.locationId, good, today, 30)
  const elsewhere = knownMarkets(game.priceLog, good)
    .filter((entry) => entry.locationId !== game.locationId)
    .slice(0, 2)
  const width = 120
  const height = 28
  const line = sparkline(
    samples.map((sample) => sample.price),
    width,
    height,
  )
  return (
    <View style={styles.history}>
      <View style={styles.historyRow}>
        {samples.length >= 2 ? (
          <Svg width={width} height={height}>
            <Polyline
              points={line}
              fill="none"
              stroke={palette.gold}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <Text style={styles.historyText}>Здесь ты недавно: истории цен ещё нет.</Text>
        )}
        <View style={styles.historyNotes}>
          {monthAgo !== null ? (
            <Text style={styles.historyText}>{`месяц назад ${monthAgo}`}</Text>
          ) : null}
          {yearAgo !== null ? (
            <Text style={styles.historyText}>{`год назад ${yearAgo}`}</Text>
          ) : null}
        </View>
      </View>
      {elsewhere.length > 0 ? (
        <Text style={styles.historyText}>
          {`Дороже, по памяти: ${elsewhere
            .map((entry) => `${game.world.locations[entry.locationId]?.name ?? '…'} ${entry.price}`)
            .join(' · ')}`}
        </Text>
      ) : (
        <Text style={styles.historyText}>Где дороже — узнаешь, побывав в других местах.</Text>
      )}
    </View>
  )
}

/** Точки ломаной по значениям: растянуть по ширине, вписать по высоте. */
function sparkline(values: readonly number[], width: number, height: number): string {
  if (values.length < 2) return ''
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = Math.max(1, high - low)
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * (width - 2) + 1
      const y = height - 2 - ((value - low) / span) * (height - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/** Что продают там, где стоит герой. В глуши — ничего: лавки там нет. */
function itemsSoldAtHere(game: GameState) {
  const kind = game.world.locations[game.locationId]?.archetype
  if (!kind || !isSettlement(kind)) return []
  return itemsSoldAt(kind, kingdomOf(game.world, game.locationId)?.id ?? null)
}

/** Дёшево или дорого — относительно обычной цены этого товара в мире. */
function verdict(price: number, base: number): string {
  if (price <= base * 0.7) return 'дёшево'
  if (price >= base * 1.4) return 'дорого'
  return ''
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    alignItems: 'center',
    borderBottomColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  info: { flex: 1 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  history: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  historyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  historyNotes: { flex: 1, gap: 2 },
  historyText: { color: palette.dim, fontSize: font.tiny },
  name: { color: palette.text, fontSize: font.body },
  mine: { color: palette.faint, fontSize: font.tiny },
  prices: { color: palette.dim, fontSize: font.small },
  cheap: { color: palette.good, fontSize: font.small },
  dear: { color: palette.danger, fontSize: font.small },
  action: {
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.md,
    height: touch.min,
    justifyContent: 'center',
    width: touch.comfortable,
  },
  actionOff: { opacity: 0.3 },
  actionLabel: { color: palette.gold, fontSize: font.title },
})
