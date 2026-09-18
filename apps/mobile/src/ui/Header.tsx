import {
  CLOCK_SPEED_LABELS,
  type ClockSpeed,
  FATIGUE_MAX,
  type GameState,
  SEASON_LABELS,
  TIME_OF_DAY_LABELS,
  dayOf,
  formatDate,
  hourOf,
  minuteOf,
  seasonOf,
  timeOfDay,
  yearOf,
} from '@tpg/engine'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Icon } from '../art/icons'
import { Portrait, heroFace } from '../art/portrait'
import { openSheet } from '../game/nav'
import { setSpeed } from '../game/store'
import { dayTint, font, lineHeight, palette, radii, spacing, touch } from '../theme'

const SPEEDS: readonly ClockSpeed[] = ['paused', 'slow', 'normal', 'fast']
const SPEED_GLYPH: Record<ClockSpeed, string> = {
  paused: '❚❚',
  slow: '▸',
  normal: '▸▸',
  fast: '▸▸▸',
}

/**
 * Шапка: герой слева, время посередине, карта справа.
 *
 * Слева — кнопка с именем (место под лицо этапа 11): она открывает двор. Справа
 * — карта: мир в одно нажатие. Между ними часы; подложка едва меняет цвет по
 * времени суток, слово «рассвет» стоит рядом. Кошель и усталость — тонкой
 * строкой под ними.
 */
export function Header({ game, speed }: { game: GameState; speed: ClockSpeed }) {
  const hero = game.character
  const pora = timeOfDay(game.time)
  const points = hero.unspentSkillPoints + hero.unspentAttributePoints
  const hh = String(hourOf(game.time)).padStart(2, '0')
  const mm = String(minuteOf(game.time)).padStart(2, '0')
  const fatigue = Math.min(1, hero.fatigue / FATIGUE_MAX)

  return (
    <View style={[styles.box, { backgroundColor: dayTint[pora] }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Двор"
          accessibilityRole="button"
          onPress={() => openSheet('court')}
          style={styles.hero}
        >
          <View style={styles.face}>
            <Portrait seed={hero.name} age={hero.age} size={40} overrides={heroFace(hero.tags)} />
            {points > 0 ? <View style={styles.dot} /> : null}
          </View>
          <View>
            <Text numberOfLines={1} style={styles.name}>
              {hero.name}
            </Text>
            <Text style={styles.sub}>
              {`${hero.money} монет`}
              {points > 0 ? `  ·  +${points} очк.` : ''}
            </Text>
          </View>
        </Pressable>

        <View style={styles.clock}>
          <Text style={styles.time}>{`${hh}:${mm}`}</Text>
          <Text style={[styles.pora, pora === 'night' && styles.night]}>
            {/* Дата, а не номер дня: с версии 0.5 у года есть месяцы и времена
                года, и «14 липня» говорит больше, чем «день 470» (этап 37). */}
            {`${formatDate(dayOf(game.time))}, ${SEASON_LABELS[seasonOf(dayOf(game.time))]} · год ${yearOf(dayOf(game.time))} · ${TIME_OF_DAY_LABELS[pora]}`}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Карта"
          accessibilityRole="button"
          onPress={() => openSheet('map')}
          style={styles.mapButton}
        >
          <Icon name="map" size={20} color={palette.gold} />
          <Text style={styles.mapLabel}>Карта</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.fatigueTrack}>
          <View
            style={[
              styles.fatigueFill,
              {
                width: `${fatigue * 100}%`,
                backgroundColor:
                  fatigue > 0.8 ? palette.danger : fatigue > 0.5 ? palette.warn : palette.good,
              },
            ]}
          />
        </View>
        <Text style={styles.fatigueLabel}>{`усталость ${Math.round(hero.fatigue)}`}</Text>
        <View style={styles.speeds}>
          {SPEEDS.map((option) => (
            <Pressable
              accessibilityLabel={CLOCK_SPEED_LABELS[option]}
              key={option}
              onPress={() => setSpeed(option)}
              style={[styles.speed, option === speed && styles.speedActive]}
            >
              <Text style={[styles.speedLabel, option === speed && styles.speedLabelActive]}>
                {SPEED_GLYPH[option]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  hero: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touch.min,
  },
  face: {
    alignItems: 'center',
    backgroundColor: palette.raised,
    borderColor: palette.gold,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  dot: {
    backgroundColor: palette.good,
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: -1,
    top: -1,
    width: 8,
  },
  name: { color: palette.text, fontSize: font.body, lineHeight: lineHeight.body },
  sub: { color: palette.gold, fontSize: font.tiny, lineHeight: lineHeight.tiny },
  clock: { alignItems: 'center' },
  time: { color: palette.text, fontSize: font.heading, lineHeight: lineHeight.heading },
  pora: { color: palette.dim, fontSize: font.tiny, lineHeight: lineHeight.tiny },
  night: { color: palette.gold },
  mapButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.lineStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    maxWidth: 72,
    minHeight: touch.min,
  },
  mapLabel: { color: palette.gold, fontSize: font.tiny },
  fatigueTrack: {
    backgroundColor: palette.line,
    borderRadius: 3,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  fatigueFill: { height: 4 },
  fatigueLabel: { color: palette.faint, fontSize: font.tiny },
  speeds: { flexDirection: 'row', gap: 3 },
  speed: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: spacing.xs,
  },
  speedActive: { backgroundColor: palette.surfaceAlt, borderColor: palette.gold },
  speedLabel: { color: palette.faint, fontSize: 9 },
  speedLabelActive: { color: palette.gold },
})
