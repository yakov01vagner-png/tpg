import {
  type Command,
  type GameState,
  TROOPS,
  TROOP_IDS,
  type TroopId,
  canApply,
  dailyFood,
  dailyWages,
  partyCapacity,
  partySize,
  partyStrength,
  troopCount,
} from '@tpg/engine'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { dispatch } from '../game/store'
import { colors, font, radius, spacing } from '../theme'
import { ActionCard } from '../ui/ActionCard'
import { Button, Empty, Section } from '../ui/atoms'

/**
 * Отряд: кого ведёшь и во что это обходится.
 *
 * Главное на экране — не состав, а расход: жалованье и еда в сутки. Отряд
 * должен читаться как обязательство, а не как приз.
 */
export function PartyScreen({ game }: { game: GameState }) {
  const party = game.party
  const size = partySize(party)
  const wages = dailyWages(party)
  const food = dailyFood(party)
  const stores = (game.character.inventory.grain ?? 0) + (game.character.inventory.fish ?? 0)
  const daysOfFood = food > 0 ? Math.floor(stores / food) : null
  const settlement = game.settlements[game.locationId]

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <Text style={styles.headline}>{size > 0 ? `${size} под твоим началом` : 'Ты один'}</Text>
        {size > 0 ? (
          <>
            <Text style={styles.line}>
              В сутки: {wages} монет и {food} мер еды
            </Text>
            <Text style={daysOfFood !== null && daysOfFood < 3 ? styles.warning : styles.line}>
              {daysOfFood === null
                ? 'Еды не нужно'
                : daysOfFood === 0
                  ? 'Еды нет — завтра начнут расходиться'
                  : `Еды хватит на ${daysOfFood} сут.`}
            </Text>
            <Text style={styles.line}>
              Дух: {moraleWord(party.morale)} ({party.morale}) · сила {partyStrength(party)}
            </Text>
            <Text style={styles.line}>Поклажа: до {partyCapacity(game.character, party)}</Text>
          </>
        ) : (
          <Text style={styles.line}>Наёмных людей можно взять там, где они есть.</Text>
        )}
      </View>

      {size > 0 ? (
        <Section title="Под началом">
          {TROOP_IDS.filter((troop) => troopCount(party, troop) > 0).map((troop: TroopId) => (
            <View key={troop} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{TROOPS[troop].label}</Text>
                <Text style={styles.meta}>
                  {troopCount(party, troop)} чел. · {TROOPS[troop].wage} монет в сутки каждому
                </Text>
              </View>
              <Button
                label="Распустить"
                tone="quiet"
                onPress={() => dispatch({ type: 'disband', troop, count: 1 })}
              />
            </View>
          ))}
        </Section>
      ) : null}

      <Section
        title={`Набор${settlement ? ` · готовых идти ${Math.floor(settlement.recruits)}` : ''}`}
      >
        {TROOP_IDS.map((troop: TroopId) => {
          const def = TROOPS[troop]
          const command: Command = { type: 'hire', troop, count: 1 }
          const check = canApply(game, command)
          // Тех, кого тут не бывает вовсе, не показываем: это шум.
          const here = game.world.locations[game.locationId]
          if (!here || !def.where.includes(here.archetype)) return null
          return (
            <ActionCard
              key={troop}
              title={def.label}
              description={def.description}
              meta={`${def.hireCost} монет · ${def.wage}/сут`}
              reason={check.ok ? null : check.message}
              onPress={() => dispatch(command)}
            />
          )
        })}
        {game.world.locations[game.locationId] ? null : <Empty text="Здесь никого не нанять." />}
      </Section>
    </ScrollView>
  )
}

export function moraleWord(morale: number): string {
  if (morale >= 75) return 'рвутся в бой'
  if (morale >= 50) return 'спокойны'
  if (morale >= 30) return 'ропщут'
  return 'вот-вот разбегутся'
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  headline: { color: colors.text, fontSize: font.title },
  line: { color: colors.dim, fontSize: font.small },
  warning: { color: colors.danger, fontSize: font.small },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowInfo: { flex: 1 },
  name: { color: colors.text, fontSize: font.body },
  meta: { color: colors.faint, fontSize: font.tiny },
})
