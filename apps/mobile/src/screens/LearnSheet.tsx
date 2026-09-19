import {
  type Command,
  type GameState,
  MAGIC_RANKS,
  MASTER_TEMPERS,
  SKILLS,
  bookById,
  booksAt,
  canApply,
  canDebate,
  canTakeStudent,
  coursesAt,
  dayOf,
  eligibleRank,
  examsAt,
  formatDuration,
  formatWindowShort,
  hasBook,
  isSelfTaught,
  masterSays,
  masterStance,
  schoolAt,
  unrecognizedGap,
} from '@tpg/engine'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { Icon } from '../art/icons'
import { dispatch } from '../game/store'
import { font, lineHeight, palette, spacing } from '../theme'
import { Card, Dim, Empty, Heading, Panel, Section } from '../ui/parts'

/** Научиться: наставники и испытания этого места. */
export function LearnSheet({ game }: { game: GameState }) {
  const reasonFor = (command: Command): string | null => {
    const check = canApply(game, command)
    return check.ok ? null : check.message
  }
  const courses = coursesAt(game)
  const exams = examsAt(game)
  const magic = game.character.skills.magic.level
  const earned = eligibleRank(magic)
  const gap = unrecognizedGap(magic, game.character.magicRank)
  // Школа — место и человек (этап 40): кто здесь принимает и как к тебе относится.
  const school = schoolAt(game.world, game.locationId)
  const stance = school ? masterStance(game, school) : null
  const selfTaught = isSelfTaught(game)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {gap > 0 && earned ? (
        <Panel tone="gold">
          <Dim tone="gold">
            {`Сила обгоняет титул: по навыку тянешь на «${MAGIC_RANKS[earned].label}», но признания нет. Ищи школу.`}
          </Dim>
        </Panel>
      ) : null}

      {school ? (
        <Section title="Школа">
          <Panel tone={stance === 'refuses' || stance === 'absent' ? 'danger' : undefined}>
            <Heading>{school.name}</Heading>
            <Dim>{school.tradition}</Dim>
            <Dim>
              {`Глава — ${school.master.name}, ${MAGIC_RANKS[school.master.rank].label.toLowerCase()}, ${MASTER_TEMPERS[school.master.temper].label}. ${MASTER_TEMPERS[school.master.temper].flavor}`}
            </Dim>
            <Dim>{`Выше «${MAGIC_RANKS[school.topRank].label}» здесь не присваивают.`}</Dim>
            <Text
              style={styles.speech}
            >{`${school.master.name}: «${masterSays(game, school, dayOf(game.time))}»`}</Text>
            {selfTaught ? (
              <Dim tone="gold">Ты самоучка: школа примет, но спросит строже и возьмёт вдвое.</Dim>
            ) : null}
          </Panel>
        </Section>
      ) : null}

      <Section title="Наставники">
        {courses.length === 0 ? <Empty text="Учиться здесь не у кого — это не то место." /> : null}
        {courses.map((course) => {
          const command: Command = { type: 'study', courseId: course.id }
          return (
            <Card
              key={course.id}
              glyph={<Icon name={course.skill} size={20} color={palette.good} />}
              title={course.label}
              description={course.description}
              meta={`${formatDuration(course.durationMinutes)} · −${course.cost} · ${SKILLS[course.skill].label}${course.window ? ` · ${formatWindowShort(course.window)}` : ''}`}
              reason={reasonFor(command)}
              onPress={() => dispatch(command)}
              tone="good"
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
            <Card
              key={exam.id}
              glyph={<Icon name="magic" size={20} color={palette.gold} />}
              title={exam.label}
              description={exam.description}
              meta={`${formatDuration(exam.durationMinutes)} · −${exam.cost} · ${MAGIC_RANKS[exam.rank].label}`}
              reason={reasonFor(command)}
              onPress={() => dispatch(command)}
            />
          )
        })}
      </Section>
      <Books game={game} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  speech: {
    color: palette.dim,
    fontSize: font.small,
    fontStyle: 'italic',
    lineHeight: lineHeight.small,
    marginTop: spacing.sm,
  },
})

/**
 * Книги, споры и ученики (этап 55): то, что есть в школе помимо испытаний.
 */
function Books({ game }: { game: GameState }) {
  const sold = booksAt(game)
  const mine = Object.entries(game.books ?? {})
  const student = game.student
  if (sold.length === 0 && mine.length === 0 && !canDebate(game)) return null
  return (
    <Section title="Книги и учение">
      {canDebate(game) ? (
        <Card
          title="Поспорить в школе"
          description="Ученики и магистры спорят о том, чего никто не знает наверняка. Проигравший узнаёт больше."
          meta="3 ч"
          reason={reasonOf(game, { type: 'debate' })}
          onPress={() => dispatch({ type: 'debate' })}
        />
      ) : null}
      {student ? (
        <Card
          title={`Твой ученик: ${student.name}`}
          description={`Учится ${student.learned} суток. Кормить и учить — твоё дело.`}
        />
      ) : canTakeStudent(game).can ? (
        <Card
          title="Взять ученика"
          description="Учить может магистр и выше. Он пойдёт следом и однажды уйдёт своей дорогой."
          reason={reasonOf(game, { type: 'takeStudent' })}
          onPress={() => dispatch({ type: 'takeStudent' })}
        />
      ) : null}
      {mine.map(([id, state]) => {
        const book = bookById(id)
        if (!book) return null
        return (
          <Card
            key={id}
            title={book.label}
            description={state.read ? book.about : `Прочитано ${state.days} из ${book.days} суток.`}
            meta={state.read ? 'прочитана' : 'читать день'}
            reason={state.read ? undefined : reasonOf(game, { type: 'readBook', bookId: id })}
            onPress={state.read ? undefined : () => dispatch({ type: 'readBook', bookId: id })}
          />
        )
      })}
      {sold
        .filter((book) => !hasBook(game, book.id))
        .map((book) => (
          <Card
            key={book.id}
            title={book.label}
            description={book.about}
            meta={`${book.price} · ${book.days} суток чтения`}
            reason={reasonOf(game, { type: 'buyBook', bookId: book.id })}
            onPress={() => dispatch({ type: 'buyBook', bookId: book.id })}
          />
        ))}
    </Section>
  )
}

function reasonOf(game: GameState, command: Command): string | undefined {
  const check = canApply(game, command)
  return check.ok ? undefined : check.message
}
