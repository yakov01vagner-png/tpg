import {
  ARCHETYPE_LABELS,
  type GameState,
  PLAYER,
  addressOf,
  foodSecurity,
  holdingsOf,
  lordById,
  warsOf,
} from '@tpg/engine'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '../theme'
import { Empty, Section } from '../ui/parts'

/**
 * Карта мира (этап 6, блок W).
 *
 * Мир глубокий, но до сих пор был невидимым: войны пролетали строчкой в
 * журнале, владения не показывались нигде. Здесь — положение вещей: кто чей,
 * где война, где голодно и где стоят твои.
 */
export function WorldScreen({ game }: { game: GameState }) {
  const [openKingdom, setOpenKingdom] = useState<string | null>(null)
  const mine = holdingsOf(game.settlements, PLAYER)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {game.realm ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{game.realm.name}</Text>
          <Text style={styles.dim}>Твоё имя на карте. Слава: {game.renown}</Text>
        </View>
      ) : null}

      <Section title="Войны">
        {game.politics.wars.length === 0 ? <Empty text="Мир. Пока что." /> : null}
        {game.politics.wars.map((war) => (
          <View key={`${war.a}-${war.b}-${war.since}`} style={styles.row}>
            <Text style={styles.rowTitle}>
              {sideName(game, war.a)} — {sideName(game, war.b)}
            </Text>
            <Text style={styles.dim}>{war.reason}</Text>
          </View>
        ))}
      </Section>

      <Section title="Архимаги корон">
        {Object.values(game.politics.archmages).map((archmage) => (
          <View key={archmage.kingdomId} style={styles.row}>
            <Text style={styles.rowTitle}>
              {game.world.kingdoms[archmage.kingdomId]?.name ?? archmage.kingdomId}
            </Text>
            <Text style={archmage.state === 'free' ? styles.free : styles.dim}>
              {archmage.state === 'free'
                ? 'при дворе'
                : archmage.state === 'busy'
                  ? 'занят своими делами'
                  : 'отказался служить'}
            </Text>
          </View>
        ))}
      </Section>

      {mine.length > 0 ? (
        <Section title="Твои владения">
          {mine.map((settlement) => (
            <View key={settlement.locationId} style={styles.row}>
              <Text style={styles.rowTitle}>
                {game.world.locations[settlement.locationId]?.name} · {settlement.population} чел.
              </Text>
              <Text style={styles.dim}>
                {addressOf(game.world, settlement.locationId)} · {foodWord(settlement)}
                {settlement.building ? ` · стройка ${settlement.building.daysLeft} сут.` : ''}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      <Section title="Королевства">
        {Object.values(game.world.kingdoms).map((kingdom) => {
          const open = openKingdom === kingdom.id
          const wars = warsOf(game.politics, kingdom.id)
          return (
            <View key={kingdom.id}>
              <Pressable
                onPress={() => setOpenKingdom(open ? null : kingdom.id)}
                style={styles.kingdom}
              >
                <Text style={styles.rowTitle}>{kingdom.name}</Text>
                <Text style={styles.dim}>
                  {wars.length > 0 ? `воюет (${wars.length})` : 'в мире'} ·{' '}
                  {kingdom.regionIds.length} области
                </Text>
              </Pressable>
              {open
                ? kingdom.regionIds.map((regionId) => {
                    const region = game.world.regions[regionId]
                    if (!region) return null
                    return (
                      <View key={regionId} style={styles.region}>
                        <Text style={styles.regionName}>{region.name}</Text>
                        {region.provinceIds.map((provinceId) => {
                          const province = game.world.provinces[provinceId]
                          if (!province) return null
                          return (
                            <View key={provinceId} style={styles.province}>
                              <Text style={styles.provinceName}>{province.name}</Text>
                              {province.locationIds.map((id) => {
                                const settlement = game.settlements[id]
                                const location = game.world.locations[id]
                                if (!settlement || !location) return null
                                return (
                                  <Text key={id} style={styles.place}>
                                    {location.name} ({ARCHETYPE_LABELS[location.archetype]}) —{' '}
                                    {ownerWord(game, settlement.owner)}, {foodWord(settlement)}
                                  </Text>
                                )
                              })}
                            </View>
                          )
                        })}
                      </View>
                    )
                  })
                : null}
            </View>
          )
        })}
      </Section>
    </ScrollView>
  )
}

function sideName(game: GameState, id: string): string {
  if (id === PLAYER) return game.realm?.name ?? 'ты'
  const kingdom = game.world.kingdoms[id]
  if (kingdom) return kingdom.name
  const lord = lordById(game.politics, id)
  return lord ? `${lord.title} ${lord.name}` : id
}

function ownerWord(game: GameState, owner: string | null): string {
  if (owner === PLAYER) return 'твоё'
  if (!owner) return 'ничьё'
  if (owner.startsWith('crown:')) return 'корона'
  const lord = lordById(game.politics, owner)
  return lord ? `${lord.title} ${lord.name}` : 'чужое'
}

function foodWord(settlement: Parameters<typeof foodSecurity>[0]): string {
  const security = foodSecurity(settlement)
  if (settlement.population <= 0) return 'заброшено'
  if (security < 0.25) return 'голод'
  if (security < 0.6) return 'впроголодь'
  return 'сыто'
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  banner: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  bannerTitle: { color: colors.gold, fontSize: font.title },
  row: {
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  rowTitle: { color: colors.text, fontSize: font.body },
  dim: { color: colors.dim, fontSize: font.small },
  free: { color: colors.good, fontSize: font.small },
  kingdom: {
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  region: { paddingLeft: spacing.md, paddingVertical: spacing.xs },
  regionName: { color: colors.text, fontSize: font.small },
  province: { paddingLeft: spacing.md, paddingVertical: spacing.xs },
  provinceName: { color: colors.dim, fontSize: font.tiny },
  place: { color: colors.faint, fontSize: font.tiny, paddingLeft: spacing.md },
})
