import {
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  type Command,
  type GameState,
  canApply,
  dailyTax,
  foodSecurity,
  freeSlots,
  garrisonLimit,
  garrisonSize,
  isOwnedByPlayer,
  kingdomOf,
  lordById,
  warsOf,
} from '@tpg/engine'
import { ScrollView, StyleSheet } from 'react-native'
import { Icon } from '../art/icons'
import { dispatch } from '../game/store'
import { palette, spacing } from '../theme'
import { Body, Card, Dim, Empty, Panel, Section } from '../ui/parts'

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
            <Panel>
              <Body>{`Подать ${dailyTax(settlement, foodSecurity(settlement))} в сутки`}</Body>
              <Dim>
                {`Гарнизон ${garrisonSize(settlement)} из ${garrisonLimit(game.world, settlement)} · мест под стройку ${freeSlots(game.world, settlement)}`}
              </Dim>
              {settlement.buildings.length > 0 ? (
                <Dim>{`Построено: ${settlement.buildings.map((id: BuildingId) => BUILDINGS[id].label).join(', ')}`}</Dim>
              ) : null}
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
})
