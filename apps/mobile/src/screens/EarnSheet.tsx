import {
  type AttributeId,
  CARAVAN_COST,
  CRAFT_MASTERS,
  type Command,
  GOODS,
  type GameState,
  SKILLS,
  type SkillId,
  WORKSHOP_COST,
  canApply,
  carried,
  chainDef,
  chainsOfferedAt,
  currentStep,
  describeQuest,
  formatDate,
  formatDuration,
  formatWindowShort,
  isComplete,
  jobsAt,
  masterOf,
  masterPay,
  nextCraftRank,
  offersAt,
  rankOfShifts,
  shiftsOf,
} from '@tpg/engine'
import { ScrollView, StyleSheet } from 'react-native'
import { Icon } from '../art/icons'
import { Portrait } from '../art/portrait'
import { dispatch } from '../game/store'
import { palette, spacing } from '../theme'
import { Button, Card, Dim, Empty, Section } from '../ui/parts'

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
      {jobs.length === 0 ? (
        <Section title="Работа">
          <Empty text="Здесь работы для чужака нет." />
        </Section>
      ) : null}
      {groupJobs(jobs).map(([attribute, group]) => (
        <Section key={attribute} title={`Работа ${GROUP_TITLES[attribute]}`}>
          {group.map((job) => {
            const command: Command = { type: 'work', jobId: job.id }
            // Ступень выучки и хозяин работы (этап 50): платят по ступени, а
            // берут — по тому, что мастер о тебе видит.
            const shifts = shiftsOf(game, job.id)
            const rank = rankOfShifts(shifts)
            const master = masterOf(game.locationId, job)
            const ahead = nextCraftRank(shifts)
            const pay = Math.round(job.pay * rank.pay * masterPay(master))
            return (
              <Card
                key={job.id}
                glyph={<Icon name={mainSkill(job.practice)} size={20} color={palette.dim} />}
                title={job.label}
                description={`${job.description}\n${master.name}, ${CRAFT_MASTERS[master.temper].label}. Ты ${rank.label}${ahead ? `, до ступени «${ahead.rank.label}» ещё ${ahead.left} смен` : ''}.`}
                meta={`${formatDuration(job.durationMinutes)} · +${pay}${job.window ? ` · ${formatWindowShort(job.window)}` : ''}`}
                reason={reasonFor(command)}
                onPress={() => dispatch(command)}
              />
            )
          })}
        </Section>
      ))}

      <Section title="Люди просят">
        {game.chains.length === 0 && chainsOfferedAt(game).length === 0 ? (
          <Empty text="Здесь к тебе никто не подошёл." />
        ) : null}
        {game.chains.map((progress) => {
          const chain = chainDef(progress.chainId)
          const step = currentStep(progress)
          if (!chain) return null
          return (
            <Card
              key={chain.id}
              glyph={
                <Portrait
                  seed={chain.giver.seed}
                  size={36}
                  age={44}
                  kingdomId={chain.giver.kingdomId ?? null}
                />
              }
              title={chain.title}
              description={step ? step.text : 'Сделано.'}
              meta={`${chain.giver.name} · шаг ${progress.step + 1} из ${chain.steps.length}`}
              tone="gold"
            />
          )
        })}
        {chainsOfferedAt(game).map((chain) => {
          const command: Command = { type: 'startChain', chainId: chain.id }
          return (
            <Card
              key={chain.id}
              glyph={
                <Portrait
                  seed={chain.giver.seed}
                  size={36}
                  age={44}
                  kingdomId={chain.giver.kingdomId ?? null}
                />
              }
              title={chain.title}
              description={chain.intro}
              meta={`${chain.giver.name} · ${chain.reward.money} монет`}
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
                  : quest.type === 'bringFood' || quest.type === 'fairGoods'
                    ? `Привезено ${quest.progress} из ${quest.amount}.`
                    : 'Ещё не сделано.'
              }
              meta={`${quest.reward} · до ${formatDate(quest.deadlineDay)}`}
              reason={reasonFor({ type: 'finishQuest', questId: quest.id })}
              onPress={() => dispatch({ type: 'finishQuest', questId: quest.id })}
              tone={done ? 'good' : 'gold'}
            />
          )
        })}
        {taken.map((quest) => {
          const good = quest.type === 'fairGoods' ? quest.good : undefined
          if (!good || isComplete(game, quest) || quest.issuerLocationId !== game.locationId) {
            return null
          }
          const amount = Math.min(quest.amount - quest.progress, carried(game.character, good))
          const command = { type: 'deliverGoods' as const, good, amount: Math.max(1, amount) }
          return (
            <Button
              key={`hand:${quest.id}`}
              label={`Сдать к ярмарке: ${GOODS[good].label.toLowerCase()} (${amount})`}
              tone="quiet"
              disabled={amount <= 0 || !canApply(game, command).ok}
              onPress={() => dispatch(command)}
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

/**
 * Работы сгруппированы по тому, что они дают: по атрибуту главного навыка.
 * Тринадцать карточек превращаются в три-четыре вопроса — «чем заработать?».
 */
const GROUP_TITLES: Record<AttributeId, string> = {
  strength: 'силой',
  agility: 'ловкостью',
  endurance: 'выносливостью',
  mind: 'умом',
  will: 'волей',
  charisma: 'словом',
}

type Job = ReturnType<typeof jobsAt>[number]

function groupJobs(jobs: readonly Job[]): [AttributeId, Job[]][] {
  const groups = new Map<AttributeId, Job[]>()
  for (const job of jobs) {
    const attribute = SKILLS[mainSkill(job.practice)].attribute
    const list = groups.get(attribute)
    if (list) list.push(job)
    else groups.set(attribute, [job])
  }
  return [...groups.entries()]
}

/** Знак работы — навык, который она качает сильнее всего. */
function mainSkill(practice: Readonly<Partial<Record<SkillId, number>>>): SkillId {
  let best: SkillId = 'hardLabour'
  let most = -1
  for (const [skill, amount] of Object.entries(practice)) {
    if ((amount ?? 0) > most) {
      most = amount ?? 0
      best = skill as SkillId
    }
  }
  return best
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
})
