import {
  CLOCK_SPEED_LABELS,
  type ClockSpeed,
  type GameState,
  TIME_OF_DAY_LABELS,
  formatTime,
  timeOfDay,
} from '@tpg/engine'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { setSpeed } from '../game/store'
import { colors, font, radius, spacing } from '../theme'

const SPEEDS: readonly ClockSpeed[] = ['paused', 'slow', 'normal', 'fast']

/**
 * Часы: время суток словом и управление ходом времени.
 *
 * Мир идёт сам, поэтому игроку нужны две вещи: понимать, что сейчас за пора, и
 * иметь возможность остановить время, когда надо подумать.
 */
export function ClockBar({ game, speed }: { game: GameState; speed: ClockSpeed }) {
  const pora = timeOfDay(game.time)
  return (
    <View style={styles.bar}>
      <Text style={styles.time}>
        {formatTime(game.time)}
        <Text style={[styles.pora, pora === 'night' ? styles.night : null]}>
          {'  '}
          {TIME_OF_DAY_LABELS[pora]}
        </Text>
      </Text>
      <View style={styles.speeds}>
        {SPEEDS.map((option) => (
          <Pressable
            accessibilityLabel={CLOCK_SPEED_LABELS[option]}
            key={option}
            onPress={() => setSpeed(option)}
            style={[styles.speed, option === speed && styles.speedActive]}
          >
            <Text style={[styles.speedLabel, option === speed && styles.speedLabelActive]}>
              {option === 'paused'
                ? '❚❚'
                : option === 'slow'
                  ? '▸'
                  : option === 'normal'
                    ? '▸▸'
                    : '▸▸▸'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  time: { color: colors.text, flex: 1, fontSize: font.heading },
  pora: { color: colors.dim, fontSize: font.small },
  night: { color: colors.gold },
  speeds: { flexDirection: 'row', gap: spacing.xs },
  speed: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    minWidth: 40,
  },
  speedActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.gold },
  speedLabel: { color: colors.faint, fontSize: font.tiny },
  speedLabelActive: { color: colors.gold },
})
