import { FATIGUE_MAX, type GameState, formatTime } from '@tpg/engine'
import { StyleSheet, Text, View } from 'react-native'
import { colors, font, spacing } from '../theme'
import { Meter } from './atoms'

export function Header({ game }: { game: GameState }) {
  const hero = game.character
  const points = hero.unspentSkillPoints + hero.unspentAttributePoints
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={styles.time}>{formatTime(game.time)}</Text>
        <Text style={styles.money}>{hero.money} монет</Text>
      </View>
      <View style={styles.row}>
        <Meter value={hero.fatigue} max={FATIGUE_MAX} label="Усталость" />
        <Text style={styles.level}>
          Уровень {hero.level}
          {points > 0 ? `  ·  +${points}` : ''}
        </Text>
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
})
