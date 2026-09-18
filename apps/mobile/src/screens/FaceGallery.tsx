import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { COMPANION_FACES, Portrait } from '../art/portrait'
import { font, palette, spacing } from '../theme'

/** Галерея лиц — для проверки стиля, в игре не показывается. */
export function FaceGallery() {
  const kingdoms = ['reEstiz', 'robl', 'boharut', 'durHazad', 'tribes']
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Спутники</Text>
      <View style={styles.grid}>
        {Object.keys(COMPANION_FACES).map((id) => (
          <View key={id} style={styles.cell}>
            <Portrait seed={id} size={96} overrides={COMPANION_FACES[id]} />
            <Text style={styles.label}>{id}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.title}>Лорды по коронам и возраст</Text>
      <View style={styles.grid}>
        {kingdoms.map((kingdom) =>
          [25, 50, 68].map((age) => (
            <View key={`${kingdom}-${age}`} style={styles.cell}>
              <Portrait seed={`lord:${kingdom}:1`} size={96} age={age} kingdomId={kingdom} />
              <Text style={styles.label}>{`${kingdom} · ${age}`}</Text>
            </View>
          )),
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  title: { color: palette.dim, fontSize: font.small, marginVertical: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 8,
    padding: spacing.sm,
  },
  label: { color: palette.faint, fontSize: 9, marginTop: spacing.xs },
})
