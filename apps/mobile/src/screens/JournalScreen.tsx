import { type GameState, formatTime } from '@tpg/engine'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, font, spacing } from '../theme'
import { Empty } from '../ui/atoms'

/** Журнал: свежее сверху — на телефоне листать вверх за историей неудобно. */
export function JournalScreen({ game }: { game: GameState }) {
  const entries = [...game.log].reverse()
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {entries.length === 0 ? <Empty text="Пока ничего не случилось." /> : null}
      {entries.map((entry, index) => (
        <View key={`${entry.time}-${index}-${entry.text}`} style={styles.entry}>
          <Text style={styles.time}>{formatTime(entry.time)}</Text>
          <Text style={styles.text}>{entry.text}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  entry: {
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  time: { color: colors.faint, fontSize: font.tiny },
  text: { color: colors.text, fontSize: font.body },
})
