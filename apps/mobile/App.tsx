import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { abandonGame, bootstrap, dismissNotice, useAppState } from './src/game/store'
import { BattleScreen } from './src/screens/BattleScreen'
import { CharacterScreen } from './src/screens/CharacterScreen'
import { CreateCharacterScreen } from './src/screens/CreateCharacterScreen'
import { JournalScreen } from './src/screens/JournalScreen'
import { LocationScreen } from './src/screens/LocationScreen'
import { PartyScreen } from './src/screens/PartyScreen'
import { RoadScreen } from './src/screens/RoadScreen'
import { TradeScreen } from './src/screens/TradeScreen'
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

        {state.phase === 'play' && state.game.over ? (
          <View style={styles.over}>
            <Text style={styles.overTitle}>Здесь эта история кончается</Text>
            <Text style={styles.overText}>
              {state.game.character.name} пал в бою. Мир остался без него — и, судя по всему, этого
              не заметил.
            </Text>
            <Pressable onPress={() => void abandonGame()} style={styles.overButton}>
              <Text style={styles.overButtonLabel}>Начать заново</Text>
            </Pressable>
          </View>
        ) : null}

        {state.phase === 'play' && !state.game.over && state.game.battle ? (
          <>
            <Header game={state.game} />
            <View style={styles.body}>
              <BattleScreen game={state.game} />
            </View>
            {state.notice ? (
              <Pressable onPress={dismissNotice} style={styles.notice}>
                <Text style={styles.noticeText}>{state.notice}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {state.phase === 'play' && !state.game.over && !state.game.battle ? (
          <>
            <Header game={state.game} />
            <View style={styles.body}>
              {tab === 'location' ? <LocationScreen game={state.game} /> : null}
              {tab === 'trade' ? <TradeScreen game={state.game} /> : null}
              {tab === 'road' ? <RoadScreen game={state.game} /> : null}
              {tab === 'party' ? <PartyScreen game={state.game} /> : null}
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
  over: { flex: 1, gap: spacing.lg, justifyContent: 'center', padding: spacing.xl },
  overTitle: { color: colors.text, fontSize: font.title, textAlign: 'center' },
  overText: { color: colors.dim, fontSize: font.body, textAlign: 'center' },
  overButton: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  overButtonLabel: {
    color: colors.bg,
    fontSize: font.body,
    fontWeight: '600',
    textAlign: 'center',
  },
})
