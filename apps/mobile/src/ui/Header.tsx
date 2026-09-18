import {
  CLOCK_SPEED_LABELS,
  type ClockSpeed,
  FATIGUE_MAX,
  type GameState,
  TIME_OF_DAY_LABELS,
  dayOf,
  hourOf,
  kingdomOf,
  minuteOf,
  timeOfDay,
} from '@tpg/engine'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { setSpeed } from '../game/store'
import { dayTint, font, lineHeight, palette, radii, spacing } from '../theme'
import { Meter } from './parts'

const SPEEDS: readonly ClockSpeed[] = ['paused', 'slow', 'normal', 'fast']
const SPEED_GLYPH: Record<ClockSpeed, string> = {
  paused: '❚❚',
  slow: '▸',
  normal: '▸▸',
  fast: '▸▸▸',
}

/**
 * Шапка: всё, что нужно видеть всегда, за одну секунду.
 *
 * Первая строка — где ты и который час; подложка едва меняет цвет по времени
 * суток, слово «рассвет» стоит рядом на всякий случай. Вторая — кошель, люди,
 * усталость и ход времени. Ничего сверх этого: остальное живёт на вкладках.
 */
export function Header({ game, speed }: { game: GameState; speed: ClockSpeed }) {
  const hero = game.character
  const here = game.world.locations[game.locationId]
  const kingdom = kingdomOf(game.world, game.locationId)
  const pora = timeOfDay(game.time)
  const points = hero.unspentSkillPoints + hero.unspentAttributePoints
  const hh = String(hourOf(game.time)).padStart(2, '0')
  const mm = String(minuteOf(game.time)).padStart(2, '0')

  return (
    <View style={[styles.box, { backgroundColor: dayTint[pora] }]}>
      <View style={styles.row}>
        <View style={styles.place}>
          <Text numberOfLines={1} style={styles.placeName}>
            {here?.name ?? '…'}
          </Text>
          <Text numberOfLines={1} style={styles.placeMeta}>
            {kingdom?.name ?? ''}
          </Text>
        </View>
        <View style={styles.clock}>
          <Text style={styles.time}>{`${hh}:${mm}`}</Text>
          <Text style={[styles.pora, pora === 'night' && styles.night]}>
            {`день ${dayOf(game.time)} · ${TIME_OF_DAY_LABELS[pora]}`}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.money}>
          {hero.money}
          <Text style={styles.moneyUnit}> монет</Text>
        </Text>
        {points > 0 ? <Text style={styles.points}>+{points} очк.</Text> : null}
        <View style={styles.meter}>
          <Meter value={hero.fatigue} max={FATIGUE_MAX} label="Усталость" invert />
        </View>
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
  place: { flex: 1 },
  placeName: { color: palette.text, fontSize: font.heading, lineHeight: lineHeight.heading },
  placeMeta: { color: palette.faint, fontSize: font.tiny, lineHeight: lineHeight.tiny },
  clock: { alignItems: 'flex-end' },
  time: { color: palette.text, fontSize: font.heading, lineHeight: lineHeight.heading },
  pora: { color: palette.dim, fontSize: font.tiny, lineHeight: lineHeight.tiny },
  night: { color: palette.gold },
  money: { color: palette.gold, fontSize: font.heading },
  moneyUnit: { color: palette.goldDim, fontSize: font.tiny },
  points: { color: palette.good, fontSize: font.tiny },
  meter: { flex: 1 },
  speeds: { flexDirection: 'row', gap: 3 },
  speed: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    minWidth: 30,
    paddingHorizontal: spacing.xs,
  },
  speedActive: { backgroundColor: palette.surfaceAlt, borderColor: palette.gold },
  speedLabel: { color: palette.faint, fontSize: 9 },
  speedLabelActive: { color: palette.gold },
})
