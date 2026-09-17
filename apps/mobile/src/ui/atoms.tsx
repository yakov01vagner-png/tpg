import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '../theme'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  )
}

export function Button({
  label,
  onPress,
  tone = 'normal',
  disabled = false,
}: {
  label: string
  onPress: () => void
  tone?: 'normal' | 'primary' | 'quiet'
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' && styles.buttonPrimary,
        tone === 'quiet' && styles.buttonQuiet,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonLabel, tone === 'primary' && styles.buttonLabelPrimary]}>
        {label}
      </Text>
    </Pressable>
  )
}

/** Полоска для усталости: числа рядом обязательно — цвет один не считается. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = Math.min(1, Math.max(0, value / max))
  const tone = ratio > 0.8 ? colors.danger : ratio > 0.5 ? colors.gold : colors.good
  return (
    <View style={styles.meterBox}>
      <Text style={styles.meterLabel}>
        {label} {Math.round(value)}
      </Text>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${ratio * 100}%`, backgroundColor: tone }]} />
      </View>
    </View>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    color: colors.faint,
    fontSize: font.tiny,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: { backgroundColor: colors.gold, borderColor: colors.gold },
  buttonQuiet: { backgroundColor: 'transparent' },
  buttonLabel: { color: colors.text, fontSize: font.body, textAlign: 'center' },
  buttonLabelPrimary: { color: colors.bg, fontWeight: '600' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
  meterBox: { flex: 1 },
  meterLabel: { color: colors.dim, fontSize: font.tiny, marginBottom: spacing.xs },
  meterTrack: {
    backgroundColor: colors.line,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
  meterFill: { height: 6 },
  statLabel: { color: colors.faint, fontSize: font.tiny },
  statValue: { color: colors.text, fontSize: font.body },
  empty: { color: colors.faint, fontSize: font.small, fontStyle: 'italic' },
})
