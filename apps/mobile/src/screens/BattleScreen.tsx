import {
  GROUP_IDS,
  GROUP_LABELS,
  type GameState,
  type GroupId,
  ORDER_LABELS,
  type OrderId,
  TROOPS,
  type TroopId,
  unitsSize,
} from '@tpg/engine'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { dispatch } from '../game/store'
import { colors, font, radius, spacing } from '../theme'
import { Button } from '../ui/atoms'
import { moraleWord } from './PartyScreen'

/** Приказы, которые имеет смысл давать конкретной группе. */
const ORDERS_FOR: Record<GroupId, readonly OrderId[]> = {
  vanguard: ['hold', 'charge', 'fallBack'],
  archers: ['shoot', 'hold', 'fallBack'],
  flank: ['flank', 'charge', 'hold'],
  reserve: ['hold', 'charge', 'fallBack'],
}

const DEFAULT_ORDERS: Record<GroupId, OrderId> = {
  vanguard: 'hold',
  archers: 'shoot',
  flank: 'flank',
  reserve: 'hold',
}

/**
 * Бой: приказы группам, а не отдельным людям (DESIGN.md, п.5).
 *
 * Экран устроен так, чтобы раунд был выбором: видно, кто чем занят, что
 * делает враг и во что обошёлся прошлый раунд.
 */
export function BattleScreen({ game }: { game: GameState }) {
  const battle = game.battle
  const [orders, setOrders] = useState<Record<GroupId, OrderId>>(DEFAULT_ORDERS)
  if (!battle) return null

  const finished = battle.outcome !== 'ongoing'
  const enemySize = unitsSize(battle.enemy.units)
  const log = [...battle.log].reverse().slice(0, 10)

  const cycle = (group: GroupId) => {
    const allowed = ORDERS_FOR[group]
    const index = allowed.indexOf(orders[group])
    const next = allowed[(index + 1) % allowed.length] ?? allowed[0]
    if (next) setOrders({ ...orders, [group]: next })
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={styles.title}>{battle.enemy.name}</Text>
        <Text style={styles.line}>
          Против тебя {enemySize} · они {moraleWord(battle.enemy.morale)}
        </Text>
        <Text style={styles.line}>
          Раунд {battle.round} · твои {moraleWord(battle.morale)}
        </Text>
      </View>

      {finished ? null : (
        <>
          {GROUP_IDS.map((group: GroupId) => {
            const units = battle.groups[group]
            const size = unitsSize(units)
            if (size === 0) return null
            return (
              <Pressable key={group} onPress={() => cycle(group)} style={styles.group}>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>
                    {GROUP_LABELS[group]} · {size}
                  </Text>
                  <Text style={styles.groupUnits}>{describeUnits(units)}</Text>
                </View>
                <Text style={styles.order}>{ORDER_LABELS[orders[group]]}</Text>
              </Pressable>
            )
          })}
          <Text style={styles.hint}>Нажми на группу, чтобы сменить приказ.</Text>

          <View style={styles.actions}>
            <Button
              label="Отдать приказы"
              tone="primary"
              onPress={() => dispatch({ type: 'battleOrders', orders })}
            />
            <Button label="Отойти" tone="quiet" onPress={() => dispatch({ type: 'battleFlee' })} />
          </View>
        </>
      )}

      {finished ? (
        <View style={styles.outcome}>
          <Text style={styles.outcomeTitle}>{outcomeWord(battle.outcome)}</Text>
          {battle.outcome === 'won' ? (
            <>
              <Text style={styles.line}>
                Добыча: {battle.spoils.money} монет
                {battle.spoils.prisoners > 0 ? ` · пленных ${battle.spoils.prisoners}` : ''}
              </Text>
              {battle.spoils.prisoners > 0 ? (
                <View style={styles.actions}>
                  <Button
                    label="Продать пленных"
                    onPress={() => dispatch({ type: 'battleEnd', prisoners: 'ransom' })}
                  />
                  <Button
                    label="Взять к себе"
                    onPress={() => dispatch({ type: 'battleEnd', prisoners: 'recruit' })}
                  />
                  <Button
                    label="Отпустить"
                    tone="quiet"
                    onPress={() => dispatch({ type: 'battleEnd', prisoners: 'release' })}
                  />
                </View>
              ) : (
                <View style={styles.actions}>
                  <Button
                    label="Дальше"
                    tone="primary"
                    onPress={() => dispatch({ type: 'battleEnd', prisoners: 'release' })}
                  />
                </View>
              )}
            </>
          ) : (
            <View style={styles.actions}>
              <Button
                label="Дальше"
                tone="primary"
                onPress={() => dispatch({ type: 'battleEnd', prisoners: 'release' })}
              />
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.log}>
        {log.map((line: string, index: number) => (
          <Text key={`${index}-${line}`} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </View>
    </ScrollView>
  )
}

function describeUnits(units: Readonly<Partial<Record<TroopId, number>>>): string {
  return Object.entries(units)
    .map(([troop, count]) => `${TROOPS[troop as TroopId].label.toLowerCase()} ${count}`)
    .join(', ')
}

function outcomeWord(outcome: string): string {
  if (outcome === 'won') return 'Поле за нами'
  if (outcome === 'lost') return 'Разбиты'
  return 'Отошли'
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  head: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  title: { color: colors.text, fontSize: font.title },
  line: { color: colors.dim, fontSize: font.small },
  group: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 60,
    padding: spacing.md,
  },
  groupInfo: { flex: 1 },
  groupName: { color: colors.text, fontSize: font.body },
  groupUnits: { color: colors.faint, fontSize: font.tiny },
  order: { color: colors.gold, fontSize: font.small, textAlign: 'right' },
  hint: { color: colors.faint, fontSize: font.tiny, marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  outcome: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  outcomeTitle: { color: colors.gold, fontSize: font.heading },
  log: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  logLine: { color: colors.dim, fontSize: font.small, marginBottom: spacing.xs },
})
