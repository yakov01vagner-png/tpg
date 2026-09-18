import type { GameState } from '@tpg/engine'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { SHEET_TITLES, type SheetId, closeSheet, useNav } from './src/game/nav'
import { abandonGame, bootstrap, dismissNotice, useAppState } from './src/game/store'
import { BattleScreen } from './src/screens/BattleScreen'
import { CharacterScreen } from './src/screens/CharacterScreen'
import { CreateCharacterScreen } from './src/screens/CreateCharacterScreen'
import { EarnSheet } from './src/screens/EarnSheet'
import { FaceGallery } from './src/screens/FaceGallery'
import { HomeScreen } from './src/screens/HomeScreen'
import { IconGallery } from './src/screens/IconGallery'
import { JournalScreen } from './src/screens/JournalScreen'
import { LearnSheet } from './src/screens/LearnSheet'
import { MapScreen } from './src/screens/MapScreen'
import { OwnSheet } from './src/screens/OwnSheet'
import { PeopleScreen } from './src/screens/PeopleScreen'
import { TradeScreen } from './src/screens/TradeScreen'
import { WorldScreen } from './src/screens/WorldScreen'
import { font, lineHeight, palette, radii, spacing } from './src/theme'
import { Header } from './src/ui/Header'
import { Sheet } from './src/ui/Sheet'
import { Button } from './src/ui/parts'

/** Что рисуется на листе с таким именем. Одно место, чтобы не разъехалось. */
function sheetBody(id: SheetId, game: GameState) {
  switch (id) {
    case 'earn':
      return <EarnSheet game={game} />
    case 'learn':
      return <LearnSheet game={game} />
    case 'market':
      return <TradeScreen game={game} />
    case 'people':
      return <PeopleScreen game={game} />
    case 'own':
      return <OwnSheet game={game} />
    case 'chronicle':
      return <JournalScreen game={game} />
    case 'court':
      return <CharacterScreen game={game} />
    case 'map':
      return <MapScreen game={game} />
    case 'world':
      return <WorldScreen game={game} />
  }
}

/** В вебе `#icons` открывает галерею знаков — для проверки стиля, не для игры. */
const hash =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as { location?: { hash?: string } }).location?.hash === 'string'
    ? (globalThis as { location: { hash: string } }).location.hash
    : ''
const wantsGallery = hash === '#icons'
const wantsFaces = hash === '#faces'

export default function App() {
  const state = useAppState()
  const nav = useNav()
  const top = nav.stack[nav.stack.length - 1]

  useEffect(() => {
    void bootstrap()
  }, [])

  if (wantsGallery || wantsFaces) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          {wantsFaces ? <FaceGallery /> : <IconGallery />}
        </SafeAreaView>
      </SafeAreaProvider>
    )
  }

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

        {state.phase === 'play' && !state.game.over && state.game.battle ? (
          // Бой занимает весь экран: ни шапки, ни листов — только поле.
          <BattleScreen game={state.game} />
        ) : null}

        {state.phase === 'play' && !state.game.over && !state.game.battle ? (
          <>
            <Header game={state.game} speed={state.speed} />
            <View style={styles.body}>
              {top ? (
                <Sheet title={SHEET_TITLES[top]} onClose={closeSheet}>
                  {sheetBody(top, state.game)}
                </Sheet>
              ) : (
                <HomeScreen game={state.game} />
              )}
            </View>
            {state.notice ? (
              <Pressable accessibilityRole="button" onPress={dismissNotice} style={styles.notice}>
                <Text style={styles.noticeText}>{state.notice}</Text>
                <Text style={styles.noticeHint}>нажми, чтобы убрать</Text>
              </Pressable>
            ) : null}
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
