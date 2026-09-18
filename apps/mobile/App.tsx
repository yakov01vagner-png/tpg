import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { closeSheet, goTab, useNav } from './src/game/nav'
import { abandonGame, bootstrap, dismissNotice, useAppState } from './src/game/store'
import { BattleScreen } from './src/screens/BattleScreen'
import { CharacterScreen } from './src/screens/CharacterScreen'
import { CreateCharacterScreen } from './src/screens/CreateCharacterScreen'
import { JournalScreen } from './src/screens/JournalScreen'
import { LocationScreen } from './src/screens/LocationScreen'
import { MapScreen } from './src/screens/MapScreen'
import { PeopleScreen } from './src/screens/PeopleScreen'
import { TradeScreen } from './src/screens/TradeScreen'
import { WorldScreen } from './src/screens/WorldScreen'
import { font, lineHeight, palette, radii, spacing } from './src/theme'
import { Header } from './src/ui/Header'
import { Sheet } from './src/ui/Sheet'
import { TabBar } from './src/ui/TabBar'
import { Button } from './src/ui/parts'

export default function App() {
  const state = useAppState()
  const nav = useNav()

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
              {state.game.character.name} ушёл, и продолжить его некому. Мир остался — и, судя по
              всему, этого не заметил.
            </Text>
            <Button label="Начать заново" tone="primary" onPress={() => void abandonGame()} />
          </View>
        ) : null}

        {state.phase === 'play' && !state.game.over ? (
          <>
            <Header game={state.game} speed={state.speed} />
            <View style={styles.body}>
              {state.game.battle ? (
                <BattleScreen game={state.game} />
              ) : nav.sheet === 'trade' ? (
                <Sheet title="Рынок" onClose={closeSheet}>
                  <TradeScreen game={state.game} />
                </Sheet>
              ) : nav.sheet === 'world' ? (
                <Sheet title="Сводка мира" onClose={closeSheet}>
                  <WorldScreen game={state.game} />
                </Sheet>
              ) : nav.tab === 'here' ? (
                <LocationScreen game={state.game} />
              ) : nav.tab === 'map' ? (
                <MapScreen game={state.game} />
              ) : nav.tab === 'people' ? (
                <PeopleScreen game={state.game} />
              ) : nav.tab === 'hero' ? (
                <CharacterScreen game={state.game} />
              ) : (
                <JournalScreen game={state.game} />
              )}
            </View>
            {state.notice ? (
              <Pressable accessibilityRole="button" onPress={dismissNotice} style={styles.notice}>
                <Text style={styles.noticeText}>{state.notice}</Text>
                <Text style={styles.noticeHint}>нажми, чтобы убрать</Text>
              </Pressable>
            ) : null}
            {state.game.battle ? null : (
              <TabBar
                active={nav.tab}
                onSelect={goTab}
                attention={
                  new Set(
                    state.game.character.unspentSkillPoints +
                      state.game.character.unspentAttributePoints >
                      0
                      ? ['hero' as const]
                      : [],
                  )
                }
              />
            )}
          </>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: palette.bg, flex: 1 },
  body: { flex: 1 },
  loading: { color: palette.dim, fontSize: font.body, padding: spacing.lg },
  notice: {
    backgroundColor: palette.raised,
    borderLeftColor: palette.gold,
    borderLeftWidth: 3,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
  },
  noticeText: { color: palette.text, fontSize: font.small, lineHeight: lineHeight.small },
  noticeHint: { color: palette.faint, fontSize: font.tiny, marginTop: spacing.xxs },
  over: { flex: 1, gap: spacing.lg, justifyContent: 'center', padding: spacing.xl },
  overTitle: { color: palette.text, fontSize: font.title, textAlign: 'center' },
  overText: {
    color: palette.dim,
    fontSize: font.body,
    lineHeight: lineHeight.body,
    textAlign: 'center',
  },
})
