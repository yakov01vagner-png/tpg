import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { TabId } from '../game/nav'
import { font, palette, spacing } from '../theme'

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'here', label: 'Здесь' },
  { id: 'map', label: 'Карта' },
  { id: 'people', label: 'Люди' },
  { id: 'hero', label: 'Герой' },
  { id: 'journal', label: 'Журнал' },
]

/**
 * Вкладки внизу: до них дотягивается большой палец (DESIGN.md, п.10).
 *
 * Пять, а не шесть: торг ушёл под «Здесь» (он про это место), дороги — туда
 * же, сводка мира — под карту. Вкладка — это то, куда возвращаются, а не всё,
 * что в игре есть.
 */
export function TabBar({
  active,
  onSelect,
  attention,
}: {
  active: TabId
  onSelect: (tab: TabId) => void
  /** Вкладки, на которых что-то ждёт: очки навыков, новое в журнале. */
  attention?: ReadonlySet<TabId>
}) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const selected = tab.id === active
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            style={styles.tab}
          >
            <View style={[styles.mark, selected && styles.markActive]} />
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
            {attention?.has(tab.id) ? <View style={styles.dot} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: palette.bg,
    borderTopColor: palette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingTop: spacing.xs,
  },
  mark: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    height: 3,
    marginBottom: spacing.xs,
    width: 20,
  },
  markActive: { backgroundColor: palette.gold },
  label: { color: palette.faint, fontSize: font.tiny },
  labelActive: { color: palette.gold, fontWeight: '600' },
  dot: {
    backgroundColor: palette.gold,
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    right: '28%',
    top: 10,
    width: 6,
  },
})
