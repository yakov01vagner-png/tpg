import {
  GROUP_IDS,
  GROUP_LABELS,
  type GameState,
  type GroupId,
  ORDER_LABELS,
  type OrderId,
  TERRAIN_LABELS,
  TROOPS,
  type TroopId,
  type Units,
  canApply,
  unitsSize,
} from '@tpg/engine'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Icon } from '../art/icons'
import { dispatch } from '../game/store'
import { font, lineHeight, palette, radii, spacing } from '../theme'
import { Button, Dim, Faint, Heading, Panel, Stat, Stats } from '../ui/parts'
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
 * Бой: поле, а не список.
 *
 * Сверху — враг строем: сколько и кого. Между — местность и стены. Ниже —
 * твой строй группами: знак воинов, число, приказ; нажатие меняет приказ.
 * Под строем — рассказ о прошлом раунде словами. Приказы группам, а не
 * отдельным людям (DESIGN.md, п.5).
 */
export function BattleScreen({ game }: { game: GameState }) {
  const battle = game.battle
  const [orders, setOrders] = useState<Record<GroupId, OrderId>>(DEFAULT_ORDERS)
  if (!battle) return null

  const finished = battle.outcome !== 'ongoing'
  const enemySize = unitsSize(battle.enemy.units)
  const log = [...battle.log].reverse().slice(0, 6)

  const cycle = (group: GroupId) => {
    const allowed = ORDERS_FOR[group]
    const index = allowed.indexOf(orders[group])
    const next = allowed[(index + 1) % allowed.length] ?? allowed[0]
    if (next) setOrders({ ...orders, [group]: next })
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Враг */}
      <View style={styles.enemy}>
        <View style={styles.side}>
          <Text style={styles.sideName}>{battle.enemy.name}</Text>
          <Text style={styles.sideMeta}>{`${enemySize} · ${moraleWord(battle.enemy.morale)}`}</Text>
        </View>
        <UnitsRow units={battle.enemy.units} color={palette.danger} />
      </View>

      {/* Поле */}
      <View style={styles.field}>
        <Icon name={battle.terrain} size={18} color={palette.faint} />
        <Text style={styles.fieldText}>
          {`${TERRAIN_LABELS[battle.terrain]}${
            battle.wallBonus > 1
              ? ` · их стены ×${battle.wallBonus.toFixed(1)}`
              : battle.ownWalls > 1
                ? ` · твои стены ×${battle.ownWalls.toFixed(1)}`
                : ''
          } · раунд ${battle.round}`}
        </Text>
        {battle.strain > 0 ? (
          <Text style={[styles.fieldText, battle.strain > 70 && { color: palette.danger }]}>
            {`истощение ${battle.strain}`}
          </Text>
        ) : null}
      </View>

      {/* Свой строй */}
      <View style={styles.mine}>
        <View style={styles.side}>
          <Text style={styles.sideName}>Твои</Text>
          <Text style={styles.sideMeta}>{moraleWord(battle.morale)}</Text>
        </View>
        {finished
          ? null
          : GROUP_IDS.map((group: GroupId) => {
              const units = battle.groups[group]
              const size = unitsSize(units)
              if (size === 0) return null
              return (
                <Pressable
                  accessibilityRole="button"
                  key={group}
                  onPress={() => cycle(group)}
                  style={({ pressed }) => [styles.group, pressed && styles.pressed]}
                >
                  <View style={styles.groupHead}>
                    <Text style={styles.groupName}>{GROUP_LABELS[group]}</Text>
                    <Text style={styles.groupSize}>{size}</Text>
                  </View>
                  <UnitsRow units={units} color={palette.text} />
                  <View style={styles.order}>
                    <Text style={styles.orderLabel}>{ORDER_LABELS[orders[group]]}</Text>
                    <Text style={styles.orderHint}>нажми — сменить</Text>
                  </View>
                </Pressable>
              )
            })}
      </View>

      {finished ? null : (
        <View style={styles.actions}>
          <Button
            label="Отдать приказы"
            tone="primary"
            onPress={() => dispatch({ type: 'battleOrders', orders })}
          />
          {battle.duel === 'none' ? (
            <>
              <Button
                label="Вызвать на поединок"
                onPress={() => dispatch({ type: 'duel' })}
                disabled={duelReason(game) !== null}
              />
              {duelReason(game) ? <Faint>{duelReason(game)}</Faint> : null}
            </>
          ) : (
            <Dim>{battle.duel === 'won' ? 'Поединок выигран.' : 'Поединок проигран.'}</Dim>
          )}
          <Button label="Отойти" tone="quiet" onPress={() => dispatch({ type: 'battleFlee' })} />
        </View>
      )}

      {finished ? (
        <Panel tone={battle.outcome === 'won' ? 'good' : 'danger'}>
          <Heading>{outcomeWord(battle.outcome)}</Heading>
          {battle.outcome === 'won' ? (
            <>
              <Stats>
                <Stat label="Добыча" value={`${battle.spoils.money}`} tone="gold" />
                {battle.spoils.prisoners > 0 ? (
                  <Stat label="Пленных" value={`${battle.spoils.prisoners}`} />
                ) : null}
              </Stats>
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
              <Dim>
                {battle.outcome === 'lost'
                  ? battle.stake?.type === 'defense'
                    ? 'Стены не удержали. Что стало с тобой — узнаешь, когда откроешь глаза.'
                    : 'Поле осталось за ними. Что стало с тобой — узнаешь, когда откроешь глаза.'
                  : 'Отступили. Не победа, но и не конец.'}
              </Dim>
              <Button
                label="Дальше"
                tone="primary"
                onPress={() => dispatch({ type: 'battleEnd', prisoners: 'release' })}
              />
            </View>
          )}
        </Panel>
      ) : null}

      {/* Рассказ */}
      <View style={styles.tale}>
        <Faint>ХОД БОЯ</Faint>
        {log.map((line: string, index: number) => (
          <Text key={`${index}-${line}`} style={[styles.taleLine, index === 0 && styles.taleFresh]}>
            {line}
          </Text>
        ))}
      </View>
    </ScrollView>
  )
}

