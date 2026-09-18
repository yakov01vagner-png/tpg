import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { type Tone, font, lineHeight, palette, radii, spacing, toneColor, touch } from '../theme'

/**
 * Части, из которых собирается любой экран.
 *
 * Экран не рисуется, а собирается: заголовок раздела, ряд, карточка действия,
 * кнопка, шкала, метка, переключатель. Всё, что повторяется хотя бы дважды,
 * живёт здесь и нигде больше — так иконки и лица (этапы 10 и 11) лягут на все
 * экраны одним движением, а не десятью.
 */

// --- текст ------------------------------------------------------------------

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>
}

export function Body({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <Text style={[styles.body, tone ? { color: toneColor[tone] } : null]}>{children}</Text>
}

export function Dim({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <Text style={[styles.dim, tone ? { color: toneColor[tone] } : null]}>{children}</Text>
}

export function Faint({ children }: { children: ReactNode }) {
  return <Text style={styles.faint}>{children}</Text>
}

// --- раздел -----------------------------------------------------------------

export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: string
  children: ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
        {aside ? <Text style={styles.sectionAside}>{aside}</Text> : null}
      </View>
      {children}
    </View>
  )
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>
}

export function Divider() {
  return <View style={styles.divider} />
}

// --- кнопка -----------------------------------------------------------------

export function Button({
  label,
  onPress,
  tone = 'normal',
  disabled = false,
  compact = false,
}: {
  label: string
  onPress: () => void
  tone?: 'normal' | 'primary' | 'quiet' | 'danger'
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        tone === 'primary' && styles.buttonPrimary,
        tone === 'quiet' && styles.buttonQuiet,
        tone === 'danger' && styles.buttonDanger,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          compact && styles.buttonLabelCompact,
          tone === 'primary' && styles.buttonLabelPrimary,
          tone === 'danger' && styles.buttonLabelDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// --- метка, шкала, число ----------------------------------------------------

/** Короткое слово в рамке: состояние, которое видно раньше текста. */
export function Badge({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { borderColor: toneColor[tone] }]}>
      <Text style={[styles.badgeText, { color: toneColor[tone] }]}>{text}</Text>
    </View>
  )
}

