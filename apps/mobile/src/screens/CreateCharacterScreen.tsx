import {
  ATTRIBUTE_IDS,
  ATTRIBUTE_LABELS,
  BIOGRAPHY,
  type CharacterDraft,
  SKILLS,
  type SkillId,
  buildCharacterDraft,
  progressOf,
  templateOptionIds,
} from '@tpg/engine'
import { useState } from 'react'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { openSheet } from '../game/nav'
import { startGame } from '../game/store'
import { font, palette, radii, spacing, touch } from '../theme'
import { Body, Button, Card, Dim, Panel, Section, Title } from '../ui/parts'

/**
 * Создание персонажа: биография с ветвлением или готовый шаблон (DESIGN.md, п.6).
 * Варианты, недоступные с накопленными тегами, просто не показываются — объяснять
 * игроку, кем он не может быть, незачем.
 */
export function CreateCharacterScreen({ error }: { error: string | null }) {
  const [name, setName] = useState('Странник')
  const [chosen, setChosen] = useState<string[]>([])
  const [inBiography, setInBiography] = useState(false)

  const progress = progressOf(BIOGRAPHY, chosen)
  const heroName = name.trim() === '' ? 'Странник' : name.trim()

  const start = (optionIds: readonly string[]) => {
    const result = buildCharacterDraft(heroName, optionIds, BIOGRAPHY)
    if (result.ok) startGame(result.draft)
  }

  if (!inBiography) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Title>Новый персонаж</Title>
          {error ? <Dim tone="danger">{error}</Dim> : null}
        </View>

        <Section title="Имя">
          <TextInput
            onChangeText={setName}
            placeholder="Странник"
            placeholderTextColor={palette.faint}
            style={styles.input}
            value={name}
          />
        </Section>

        <Section title="Быстрый старт">
          {BIOGRAPHY.templates.map((template) => (
            <Card
              key={template.id}
              title={template.label}
              description={template.description}
              meta="начать"
              onPress={() => start(templateOptionIds(BIOGRAPHY, template.id) ?? [])}
            />
          ))}
        </Section>

        <Button
          label="Пройти биографию"
          tone="primary"
          onPress={() => {
            setChosen([])
            setInBiography(true)
          }}
        />
        <View style={styles.back}>
          <Button label="Сейвы и перенос" tone="quiet" onPress={() => openSheet('saves')} />
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Title>{progress.stage ? progress.stage.label : 'Готов'}</Title>
        <Body>
          {progress.stage ? progress.stage.question : `${heroName}, вот что из тебя вышло.`}
        </Body>
      </View>

      {progress.stage
        ? progress.options.map((option) => (
            <Card
              key={option.id}
              title={option.label}
              description={option.text}
              onPress={() => setChosen([...chosen, option.id])}
            />
          ))
        : null}

      {progress.done ? <Summary draft={buildDraft(heroName, chosen)} /> : null}
      {progress.done ? (
        <Button label="Начать игру" tone="primary" onPress={() => start(chosen)} />
      ) : null}

      <View style={styles.back}>
        <Button
          label={chosen.length === 0 ? 'Назад к шаблонам' : 'Отменить последний выбор'}
          tone="quiet"
          onPress={() => {
            if (chosen.length === 0) setInBiography(false)
            else setChosen(chosen.slice(0, -1))
          }}
        />
      </View>
    </ScrollView>
  )
}

function buildDraft(name: string, chosen: readonly string[]): CharacterDraft | null {
  const result = buildCharacterDraft(name, chosen, BIOGRAPHY)
  return result.ok ? result.draft : null
}

/** Что получилось: только то, что отличается от нуля, иначе список не читается. */
function Summary({ draft }: { draft: CharacterDraft | null }) {
  if (!draft) return null
  const skills = Object.entries(draft.skills ?? {}).filter(([, level]) => (level ?? 0) > 0)
  return (
    <Panel>
      <Dim>{`Кошель: ${draft.money ?? 0} монет`}</Dim>
      <Dim>
        {ATTRIBUTE_IDS.map((id) => `${ATTRIBUTE_LABELS[id]} ${draft.attributes?.[id] ?? 3}`).join(
          ' · ',
        )}
      </Dim>
      <Dim>
        {skills.map(([id, level]) => `${SKILLS[id as SkillId].label} ${level}`).join(' · ')}
      </Dim>
    </Panel>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  head: { gap: spacing.xs, marginBottom: spacing.lg },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: palette.text,
    fontSize: font.body,
    minHeight: touch.comfortable,
    paddingHorizontal: spacing.md,
  },
  back: { marginTop: spacing.md },
})
