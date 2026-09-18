import {
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  type Command,
  type GameState,
  LIFE,
  PLAYER,
  type Settlement,
  TROOPS,
  TROOP_IDS,
  canApply,
  dailyTax,
  dailyTolls,
  foodSecurity,
  freeSlots,
  garrisonLimit,
  garrisonSize,
  garrisonWages,
  isOwnedByPlayer,
  isSite,
  kingdomOf,
  lordById,
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

      <Section title={settlement && isOwnedByPlayer(settlement) ? 'Твоя земля' : 'Это место'}>
        {!settlement || !here ? <Empty text="Здесь нечем владеть." /> : null}
        {settlement && here && !isOwnedByPlayer(settlement) ? (
          game.siege?.locationId === game.locationId ? (
            <>
              <Card
                title="Ждать под стенами"
                description={`Осада идёт ${game.siege.days} сут. В городе тает хлеб.`}
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
          <Stat label="Людей" value={`${settlement.population}`} />
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
