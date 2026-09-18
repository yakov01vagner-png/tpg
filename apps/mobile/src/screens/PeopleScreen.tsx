import {
  COMPANION_RANSOM,
  type Command,
  type Companion,
  type GameState,
  PLAYER,
  TEMPERS,
  TROOPS,
  TROOP_IDS,
  type TroopId,
  canApply,
  companionsAt,
  dailyFood,
  dailyWages,
  dayOf,
  isSettlement,
  lordById,
  lordSays,
  matchesAt,
  partyCapacity,
  partySize,
  partyStrength,
  troopCount,
} from '@tpg/engine'
import { ScrollView, StyleSheet } from 'react-native'
import { Icon } from '../art/icons'
import { COMPANION_FACES, Portrait } from '../art/portrait'
import { dispatch } from '../game/store'
import { palette, spacing } from '../theme'
import { Badge, Button, Card, Dim, Empty, Panel, Row, Section, Stat, Stats } from '../ui/parts'

/**
 * Люди: кого ведёшь и кто идёт с тобой.
 *
 * Отряд и спутники — на одном экране, потому что это один вопрос: кто со мной.
 * Главное в отряде — не состав, а расход: жалованье и еда в сутки. Отряд
 * должен читаться как обязательство, а не как приз.
 */
export function PeopleScreen({ game }: { game: GameState }) {
  const party = game.party
  const size = partySize(party)
  const wages = dailyWages(party)
  const food = dailyFood(party)
  const stores = (game.character.inventory.grain ?? 0) + (game.character.inventory.fish ?? 0)
  const daysOfFood = food > 0 ? Math.floor(stores / food) : null
  const settlement = game.settlements[game.locationId]
  const here = game.world.locations[game.locationId]

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel tone={daysOfFood !== null && daysOfFood < 3 ? 'danger' : undefined}>
        <Stats>
          <Stat label="Под началом" value={size > 0 ? `${size}` : 'ты один'} />
          {size > 0 ? <Stat label="В сутки" value={`${wages} монет · ${food} еды`} /> : null}
          {size > 0 ? (
            <Stat
              label="Еды хватит"
              value={daysOfFood === null ? '—' : daysOfFood === 0 ? 'нет' : `${daysOfFood} сут.`}
              tone={daysOfFood !== null && daysOfFood < 3 ? 'danger' : undefined}
            />
          ) : null}
          {size > 0 ? (
            <Stat label="Дух" value={`${moraleWord(party.morale)} · ${party.morale}`} />
          ) : null}
          {size > 0 ? <Stat label="Сила" value={`${partyStrength(party)}`} /> : null}
          <Stat label="Поклажа до" value={`${partyCapacity(game.character, party)}`} />
        </Stats>
        {size === 0 ? <Dim>Наёмных людей можно взять там, где они есть.</Dim> : null}
      </Panel>

      {game.bands.some((band) => band.locationId === game.locationId && !band.travel) ? (
        <Section title="Войско у ворот">
          {game.bands
            .filter((band) => band.locationId === game.locationId && !band.travel)
            .map((band) => {
              const lord = lordById(game.politics, band.lordId)
              const count = Object.values(band.units).reduce((sum, n) => sum + (n ?? 0), 0)
              const command: Command = { type: 'attackBand', bandId: band.id }
              const check = canApply(game, command)
              const here = game.settlements[game.locationId]
              const atOurWalls =
                here?.owner === PLAYER &&
                band.goal.type === 'siege' &&
                band.goal.targetId === game.locationId
              return (
                <Card
                  key={band.id}
                  glyph={
                    lord ? (
                      <Portrait seed={lord.id} size={36} age={45} kingdomId={lord.kingdomId} />
                    ) : (
                      <Icon name="army" size={22} color={palette.danger} />
                    )
                  }
                  title={lord ? `${lord.title} ${lord.name}` : 'Рать короны'}
                  description={
                    atOurWalls
                      ? `${count} человек под твоими стенами — гарнизон встанет с тобой`
                      : `${count} человек под знамёнами`
                  }
                  meta={atOurWalls ? 'оборонять стены' : 'напасть'}
                  reason={check.ok ? null : check.message}
                  onPress={() => dispatch(command)}
                  tone="danger"
                />
              )
            })}
        </Section>
      ) : null}

      {matchesAt(game).length > 0 ? (
        <Section title="Дом лорда">
          {matchesAt(game).map((lord) => {
            const command: Command = { type: 'proposeMarriage', lordId: lord.id }
            const check = canApply(game, command)
            return (
              <Card
                key={lord.id}
                glyph={<Portrait seed={lord.id} size={36} age={48} kingdomId={lord.kingdomId} />}
                title={`Посвататься к дому ${lord.name}`}
                description={`«${lordSays(game, lord, dayOf(game.time))}» Брак — это союз и приданое. Дом смотрит на славу и на то, что о тебе помнят.`}
                meta="сватовство"
                reason={check.ok ? null : check.message}
                onPress={() => dispatch(command)}
                tone="gold"
              />
            )
          })}
        </Section>
      ) : null}

      <Section title="Спутники">
        {game.companions.length === 0 ? (
          <Empty text="Ты идёшь один. Именных людей встречают в городах и обителях." />
        ) : (
          game.companions.map((companion) => (
            <Row
              key={companion.id}
              glyph={
                <Portrait seed={companion.id} size={36} overrides={COMPANION_FACES[companion.id]} />
              }
              title={companion.name}
              subtitle={`${TEMPERS[companion.temper]?.label ?? ''} · ${companion.captive ? 'в плену' : roleWord(companion.role)}`}
              right={
                <>
                  <Badge text={moodWord(companion.mood)} tone={moodTone(companion.mood)} />
                  {companion.captive ? (
                    <Button
                      compact
                      label={`Выкуп ${COMPANION_RANSOM}`}
                      disabled={
                        !canApply(game, { type: 'ransomCompanion', companionId: companion.id }).ok
                      }
                      onPress={() =>
                        dispatch({ type: 'ransomCompanion', companionId: companion.id })
                      }
                    />
                  ) : companion.role.type !== 'party' ? (
                    <Button
                      compact
                      label="Вернуть"
                      onPress={() =>
                        dispatch({
                          type: 'assignCompanion',
                          companionId: companion.id,
                          role: { type: 'party' },
                        })
                      }
                    />
                  ) : (
                    <Button
                      compact
                      label="Отпустить"
                      tone="quiet"
                      onPress={() =>
                        dispatch({ type: 'dismissCompanion', companionId: companion.id })
                      }
                    />
                  )}
                </>
              }
            />
          ))
        )}
      </Section>

      <Section title="Кого можно позвать">
        {companionsAt(game).length === 0 ? (
          <Empty text="Здесь таких людей не встретишь." />
        ) : (
          companionsAt(game).map((def) => {
            const command: Command = { type: 'recruitCompanion', companionId: def.id }
            const check = canApply(game, command)
            return (
              <Card
                key={def.id}
                glyph={<Portrait seed={def.id} size={36} overrides={COMPANION_FACES[def.id]} />}
                title={def.name}
                meta={`${def.fee} монет`}
                description={`${def.story} Нрав: ${TEMPERS[def.temper]?.label ?? ''}.`}
                reason={check.ok ? null : check.message}
                onPress={() => dispatch(command)}
              />
            )
          })
        )}
      </Section>

      {size > 0 ? (
        <Section title="Под началом">
          {TROOP_IDS.filter((troop) => troopCount(party, troop) > 0).map((troop: TroopId) => (
            <Row
              key={troop}
              glyph={<Icon name={troop} size={22} color={palette.dim} />}
              title={TROOPS[troop].label}
              subtitle={`${troopCount(party, troop)} чел. · ${TROOPS[troop].wage} монет в сутки каждому`}
              right={
                <Button
                  compact
                  label="Распустить"
                  tone="quiet"
                  onPress={() => dispatch({ type: 'disband', troop, count: 1 })}
                />
              }
            />
          ))}
        </Section>
      ) : null}

      <Section
        title="Набор"
        aside={settlement ? `готовых идти ${Math.floor(settlement.recruits)}` : undefined}
      >
        {TROOP_IDS.map((troop: TroopId) => {
          const def = TROOPS[troop]
          const command: Command = { type: 'hire', troop, count: 1 }
          const check = canApply(game, command)
          // Тех, кого тут не бывает вовсе, не показываем: это шум.
          if (!here || !isSettlement(here.archetype) || !def.where.includes(here.archetype))
            return null
          return (
            <Card
              key={troop}
              glyph={<Icon name={troop} size={20} color={palette.dim} />}
              title={def.label}
              description={def.description}
              meta={`${def.hireCost} монет · ${def.wage}/сут`}
              reason={check.ok ? null : check.message}
              onPress={() => dispatch(command)}
            />
          )
        })}
        {here ? null : <Empty text="Здесь никого не нанять." />}
      </Section>
    </ScrollView>
  )
}

/** Расположение спутника словом: число само по себе игроку ничего не говорит. */
function moodWord(mood: number): string {
  if (mood >= 75) return 'предан'
  if (mood >= 50) return 'доволен'
  if (mood >= 30) return 'холоден'
  return 'вот-вот уйдёт'
}

function moodTone(mood: number): 'good' | 'neutral' | 'warn' | 'danger' {
  if (mood >= 75) return 'good'
  if (mood >= 50) return 'neutral'
  if (mood >= 30) return 'warn'
  return 'danger'
}

function roleWord(role: Companion['role']): string {
  if (role.type === 'steward') return 'управляет владением'
  if (role.type === 'factor') return 'ведёт дело'
  return 'идёт с тобой'
}

export function moraleWord(morale: number): string {
  if (morale >= 75) return 'рвутся в бой'
  if (morale >= 50) return 'спокойны'
  if (morale >= 30) return 'ропщут'
  return 'вот-вот разбегутся'
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
})
