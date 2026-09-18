import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Icon } from '../art/icons'
import { font, lineHeight, palette, radii, spacing, touch } from '../theme'

/**
 * Лист поверх экрана: заголовок, кнопка назад, содержимое.
 *
 * Не модальное окно и не отдельная страница: игрок видит, что он «над»
 * вкладкой, и одним нажатием возвращается туда, откуда пришёл.
 */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Pressable
          accessibilityLabel="Назад"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.back}
        >
          <Icon name="back" size={24} color={palette.gold} />
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: palette.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    flex: 1,
  },
  head: {
    alignItems: 'center',
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  back: {
    alignItems: 'center',
    height: touch.min,
    justifyContent: 'center',
    width: touch.min,
  },
  title: { color: palette.text, flex: 1, fontSize: font.heading, lineHeight: lineHeight.heading },
  body: { flex: 1 },
})
