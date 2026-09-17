import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { bootstrap, dismissNotice, useAppState } from './src/game/store'
import { CharacterScreen } from './src/screens/CharacterScreen'
import { CreateCharacterScreen } from './src/screens/CreateCharacterScreen'
import { JournalScreen } from './src/screens/JournalScreen'
import { LocationScreen } from './src/screens/LocationScreen'
import { colors, font, spacing } from './src/theme'
import { Header } from './src/ui/Header'
import { TabBar, type TabId } from './src/ui/TabBar'

export default function App() {
  const state = useAppState()
  const [tab, setTab] = useState<TabId>('location')

  useEffect(() => {
    void bootstrap()
  }, [])

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root}>
        {state.phase === 'loading' ? <Text style={styles.loading}>Загрузка…</Text> : null}

        {state.phase === 'create' ? <CreateCharacterScreen error={state.error} /> : null}

        {state.phase === 'play' ? (
          <>
            <Header game={state.game} />
            <View style={styles.body}>
              {tab === 'location' ? <LocationScreen game={state.game} /> : null}
              {tab === 'character' ? <CharacterScreen game={state.game} /> : null}
              {tab === 'journal' ? <JournalScreen game={state.game} /> : null}
            </View>
            {state.notice ? (
              <Pressable onPress={dismissNotice} style={styles.notice}>
                <Text style={styles.noticeText}>{state.notice}</Text>
              </Pressable>
            ) : null}
            <TabBar active={tab} onSelect={setTab} />
          </>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, flex: 1 },
  body: { flex: 1 },
  loading: { color: colors.dim, fontSize: font.body, padding: spacing.lg },
  notice: {
    backgroundColor: colors.surfaceAlt,
    borderTopColor: colors.danger,
    borderTopWidth: 2,
    padding: spacing.md,
  },
  noticeText: { color: colors.text, fontSize: font.small },
})
