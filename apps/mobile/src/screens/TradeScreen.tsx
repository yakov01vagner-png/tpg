import {
  type Command,
  GOODS,
  GOOD_IDS,
  type GameState,
  type GoodId,
  ITEMS,
  SLOT_IDS,
  SLOT_LABELS,
  buyPrice,
  canApply,
  carried,
  carriedWeight,
  partyCapacity,
  sellPrice,
  skillLevel,
} from '@tpg/engine'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { dispatch } from '../game/store'
import { font, palette, radii, spacing, touch } from '../theme'
import { Card, Chip, Chips, Empty, Panel, Section, Stat, Stats } from '../ui/parts'

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
  const market = game.settlements[game.locationId]
  const tradeSkill = skillLevel(game.character, 'trade')
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
          <Stat label="Торг" value={`${tradeSkill}`} />
        </Stats>
      </Panel>

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
            <View key={good} style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {GOODS[good].label}
                  {mine > 0 ? <Text style={styles.mine}>{`  у тебя ${mine}`}</Text> : null}
                </Text>
                <Text style={styles.prices}>
                  {`купить ${buy} · продать ${sell}`}
                  {word ? (
                    <Text
                      style={word === 'дёшево' ? styles.cheap : styles.dear}
                    >{`  ${word}`}</Text>
                  ) : null}
                </Text>
              </View>
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
          )
        })}
      </Section>

      <Section title="Снаряжение">
        {ITEMS.filter((item) => {
          const here = game.world.locations[game.locationId]
          return here ? item.where.includes(here.archetype) : false
        }).map((item) => {
          const command: Command = { type: 'buyItem', itemId: item.id }
          const check = canApply(game, command)
          const worn = game.character.equipment[item.slot]?.id === item.id
          return (
            <Card
              key={item.id}
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
