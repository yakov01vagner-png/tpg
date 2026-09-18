import {
  ATTRIBUTE_IDS,
  ATTRIBUTE_LABELS,
  type AttributeId,
  type Command,
  type GameState,
  ITEMS_BY_ID,
  MAGIC_RANKS,
  PRIME_AGE,
  SLOT_IDS,
  SLOT_LABELS,
  type SkillId,
  ageOf,
  canApply,
  dayOf,
  eligibleRank,
  gearBonus,
  heirOf,
  skillXpToNext,
  skillsOfAttribute,
  unrecognizedGap,
} from '@tpg/engine'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Icon } from '../art/icons'
import { Portrait, heroFace } from '../art/portrait'
import { abandonGame, dispatch } from '../game/store'
import { font, palette, radii, spacing, touch } from '../theme'
import { Button, Dim, Faint, Panel, Row, Section, Stat, Stats, Title } from '../ui/parts'

/**
 * Герой: кто ты, что умеешь, что носишь, чей ты и что у тебя есть.
 *
 * Очки тратятся здесь же, у той строки, куда идут: игрок не должен искать,
 * где потратить то, что ему только что дали.
 */
export function CharacterScreen({ game }: { game: GameState }) {
  const hero = game.character
  const recognized = hero.magicRank ? MAGIC_RANKS[hero.magicRank].label : 'нет'
  const magicLevel = hero.skills.magic.level
  const earned = eligibleRank(magicLevel)
  const gap = unrecognizedGap(magicLevel, hero.magicRank)
  const today = dayOf(game.time)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel>
        <View style={styles.portraitRow}>
          <Portrait seed={hero.name} age={hero.age} size={72} overrides={heroFace(hero.tags)} />
          <View style={styles.portraitText}>
            <Title>{hero.name}</Title>
            <Dim>{hero.family.house}</Dim>
          </View>
        </View>
        <Stats>
          <Stat label="Уровень" value={`${hero.level}`} />
          <Stat
            label="Лет"
            value={`${hero.age}`}
            tone={hero.age > PRIME_AGE ? 'warn' : undefined}
          />
          <Stat label="Ранг магии" value={recognized} />
          <Stat label="Слава" value={`${game.renown}`} tone="gold" />
        </Stats>
        {gap > 0 && earned ? (
          <Dim tone="gold">
            {`Сила обгоняет титул: по навыку тянешь на «${MAGIC_RANKS[earned].label}», но признания нет.`}
          </Dim>
        ) : null}
      </Panel>

      <Section
        title="Атрибуты"
        aside={hero.unspentAttributePoints > 0 ? `${hero.unspentAttributePoints} очк.` : undefined}
      >
        {ATTRIBUTE_IDS.map((id: AttributeId) => (
          <Row
            key={id}
            glyph={<Icon name={id} size={22} color={palette.gold} />}
            title={ATTRIBUTE_LABELS[id]}
            right={
              <>
                <Text style={styles.value}>{hero.attributes[id]}</Text>
                {hero.unspentAttributePoints > 0 ? (
                  <Plus
                    label={`Поднять: ${ATTRIBUTE_LABELS[id]}`}
                    onPress={() => dispatch({ type: 'spendAttributePoint', attributeId: id })}
                  />
                ) : null}
              </>
            }
          />
        ))}
      </Section>

      <Section
        title="Навыки"
        aside={hero.unspentSkillPoints > 0 ? `${hero.unspentSkillPoints} очк.` : undefined}
      >
        {ATTRIBUTE_IDS.map((attribute: AttributeId) => (
          <View key={attribute} style={styles.group}>
            <Faint>{ATTRIBUTE_LABELS[attribute]}</Faint>
            {skillsOfAttribute(attribute).map((skill) => {
              const progress = hero.skills[skill.id as SkillId]
              return (
                <Row
                  key={skill.id}
                  glyph={<Icon name={skill.id as SkillId} size={20} color={palette.dim} />}
                  title={skill.label}
                  subtitle={`${Math.round(progress.xp)} из ${skillXpToNext(progress.level)} до следующего`}
                  right={
                    <>
                      <Text style={styles.value}>{progress.level}</Text>
                      {hero.unspentSkillPoints > 0 ? (
                        <Plus
                          label={`Поднять: ${skill.label}`}
                          onPress={() => dispatch({ type: 'spendSkillPoint', skillId: skill.id })}
                        />
                      ) : null}
                    </>
                  }
                />
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
            <Row
              key={slot}
              glyph={<Icon name={slot} size={20} color={item ? palette.gold : palette.faint} />}
              title={SLOT_LABELS[slot]}
              subtitle={item ? `${item.label} · ${worn?.condition}%` : 'пусто'}
            />
          )
        })}
        <Dim>{`От железа: +${gearBonus(hero).attack} к удару, +${gearBonus(hero).defense} к обороне`}</Dim>
      </Section>

      {hero.wound || hero.captivity ? (
        <Section title="Тело и воля">
          {hero.wound ? (
            <Row
              glyph={<Icon name="wound" size={20} color={palette.danger} />}
              title={hero.wound.severity >= 0.5 ? 'Тяжёлая рана' : 'Рана заживает'}
              subtitle={`${hero.wound.daysLeft} сут. · сила, ловкость и выносливость −${Math.round(hero.wound.severity * 3)}`}
            />
          ) : null}
          {hero.captivity ? (
            <Row
              glyph={<Icon name="captive" size={20} color={palette.danger} />}
              title="В плену"
              subtitle={`${hero.captivity.daysLeft} сут. · выкуп ${hero.captivity.ransom}`}
            />
          ) : null}
        </Section>
      ) : null}

      <Section title="Дом и род">
        <Dim>{`${hero.family.house}${hero.age > PRIME_AGE ? ' · годы берут своё' : ''}`}</Dim>
        <Dim>
          {hero.family.spouse
            ? `В браке: ${hero.family.spouse.name}`
            : 'Не в браке: свататься надо там, где сидит дом лорда'}
        </Dim>
        {hero.family.children.length === 0 ? (
          <Dim>Детей нет.</Dim>
        ) : (
          hero.family.children.map((child) => (
            <Dim key={`${child.name}:${child.bornDay}`}>
              {`${child.name}, ${ageOf(child.bornDay, today)} лет${
                heirOf(hero.family, today)?.name === child.name ? ' — наследник' : ''
              }`}
            </Dim>
          ))
        )}
      </Section>

      <Section title="Дела">
        {game.enterprises.length === 0 ? (
          <Dim>Ни каравана, ни мастерской. Доход, который идёт без тебя, заводят в городе.</Dim>
        ) : (
          game.enterprises.map((one) => (
            <Row
              key={one.id}
              title={one.kind === 'caravan' ? 'Караван' : 'Мастерская'}
              subtitle={`${game.world.locations[one.locationId]?.name ?? '—'}${
                one.travel ? ' · в пути' : ''
              } · принесло ${one.earned}`}
              right={
                <Button
                  compact
                  label="Свернуть"
                  tone="quiet"
                  onPress={() => dispatch({ type: 'closeEnterprise', enterpriseId: one.id })}
                />
              }
            />
          ))
        )}
      </Section>

      {hero.tags.length > 0 ? (
        <Section title="Биография">
          <Dim>{hero.tags.join(' · ')}</Dim>
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

function Plus({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.plus}>
      <Text style={styles.plusLabel}>+</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  portraitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  portraitText: { flex: 1 },
  group: { marginBottom: spacing.md },
  value: { color: palette.text, fontSize: font.body, minWidth: 24, textAlign: 'right' },
  plus: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    height: 32,
    justifyContent: 'center',
    minWidth: touch.min,
  },
  plusLabel: { color: palette.bg, fontSize: font.heading, fontWeight: '600' },
  action: { marginTop: spacing.sm },
})
