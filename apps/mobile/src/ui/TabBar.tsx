import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, spacing } from '../theme'

export type TabId = 'location' | 'road' | 'character' | 'journal'

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'location', label: 'Дела' },
  { id: 'road', label: 'Дорога' },
  { id: 'character', label: 'Герой' },
  { id: 'journal', label: 'Журнал' },
]

/** Вкладки внизу экрана: до них дотягивается большой палец (DESIGN.md, п.10). */
export function TabBar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab.id === active }}
          key={tab.id}
          onPress={() => onSelect(tab.id)}
          style={styles.tab}
        >
          <Text style={[styles.label, tab.id === active && styles.labelActive]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  tab: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 56 },
  label: { color: colors.faint, fontSize: font.small },
  labelActive: { color: colors.gold, fontWeight: '600' },
})
