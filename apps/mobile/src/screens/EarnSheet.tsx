import {
  CARAVAN_COST,
  type Command,
  type GameState,
  WORKSHOP_COST,
  canApply,
  describeQuest,
  formatDuration,
  formatWindowShort,
  isComplete,
  jobsAt,
  offersAt,
} from '@tpg/engine'
import { ScrollView, StyleSheet } from 'react-native'
import { dispatch } from '../game/store'
import { spacing } from '../theme'
import { Card, Dim, Empty, Section } from '../ui/parts'

/**
 * Заработать: всё, что здесь приносит деньги.
 *
 * Работа руками, поручения и дело, которое кормит без тебя, — на одном листе,
 * потому что вопрос у игрока один. Доступность спрашиваем у ядра.
 */
export function EarnSheet({ game }: { game: GameState }) {
  const reasonFor = (command: Command): string | null => {
    const check = canApply(game, command)
    return check.ok ? null : check.message
  }
  const jobs = jobsAt(game)
  const offers = offersAt(game)
  const taken = game.quests

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="Работа">
        {jobs.length === 0 ? <Empty text="Здесь работы для чужака нет." /> : null}
        {jobs.map((job) => {
          const command: Command = { type: 'work', jobId: job.id }
          return (
            <Card
              key={job.id}
              title={job.label}
              description={job.description}
              meta={`${formatDuration(job.durationMinutes)} · +${job.pay}${job.window ? ` · ${formatWindowShort(job.window)}` : ''}`}
              reason={reasonFor(command)}
              onPress={() => dispatch(command)}
            />
          )
        })}
      </Section>

      <Section title="Поручения">
        {taken.length === 0 && offers.length === 0 ? (
          <Empty text="Дел для тебя здесь нет." />
        ) : null}
        {taken.map((quest) => {
          const done = isComplete(game, quest)
          return (
            <Card
              key={quest.id}
              title={describeQuest(game, quest)}
              description={
                done
                  ? 'Сделано. Пора за наградой.'
                  : quest.type === 'bringFood'
                    ? `Привезено ${quest.progress} из ${quest.amount}.`
                    : 'Ещё не сделано.'
              }
              meta={`${quest.reward} · до ${quest.deadlineDay} дня`}
              reason={reasonFor({ type: 'finishQuest', questId: quest.id })}
              onPress={() => dispatch({ type: 'finishQuest', questId: quest.id })}
              tone={done ? 'good' : 'gold'}
            />
          )
        })}
        {offers.map((quest) => (
          <Card
            key={quest.id}
            title={describeQuest(game, quest)}
            description="Просят здесь. Срок ограничен."
            meta={`${quest.reward} монет`}
            reason={reasonFor({ type: 'takeQuest', questId: quest.id })}
            onPress={() => dispatch({ type: 'takeQuest', questId: quest.id })}
          />
        ))}
      </Section>

      <Section title="Дело, которое кормит">
        <Dim>Доход, который идёт без тебя. Караван пускают с карты — туда, куда есть дорога.</Dim>
        <Card
          title="Открыть мастерскую"
          description="Сырьё в товар по местным ценам. Осада или голод — и она встала."
          meta={`${WORKSHOP_COST} монет`}
          reason={reasonFor({ type: 'foundWorkshop' })}
          onPress={() => dispatch({ type: 'foundWorkshop' })}
        />
        <Card
          title="Снарядить караван"
          description={`${CARAVAN_COST} монет. Выбери на карте место, куда ему ходить.`}
          meta="с карты"
        />
      </Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
})
