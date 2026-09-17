import {
  ARCHETYPE_LABELS,
  type Command,
  type GameState,
  TERRAIN_LABELS,
  addressOf,
  canApply,
  formatDuration,
  hours,
  roadsFrom,
  travelFatigue,
} from '@tpg/engine'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { dispatch } from '../game/store'
import { colors, font, radius, spacing } from '../theme'
import { ActionCard } from '../ui/ActionCard'
import { Empty, Section } from '../ui/atoms'

/**
 * Дорога: где ты и куда отсюда можно уйти.
 *
 * Ходить можно только к соседу по дороге — дальний путь складывается из
 * нескольких переходов, поэтому список коротких и понятных вариантов честнее
 * карты с зумом (DESIGN.md, п.10).
 */
export function RoadScreen({ game }: { game: GameState }) {
  const here = game.world.locations[game.locationId]
  const roads = roadsFrom(game.world, game.locationId)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {here ? (
        <View style={styles.here}>
          <Text style={styles.hereName}>{here.name}</Text>
          <Text style={styles.hereMeta}>
            {ARCHETYPE_LABELS[here.archetype]} · {TERRAIN_LABELS[here.terrain]} ·{' '}
            {formatPopulation(here.population)} жителей
          </Text>
          <Text style={styles.hereAddress}>{addressOf(game.world, game.locationId)}</Text>
        </View>
      ) : null}

      <Section title="Дороги отсюда">
        {roads.length === 0 ? <Empty text="Отсюда никуда не ведёт дорога." /> : null}
        {roads.map((road) => {
          const target = game.world.locations[road.to]
          if (!target) return null
          const command: Command = { type: 'travel', toLocationId: road.to }
          const check = canApply(game, command)
          return (
            <ActionCard
              key={road.to}
              title={target.name}
              description={`${ARCHETYPE_LABELS[target.archetype]}, ${formatPopulation(target.population)} жителей · усталость +${travelFatigue(road.hours)}`}
              meta={formatDuration(hours(road.hours))}
              reason={check.ok ? null : check.message}
              onPress={() => dispatch(command)}
            />
          )
        })}
      </Section>
    </ScrollView>
  )
}

/** 12400 → «12 400»: на телефоне длинные числа иначе не читаются. */
function formatPopulation(value: number): string {
  return value.toLocaleString('ru-RU').replace(/ /g, ' ')
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  here: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    marginBottom: spacing.xl,
    padding: spacing.md,
  },
  hereName: { color: colors.text, fontSize: font.title },
  hereMeta: { color: colors.dim, fontSize: font.small, marginTop: spacing.xs },
  hereAddress: { color: colors.faint, fontSize: font.tiny, marginTop: spacing.sm },
})
