import {
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  CAPTIVE_FATES,
  CAPTIVE_FATE_LABELS,
  CECH_DUES,
  CONTENT,
  type Command,
  type GameState,
  LIFE,
  MAGIC_RANKS,
  PLAYER,
  SIEGE_MOVE_LABELS,
  SPOUSE_TEMPERS,
  type Settlement,
  TROOPS,
  TROOP_IDS,
  VASSAL_SHARE,
  ageOf,
  atHome,
  bentWords,
  bribePrice,
  canApply,
  canRetire,
  cechAt,
  courtCase,
  dailyTax,
  dailyTolls,
  dayOf,
  foodSecurity,
  freeSlots,
  garrisonLimit,
  garrisonSize,
  garrisonWages,
  holdingsOf,
  homeDef,
  homesAt,
  isOwnedByPlayer,
  isSite,
  kinOf,
  kingdomOf,
  lordById,
  loyaltyWord,
  ownOrder,
  rankLabel,
  rankOfShifts,
  sapLeft,
  spouseSays,
  spouseTemper,
  surrenderChance,
  upbringingOf,
  vassalsOf,
  warsOf,
} from '@tpg/engine'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Icon } from '../art/icons'
import { dispatch } from '../game/store'
import { palette, spacing } from '../theme'
import {
  Body,
  Button,
  Card,
  Dim,
  Empty,
  Faint,
  Panel,
  Row,
  Section,
  Stat,
  Stats,
} from '../ui/parts'

/**
 * Своё: земля, служба, власть.
 *
 * Лист меняется вместе с положением: на своей земле — стройка и гарнизон, под
 * чужими стенами — осада, на службе — война и лен. Одно намерение, разные дела.
 */
