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
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { startGame } from '../game/store'
import { colors, font, radius, spacing } from '../theme'
import { ActionCard } from '../ui/ActionCard'
import { Button, Section } from '../ui/atoms'

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
        <Text style={styles.title}>Новый персонаж</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Section title="Имя">
          <TextInput
            onChangeText={setName}
            placeholder="Странник"
            placeholderTextColor={colors.faint}
            style={styles.input}
            value={name}
          />
        </Section>

        <Section title="Быстрый старт">
          {BIOGRAPHY.templates.map((template) => (
            <ActionCard
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
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{progress.stage ? progress.stage.label : 'Готов'}</Text>
      <Text style={styles.question}>
        {progress.stage ? progress.stage.question : `${heroName}, вот что из тебя вышло.`}
      </Text>

      {progress.stage
        ? progress.options.map((option) => (
            <ActionCard
              key={option.id}
              title={option.label}
              description={option.text}
              meta=""
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
    <View style={styles.summary}>
      <Text style={styles.summaryLine}>Кошель: {draft.money ?? 0} монет</Text>
      <Text style={styles.summaryLine}>
        {ATTRIBUTE_IDS.map((id) => `${ATTRIBUTE_LABELS[id]} ${draft.attributes?.[id] ?? 3}`).join(
          ' · ',
        )}
      </Text>
      <Text style={styles.summaryLine}>
        {skills.map(([id, level]) => `${SKILLS[id as SkillId].label} ${level}`).join(' · ')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: font.title },
  question: { color: colors.dim, fontSize: font.body, marginBottom: spacing.lg },
  error: {
    color: colors.danger,
    fontSize: font.small,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    color: colors.text,
    fontSize: font.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  summaryLine: { color: colors.dim, fontSize: font.small },
  back: { marginTop: spacing.md },
})
