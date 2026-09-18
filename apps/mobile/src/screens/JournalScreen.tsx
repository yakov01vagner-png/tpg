import {
  type GameState,
  LOG_KIND_LABELS,
  type LogEntry,
  type LogKind,
  dayOf,
  hourOf,
  minuteOf,
} from '@tpg/engine'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { type Tone, font, lineHeight, palette, spacing, toneColor } from '../theme'
import { Empty } from '../ui/parts'

/**
 * Журнал как лента: по дням, со знаком у каждой записи.
 *
 * Свежее сверху — на телефоне листать вверх за историей неудобно. День —
 * заголовок, а не приписка к каждой строке: так видно, сколько всего
 * случилось за сутки, и пустой день не занимает места. Знак слева — цвет
 * по виду события; слово рядом обязательно, цвет один не считается.
 */
const KIND_TONE: Record<LogKind, Tone> = {
  money: 'gold',
  skill: 'good',
  level: 'good',
  rank: 'gold',
  war: 'danger',
  plague: 'danger',
  world: 'info',
  people: 'info',
  trade: 'gold',
  notice: 'neutral',
}

export function JournalScreen({ game }: { game: GameState }) {
  const days = groupByDay([...game.log].reverse())
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {days.length === 0 ? <Empty text="Пока ничего не случилось." /> : null}
      {days.map(({ day, entries }) => (
        <View key={day} style={styles.day}>
          <Text style={styles.dayTitle}>
            {day === dayOf(game.time) ? 'Сегодня' : `День ${day}`}
          </Text>
          {entries.map((entry, index) => {
            const tone = KIND_TONE[entry.kind]
            return (
              <View key={`${entry.time}-${index}`} style={styles.entry}>
                <View style={[styles.mark, { backgroundColor: toneColor[tone] }]} />
                <View style={styles.entryBody}>
                  <Text style={styles.text}>{entry.text}</Text>
                  <Text style={styles.meta}>
                    {`${String(hourOf(entry.time)).padStart(2, '0')}:${String(
                      minuteOf(entry.time),
                    ).padStart(2, '0')} · ${LOG_KIND_LABELS[entry.kind]}`}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      ))}
    </ScrollView>
  )
}

function groupByDay(entries: readonly LogEntry[]): { day: number; entries: LogEntry[] }[] {
  const groups: { day: number; entries: LogEntry[] }[] = []
  for (const entry of entries) {
    const day = dayOf(entry.time)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.entries.push(entry)
    else groups.push({ day, entries: [entry] })
  }
  return groups
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  day: { marginBottom: spacing.lg },
  dayTitle: {
    color: palette.faint,
    fontSize: font.tiny,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  entry: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  mark: { borderRadius: 2, marginTop: 7, height: 8, width: 4 },
  entryBody: { flex: 1 },
  text: { color: palette.text, fontSize: font.body, lineHeight: lineHeight.body },
  meta: { color: palette.faint, fontSize: font.tiny, marginTop: spacing.xxs },
})
