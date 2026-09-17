import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '../theme'

/**
 * Пункт списка дел. Цена действия видна до нажатия, причина отказа — тоже:
 * игрок не должен тыкать наугад, чтобы узнать, почему нельзя.
 */
export function ActionCard({
  title,
  description,
  meta,
  reason,
  onPress,
}: {
  title: string
  description?: string
  meta: string
  reason?: string | null
  onPress: () => void
}) {
  const blocked = Boolean(reason)
  return (
    <Pressable
      accessibilityRole="button"
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [styles.card, blocked && styles.blocked, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  blocked: { opacity: 0.55 },
  pressed: { backgroundColor: colors.surfaceAlt },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { color: colors.text, flexShrink: 1, fontSize: font.heading },
  meta: { color: colors.gold, fontSize: font.small },
  description: { color: colors.dim, fontSize: font.small, marginTop: spacing.xs },
  reason: { color: colors.danger, fontSize: font.small, marginTop: spacing.sm },
})
