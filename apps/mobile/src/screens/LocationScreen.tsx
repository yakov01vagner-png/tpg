import {
  type Command,
  type GameState,
  MAGIC_RANKS,
  SKILLS,
  type TimeWindow,
  canApply,
  coursesAt,
  examsAt,
  formatDuration,
  formatWindowShort,
  jobsAt,
} from '@tpg/engine'
import { ScrollView, StyleSheet } from 'react-native'
import { dispatch } from '../game/store'
import { spacing } from '../theme'
import { ActionCard } from '../ui/ActionCard'
import { Empty, Section } from '../ui/atoms'

/**
 * Экран города: списки дел вместо карты (DESIGN.md, п.10).
 * Доступность каждого пункта спрашиваем у ядра — правила живут только там.
 */
export function LocationScreen({ game }: { game: GameState }) {
  const reasonFor = (command: Command): string | null => {
    const check = canApply(game, command)
    return check.ok ? null : check.message
  }

  // Расписание показываем только там, где оно не дневное, — иначе шум.
  const schedule = (window?: TimeWindow) => (window ? ` · ${formatWindowShort(window)}` : '')

  // Список дел — не весь контент игры, а то, что водится именно здесь.
  const jobs = jobsAt(game.world, game.locationId)
  const courses = coursesAt(game.world, game.locationId)
  const exams = examsAt(game.world, game.locationId)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="Работа">
        {jobs.length === 0 ? <Empty text="Здесь работы для чужака нет." /> : null}
        {jobs.map((job) => {
          const command: Command = { type: 'work', jobId: job.id }
          return (
            <ActionCard
              key={job.id}
              title={job.label}
              description={job.description}
              meta={`${formatDuration(job.durationMinutes)} · +${job.pay}${schedule(job.window)}`}
              reason={reasonFor(command)}
              onPress={() => dispatch(command)}
            />
          )
        })}
      </Section>

      <Section title="Наставники">
        {courses.length === 0 ? <Empty text="Учиться здесь не у кого — это не то место." /> : null}
        {courses.map((course) => {
          const command: Command = { type: 'study', courseId: course.id }
          return (
            <ActionCard
              key={course.id}
              title={course.label}
              description={course.description}
              meta={`${formatDuration(course.durationMinutes)} · −${course.cost} · ${SKILLS[course.skill].label}${schedule(course.window)}`}
              reason={reasonFor(command)}
              onPress={() => dispatch(command)}
            />
          )
        })}
      </Section>

      <Section title="Испытания">
        {exams.length === 0 ? (
          <Empty text="Ранги присваивают там, где есть школа. Здесь её нет." />
        ) : null}
        {exams.map((exam) => {
          const command: Command = { type: 'takeExam', examId: exam.id }
          return (
            <ActionCard
              key={exam.id}
              title={exam.label}
              description={exam.description}
              meta={`${formatDuration(exam.durationMinutes)} · −${exam.cost} · ${MAGIC_RANKS[exam.rank].label}`}
              reason={reasonFor(command)}
              onPress={() => dispatch(command)}
            />
          )
        })}
      </Section>

      <Section title="Отдых">
        <ActionCard
          title="Передохнуть"
          meta="1 ч"
          reason={reasonFor({ type: 'rest', hours: 1 })}
          onPress={() => dispatch({ type: 'rest', hours: 1 })}
        />
        <ActionCard
          title="Отдыхать до вечера"
          meta="4 ч"
          reason={reasonFor({ type: 'rest', hours: 4 })}
          onPress={() => dispatch({ type: 'rest', hours: 4 })}
        />
        <ActionCard
          title="Спать до утра"
          description="Снимает усталость полностью."
          meta="до 06:00"
          reason={reasonFor({ type: 'sleep' })}
          onPress={() => dispatch({ type: 'sleep' })}
        />
      </Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
})
