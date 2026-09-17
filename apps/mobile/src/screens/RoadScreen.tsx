import {
  ARCHETYPE_LABELS,
  type Command,
  type GameState,
  TERRAIN_LABELS,
  addressOf,
  canApply,
  foodSecurity,
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
  const settlement = game.settlements[game.locationId]
  const roads = roadsFrom(game.world, game.locationId)
  // Население и сытость берём живые: деревня могла обезлюдеть, пока ты ходил.
  const people = settlement?.population ?? here?.population ?? 0
  const fed = settlement ? wellFed(foodSecurity(settlement)) : null

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {here ? (
        <View style={styles.here}>
          <Text style={styles.hereName}>{here.name}</Text>
          <Text style={styles.hereMeta}>
            {ARCHETYPE_LABELS[here.archetype]} · {TERRAIN_LABELS[here.terrain]} ·{' '}
            {people > 0 ? `${formatPopulation(people)} жителей` : 'заброшено'}
          </Text>
          {fed ? <Text style={fed.style}>{fed.label}</Text> : null}
          {settlement && settlement.banditry > 0.25 ? (
            <Text style={settlement.banditry > 0.6 ? styles.hungry : styles.lean}>
              {settlement.banditry > 0.6 ? 'На дорогах разбой' : 'На дорогах пошаливают'}
            </Text>
          ) : null}
          <Text style={styles.hereAddress}>{addressOf(game.world, game.locationId)}</Text>
        </View>
      ) : null}

      <Section title="Дороги отсюда">
        {roads.length === 0 ? <Empty text="Отсюда никуда не ведёт дорога." /> : null}
        {roads.map((road) => {
          const target = game.world.locations[road.to]
          if (!target) return null
          const neighbours = game.settlements[road.to]?.population ?? target.population
          const command: Command = { type: 'travel', toLocationId: road.to }
          const check = canApply(game, command)
          return (
            <ActionCard
              key={road.to}
              title={target.name}
              description={`${ARCHETYPE_LABELS[target.archetype]}, ${neighbours > 0 ? `${formatPopulation(neighbours)} жителей` : 'заброшено'} · усталость +${travelFatigue(road.hours)}`}
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

/**
 * Сытость словами: число обеспеченности игроку ничего не скажет, а «голодает»
 * скажет сразу — и объяснит, почему тут втридорога просят за зерно.
 */
function wellFed(security: number): { label: string; style: object } {
  if (security < 0.25) return { label: 'Голодает', style: styles.hungry }
  if (security < 0.6) return { label: 'Живёт впроголодь', style: styles.lean }
  return { label: 'Сыто', style: styles.fed }
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
  fed: { color: colors.good, fontSize: font.small, marginTop: spacing.xs },
  lean: { color: colors.gold, fontSize: font.small, marginTop: spacing.xs },
  hungry: { color: colors.danger, fontSize: font.small, marginTop: spacing.xs },
})
