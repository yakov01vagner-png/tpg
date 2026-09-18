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
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { dispatch } from '../game/store'
import { font, lineHeight, palette, spacing } from '../theme'
import { Button, Dim, Faint, Heading, Panel, Row, Stat, Stats, Title } from '../ui/parts'
import { moraleWord } from './PeopleScreen'

/** Приказы, которые имеет смысл давать конкретной группе. */
const ORDERS_FOR: Record<GroupId, readonly OrderId[]> = {
  vanguard: ['hold', 'charge', 'fallBack'],
  archers: ['shoot', 'hold', 'fallBack'],
  flank: ['flank', 'charge', 'hold'],
  reserve: ['hold', 'charge', 'fallBack'],
  mages: ['fireball', 'curse', 'ward'],
}

const DEFAULT_ORDERS: Record<GroupId, OrderId> = {
  vanguard: 'hold',
  archers: 'shoot',
  flank: 'flank',
  reserve: 'hold',
  mages: 'fireball',
}

/**
 * Бой: приказы группам, а не отдельным людям (DESIGN.md, п.5).
 *
 * Раунд — это выбор: видно, кто чем занят, что делает враг и во что обошёлся
 * прошлый раунд. Строй и рассказ раундами — этап 13; здесь бой ложится на общий
 * язык, чтобы к тому этапу было куда класть.
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
      <Panel tone="danger">
        <Title>{battle.enemy.name}</Title>
        <Stats>
          <Stat label="Против тебя" value={`${enemySize}`} />
          <Stat label="Они" value={moraleWord(battle.enemy.morale)} />
          <Stat label="Раунд" value={`${battle.round}`} />
          <Stat label="Твои" value={moraleWord(battle.morale)} />
        </Stats>
        {battle.strain > 0 ? (
          <Dim tone={battle.strain > 70 ? 'danger' : undefined}>
            {`Истощение круга: ${battle.strain}${battle.strain > 70 ? ' — колдовать опасно' : ''}`}
          </Dim>
        ) : null}
      </Panel>

      {finished ? null : (
        <>
          {GROUP_IDS.map((group: GroupId) => {
            const units = battle.groups[group]
            const size = unitsSize(units)
            if (size === 0) return null
            return (
              <Row
                key={group}
                title={`${GROUP_LABELS[group]} · ${size}`}
                subtitle={describeUnits(units)}
                right={<Text style={styles.order}>{ORDER_LABELS[orders[group]]}</Text>}
                onPress={() => cycle(group)}
              />
            )
          })}
          <Faint>Нажми на группу, чтобы сменить приказ.</Faint>

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
        <Panel tone={battle.outcome === 'won' ? 'good' : 'danger'}>
          <Heading>{outcomeWord(battle.outcome)}</Heading>
          {battle.outcome === 'won' ? (
            <>
              <Dim>
                {`Добыча: ${battle.spoils.money} монет${
                  battle.spoils.prisoners > 0 ? ` · пленных ${battle.spoils.prisoners}` : ''
                }`}
              </Dim>
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
        </Panel>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  order: { color: palette.gold, fontSize: font.small, textAlign: 'right' },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  log: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  logLine: {
    color: palette.dim,
    fontSize: font.small,
    lineHeight: lineHeight.small,
    marginBottom: spacing.xs,
  },
})