/** Полоска с числом рядом: цвет один не считается. */
export function Meter({
  value,
  max,
  label,
  invert = false,
}: {
  value: number
  max: number
  label: string
  /** Для шкал, где много — плохо (усталость), а не хорошо (дух). */
  invert?: boolean
}) {
  const ratio = Math.min(1, Math.max(0, value / max))
  const bad = invert ? ratio > 0.8 : ratio < 0.3
  const mid = invert ? ratio > 0.5 : ratio < 0.6
  const tone = bad ? palette.danger : mid ? palette.warn : palette.good
  return (
    <View style={styles.meterBox}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>{Math.round(value)}</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${ratio * 100}%`, backgroundColor: tone }]} />
      </View>
    </View>
  )
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone ? { color: toneColor[tone] } : null]}>{value}</Text>
    </View>
  )
}

/** Ряд чисел одной строкой: кошель, люди, сила. */
export function Stats({ children }: { children: ReactNode }) {
  return <View style={styles.stats}>{children}</View>
}

// --- переключатель ----------------------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ readonly id: T; readonly label: string }>
  value: T
  onChange: (next: T) => void
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.id === value
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Маленькая кнопка-фишка для наборов: масштаб, режим, партия. */
export function Chip({
  label,
  active = false,
  onPress,
}: {
  label: string
  active?: boolean
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  )
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={styles.chips}>{children}</View>
}

// --- ряд и карточка ---------------------------------------------------------

/**
 * Ряд списка: слева знак (место под иконку этапа 10), в середине имя и
 * подпись, справа число или действие.
 */
export function Row({
  glyph,
  title,
  subtitle,
  right,
  onPress,
  tone,
}: {
  glyph?: ReactNode
  title: string
  subtitle?: string
  right?: ReactNode
  onPress?: () => void
  tone?: Tone
}) {
  const inner = (
    <>
      {glyph ? <View style={styles.rowGlyph}>{glyph}</View> : null}
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, tone ? { color: toneColor[tone] } : null]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
    </>
  )
  if (!onPress) return <View style={styles.row}>{inner}</View>
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {inner}
    </Pressable>
  )
}

/**
 * Карточка действия. Цена видна до нажатия, причина отказа — тоже: игрок не
 * должен тыкать наугад, чтобы узнать, почему нельзя.
 */
export function Card({
  glyph,
  title,
  description,
  meta,
  reason,
  onPress,
  tone = 'gold',
}: {
  glyph?: ReactNode
  title: string
  description?: string
  meta?: string
  reason?: string | null
  onPress?: () => void
  tone?: Tone
}) {
  const blocked = Boolean(reason)
  return (
    <Pressable
      accessibilityRole="button"
      disabled={blocked || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        blocked && styles.blocked,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHead}>
        {glyph ? <View style={styles.cardGlyph}>{glyph}</View> : null}
        <Text style={styles.cardTitle}>{title}</Text>
        {meta ? <Text style={[styles.cardMeta, { color: toneColor[tone] }]}>{meta}</Text> : null}
      </View>
      {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
      {reason ? <Text style={styles.cardReason}>{reason}</Text> : null}
    </Pressable>
  )
}

/**
 * Плитка намерения: большая кнопка с названием, подписью и числом.
 *
 * Дом собран из них: игрок думает «заработать», а не «работа, наставники,
 * испытания». Число справа — сколько за плиткой возможностей; ноль плитку
 * гасит, но не прячет: пусть видно, чего здесь нет.
 */
export function Tile({
  glyph,
  title,
  subtitle,
  count,
  onPress,
  tone = 'neutral',
}: {
  glyph?: ReactNode
  title: string
  subtitle?: string
  count?: number
  onPress: () => void
  tone?: Tone
}) {
  const empty = count === 0
  return (
    <Pressable
      accessibilityRole="button"
      disabled={empty}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        empty && styles.disabled,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.tileHead}>
        {glyph ? <View style={styles.tileGlyph}>{glyph}</View> : null}
        <Text style={styles.tileTitle}>{title}</Text>
        {count !== undefined && count > 0 ? (
          <Text style={[styles.tileCount, { color: toneColor[tone] }]}>{count}</Text>
        ) : null}
      </View>
      {subtitle ? (
        <Text numberOfLines={2} style={styles.tileSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  )
}

export function Tiles({ children }: { children: ReactNode }) {
  return <View style={styles.tiles}>{children}</View>
}

/** Плашка сводки: несколько строк на подложке, без действия. */
export function Panel({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <View
      style={[styles.panel, tone ? { borderLeftColor: toneColor[tone], borderLeftWidth: 3 } : null]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { color: palette.text, fontSize: font.title, lineHeight: lineHeight.title },
  heading: { color: palette.text, fontSize: font.heading, lineHeight: lineHeight.heading },
  body: { color: palette.text, fontSize: font.body, lineHeight: lineHeight.body },
  dim: { color: palette.dim, fontSize: font.small, lineHeight: lineHeight.small },
  faint: { color: palette.faint, fontSize: font.tiny, lineHeight: lineHeight.tiny },

  section: { marginBottom: spacing.xl },
  sectionHead: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: palette.faint, fontSize: font.tiny, letterSpacing: 1.5 },
  sectionAside: { color: palette.dim, fontSize: font.tiny },
  empty: {
    color: palette.faint,
    fontSize: font.small,
    fontStyle: 'italic',
    lineHeight: lineHeight.small,
  },
  divider: {
    backgroundColor: palette.line,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },

  button: {
    backgroundColor: palette.surfaceAlt,
    borderColor: palette.lineStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touch.comfortable,
    paddingHorizontal: spacing.lg,
  },
  buttonCompact: { minHeight: 36, paddingHorizontal: spacing.md },
  buttonPrimary: { backgroundColor: palette.gold, borderColor: palette.gold },
  buttonQuiet: { backgroundColor: 'transparent', borderColor: 'transparent' },
  buttonDanger: { borderColor: palette.danger },
  buttonLabel: { color: palette.text, fontSize: font.body, textAlign: 'center' },
  buttonLabelCompact: { fontSize: font.small },
  buttonLabelPrimary: { color: palette.bg, fontWeight: '600' },
  buttonLabelDanger: { color: palette.danger },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  badgeText: { fontSize: font.tiny },

  meterBox: { flex: 1 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  meterLabel: { color: palette.dim, fontSize: font.tiny },
  meterValue: { color: palette.dim, fontSize: font.tiny },
  meterTrack: { backgroundColor: palette.line, borderRadius: 3, height: 5, overflow: 'hidden' },
  meterFill: { height: 5 },

  stat: { minWidth: 72 },
  statLabel: { color: palette.faint, fontSize: font.tiny },
  statValue: { color: palette.text, fontSize: font.body },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },

  segmented: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    padding: 3,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  segmentActive: { backgroundColor: palette.raised },
  segmentLabel: { color: palette.dim, fontSize: font.small },
  segmentLabelActive: { color: palette.gold },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  chipActive: { backgroundColor: palette.surfaceAlt, borderColor: palette.gold },
  chipLabel: { color: palette.dim, fontSize: font.small },
  chipLabelActive: { color: palette.gold },

  row: {
    alignItems: 'center',
    borderBottomColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: touch.min,
    paddingVertical: spacing.sm,
  },
  rowGlyph: { alignItems: 'center', justifyContent: 'center', width: 28 },
  rowBody: { flex: 1 },
  rowTitle: { color: palette.text, fontSize: font.body, lineHeight: lineHeight.body },
  rowSubtitle: { color: palette.dim, fontSize: font.small, lineHeight: lineHeight.small },
  rowRight: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },

  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  blocked: { opacity: 0.55 },
  cardPressed: { backgroundColor: palette.surfaceAlt },
  cardHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  cardGlyph: { alignItems: 'center', justifyContent: 'center', width: 24 },
  cardTitle: {
    color: palette.text,
    flex: 1,
    fontSize: font.heading,
    lineHeight: lineHeight.heading,
  },
  cardMeta: { fontSize: font.small, textAlign: 'right' },
  cardDescription: {
    color: palette.dim,
    fontSize: font.small,
    lineHeight: lineHeight.small,
    marginTop: spacing.xs,
  },
  cardReason: { color: palette.danger, fontSize: font.small, marginTop: spacing.sm },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tile: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 76,
    padding: spacing.md,
  },
  tileHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  tileGlyph: { alignItems: 'center', justifyContent: 'center' },
  tileTitle: {
    color: palette.text,
    flex: 1,
    fontSize: font.heading,
    lineHeight: lineHeight.heading,
  },
  tileCount: { fontSize: font.small },
  tileSubtitle: {
    color: palette.dim,
    fontSize: font.tiny,
    lineHeight: lineHeight.tiny,
    marginTop: spacing.xs,
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
})