export function OwnSheet({ game }: { game: GameState }) {
  const reasonFor = (command: Command): string | null => {
    const check = canApply(game, command)
    return check.ok ? null : check.message
  }
  const settlement = game.settlements[game.locationId]
  const here = game.world.locations[game.locationId]
  const kingdom = kingdomOf(game.world, game.locationId)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {game.realm ? (
        <Panel tone="gold">
          <Body>{game.realm.name}</Body>
          <Dim>{`Твоё имя на карте. Слава: ${game.renown}`}</Dim>
        </Panel>
      ) : null}

      <Affairs game={game} />

      <Captives game={game} />

      <CraftSection game={game} />

      <HomeSection game={game} />

      <Section title={settlement && isOwnedByPlayer(settlement) ? 'Твоя земля' : 'Это место'}>
        {!settlement || !here ? <Empty text="Здесь нечем владеть." /> : null}
        {settlement && here && !isOwnedByPlayer(settlement) ? (
          game.siege?.locationId === game.locationId ? (
            <SiegeMoves game={game} settlement={settlement} />
          ) : (
            <Card
              title="Обложить город"
              description={`Держит: ${ownerName(game, settlement.owner)}.`}
              meta="осада"
              reason={reasonFor({ type: 'besiege' })}
              onPress={() => dispatch({ type: 'besiege' })}
              tone="danger"
            />
          )
        ) : null}
        {settlement && here && isOwnedByPlayer(settlement) ? (
          <>
            <Holding game={game} settlement={settlement} />
            {BUILDING_IDS.filter((id: BuildingId) => !settlement.buildings.includes(id)).map(
              (id: BuildingId) => {
                const command: Command = { type: 'build', building: id }
                const check = canApply(game, command)
                if (!check.ok && check.code === 'unavailableHere') return null
                return (
                  <Card
                    key={id}
                    glyph={<Icon name={id} size={20} color={palette.dim} />}
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
              glyph={<Icon name="plague" size={20} color={palette.danger} />}
              title={settlement.quarantined ? 'Ворота закрыты' : 'Закрыть ворота от мора'}
              description="Мор останется внутри и унесёт меньше; торговля встанет, а люди запомнят, кто их запер."
              meta="карантин"
              reason={reasonFor({ type: 'quarantine' })}
              onPress={() => dispatch({ type: 'quarantine' })}
              tone="danger"
            />
          </>
        ) : null}
      </Section>

      {game.realm ? <Court game={game} reasonFor={reasonFor} /> : null}

      <Section title="Служба">
        {!kingdom ? <Empty text="Здесь некому служить." /> : null}
        {kingdom && game.service === null ? (
          <Card
            title={`Пойти на службу: ${kingdom.name}`}
            description={kingdom.flavor}
            meta="жалованье и доля добычи"
            reason={reasonFor({ type: 'takeService', kingdomId: kingdom.id })}
            onPress={() => dispatch({ type: 'takeService', kingdomId: kingdom.id })}
          />
        ) : null}
        {kingdom && game.service !== null ? (
          <>
            <Card
              title="Выйти навстречу врагу"
              description={
                warsOf(game.politics, game.service).length > 0
                  ? `Идёт война: ${warsOf(game.politics, game.service)[0]?.reason}.`
                  : 'Войны нет — воевать не с кем.'
              }
              meta="бой"
              reason={reasonFor({ type: 'seekEnemy' })}
              onPress={() => dispatch({ type: 'seekEnemy' })}
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
              title="Просить землю за службу"
              description={`Слава за тобой: ${game.renown}. Нужно три победы.`}
              meta="лен"
              reason={reasonFor({ type: 'askForFief' })}
              onPress={() => dispatch({ type: 'askForFief' })}
            />
            <Card
              title="Провозгласить своё владение"
              description="Два своих места — уже основание назваться. Прежний сюзерен это так не оставит."
              meta="своё имя"
              reason={reasonFor({ type: 'proclaimRealm', name: 'Вольное владение' })}
              onPress={() => dispatch({ type: 'proclaimRealm', name: 'Вольное владение' })}
              tone="gold"
            />
            <Card title="Оставить службу" onPress={() => dispatch({ type: 'leaveService' })} />
          </>
        ) : null}
      </Section>
    </ScrollView>
  )
}

/**
 * Двор (этап 43): свои лорды, их верность, лен и суд.
 *
 * Здесь власть игрока становится делом: пожаловать место вассалу, отнять,
 * рассудить спор. Всё это — с последствиями, которые видны в тех же строках.
 */
function Court({
  game,
  reasonFor,
}: {
  game: GameState
  reasonFor: (command: Command) => string | null
}) {
  const vassals = vassalsOf(game)
  const settlement = game.settlements[game.locationId]
  const holder = settlement ? lordById(game.politics, settlement.owner ?? '') : null
  const here = game.world.locations[game.locationId]
  const pending = courtCase(game)
  return (
    <Section
      title="Двор"
      aside={vassals.length > 0 ? `вассалов ${vassals.length}` : 'без вассалов'}
    >
      {vassals.length === 0 ? (
        <Dim>Под твоей рукой пока никого: лордов зовут в «Людях», когда они тебе верят.</Dim>
      ) : null}
      {vassals.map((lord) => {
        const held = holdingsOf(game.settlements, lord.id)
        return (
          <Row
            key={lord.id}
            title={`${lord.title} ${lord.name}`}
            subtitle={`${loyaltyWord(lord.loyalty)} (${lord.loyalty}) · земли: ${held.length} · доля с неё ${Math.round(VASSAL_SHARE * 100)}%`}
            right={
              settlement && isOwnedByPlayer(settlement) && here ? (
                <Button
                  compact
                  label={`Пожаловать ${here.name}`}
                  tone="quiet"
                  disabled={
                    reasonFor({
                      type: 'grantFief',
                      lordId: lord.id,
                      locationId: game.locationId,
                    }) !== null
                  }
                  onPress={() =>
                    dispatch({ type: 'grantFief', lordId: lord.id, locationId: game.locationId })
                  }
                />
              ) : null
            }
          />
        )
      })}
      {holder && holder.kingdomId === PLAYER ? (
        <Card
          title={`Отнять ${here?.name ?? 'землю'} у ${holder.title.toLowerCase()} ${holder.name}`}
          description="Земля вернётся к тебе. Он запомнит, остальные заметят."
          meta="верность −25 у него, −5 у всех"
          reason={reasonFor({ type: 'revokeFief', locationId: game.locationId })}
          onPress={() => dispatch({ type: 'revokeFief', locationId: game.locationId })}
          tone="danger"
        />
      ) : null}
      {pending ? (
        <Panel tone="gold">
          <Body>{pending.title}</Body>
          <Dim>{pending.text}</Dim>
          {pending.choices.map((choice) => (
            <Button
              key={choice.id}
              label={`${choice.label} — ${choice.hint}`}
              disabled={
                reasonFor({ type: 'judge', caseId: pending.id, choice: choice.id }) !== null
              }
              onPress={() => dispatch({ type: 'judge', caseId: pending.id, choice: choice.id })}
            />
          ))}
          {settlement && isOwnedByPlayer(settlement) ? null : (
            <Faint>Двор держат на своей земле.</Faint>
          )}
        </Panel>
      ) : (
        <Faint>Дел на суде нет: приходят раз в месяц, на свою землю.</Faint>
      )}
    </Section>
  )
}

/**
 * Владение как хозяйство: люди, хлеб, подати и жалованье, стройка, гарнизон,
 * управляющий, постройки. Лен — не строка в сводке, а то, чем живёшь.
 */
function Holding({ game, settlement }: { game: GameState; settlement: Settlement }) {
  const security = foodSecurity(settlement)
  const tax = dailyTax(settlement, security)
  const wages = garrisonWages(settlement)
  const steward = game.companions.find(
    (one) => one.role.type === 'steward' && one.role.locationId === settlement.locationId,
  )
  const province =
    game.world.provinces[game.world.locations[settlement.locationId]?.provinceId ?? '']
  const own = (province?.locationIds ?? []).filter((id) => game.settlements[id]?.owner === PLAYER)
  const tolls = dailyTolls(game.world, game.settlements, PLAYER)
  const breadDays = Math.floor(
    (settlement.stock.grain + settlement.stock.fish) /
      Math.max(1, settlement.population * LIFE.foodPerPerson),
  )
  const troopsHere = TROOP_IDS.filter(
    (troop) => (settlement.garrison[troop] ?? 0) > 0 || (game.party.units[troop] ?? 0) > 0,
  )
  return (
    <>
      <Panel>
        <Stats>
          <Stat label="Людей" value={`${Math.round(settlement.population)}`} />
          <Stat
            label="Хлеба на"
            value={`${breadDays} сут.`}
            tone={security < 0.25 ? 'danger' : security < 0.6 ? 'warn' : 'good'}
          />
          <Stat label="Подать" value={`+${tax}`} tone="gold" />
          <Stat label="Жалованье" value={`−${wages}`} tone={wages > tax ? 'danger' : undefined} />
        </Stats>
        <Dim>
          {`Гарнизон ${garrisonSize(settlement)} из ${garrisonLimit(game.world, settlement)} · рекрутов ${Math.floor(settlement.recruits)} · разбой ${Math.round(settlement.banditry * 100)}%`}
        </Dim>
        <Dim>
          {steward
            ? `Управляющий: ${steward.name} — торг ${steward.skills.trade ?? 0}`
            : 'Управляющего нет: спутника можно поставить на это место в «Людях».'}
        </Dim>
        {tolls > 0 ? <Dim tone="gold">{`Пошлины с дорог: +${tolls} в сутки`}</Dim> : null}
        {settlement.building ? (
          <Dim tone="gold">
            {`Строится: ${BUILDINGS[settlement.building.id].label.toLowerCase()} — осталось ${settlement.building.daysLeft} сут.`}
          </Dim>
        ) : (
          <Dim>{`Мест под стройку: ${freeSlots(game.world, settlement)}`}</Dim>
        )}
      </Panel>

      <Section title={`Твоя земля: ${province?.name ?? 'провинция'}`}>
        <Dim>
          {`Мест в провинции ${(province?.locationIds.length ?? 0) + (province?.siteIds.length ?? 0)}, из них твоих ${own.length}. Провинция следует за главным местом: взяв его, берут и остальное.`}
        </Dim>
        {(province?.siteIds.length ?? 0) > 0 ? (
          <View style={styles.built}>
            {(province?.siteIds ?? []).map((id) => {
              const place = game.world.locations[id]
              if (!place || !isSite(place.archetype)) return null
              return (
                <View key={id} style={styles.builtOne}>
                  <Icon name={place.archetype} size={22} color={palette.dim} />
                  <Faint>{place.name.split(' ').slice(-1)[0]}</Faint>
                </View>
              )
            })}
          </View>
        ) : (
          <Dim>Глуши в этой провинции не записано.</Dim>
        )}
      </Section>

      {settlement.buildings.length > 0 ? (
        <View style={styles.built}>
          {settlement.buildings.map((id: BuildingId) => (
            <View key={id} style={styles.builtOne}>
              <Icon name={id} size={22} color={palette.gold} />
              <Faint>{BUILDINGS[id].label}</Faint>
            </View>
          ))}
        </View>
      ) : null}

      {troopsHere.length > 0 ? (
        <View style={styles.garrison}>
          {troopsHere.map((troop) => {
            const inGarrison = settlement.garrison[troop] ?? 0
            const withMe = game.party.units[troop] ?? 0
            const station: Command = { type: 'station', troop, count: 1 }
            const withdraw: Command = { type: 'withdraw', troop, count: 1 }
            return (
              <Row
                key={troop}
                glyph={<Icon name={troop} size={20} color={palette.dim} />}
                title={TROOPS[troop].label}
                subtitle={`на стенах ${inGarrison} · с тобой ${withMe}`}
                right={
                  <View style={styles.garrisonButtons}>
                    <Button
                      compact
                      label="−"
                      tone="quiet"
                      disabled={!canApply(game, withdraw).ok}
                      onPress={() => dispatch(withdraw)}
                    />
                    <Button
                      compact
                      label="+"
                      disabled={!canApply(game, station).ok}
                      onPress={() => dispatch(station)}
                    />
                  </View>
                }
              />
            )
          })}
        </View>
      ) : null}
    </>
  )
}

function ownerName(game: GameState, owner: string | null): string {
  if (!owner) return 'никто'
  if (owner === 'player') return 'ты'
  if (owner.startsWith('crown:'))
    return `корона (${game.world.kingdoms[owner.slice('crown:'.length)]?.name ?? '?'})`
  const lord = lordById(game.politics, owner)
  return lord ? `${lord.title} ${lord.name}` : 'неизвестно кто'
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  built: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: spacing.sm },
  builtOne: { alignItems: 'center', minWidth: 56 },
  garrison: { marginBottom: spacing.sm },
  garrisonButtons: { flexDirection: 'row', gap: spacing.xs },
})

/**
 * Свои дела в одном месте (этап 47): орден, школа, вассалы, корабли и земля
 * не теряются по листам. Каждая строка — итог, а не управление: управляют
 * там, где это происходит.
 */
function Affairs({ game }: { game: GameState }) {
  const order = ownOrder(game)
  const membership = game.guild
  const vassals = vassalsOf(game)
  const holdings = holdingsOf(game.settlements, PLAYER)
  const ships = game.enterprises.filter((one) => one.kind === 'shipping').length
  const rank = game.character.magicRank ? MAGIC_RANKS[game.character.magicRank].label : null
  const day = dayOf(game.time)
  const rows: { label: string; value: string }[] = []
  if (order && membership) {
    const owed = membership.paidUntil < day
    rows.push({
      label: order.name,
      value: `${rankLabel(order, membership.standing)}${owed ? ' · взнос просрочен' : ''}`,
    })
  }
  if (rank) rows.push({ label: 'Магия', value: rank })
  if (holdings.length > 0) {
    rows.push({
      label: 'Земля',
      value: `${holdings.length} ${holdings.length === 1 ? 'место' : holdings.length < 5 ? 'места' : 'мест'}`,
    })
  }
  if (vassals.length > 0) {
    rows.push({
      label: 'Вассалы',
      value: `${vassals.length}: ${vassals.map((lord) => `${lord.name} (${loyaltyWord(lord.loyalty)})`).join(', ')}`,
    })
  }
  if (game.ship) rows.push({ label: 'Судно', value: `«${game.ship.name}»` })
  if (ships > 0) rows.push({ label: 'Перевоз', value: `${ships} дел морем` })
  if (game.service) {
    rows.push({ label: 'Служба', value: game.world.kingdoms[game.service]?.name ?? game.service })
  }
  if (rows.length === 0) return null
  return (
    <Section title="Свои дела">
      {rows.map((row) => (
        <Row key={row.label} title={row.label} subtitle={row.value} />
      ))}
    </Section>
  )
}

/**
 * Ремесло (этап 50): цех города, свои ученики и то, чему выучился.
 */
function CraftSection({ game }: { game: GameState }) {
  const cech = cechAt(game.world, game.settlements, game.locationId)
  const workshop = game.enterprises.find(
    (one) => one.kind === 'workshop' && one.locationId === game.locationId,
  )
  const learned = Object.entries(game.craft ?? {})
    .map(([jobId, shifts]) => ({ jobId, shifts, rank: rankOfShifts(shifts) }))
    .filter((one) => one.rank.id !== 'hand')
    .sort((a, b) => b.shifts - a.shifts)
  if (!cech && !workshop && learned.length === 0) return null
  const member = game.cech
  return (
    <Section title="Ремесло" aside={member ? 'ты в цехе' : undefined}>
      {learned.slice(0, 5).map((one) => (
        <Row
          key={one.jobId}
          title={CONTENT.jobs[one.jobId]?.label ?? one.jobId}
          subtitle={`${one.rank.label} · смен ${one.shifts}`}
        />
      ))}
      {cech ? (
        <Card
          title={member?.locationId === game.locationId ? `${cech.label}: ты свой` : cech.label}
          description={
            member?.locationId === game.locationId
              ? `Взнос ${CECH_DUES} в месяц. Работа мастера в городе — для своих.`
              : `Без цеха к работе мастера здесь не встать. Вступный взнос ${CECH_DUES}.`
          }
          reason={reasonFor(
            game,
            member?.locationId === game.locationId ? { type: 'leaveCech' } : { type: 'joinCech' },
          )}
          onPress={() =>
            dispatch(
              member?.locationId === game.locationId ? { type: 'leaveCech' } : { type: 'joinCech' },
            )
          }
        />
      ) : null}
      {workshop ? (
        <Card
          title={`Мастерская: учеников ${workshop.apprentices ?? 0}`}
          description="Каждый прибавляет к обороту треть и примерно раз в месяц портит работу."
          meta="взять ученика"
          reason={reasonFor(game, { type: 'takeApprentice' })}
          onPress={() => dispatch({ type: 'takeApprentice' })}
        />
      ) : null}
    </Section>
  )
}

function reasonFor(game: GameState, command: Command): string | undefined {
  const check = canApply(game, command)
  return check.ok ? undefined : check.message
}

/**
 * Дом и семья (этап 56): свой дом, супруг с его мнением, дети и родня.
 */
function HomeSection({ game }: { game: GameState }) {
  const day = dayOf(game.time)
  const offered = homesAt(game.world, game.settlements, game.locationId)
  const family = game.character.family
  const kin = kinOf(family, day)
  if (!game.home && offered.length === 0 && !family.spouse && kin.length === 0) return null
  const def = game.home ? homeDef(game.home.kind) : null
  return (
    <Section
      title="Дом"
      aside={game.home ? (atHome(game) ? 'ты дома' : 'в другом месте') : undefined}
    >
      {def && game.home ? (
        <Row
          title={def.label}
          subtitle={`${game.world.locations[game.home.locationId]?.name ?? ''} · сложено ${Object.values(game.home.stash).reduce((sum, one) => sum + one, 0)} из ${def.storage}`}
        />
      ) : null}
      {!game.home
        ? offered.map((home) => (
            <Card
              key={home.id}
              title={home.label}
              description={home.about}
              meta={`${home.price}`}
              reason={reasonFor(game, { type: 'buyHome', kind: home.id })}
              onPress={() => dispatch({ type: 'buyHome', kind: home.id })}
            />
          ))
        : null}
      {family.spouse ? (
        <Card
          title={family.spouse.name}
          description={`«${spouseSays(game)}»`}
          meta={SPOUSE_TEMPERS[spouseTemper(family) ?? 'steady'].label}
        />
      ) : null}
      {family.children.map((child) => (
        <Card
          key={child.name}
          title={`${child.name}, ${ageOf(child.bornDay, day)} лет`}
          description={bentWords(child)}
          meta={`вложено ${upbringingOf(game, child)}`}
          reason={reasonFor(game, { type: 'teachChild', childName: child.name })}
          onPress={() => dispatch({ type: 'teachChild', childName: child.name })}
        />
      ))}
      {kin.map((one) => (
        <Card
          key={one.id}
          title={one.name}
          description={one.asks ? 'Просит помощи: у своих так заведено.' : 'Предлагает помощь.'}
          reason={reasonFor(game, { type: 'helpKin', kinId: one.id })}
          onPress={() => dispatch({ type: 'helpKin', kinId: one.id })}
        />
      ))}
      {canRetire(game, day) ? (
        <Card
          title="Уйти на покой"
          description="Передать имя и землю взрослому наследнику и дожить своё. Играть будешь за него."
          reason={reasonFor(game, { type: 'retire' })}
          onPress={() => dispatch({ type: 'retire' })}
          tone="gold"
        />
      ) : null}
    </Section>
  )
}

/**
 * Осада как дело (этап 58, Б2).
 *
 * Пять ходов вместо трёх: стоять, копать, требовать сдачи, купить ворота,
 * лезть. У каждого своя цена и свой риск, и видно, что он обещает.
 */
function SiegeMoves({ game, settlement }: { game: GameState; settlement: Settlement }) {
  const siege = game.siege
  if (!siege) return null
  const reasonFor = (command: Command): string | undefined => {
    const check = canApply(game, command)
    return check.ok ? undefined : check.message
  }
  const price = bribePrice(game, settlement)
  const chance = Math.round(surrenderChance(settlement, siege) * 100)
  return (
    <>
      <Panel tone={siege.breached ? 'gold' : undefined}>
        <Dim>
          {siege.breached
            ? `Осада идёт ${siege.days} сут. В стене пролом: приступ пойдёт вдвое легче.`
            : `Осада идёт ${siege.days} сут. Подкопа осталось ${sapLeft(siege)} сут.`}
        </Dim>
      </Panel>
      <Card
        title={SIEGE_MOVE_LABELS.wait.label}
        description={SIEGE_MOVE_LABELS.wait.about}
        meta="3 сут"
        reason={reasonFor({ type: 'siegeWait', days: 3 })}
        onPress={() => dispatch({ type: 'siegeWait', days: 3 })}
      />
      {siege.breached ? null : (
        <Card
          title={SIEGE_MOVE_LABELS.sap.label}
          description={SIEGE_MOVE_LABELS.sap.about}
          meta="3 сут"
          reason={reasonFor({ type: 'siegeSap', days: 3 })}
          onPress={() => dispatch({ type: 'siegeSap', days: 3 })}
        />
      )}
      <Card
        title={SIEGE_MOVE_LABELS.parley.label}
        description={SIEGE_MOVE_LABELS.parley.about}
        meta={`${chance} из ста`}
        reason={reasonFor({ type: 'siegeParley' })}
        onPress={() => dispatch({ type: 'siegeParley' })}
      />
      <Card
        title={SIEGE_MOVE_LABELS.bribe.label}
        description={SIEGE_MOVE_LABELS.bribe.about}
        meta={`−${price}`}
        reason={reasonFor({ type: 'siegeBribe' })}
        onPress={() => dispatch({ type: 'siegeBribe' })}
      />
      <Card
        title={SIEGE_MOVE_LABELS.assault.label}
        description={SIEGE_MOVE_LABELS.assault.about}
        meta="штурм"
        reason={reasonFor({ type: 'siegeAssault' })}
        onPress={() => dispatch({ type: 'siegeAssault' })}
        tone="danger"
      />
      <Card
        title={SIEGE_MOVE_LABELS.lift.label}
        description={SIEGE_MOVE_LABELS.lift.about}
        onPress={() => dispatch({ type: 'siegeLift' })}
      />
    </>
  )
}

/** Пленные лорды (этап 58, Б6): четыре решения, и каждое мир помнит. */
function Captives({ game }: { game: GameState }) {
  const captives = game.captives ?? []
  if (captives.length === 0) return null
  const day = dayOf(game.time)
  return (
    <Section title="Пленные">
      {captives.map((captive) => (
        <View key={captive.id}>
          <Panel>
            <Body>{`${captive.name}, ${captive.title.toLowerCase()}`}</Body>
            <Dim>{`В плену ${day - captive.since} сут. Выкуп: ${captive.ransom}.`}</Dim>
          </Panel>
          {CAPTIVE_FATES.map((fate) => (
            <Card
              key={fate}
              title={CAPTIVE_FATE_LABELS[fate].label}
              description={CAPTIVE_FATE_LABELS[fate].about}
              meta={fate === 'ransom' ? `+${captive.ransom}` : undefined}
              onPress={() => dispatch({ type: 'captiveFate', captiveId: captive.id, fate })}
              tone={fate === 'execute' ? 'danger' : undefined}
            />
          ))}
        </View>
      ))}
    </Section>
  )
}
