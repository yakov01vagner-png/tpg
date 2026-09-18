import {
  ARCHETYPE_LABELS,
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  type Command,
  type GameState,
  MAGIC_RANKS,
  SKILLS,
  TERRAIN_LABELS,
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
  hours,
  isComplete,
  isOwnedByPlayer,
  jobsAt,
  kingdomOf,
  lordById,
  offersAt,
  plagueAt,
  roadsFrom,
  travelFatigue,
  warsOf,
} from '@tpg/engine'
import { ScrollView, StyleSheet } from 'react-native'
import { openSheet } from '../game/nav'
import { dispatch } from '../game/store'
import { spacing } from '../theme'
import { Badge, Body, Card, Dim, Empty, Panel, Row, Section, Title } from '../ui/parts'

/**
 * Здесь: место, где ты стоишь, и всё, что в нём можно сделать.
 *
 * Дом игры. Сверху — что это за место и что в нём творится; дальше дороги
 * отсюда, рынок, дела дня, владение, служба, поручения, отдых. Доступность
 * каждого пункта спрашиваем у ядра — правила живут только там.
 */
export function LocationScreen({ game }: { game: GameState }) {
  const reasonFor = (command: Command): string | null => {
    const check = canApply(game, command)
    return check.ok ? null : check.message
  }
  const schedule = (window?: TimeWindow) => (window ? ` · ${formatWindowShort(window)}` : '')

  const here = game.world.locations[game.locationId]
  const settlement = game.settlements[game.locationId]
  const people = settlement?.population ?? here?.population ?? 0
  const roads = roadsFrom(game.world, game.locationId)
  const jobs = jobsAt(game)
  const courses = coursesAt(game)
  const exams = examsAt(game)
  const sick = plagueAt(game.plagues, game.locationId)
  const hosts = game.bands.filter((band) => band.locationId === game.locationId && !band.travel)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {here ? (
        <Panel tone={sick ? 'danger' : undefined}>
          <Title>{here.name}</Title>
          <Dim>
            {`${ARCHETYPE_LABELS[here.archetype]} · ${TERRAIN_LABELS[here.terrain]} · ${
              people > 0 ? `${formatPopulation(people)} жителей` : 'заброшено'
            }`}
          </Dim>
          <Dim>{`Держит: ${ownerName(game, settlement?.owner ?? null)}`}</Dim>
          <StateLine game={game} />
        </Panel>
      ) : null}

      <Section title="Дороги отсюда">
        {roads.length === 0 ? <Empty text="Отсюда никуда не ведёт дорога." /> : null}
        {roads.map((road) => {
          const target = game.world.locations[road.to]
          if (!target) return null
          const neighbours = game.settlements[road.to]?.population ?? target.population
          const command: Command = { type: 'travel', toLocationId: road.to }
          const check = canApply(game, command)
          const danger = (game.settlements[road.to]?.banditry ?? 0) > 0.4
          const plagueThere = plagueAt(game.plagues, road.to) !== null
          return (
            <Card
              key={road.to}
              title={target.name}
              description={`${ARCHETYPE_LABELS[target.archetype]}, ${
                neighbours > 0 ? `${formatPopulation(neighbours)} жителей` : 'заброшено'
              } · усталость +${travelFatigue(road.hours)}${danger ? ' · на дороге разбой' : ''}${
                plagueThere ? ' · там мор' : ''
              }`}
              meta={formatDuration(hours(road.hours))}
              reason={check.ok ? null : check.message}
              onPress={() => dispatch(command)}
              tone={danger || plagueThere ? 'danger' : 'gold'}
            />
          )
        })}
      </Section>

      {settlement && people > 0 ? (
        <Section title="Рынок">
          <Row
            title="Торговать"
            subtitle="Товары, снаряжение, починка"
            right={<Badge text="открыть" tone="gold" />}
            onPress={() => openSheet('trade')}
          />
        </Section>
      ) : null}

      {hosts.length > 0 ? (
        <Section title="Войска здесь">
          {hosts.map((band) => {
            const lord = lordById(game.politics, band.lordId)
            const size = Object.values(band.units).reduce((sum, n) => sum + (n ?? 0), 0)
            const command: Command = { type: 'attackBand', bandId: band.id }
            const check = canApply(game, command)
            return (
              <Card
                key={band.id}
                title={lord ? `${lord.title} ${lord.name}` : 'Рать короны'}
                description={`${size} человек под знамёнами`}
                meta="напасть"
                reason={check.ok ? null : check.message}
                onPress={() => dispatch(command)}
                tone="danger"
              />
            )
          })}
        </Section>
      ) : null}

      <Section title="Работа">
        {jobs.length === 0 ? <Empty text="Здесь работы для чужака нет." /> : null}
        {jobs.map((job) => {
          const command: Command = { type: 'work', jobId: job.id }
          return (
            <Card
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
            <Card
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
            <Card
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
        <Holding game={game} reasonFor={reasonFor} />
      </Section>

      <Section title="Служба">
        <Service game={game} reasonFor={reasonFor} />
      </Section>

      <Section title="Поручения">
        <Quests game={game} reasonFor={reasonFor} />
      </Section>

      <Section title="Отдых">
        <Card
          title="Передохнуть"
          meta="1 ч"
          reason={reasonFor({ type: 'rest', hours: 1 })}
          onPress={() => dispatch({ type: 'rest', hours: 1 })}
        />
        <Card
          title="Отдыхать до вечера"
          meta="4 ч"
          reason={reasonFor({ type: 'rest', hours: 4 })}
          onPress={() => dispatch({ type: 'rest', hours: 4 })}
        />
        <Card
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

/** Что творится: сытость, разбой, мор — словами и с цветом. */
function StateLine({ game }: { game: GameState }) {
  const settlement = game.settlements[game.locationId]
  if (!settlement || settlement.population <= 0) return null
  const security = foodSecurity(settlement)
  const sick = plagueAt(game.plagues, game.locationId)
  return (
    <>
      <Dim tone={security < 0.25 ? 'danger' : security < 0.6 ? 'warn' : 'good'}>
        {security < 0.25 ? 'Голодает' : security < 0.6 ? 'Живёт впроголодь' : 'Сыто'}
        {settlement.strain > 0.4 ? ' · земля истощена' : ''}
      </Dim>
      {settlement.banditry > 0.25 ? (
        <Dim tone={settlement.banditry > 0.6 ? 'danger' : 'warn'}>
          {settlement.banditry > 0.6 ? 'На дорогах разбой' : 'На дорогах пошаливают'}
        </Dim>
      ) : null}
      {sick ? <Body tone="danger">Здесь мор. Каждый день здесь — своей волей.</Body> : null}
    </>
  )
}

function Holding({
  game,
  reasonFor,
}: {
  game: GameState
  reasonFor: (command: Command) => string | null
}) {
  const settlement = game.settlements[game.locationId]
  const here = game.world.locations[game.locationId]
  if (!settlement || !here) return <Empty text="Здесь нечем владеть." />

  if (!isOwnedByPlayer(settlement)) {
    const siege = game.siege
    if (siege?.locationId === game.locationId) {
      return (
        <>
          <Card
            title="Ждать под стенами"
            description={`Осада идёт ${siege.days} сут. В городе тает хлеб.`}
            meta="3 сут"
            reason={reasonFor({ type: 'siegeWait', days: 3 })}
            onPress={() => dispatch({ type: 'siegeWait', days: 3 })}
          />
          <Card
            title="Идти на приступ"
            description="Стены считаются в бою как оборона. Голодный гарнизон держится хуже."
            meta="штурм"
            reason={reasonFor({ type: 'siegeAssault' })}
            onPress={() => dispatch({ type: 'siegeAssault' })}
            tone="danger"
          />
          <Card title="Снять осаду" onPress={() => dispatch({ type: 'siegeLift' })} />
        </>
      )
    }
    return (
      <Card
        title="Обложить город"
        description={`Держит: ${ownerName(game, settlement.owner)}.`}
        meta="осада"
        reason={reasonFor({ type: 'besiege' })}
        onPress={() => dispatch({ type: 'besiege' })}
        tone="danger"
      />
    )
  }

  const built = settlement.buildings.map((id: BuildingId) => BUILDINGS[id].label).join(', ')
  return (
    <>
      <Panel tone="gold">
        <Body>{`Твоя земля · подать ${dailyTax(settlement, foodSecurity(settlement))} в сутки`}</Body>
        <Dim>
          {`Гарнизон ${garrisonSize(settlement)} из ${garrisonLimit(game.world, settlement)} · мест под стройку ${freeSlots(game.world, settlement)}`}
        </Dim>
        {built ? <Dim>{`Построено: ${built}`}</Dim> : null}
        {settlement.building ? (
          <Dim>
            {`Строится: ${BUILDINGS[settlement.building.id].label.toLowerCase()} — осталось ${settlement.building.daysLeft} сут.`}
          </Dim>
        ) : null}
      </Panel>
      {BUILDING_IDS.filter((id: BuildingId) => !settlement.buildings.includes(id)).map(
        (id: BuildingId) => {
          const command: Command = { type: 'build', building: id }
          const check = canApply(game, command)
          if (!check.ok && check.code === 'unavailableHere') return null
          return (
            <Card
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
      <Card
        title="Оставить людей в гарнизоне"
        description="Пятерых из отряда — держать это место."
        meta="5 чел."
        reason={reasonFor({ type: 'station', troop: 'militia', count: 5 })}
        onPress={() => dispatch({ type: 'station', troop: 'militia', count: 5 })}
      />
      <Card
        title="Забрать людей из гарнизона"
        meta="5 чел."
        reason={reasonFor({ type: 'withdraw', troop: 'militia', count: 5 })}
        onPress={() => dispatch({ type: 'withdraw', troop: 'militia', count: 5 })}
      />
    </>
  )
}

function Service({
  game,
  reasonFor,
}: {
  game: GameState
  reasonFor: (command: Command) => string | null
}) {
  const kingdom = kingdomOf(game.world, game.locationId)
  if (!kingdom) return <Empty text="Здесь некому служить." />
  if (game.service === null) {
    const command: Command = { type: 'takeService', kingdomId: kingdom.id }
    const check = canApply(game, command)
    return (
      <Card
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
      <Card
        title="Выйти навстречу врагу"
        description={
          wars.length > 0 ? `Идёт война: ${wars[0]?.reason}.` : 'Войны нет — воевать не с кем.'
        }
        meta="бой"
        reason={seekCheck.ok ? null : seekCheck.message}
        onPress={() => dispatch(seek)}
        tone="danger"
      />
      <Card
        title="Раздать хлеб"
        description="Двадцать мер из поклажи тем, кому нечего есть."
        meta="20 мер"
        reason={reasonFor({ type: 'giveFood', amount: 20 })}
        onPress={() => dispatch({ type: 'giveFood', amount: 20 })}
      />
      <Card
        title="Провозгласить своё владение"
        description="Два своих места — уже основание назваться. Прежний сюзерен это так не оставит."
        meta="своё имя"
        reason={reasonFor({ type: 'proclaimRealm', name: 'Вольное владение' })}
        onPress={() => dispatch({ type: 'proclaimRealm', name: 'Вольное владение' })}
      />
      <Card
        title="Просить землю за службу"
        description={`Слава за тобой: ${game.renown}. Нужно три победы.`}
        meta="лен"
        reason={reasonFor({ type: 'askForFief' })}
        onPress={() => dispatch({ type: 'askForFief' })}
      />
      <Card title="Оставить службу" onPress={() => dispatch({ type: 'leaveService' })} />
    </>
  )
}

function Quests({
  game,
  reasonFor,
}: {
  game: GameState
  reasonFor: (command: Command) => string | null
}) {
  const taken = game.quests
  const offers = offersAt(game)
  if (taken.length === 0 && offers.length === 0) return <Empty text="Дел для тебя здесь нет." />
  return (
    <>
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
    </>
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

/** 12400 → «12 400»: на телефоне длинные числа иначе не читаются. */
function formatPopulation(value: number): string {
  return value.toLocaleString('ru-RU').replace(/ /g, ' ')
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
})
