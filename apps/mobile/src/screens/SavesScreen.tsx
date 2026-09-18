import { dayOf } from '@tpg/engine'
import { useEffect, useState } from 'react'
import { ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import { goHome } from '../game/nav'
import type { Slot, SlotInfo } from '../game/storage'
import { activeSlot, clearSlot, listSlots } from '../game/storage'
import { copyToSlot, exportSave, importSave, switchSlot, useAppState } from '../game/store'
import { font, palette, radii, spacing } from '../theme'
import { Button, Card, Dim, Panel, Section } from '../ui/parts'

/**
 * Сейвы: три слота, перенос строкой.
 *
 * Игру не теряют: автосейв пишет в текущий слот, другой герой живёт в другом,
 * а строка сейва переезжает на новый телефон через любой мессенджер — сейв
 * целиком сериализуем, и это его свойство, а не наше удобство.
 */
export function SavesScreen() {
  const app = useAppState()
  const [slots, setSlots] = useState<readonly (SlotInfo | { slot: Slot; name: null })[]>([])
  const [current, setCurrent] = useState<Slot>(1)
  const [exported, setExported] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh(): Promise<void> {
    setSlots(await listSlots())
    setCurrent(await activeSlot())
  }

  const playing = app.phase === 'play' ? app.game : null

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Section title="Слоты">
        {slots.map((info) => {
          const isCurrent = info.slot === current
          const title =
            info.name === null
              ? `Слот ${info.slot}: пусто`
              : `Слот ${info.slot}: ${info.name}, день ${info.day}`
          return (
            <Card
              key={info.slot}
              title={title}
              description={
                isCurrent
                  ? 'Текущий: сюда идёт автосейв.'
                  : info.name === null
                    ? 'Нажми — начать здесь нового героя.'
                    : 'Нажми — продолжить этого героя.'
              }
              meta={isCurrent ? 'текущий' : 'открыть'}
              tone={isCurrent ? 'gold' : undefined}
              onPress={
                isCurrent
                  ? undefined
                  : () => {
                      void switchSlot(info.slot).then(() => {
                        goHome()
                        void refresh()
                      })
                    }
              }
            />
          )
        })}
        {playing ? (
          <View style={styles.row}>
            {slots
              .filter((info) => info.slot !== current)
              .map((info) => (
                <Button
                  key={info.slot}
                  compact
                  label={`Копия в слот ${info.slot}`}
                  tone="quiet"
                  onPress={() => void copyToSlot(info.slot).then(refresh)}
                />
              ))}
          </View>
        ) : null}
        <View style={styles.row}>
          {slots
            .filter((info) => info.name !== null && info.slot !== current)
            .map((info) => (
              <Button
                key={`clear-${info.slot}`}
                compact
                label={`Стереть слот ${info.slot}`}
                tone="danger"
                onPress={() => void clearSlot(info.slot).then(refresh)}
              />
            ))}
        </View>
      </Section>

      {playing ? (
        <Section title="Перенести на другой телефон">
          <Dim>
            {`Игра целиком — одна строка. Скопируй её и вставь на другом устройстве. Сейчас: ${playing.character.name}, день ${dayOf(playing.time)}.`}
          </Dim>
          <View style={styles.row}>
            <Button
              label="Показать строку"
              onPress={() => setExported(exportSave())}
              tone="primary"
            />
            <Button
              label="Поделиться"
              tone="quiet"
              onPress={() => {
                const raw = exportSave()
                if (raw) void Share.share({ message: raw }).catch(() => undefined)
              }}
            />
          </View>
          {exported ? (
            <Panel>
              <TextInput
                editable={false}
                multiline
                selectTextOnFocus
                style={styles.export}
                value={exported}
              />
              <Dim>Выдели всё и скопируй.</Dim>
            </Panel>
          ) : null}
        </Section>
      ) : null}

      <Section title="Вставить сейв">
        <TextInput
          multiline
          onChangeText={setPasted}
          placeholder="Сюда — строку сейва с другого телефона"
          placeholderTextColor={palette.faint}
          style={styles.import}
          value={pasted}
        />
        {error ? <Dim tone="danger">{error}</Dim> : null}
        <Button
          label="Загрузить в текущий слот"
          disabled={pasted.trim().length === 0}
          onPress={() => {
            void importSave(pasted).then((problem) => {
              setError(problem)
              if (!problem) {
                setPasted('')
                goHome()
              }
            })
          }}
        />
      </Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  export: {
    color: palette.dim,
    fontSize: font.tiny,
    maxHeight: 120,
  },
  import: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: palette.text,
    fontSize: font.tiny,
    minHeight: 80,
    padding: spacing.sm,
  },
})
