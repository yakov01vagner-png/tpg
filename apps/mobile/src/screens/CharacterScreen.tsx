import {
  ATTRIBUTE_IDS,
  ATTRIBUTE_LABELS,
  type AttributeId,
  type GameState,
  ITEMS_BY_ID,
  MAGIC_RANKS,
  SLOT_IDS,
  SLOT_LABELS,
  type SkillId,
  eligibleRank,
  gearBonus,
  skillXpToNext,
  skillsOfAttribute,
  unrecognizedGap,
} from '@tpg/engine'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { abandonGame, dispatch } from '../game/store'
import { colors, font, radius, spacing } from '../theme'
import { Button, Section } from '../ui/atoms'

export function CharacterScreen({ game }: { game: GameState }) {
  const hero = game.character
  const recognized = hero.magicRank ? MAGIC_RANKS[hero.magicRank].label : 'нет'
  const magicLevel = hero.skills.magic.level
  const earned = eligibleRank(magicLevel)
  const gap = unrecognizedGap(magicLevel, hero.magicRank)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.name}>{hero.name}</Text>
      <Text style={styles.subtitle}>
        Уровень {hero.level} · ранг магии: {recognized}
      </Text>
      {gap > 0 && earned ? (
        <Text style={styles.gap}>
          Сила обгоняет титул: по навыку тянешь на «{MAGIC_RANKS[earned].label}», но признания нет.
        </Text>
      ) : null}

      <Section
        title={`Атрибуты${hero.unspentAttributePoints > 0 ? ` · ${hero.unspentAttributePoints} очк.` : ''}`}
      >
        {ATTRIBUTE_IDS.map((id: AttributeId) => (
          <View key={id} style={styles.row}>
            <Text style={styles.rowLabel}>{ATTRIBUTE_LABELS[id]}</Text>
            <Text style={styles.rowValue}>{hero.attributes[id]}</Text>
            {hero.unspentAttributePoints > 0 ? (
              <Pressable
                accessibilityLabel={`Поднять: ${ATTRIBUTE_LABELS[id]}`}
                onPress={() => dispatch({ type: 'spendAttributePoint', attributeId: id })}
                style={styles.plus}
              >
                <Text style={styles.plusLabel}>+</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Section>

      <Section
        title={`Навыки${hero.unspentSkillPoints > 0 ? ` · ${hero.unspentSkillPoints} очк.` : ''}`}
      >
        {ATTRIBUTE_IDS.map((attribute: AttributeId) => (
          <View key={attribute} style={styles.group}>
            <Text style={styles.groupTitle}>{ATTRIBUTE_LABELS[attribute]}</Text>
            {skillsOfAttribute(attribute).map((skill) => {
              const progress = hero.skills[skill.id as SkillId]
              return (
                <View key={skill.id} style={styles.row}>
                  <Text style={styles.rowLabel}>{skill.label}</Text>
                  <Text style={styles.rowProgress}>
                    {Math.round(progress.xp)}/{skillXpToNext(progress.level)}
                  </Text>
                  <Text style={styles.rowValue}>{progress.level}</Text>
                  {hero.unspentSkillPoints > 0 ? (
                    <Pressable
                      accessibilityLabel={`Поднять: ${skill.label}`}
                      onPress={() => dispatch({ type: 'spendSkillPoint', skillId: skill.id })}
                      style={styles.plus}
                    >
                      <Text style={styles.plusLabel}>+</Text>
                    </Pressable>
                  ) : null}
                </View>
              )
            })}
          </View>
        ))}
      </Section>

      <Section title="Снаряжение">
        {SLOT_IDS.map((slot) => {
          const worn = hero.equipment[slot]
          const item = worn ? ITEMS_BY_ID[worn.id] : null
          return (
            <View key={slot} style={styles.row}>
              <Text style={styles.rowLabel}>{SLOT_LABELS[slot]}</Text>
              <Text style={item ? styles.rowValue : styles.rowProgress}>
                {item ? `${item.label} · ${worn?.condition}%` : 'пусто'}
              </Text>
            </View>
          )
        })}
        <Text style={styles.tags}>
          От железа: +{gearBonus(hero).attack} к удару, +{gearBonus(hero).defense} к обороне
        </Text>
      </Section>

      {hero.tags.length > 0 ? (
        <Section title="Биография">
          <Text style={styles.tags}>{hero.tags.join(' · ')}</Text>
        </Section>
      ) : null}

      <Button
        label="Начать заново"
        tone="quiet"
        onPress={() =>
          Alert.alert('Начать заново?', 'Текущий персонаж и его сейв будут стёрты.', [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Стереть', style: 'destructive', onPress: () => void abandonGame() },
          ])
        }
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  name: { color: colors.text, fontSize: font.title },
  subtitle: { color: colors.dim, fontSize: font.small, marginBottom: spacing.md },
  gap: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    color: colors.gold,
    fontSize: font.small,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  group: { marginBottom: spacing.md },
  groupTitle: { color: colors.faint, fontSize: font.tiny, marginBottom: spacing.xs },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
  },
  rowLabel: { color: colors.text, flex: 1, fontSize: font.body },
  rowProgress: { color: colors.faint, fontSize: font.tiny },
  rowValue: { color: colors.text, fontSize: font.body, minWidth: 28, textAlign: 'right' },
  plus: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius,
    height: 36,
    justifyContent: 'center',
    width: 44,
  },
  plusLabel: { color: colors.gold, fontSize: font.heading },
  tags: { color: colors.dim, fontSize: font.small },
})
