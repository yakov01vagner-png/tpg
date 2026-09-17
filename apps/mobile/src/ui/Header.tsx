import { type ClockSpeed, FATIGUE_MAX, type GameState, addressOf } from '@tpg/engine'
import { StyleSheet, Text, View } from 'react-native'
import { colors, font, spacing } from '../theme'
import { ClockBar } from './ClockBar'
import { Meter } from './atoms'

export function Header({ game, speed }: { game: GameState; speed: ClockSpeed }) {
  const hero = game.character
  const points = hero.unspentSkillPoints + hero.unspentAttributePoints
  const here = game.world.locations[game.locationId]
  return (
    <View style={styles.box}>
      {here ? (
        <View style={styles.row}>
          <Text numberOfLines={1} style={styles.place}>
            {here.name}
          </Text>
          <Text numberOfLines={1} style={styles.address}>
            {addressOf(game.world, game.locationId).split(' · ')[0]}
          </Text>
        </View>
      ) : null}
      <ClockBar game={game} speed={speed} />
      <View style={styles.row}>
        <Text style={styles.money}>{hero.money} монет</Text>
        <Text style={styles.level}>
          Уровень {hero.level}
          {points > 0 ? `  ·  +${points}` : ''}
        </Text>
      </View>
      <View style={styles.row}>
        <Meter value={hero.fatigue} max={FATIGUE_MAX} label="Усталость" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  time: { color: colors.text, flex: 1, fontSize: font.heading },
  money: { color: colors.gold, fontSize: font.heading },
  level: { color: colors.dim, fontSize: font.small },
  place: { color: colors.text, flex: 1, fontSize: font.body },
  address: { color: colors.faint, flexShrink: 1, fontSize: font.tiny },
})
