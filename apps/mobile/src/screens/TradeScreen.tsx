import {
  type Command,
  GOODS,
  GOOD_IDS,
  type GameState,
  type GoodId,
  MERCHANT_TEMPERS,
  type Merchant,
  ROWS_BY_ID,
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
  knownShare,
  mapsFor,
  merchantBuyPrice,
  merchantGreets,
  merchantSellPrice,
  merchantsAt,
  orderFrom,
  partyCapacity,
  priceAgo,
  priceHistory,
  sellPrice,
  skillLevel,
  standingWord,
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
  const merchants = merchantsAt(game.world, game.settlements, game.locationId, game)
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

      {merchants.map((merchant) => (
        <MerchantStall key={merchant.id} game={game} merchant={merchant} lot={lot} />
      ))}

      {merchants.length > 0 ? null : (
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
      )}

      <Maps game={game} />

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
  greets: { color: palette.text, fontStyle: 'italic', marginBottom: spacing.xs },
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

/**
 * Карты продаются (этап 46): знание — товар. В городе — своей короны, в
 * столице — и дальних земель. Карта уже известной земли не продаётся.
 */
function Maps({ game }: { game: GameState }) {
  const maps = mapsFor(game, game.locationId)
  if (!game.knowledge) return null
  const share = Math.round(knownShare(game) * 100)
  return (
    <Section title="Карты" aside={`знаешь ${share}% земель`}>
      {maps.length === 0 ? <Dim>Карт здесь не продают — или ты знаешь всё, что на них.</Dim> : null}
      {maps.map((map) => {
        const command: Command = { type: 'buyMap', regionId: map.regionId }
        const check = canApply(game, command)
        return (
          <Card
            key={map.regionId}
            title={map.name}
            description={`Откроет земель: ${map.fresh}.`}
            meta={`${map.price} монет`}
            reason={check.ok ? undefined : check.message}
            onPress={() => dispatch(command)}
          />
        )
      })}
    </Section>
  )
}

/**
 * Лавка купца (этап 49).
 *
 * Купец, а не строка таблицы: имя, нрав, ряд и то, как он тебя помнит. Цены у
 * него свои, торг — разговор, заказ — задаток вперёд.
 */
function MerchantStall({
  game,
  merchant,
  lot,
}: {
  game: GameState
  merchant: Merchant
  lot: number
}) {
  const market = game.settlements[game.locationId]
  if (!market) return null
  const dealing = game.dealings?.[merchant.id]
  const standing = dealing?.standing ?? 0
  const day = dayOf(game.time)
  const cut = dealing?.haggledDay === day ? (dealing.cut ?? 0) : 0
  const tradeSkill = tradeSkillAt(game)
  const temper = MERCHANT_TEMPERS[merchant.temper]
  const row = ROWS_BY_ID[merchant.rowId]
  const greets = merchantGreets(merchant, standing)
  const order = orderFrom(game.world, market, merchant, day)
  const orderTaken = game.quests.some((quest) => quest.merchantId === merchant.id)
  return (
    <Section title={merchant.name} aside={`${row?.label ?? ''} · ${standingWord(standing)}`}>
      <Dim>{`${temper.label}${cut > 0 ? ` · уступил ${Math.round(cut * 100)}%` : ''}${dealing?.deals ? ` · сделок ${dealing.deals}` : ''}`}</Dim>
      {greets ? <Text style={styles.greets}>{`«${greets}»`}</Text> : null}

      {merchant.goods.map((good) => {
        const buy = merchantBuyPrice(game.world, market, merchant, good, tradeSkill, standing, cut)
        const sell = merchantSellPrice(
          game.world,
          market,
          merchant,
          good,
          tradeSkill,
          standing,
          cut,
        )
        const mine = carried(game.character, good)
        const canBuy = canApply(game, {
          type: 'buyFrom',
          merchantId: merchant.id,
          good,
          amount: lot,
        }).ok
        const canSell = canApply(game, {
          type: 'sellTo',
          merchantId: merchant.id,
          good,
          amount: lot,
        }).ok
        return (
          <View key={good} style={styles.row}>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Icon name={good} size={22} color={palette.dim} />
                <Text style={styles.name}>
                  {GOODS[good].label}
                  {mine > 0 ? <Text style={styles.mine}>{`  у тебя ${mine}`}</Text> : null}
                </Text>
              </View>
              <Text style={styles.prices}>{`купить ${buy} · продать ${sell}`}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Купить ${GOODS[good].label} у ${merchant.name}`}
              disabled={!canBuy}
              onPress={() =>
                dispatch({ type: 'buyFrom', merchantId: merchant.id, good, amount: lot })
              }
              style={[styles.action, !canBuy && styles.actionOff]}
            >
              <Text style={styles.actionLabel}>+</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Продать ${GOODS[good].label} ${merchant.name}`}
              disabled={!canSell}
              onPress={() =>
                dispatch({ type: 'sellTo', merchantId: merchant.id, good, amount: lot })
              }
              style={[styles.action, !canSell && styles.actionOff]}
            >
              <Text style={styles.actionLabel}>−</Text>
            </Pressable>
          </View>
        )
      })}

      <Chips>
        {HAGGLES.map((push) => {
          const command: Command = { type: 'haggle', merchantId: merchant.id, push: push.id }
          return (
            <Chip
              key={push.id}
              label={push.label}
              active={false}
              onPress={() => dispatch(command)}
            />
          )
        })}
        <Chip
          label="о ценах"
          active={false}
          onPress={() => dispatch({ type: 'askPrices', merchantId: merchant.id })}
        />
      </Chips>

      {order && !orderTaken ? (
        <Card
          title={`Просит привезти: ${GOODS[order.good].label.toLowerCase()}, ${order.amount} мер`}
          description={`«${order.says}»`}
          meta={`задаток ${order.advance} · потом ${order.reward} · ${order.days} сут.`}
          reason={reasonOf(game, { type: 'takeOrder', merchantId: merchant.id })}
          onPress={() => dispatch({ type: 'takeOrder', merchantId: merchant.id })}
          tone="gold"
        />
      ) : null}
    </Section>
  )
}

const HAGGLES = [
  { id: 'soft' as const, label: 'поторговаться' },
  { id: 'firm' as const, label: 'сбить цену' },
  { id: 'bold' as const, label: 'дожать' },
]

function reasonOf(game: GameState, command: Command): string | undefined {
  const check = canApply(game, command)
  return check.ok ? undefined : check.message
}
