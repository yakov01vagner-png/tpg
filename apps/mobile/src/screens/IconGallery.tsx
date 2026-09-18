import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ICON_NAMES, Icon } from '../art/icons'
import { font, palette, spacing } from '../theme'

/**
 * Галерея знаков — только для проверки стиля, в игре не показывается.
 * Каждый знак в трёх размерах: если не читается в 16 — вычёркивать.
 */
export function IconGallery() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {ICON_NAMES.map((name) => (
          <View key={name} style={styles.cell}>
            <View style={styles.sizes}>
              <Icon name={name} size={16} color={palette.text} />
              <Icon name={name} size={24} color={palette.gold} />
              <Icon name={name} size={32} color={palette.dim} />
            </View>
            <Text style={styles.label}>{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 8,
    padding: spacing.sm,
    width: 88,
  },
  sizes: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  label: { color: palette.faint, fontSize: 9, marginTop: spacing.xs },
})
