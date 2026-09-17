import {
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  type Command,
  type GameState,
  MAGIC_RANKS,
  SKILLS,
  type TimeWindow,
  canApply,
  coursesAt,
  dailyTax,
  describeQuest,
  examsAt,
  foodSecurity,
  formatDuration,
  formatWindowShort,
  freeSlots,
  garrisonLimit,
  garrisonSize,
  isComplete,
  isOwnedByPlayer,
  jobsAt,
  kingdomOf,
  lordById,
  offersAt,
  warsOf,
} from '@tpg/engine'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { dispatch } from '../game/store'
import { colors, font, radius, spacing } from '../theme'
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
  const jobs = jobsAt(game)
  const courses = coursesAt(game)
  const exams = examsAt(game)

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

      <Section title="Владение">
        {(() => {
          const settlement = game.settlements[game.locationId]
          const here = game.world.locations[game.locationId]
          if (!settlement || !here) return <Empty text="Здесь нечем владеть." />

          if (!isOwnedByPlayer(settlement)) {
            // Чужое место: можно осаждать, если с его хозяином война.
            const siege = game.siege
            if (siege?.locationId === game.locationId) {
              return (
                <>
                  <ActionCard
                    title="Ждать под стенами"
                    description={`Осада идёт ${siege.days} сут. В городе тает хлеб.`}
                    meta="3 сут"
                    reason={reasonFor({ type: 'siegeWait', days: 3 })}
                    onPress={() => dispatch({ type: 'siegeWait', days: 3 })}
                  />
                  <ActionCard
                    title="Идти на приступ"
                    description="Стены считаются в бою как оборона. Голодный гарнизон держится хуже."
                    meta="штурм"
                    reason={reasonFor({ type: 'siegeAssault' })}
                    onPress={() => dispatch({ type: 'siegeAssault' })}
                  />
                  <ActionCard
                    title="Снять осаду"
                    meta=""
                    onPress={() => dispatch({ type: 'siegeLift' })}
                  />
                </>
              )
            }
            const owner = ownerName(game, settlement.owner)
            return (
              <ActionCard
                title="Обложить город"
                description={`Держит: ${owner}.`}
                meta="осада"
                reason={reasonFor({ type: 'besiege' })}
                onPress={() => dispatch({ type: 'besiege' })}
              />
            )
          }

          const built = settlement.buildings.map((id: BuildingId) => BUILDINGS[id].label).join(', ')
          return (
            <>
              <View style={styles.holding}>
                <Text style={styles.holdingLine}>
                  Твоя земля · подать {dailyTax(settlement, foodSecurity(settlement))} в сутки
                </Text>
                <Text style={styles.holdingDim}>
                  Гарнизон {garrisonSize(settlement)} из {garrisonLimit(game.world, settlement)} ·
                  свободных мест под стройку {freeSlots(game.world, settlement)}
                </Text>
                {built ? <Text style={styles.holdingDim}>Построено: {built}</Text> : null}
                {settlement.building ? (
                  <Text style={styles.holdingDim}>
                    Строится: {BUILDINGS[settlement.building.id].label.toLowerCase()} — осталось{' '}
                    {settlement.building.daysLeft} сут.
                  </Text>
                ) : null}
              </View>

              {BUILDING_IDS.filter((id: BuildingId) => !settlement.buildings.includes(id)).map(
                (id: BuildingId) => {
                  const command: Command = { type: 'build', building: id }
                  const check = canApply(game, command)
                  if (!check.ok && check.code === 'unavailableHere') return null
                  return (
                    <ActionCard
                      key={id}
                      title={BUILDINGS[id].label}
                      description={BUILDINGS[id].description}
                      meta={`${BUILDINGS[id].cost} монет · ${BUILDINGS[id].days} сут`}
                      reason={check.ok ? null : check.message}
                      onPress={() => dispatch(command)}
                    />
                  )
                },
              )}

              <ActionCard
                title="Оставить людей в гарнизоне"
                description="Пятерых из отряда — держать это место."
                meta="5 чел."
                reason={reasonFor({ type: 'station', troop: 'militia', count: 5 })}
                onPress={() => dispatch({ type: 'station', troop: 'militia', count: 5 })}
              />
              <ActionCard
                title="Забрать людей из гарнизона"
                meta="5 чел."
                reason={reasonFor({ type: 'withdraw', troop: 'militia', count: 5 })}
                onPress={() => dispatch({ type: 'withdraw', troop: 'militia', count: 5 })}
              />
            </>
          )
        })()}
      </Section>

      <Section title="Служба">
        {(() => {
          const kingdom = kingdomOf(game.world, game.locationId)
          if (!kingdom) return <Empty text="Здесь некому служить." />
          if (game.service === null) {
            const command: Command = { type: 'takeService', kingdomId: kingdom.id }
            const check = canApply(game, command)
            return (
              <ActionCard
                title={`Пойти на службу: ${kingdom.name}`}
                description={kingdom.flavor}
                meta="жалованье и доля добычи"
                reason={check.ok ? null : check.message}
                onPress={() => dispatch(command)}
              />
            )
          }
          const wars = warsOf(game.politics, game.service)
          const seek: Command = { type: 'seekEnemy' }
          const seekCheck = canApply(game, seek)
          return (
            <>
              <ActionCard
                title="Выйти навстречу врагу"
                description={
                  wars.length > 0
                    ? `Идёт война: ${wars[0]?.reason}.`
                    : 'Войны нет — воевать не с кем.'
                }
                meta="бой"
                reason={seekCheck.ok ? null : seekCheck.message}
                onPress={() => dispatch(seek)}
              />
              <ActionCard
                title="Раздать хлеб"
                description="Двадцать мер из поклажи тем, кому нечего есть."
                meta="20 мер"
                reason={reasonFor({ type: 'giveFood', amount: 20 })}
                onPress={() => dispatch({ type: 'giveFood', amount: 20 })}
              />
              <ActionCard
                title="Провозгласить своё владение"
                description="Два своих места — уже основание назваться. Прежний сюзерен это так не оставит."
                meta="своё имя"
                reason={reasonFor({ type: 'proclaimRealm', name: 'Вольное владение' })}
                onPress={() => dispatch({ type: 'proclaimRealm', name: 'Вольное владение' })}
              />
              <ActionCard
                title="Просить землю за службу"
                description={`Слава за тобой: ${game.renown}. Нужно три победы.`}
                meta="лен"
                reason={reasonFor({ type: 'askForFief' })}
                onPress={() => dispatch({ type: 'askForFief' })}
              />
              <ActionCard
                title="Оставить службу"
                meta=""
                onPress={() => dispatch({ type: 'leaveService' })}
              />
            </>
          )
        })()}
      </Section>

      <Section title="Поручения">
        {(() => {
          const taken = game.quests
          const offers = offersAt(game)
          if (taken.length === 0 && offers.length === 0) {
            return <Empty text="Дел для тебя здесь нет." />
          }
          return (
            <>
              {taken.map((quest) => {
                const done = isComplete(game, quest)
                return (
                  <ActionCard
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
                  />
                )
              })}
              {offers.map((quest) => (
                <ActionCard
                  key={quest.id}
                  title={describeQuest(game, quest)}
                  description="Просят здесь. Срок ограничен."
                  meta={`${quest.reward} монет`}
                  reason={reasonFor({ type: 'takeQuest', questId: quest.id })}
                  onPress={() => dispatch({ type: 'takeQuest', questId: quest.id })}
                />
              ))}
            </>
          )
        })()}
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

/** Кто держит место: корона, лорд или ты сам. */
function ownerName(game: GameState, owner: string | null): string {
  if (!owner) return 'никто'
  if (owner === 'player') return 'ты'
  if (owner.startsWith('crown:')) {
    return `корона (${game.world.kingdoms[owner.slice('crown:'.length)]?.name ?? '?'})`
  }
  const lord = lordById(game.politics, owner)
  return lord ? `${lord.title} ${lord.name}` : 'неизвестно кто'
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  holding: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  holdingLine: { color: colors.text, fontSize: font.body },
  holdingDim: { color: colors.dim, fontSize: font.small },
})
