import { type GameState, type Screen, powerScreens } from '@tpg/engine'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { dispatch } from '../game/store'
import { spacing } from '../theme'
import { Body, Button, Chip, Chips, Dim, Divider, Row, Section } from '../ui/parts'

/**
 * Власть (этап 97).
 *
 * К 0.7 у державы стало больше вещей, чем помещается в голове: казна, закон,
 * вассалы, роты, флот, посольства, кампании, наследство, города и церковь. Здесь
 * они собраны в пять ответов на пять вопросов — и каждый ответ кончается
 * действием, а не таблицей (У6). Что показывать, решает ядро (`screens.ts`);
 * здесь только разметка.
 */
export function PowerScreen({ game }: { game: GameState }) {
  const screens = powerScreens(game, game.world)
  const [open, setOpen] = useState<Screen['id']>('realm')
  const shown = screens.find((one) => one.id === open) ?? screens[0]

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Chips>
        {screens.map((one) => (
          <Chip
            key={one.id}
            label={one.title}
            onPress={() => setOpen(one.id)}
            active={one.id === open}
          />
        ))}
      </Chips>

      {shown ? (
        <>
          <View style={styles.says}>
            <Body>{shown.says}</Body>
          </View>

          <Section title={shown.title}>
            {shown.lines.map((line) => (
              <Row key={line.label} title={`${line.label}: ${line.value}`} subtitle={line.hint} />
            ))}
          </Section>

          <Divider />

          <Section title="Что можно сделать">
            {shown.deeds.length === 0 ? <Dim>Отсюда сейчас делать нечего.</Dim> : null}
            {shown.deeds.map((deed) => (
              <View key={deed.label} style={styles.deed}>
                <Button
                  label={deed.label}
                  disabled={!deed.can}
                  onPress={() => dispatch(deed.command)}
                  tone={deed.can ? 'primary' : 'quiet'}
                />
                <Dim>{deed.why}</Dim>
              </View>
            ))}
          </Section>
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  says: { paddingHorizontal: spacing.xs },
  deed: { gap: spacing.xs, marginBottom: spacing.sm },
})