/** Строй знаками: по одному знаку на вид воинов и число рядом. */
function UnitsRow({ units, color }: { units: Units; color: string }) {
  const entries = Object.entries(units).filter(([, count]) => (count ?? 0) > 0)
  return (
    <View style={styles.units}>
      {entries.map(([troop, count]) => (
        <View key={troop} style={styles.unit}>
          <Icon name={troop as TroopId} size={22} color={color} />
          <Text style={[styles.unitCount, { color }]}>{count}</Text>
          <Text style={styles.unitName}>{TROOPS[troop as TroopId].label.toLowerCase()}</Text>
        </View>
      ))}
    </View>
  )
}

function duelReason(game: GameState): string | null {
  const check = canApply(game, { type: 'duel' })
  return check.ok ? null : check.message
}

function outcomeWord(outcome: string): string {
  if (outcome === 'won') return 'Поле за нами'
  if (outcome === 'lost') return 'Разбиты'
  return 'Отошли'
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  enemy: {
    backgroundColor: palette.surface,
    borderColor: palette.danger,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  mine: {
    backgroundColor: palette.surface,
    borderColor: palette.gold,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  side: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  sideName: { color: palette.text, fontSize: font.heading, lineHeight: lineHeight.heading },
  sideMeta: { color: palette.dim, fontSize: font.small },
  field: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  fieldText: { color: palette.faint, fontSize: font.tiny },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  unit: { alignItems: 'center', minWidth: 48 },
  unitCount: { fontSize: font.body, fontWeight: '600' },
  unitName: { color: palette.faint, fontSize: 9 },
  group: {
    backgroundColor: palette.surfaceAlt,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between' },
  groupName: { color: palette.text, fontSize: font.body },
  groupSize: { color: palette.dim, fontSize: font.body },
  order: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  orderLabel: { color: palette.gold, fontSize: font.small },
  orderHint: { color: palette.faint, fontSize: 9 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  tale: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  taleLine: { color: palette.dim, fontSize: font.small, lineHeight: lineHeight.small },
  taleFresh: { color: palette.text },
})
