import {
  COMPANION_RANSOM,
  COURT_ROLES,
  type Command,
  type Companion,
  type GameState,
  LORD_TEMPERS,
  PLAYER,
  TEMPERS,
  TONES,
  TOURNEY_FEE,
  TROOPS,
  TROOP_IDS,
  type TroopId,
  canApply,
  companionsAt,
  courtOf,
  dailyFood,
  dailyWages,
  dayOf,
  denounceTargets,
  favourOf,
  favourWord,
  intriguesFor,
  isSettlement,
  lordById,
  lordHere,
  lordSays,
  lordTemper,
  matchesAt,
  partyCapacity,
  partySize,
  partyStrength,
  peopleAt,
  receptionFor,
  speakersAt,
  talkedTo,
  topicsFor,
  troopCount,
  wishDone,
  wishOf,
  wishShare,
} from '@tpg/engine'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Icon } from '../art/icons'
import { COMPANION_FACES, Portrait } from '../art/portrait'
import { dispatch } from '../game/store'
import { palette, spacing } from '../theme'
import {
  Badge,
  Button,
  Card,
  Chip,
  Dim,
  Empty,
  Panel,
  Row,
  Section,
  Stat,
  Stats,
} from '../ui/parts'

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

      <Folk game={game} />

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

      <Talk game={game} />

      <CastleCourt game={game} />

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
              subtitle={`${TEMPERS[companion.temper]?.label ?? ''} · ${companion.captive ? 'в плену' : roleWord(companion.role)}${wishLine(companion)}`}
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
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  faces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  faceCell: { width: 72, alignItems: 'center', gap: 2 },
  faceName: { color: palette.text, fontSize: 12 },
  faceRole: { color: palette.faint, fontSize: 10 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
})

/**
 * Двор лорда (этап 52): кто при нём, как он принимает и что при дворе можно
 * затеять.
 */
function CastleCourt({ game }: { game: GameState }) {
  const lord = lordHere(game)
  if (!lord) return null
  const court = courtOf(game, lord)
  const favour = favourOf(game, lord.id)
  const reception = receptionFor(game, lord, 0)
  const temper = LORD_TEMPERS[lordTemper(lord)]
  return (
    <Section title={`${lord.title} ${lord.name}`} aside={favourWord(favour)}>
      <Dim>{`${temper.label} · ${reception.admits ? `примут, ждать ${reception.waitHours} ч` : `не примут: нужен дар ${reception.gift}`}`}</Dim>
      <View style={styles.faces}>
        {court.map((one) => (
          <View key={one.id} style={styles.faceCell}>
            <Portrait seed={one.id} size={44} age={one.role === 'heir' ? 20 : 45} />
            <Text numberOfLines={1} style={styles.faceName}>
              {one.name}
            </Text>
            <Text style={styles.faceRole}>{COURT_ROLES[one.role].label}</Text>
          </View>
        ))}
      </View>
      <Card
        title={reception.admits ? 'Просить приёма' : `Просить приёма с даром ${reception.gift}`}
        description={`«${reception.says}»`}
        reason={reasonOf(game, {
          type: 'seekAudience',
          lordId: lord.id,
          gift: reception.admits ? 0 : reception.gift,
        })}
        onPress={() =>
          dispatch({
            type: 'seekAudience',
            lordId: lord.id,
            gift: reception.admits ? 0 : reception.gift,
          })
        }
      />
      {intriguesFor(game, lord).map((one) => (
        <Card
          key={one.id}
          title={one.label}
          description={one.description}
          meta={one.cost > 0 ? `${one.cost}` : undefined}
          reason={reasonOf(game, {
            type: 'courtIntrigue',
            lordId: lord.id,
            kind: one.id,
            ...(one.id === 'denounce'
              ? { targetId: denounceTargets(game, lord)[0]?.id ?? '' }
              : {}),
          })}
          onPress={() =>
            dispatch({
              type: 'courtIntrigue',
              lordId: lord.id,
              kind: one.id,
              ...(one.id === 'denounce'
                ? { targetId: denounceTargets(game, lord)[0]?.id ?? '' }
                : {}),
            })
          }
        />
      ))}
      <Card
        title="Выйти на турнир"
        description="Взнос, копьё и кошель победителю. Проигравшего поднимают с земли."
        meta={`${TOURNEY_FEE}`}
        reason={reasonOf(game, { type: 'tourney', lordId: lord.id })}
        onPress={() => dispatch({ type: 'tourney', lordId: lord.id })}
      />
      <Card
        title="Просить суда"
        description="Пожаловаться на обиду, нанесённую на его земле. Решает он."
        reason={reasonOf(game, { type: 'petition', lordId: lord.id })}
        onPress={() => dispatch({ type: 'petition', lordId: lord.id })}
      />
    </Section>
  )
}

function reasonOf(game: GameState, command: Command): string | undefined {
  const check = canApply(game, command)
  return check.ok ? undefined : check.message
}

/**
 * Разговор (этап 53): с кем здесь можно говорить и о чём. Тема — это вопрос,
 * а не реплика; ответ приходит в летопись словами собеседника.
 */
function Talk({ game }: { game: GameState }) {
  const [open, setOpen] = useState<string | null>(null)
  const speakers = speakersAt(game)
  if (speakers.length === 0) return null
  return (
    <Section title="Поговорить" aside={`${speakers.length}`}>
      {speakers.map((speaker) => {
        const topics = topicsFor(game, speaker)
        const patience = TONES[speaker.tone].patience - talkedTo(game, speaker.id)
        return (
          <View key={speaker.id}>
            <Card
              glyph={<Portrait seed={speaker.id} size={36} age={40} />}
              title={speaker.name}
              description={`${speaker.about} · говорит ${TONES[speaker.tone].label}`}
              meta={patience > 0 ? `${topics.length} тем` : 'наговорился'}
              onPress={() => setOpen(open === speaker.id ? null : speaker.id)}
            />
            {open === speaker.id ? (
              <View style={styles.topics}>
                {topics.map((topic) => (
                  <Chip
                    key={topic.id}
                    label={topic.label}
                    active={false}
                    onPress={() =>
                      dispatch({ type: 'talk', speakerId: speaker.id, topicId: topic.id })
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>
        )
      })}
    </Section>
  )
}

/** Чего спутник хочет и сколько до этого осталось (этап 54). */
function wishLine(companion: Companion): string {
  const wish = wishOf(companion)
  if (!wish) return ''
  if (wishDone(companion)) return ` · ${wish.label}: сделано`
  const share = Math.round(wishShare(companion) * 100)
  return ` · ${wish.label}${share > 0 ? ` (${share}%)` : ''}`
}

/**
 * Кто здесь есть (этап 71, У1).
 *
 * Один список на всех: купец, мастер, лекарь, священник, лорд с двором, братья,
 * свой управляющий, свой караванщик, шкипер, отшельник. До сих пор каждый экран
 * собирал своих, и человек выглядел по-разному в зависимости от того, с какой
 * стороны на него смотрят.
 */
function Folk({ game }: { game: GameState }) {
  const people = peopleAt(game)
  if (people.length === 0) return null
  return (
    <Section title="Кто здесь есть" aside={`${people.length}`}>
      {people.map((one) => (
        <Row
          key={one.id}
          glyph={<Portrait seed={one.id} size={34} age={40} />}
          title={one.name}
          subtitle={`${one.about} · ${one.attitude}${one.says ? ` — «${one.says}»` : ''}`}
        />
      ))}
    </Section>
  )
}
