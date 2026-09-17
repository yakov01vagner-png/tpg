import {
  GOODS,
  GOOD_IDS,
  type GameState,
  type GoodId,
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
import { colors, font, radius, spacing } from '../theme'
import { Empty, Section } from '../ui/atoms'

const LOTS = [1, 5, 20] as const

/**
 * Торг.
 *
 * Главное, что должен показать экран, — где дёшево, а где дорого, без блокнота.
 * Поэтому рядом с ценой стоит оценка относительно обычной цены товара: цифры
 * сами по себе игроку ничего не скажут, пока он не объездил полмира.
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
      <View style={styles.purse}>
        <Text style={styles.purseLine}>Кошель: {game.character.money} монет</Text>
        <Text style={styles.purseLine}>
          Поклажа: {weight} из {capacity}
        </Text>
      </View>

      <View style={styles.lots}>
        {LOTS.map((size) => (
          <Pressable
            key={size}
            onPress={() => setLot(size)}
            style={[styles.lot, size === lot && styles.lotActive]}
          >
            <Text style={[styles.lotLabel, size === lot && styles.lotLabelActive]}>по {size}</Text>
          </Pressable>
        ))}
      </View>

      <Section title="Товары">
        {GOOD_IDS.map((good: GoodId) => {
          const buy = buyPrice(game.world, market, good, tradeSkill)
          const sell = sellPrice(game.world, market, good, tradeSkill)
          const mine = carried(game.character, good)
          const canBuy = canApply(game, { type: 'buy', good, amount: lot }).ok
          const canSell = canApply(game, { type: 'sell', good, amount: lot }).ok
          return (
            <View key={good} style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {GOODS[good].label}
                  {mine > 0 ? <Text style={styles.mine}> у тебя {mine}</Text> : null}
                </Text>
                <Text style={styles.prices}>
                  купить {buy} · продать {sell}
                  <Text style={verdictStyle(buy, GOODS[good].basePrice)}>
                    {'  '}
                    {verdict(buy, GOODS[good].basePrice)}
                  </Text>
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Купить ${GOODS[good].label}`}
                onPress={() => dispatch({ type: 'buy', good, amount: lot })}
                style={[styles.action, !canBuy && styles.actionOff]}
              >
                <Text style={styles.actionLabel}>+</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Продать ${GOODS[good].label}`}
                onPress={() => dispatch({ type: 'sell', good, amount: lot })}
                style={[styles.action, !canSell && styles.actionOff]}
              >
                <Text style={styles.actionLabel}>−</Text>
              </Pressable>
            </View>
          )
        })}
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

function verdictStyle(price: number, base: number) {
  if (price <= base * 0.7) return styles.cheap
  if (price >= base * 1.4) return styles.dear
  return styles.prices
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  purse: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  purseLine: { color: colors.text, fontSize: font.body },
  lots: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  lot: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  lotActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.gold },
  lotLabel: { color: colors.dim, fontSize: font.small, textAlign: 'center' },
  lotLabelActive: { color: colors.gold },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: font.body },
  mine: { color: colors.faint, fontSize: font.tiny },
  prices: { color: colors.dim, fontSize: font.small },
  cheap: { color: colors.good, fontSize: font.small },
  dear: { color: colors.danger, fontSize: font.small },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  actionOff: { opacity: 0.3 },
  actionLabel: { color: colors.gold, fontSize: font.title },
})
