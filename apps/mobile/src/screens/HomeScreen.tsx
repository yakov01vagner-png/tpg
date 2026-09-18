import {
  BUILDINGS,
  type Command,
  type GameState,
  PLACE_LABELS,
  SITES,
  TERRAIN_LABELS,
  addressOf,
  canApply,
  companionsAt,
  coursesAt,
  dayOf,
  examsAt,
  foeName,
  foodSecurity,
  formatDuration,
  hours,
  isOwnedByPlayer,
  isSite,
  jobsAt,
  kingdomOf,
  lordById,
  lordSays,
  matchesAt,
  offersAt,
  plagueAt,
  roadsFrom,
  timeOfDay,
} from '@tpg/engine'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useWindowDimensions } from 'react-native'
import { Icon } from '../art/icons'
import { COMPANION_FACES, Portrait } from '../art/portrait'
import { Scene } from '../art/scene'
import { dismissHint, useDismissedHints } from '../game/hintState'
import { nextHint } from '../game/hints'
import { openSheet } from '../game/nav'
import { dispatch } from '../game/store'
import { font, lineHeight, palette, radii, spacing, touch } from '../theme'
import {
  Body,
  Button,
  Chip,
  Chips,
  Dim,
  Faint,
  Panel,
  Section,
  Tile,
  Tiles,
  Title,
} from '../ui/parts'

/**
 * Дом: место, где ты стоишь.
 *
 * Сверху — сцена: что это за место и что в нём творится (полоса под
 * иллюстрацию этапа 11). Под ней дороги — фишками, с часами. Потом намерения:
 * не «работа, наставники, испытания», а «заработать, научиться, рынок, люди,
 * своё» — то, что игрок думает, а не то, как устроен движок. Внизу — что
 * случилось только что: история под рукой, а не в пятой вкладке.
 */
export function HomeScreen({ game }: { game: GameState }) {
  const { width } = useWindowDimensions()
  const here = game.world.locations[game.locationId]
  const settlement = game.settlements[game.locationId]
  const people = settlement?.population ?? here?.population ?? 0
  const kingdom = kingdomOf(game.world, game.locationId)
  const roads = roadsFrom(game.world, game.locationId)
  const sick = plagueAt(game.plagues, game.locationId)

  const jobs = jobsAt(game).length
  const offers = offersAt(game).length + game.quests.length
  const lessons = coursesAt(game).length + examsAt(game).length
  const companions = companionsAt(game).length
  const hosts = game.bands.filter((band) => band.locationId === game.locationId && !band.travel)
  const matches = matchesAt(game).length
  const mine = settlement ? isOwnedByPlayer(settlement) : false
  const besieging = game.siege?.locationId === game.locationId
  const recent = [...game.log].reverse().slice(0, 3)
  const holder = settlement?.owner ? lordById(game.politics, settlement.owner) : null
  const following = game.companions.filter((one) => !one.captive && one.role.type === 'party')
  const stewards = game.companions.filter(
    (one) => one.role.type === 'steward' && one.role.locationId === game.locationId,
  )
  const happening: { text: string; tone: 'danger' | 'warn' | 'info' }[] = []
  if (hosts.length > 0) {
    happening.push({
      text: `У ворот войско: ${hosts
        .map((band) => {
          const lord = lordById(game.politics, band.lordId)
          return lord ? `${lord.title} ${lord.name}` : 'рать короны'
        })
        .join(', ')}`,
      tone: 'danger',
    })
  }
  if (besieging)
    happening.push({ text: `Ты держишь осаду: ${game.siege?.days ?? 0} сут.`, tone: 'warn' })
  if (sick)
    happening.push({
      text: settlement?.quarantined ? 'Мор — ворота закрыты' : 'Здесь мор',
      tone: 'danger',
    })
  if (settlement && settlement.population <= 0)
    happening.push({ text: 'Руины: людей нет, дороги заросли', tone: 'warn' })
  if (settlement?.building) {
    happening.push({ text: `Стройка: осталось ${settlement.building.daysLeft} сут.`, tone: 'info' })
  }
  // Место без жителей: здесь не торгуют и не нанимаются, зато здесь можно
  // оказаться — и это надо сказать словами, а не пустыми плитками.
  const site = here && isSite(here.archetype) ? here.archetype : null
  if (site && SITES[site].danger >= 0.35) {
    happening.push({ text: 'Место недоброе: здесь ходят с оглядкой', tone: 'warn' })
  }
  const wound = game.character.wound
  if (wound) {
    happening.push({
      text:
        wound.severity >= 0.5
          ? `Ты ранен: ${wound.daysLeft} сут. в постели`
          : `Рана затягивается: ещё ${wound.daysLeft} сут.`,
      tone: wound.severity >= 0.5 ? 'danger' : 'warn',
    })
  }
  const captivity = game.character.captivity

  const ownTitle = mine ? 'Твоя земля' : besieging ? 'Осада' : game.service ? 'Служба' : 'Своё'
  const ownSubtitle = mine
    ? 'Подати, стройка, гарнизон'
    : besieging
      ? `Идёт ${game.siege?.days ?? 0} сут.`
      : game.service
        ? 'Война, лен, своё владение'
        : kingdom
          ? `Служба: ${kingdom.name}`
          : 'Здесь некому служить'

  const dismissed = useDismissedHints()
  const hint = nextHint(game, dismissed)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {hint ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => dismissHint(hint.id)}
          style={styles.hint}
        >
          <Icon name="journal" size={16} color={palette.gold} />
          <Text style={styles.hintText}>{hint.text}</Text>
          <Text style={styles.hintClose}>✕</Text>
        </Pressable>
      ) : null}
      <View style={[styles.scene, sick ? styles.sceneSick : null]}>
        <View style={styles.sceneArt}>
          <Scene
            archetype={here?.archetype ?? 'village'}
            timeOfDay={timeOfDay(game.time)}
            width={Math.max(200, width - spacing.lg * 2)}
            height={96}
          />
        </View>
        <View style={styles.sceneKind}>
          <Icon name={here?.archetype ?? 'village'} size={18} color={palette.faint} />
          <Icon name={here?.terrain ?? 'plains'} size={18} color={palette.faint} />
          <Faint>{`${PLACE_LABELS[here?.archetype ?? 'village'].toUpperCase()} · ${TERRAIN_LABELS[here?.terrain ?? 'plains']}`}</Faint>
        </View>
        <Title>{here?.name ?? '…'}</Title>
        <Dim>
          {settlement
            ? `${people > 0 ? `${formatPopulation(people)} жителей` : 'заброшено'} · ${ownerName(game, settlement.owner)}`
            : `${addressOf(game.world, game.locationId)}`}
        </Dim>
        {site ? <Dim>{SITES[site].description}</Dim> : null}
        <StateLine game={game} />
        {settlement && settlement.buildings.length > 0 ? (
          <View style={styles.built}>
            {settlement.buildings.map((id) => (
              <View key={id} style={styles.builtOne}>
                <Icon name={id} size={18} color={palette.dim} />
                <Text style={styles.builtLabel}>{BUILDINGS[id].label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {captivity ? (
        <Panel tone="danger">
          <Body tone="danger">{`Ты в плену. Держит ${foeName(game, captivity.captorId)}.`}</Body>
          <Dim>
            {`Отпустят через ${captivity.daysLeft} сут., взяв что найдут в кошеле. Выкуп сейчас — ${captivity.ransom}.`}
          </Dim>
          <View style={styles.captiveActions}>
            <Button
              label={`Заплатить ${captivity.ransom}`}
              tone="primary"
              onPress={() => dispatch({ type: 'payRansom' })}
            />
            <Button
              label="Ждать сутки"
              tone="quiet"
              onPress={() => dispatch({ type: 'tick', minutes: 24 * 60 })}
            />
          </View>
        </Panel>
      ) : null}

      {happening.length > 0 ? (
        <Section title="Что происходит">
          {happening.map((item) => (
            <Body key={item.text} tone={item.tone}>
              {item.text}
            </Body>
          ))}
        </Section>
      ) : null}

      {holder || following.length > 0 || stewards.length > 0 ? (
        <Section title="Кто здесь">
          <View style={styles.faces}>
            {holder ? (
              <View style={styles.faceCell}>
                <Portrait seed={holder.id} size={44} age={46} kingdomId={holder.kingdomId} />
                <Text numberOfLines={1} style={styles.faceName}>
                  {holder.name}
                </Text>
                <Text style={styles.faceRole}>{holder.title}</Text>
              </View>
            ) : null}
            {[...following, ...stewards].map((one) => (
              <View key={one.id} style={styles.faceCell}>
                <Portrait seed={one.id} size={44} overrides={COMPANION_FACES[one.id]} />
                <Text numberOfLines={1} style={styles.faceName}>
                  {one.name.split(' ')[0]}
                </Text>
                <Text style={styles.faceRole}>
                  {one.role.type === 'steward' ? 'управляет' : 'с тобой'}
                </Text>
              </View>
            ))}
          </View>
          {holder ? (
            <Text
              style={styles.speech}
            >{`${holder.title} ${holder.name}: «${lordSays(game, holder, dayOf(game.time))}»`}</Text>
          ) : null}
        </Section>
      ) : null}

      <Section title="Дороги отсюда" aside={roads.length === 0 ? 'нет' : undefined}>
        <Chips>
          {roads.map((road) => {
            const target = game.world.locations[road.to]
            if (!target) return null
            const command: Command = { type: 'travel', toLocationId: road.to }
            const danger = (game.settlements[road.to]?.banditry ?? 0) > 0.4
            const plagueThere = plagueAt(game.plagues, road.to) !== null
            const dead = (game.settlements[road.to]?.population ?? 1) <= 0
            return (
              <Road
                key={road.to}
                name={target.name}
                meta={`${formatDuration(hours(dead ? road.hours * 2 : road.hours))}${danger ? ' · разбой' : ''}${plagueThere ? ' · мор' : ''}${dead ? ' · заросла' : ''}`}
                warn={danger || plagueThere}
                blocked={!canApply(game, command).ok}
                onPress={() => dispatch(command)}
              />
            )
          })}
        </Chips>
      </Section>

      {settlement ? null : (
        <Section title="Что здесь есть">
          <Dim>
            Ни торга, ни работы, ни наставника: людей тут не живёт. Отсюда можно идти дальше, а
            можно встать на ночь.
          </Dim>
        </Section>
      )}

      {settlement ? (
        <Tiles>
          <Tile
            glyph={<Icon name="earn" size={22} color={palette.gold} />}
            title="Заработать"
            subtitle={`${jobs} ${plural(jobs, 'работа', 'работы', 'работ')}${offers > 0 ? ` · ${offers} ${plural(offers, 'поручение', 'поручения', 'поручений')}` : ''}`}
            count={jobs + offers}
            onPress={() => openSheet('earn')}
            tone="gold"
          />
          <Tile
            glyph={<Icon name="learn" size={22} color={palette.good} />}
            title="Научиться"
            subtitle={lessons > 0 ? 'Наставники и испытания' : 'Учиться здесь не у кого'}
            count={lessons}
            onPress={() => openSheet('learn')}
            tone="good"
          />
          <Tile
            glyph={<Icon name="market" size={22} color={palette.gold} />}
            title="Рынок"
            subtitle={people > 0 ? 'Товары, снаряжение, починка' : 'Торговать не с кем'}
            count={people > 0 ? 1 : 0}
            onPress={() => openSheet('market')}
            tone="gold"
          />
          <Tile
            glyph={
              <Icon
                name={hosts.length > 0 ? 'army' : 'people'}
                size={22}
                color={hosts.length > 0 ? palette.danger : palette.info}
              />
            }
            title="Люди"
            subtitle={
              hosts.length > 0
                ? `Войско у ворот: ${hosts.length}`
                : companions > 0
                  ? `Есть кого позвать: ${companions}`
                  : matches > 0
                    ? 'Здесь сидит дом лорда'
                    : 'Отряд и спутники'
            }
            count={1}
            onPress={() => openSheet('people')}
            tone={hosts.length > 0 ? 'danger' : 'info'}
          />
          <Tile
            glyph={
              <Icon
                name={mine ? 'home' : besieging ? 'siege' : 'own'}
                size={22}
                color={palette.info}
              />
            }
            title={ownTitle}
            subtitle={ownSubtitle}
            count={1}
            onPress={() => openSheet('own')}
            tone="info"
          />
        </Tiles>
      ) : null}

      <Section title="Отдых">
        <Chips>
          <Chip label="Передохнуть · 1 ч" onPress={() => dispatch({ type: 'rest', hours: 1 })} />
          <Chip label="До вечера · 4 ч" onPress={() => dispatch({ type: 'rest', hours: 4 })} />
          <Chip label="Спать до утра" onPress={() => dispatch({ type: 'sleep' })} />
        </Chips>
      </Section>

      <Section title="Что случилось">
        {recent.map((entry, index) => (
          <Body key={`${entry.time}-${index}`}>{entry.text}</Body>
        ))}
        <Pressable onPress={() => openSheet('chronicle')} style={styles.more}>
          <Text style={styles.moreLabel}>Вся летопись ›</Text>
        </Pressable>
      </Section>
    </ScrollView>
  )
}

/** Дорога фишкой: имя, часы и знак опасности, всё одним взглядом. */
function Road({
  name,
  meta,
  warn,
  blocked,
  onPress,
}: {
  name: string
  meta: string
  warn: boolean
  blocked: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.road,
        warn && styles.roadWarn,
        blocked && styles.roadBlocked,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.roadName}>{name}</Text>
      <Text style={[styles.roadMeta, warn && styles.roadMetaWarn]}>{meta}</Text>
    </Pressable>
  )
}

/** Что творится: сытость, разбой, мор — словами и с цветом. */
function StateLine({ game }: { game: GameState }) {
  const settlement = game.settlements[game.locationId]
  if (!settlement || settlement.population <= 0) return null
  const security = foodSecurity(settlement)
  const sick = plagueAt(game.plagues, game.locationId)
  const parts: { text: string; tone: 'good' | 'warn' | 'danger' }[] = [
    security < 0.25
      ? { text: 'голодает', tone: 'danger' }
      : security < 0.6
        ? { text: 'впроголодь', tone: 'warn' }
        : { text: 'сыто', tone: 'good' },
  ]
  if (settlement.banditry > 0.6) parts.push({ text: 'на дорогах разбой', tone: 'danger' })
  else if (settlement.banditry > 0.25) parts.push({ text: 'на дорогах пошаливают', tone: 'warn' })
  if (settlement.strain > 0.4) parts.push({ text: 'земля истощена', tone: 'warn' })
  if (sick) parts.push({ text: 'здесь мор', tone: 'danger' })
  return (
    <View style={styles.state}>
      {parts.map((part) => (
        <Text
          key={part.text}
          style={[
            styles.stateWord,
            {
              color:
                part.tone === 'danger'
                  ? palette.danger
                  : part.tone === 'warn'
                    ? palette.warn
                    : palette.good,
            },
          ]}
        >
          {part.text}
        </Text>
      ))}
    </View>
  )
}

function ownerName(game: GameState, owner: string | null): string {
  if (!owner) return 'ничья земля'
  if (owner === 'player') return 'твоя земля'
  if (owner.startsWith('crown:'))
    return `корона ${game.world.kingdoms[owner.slice('crown:'.length)]?.name ?? ''}`
  const lord = lordById(game.politics, owner)
  return lord ? `держит ${lord.title} ${lord.name}` : 'чужая земля'
}

function formatPopulation(value: number): string {
  return value.toLocaleString('ru-RU').replace(/ /g, ' ')
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const styles = StyleSheet.create({
  hint: {
    alignItems: 'center',
    backgroundColor: palette.raised,
    borderLeftColor: palette.gold,
    borderLeftWidth: 3,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  hintText: { color: palette.text, flex: 1, fontSize: font.small, lineHeight: lineHeight.small },
  hintClose: { color: palette.faint, fontSize: font.small, paddingHorizontal: spacing.xs },
  speech: {
    color: palette.dim,
    fontSize: font.small,
    fontStyle: 'italic',
    lineHeight: lineHeight.small,
    marginTop: spacing.sm,
  },
  captiveActions: { gap: spacing.sm, marginTop: spacing.sm },
  built: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  builtOne: { alignItems: 'center', minWidth: 48 },
  builtLabel: { color: palette.faint, fontSize: 9 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  scene: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    gap: spacing.xxs,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sceneArt: { marginHorizontal: -spacing.lg, marginBottom: spacing.sm },
  sceneSick: { borderColor: palette.danger, borderWidth: 1 },
  sceneKind: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  state: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  stateWord: { fontSize: font.small },
  road: {
    backgroundColor: palette.surface,
    borderColor: palette.lineStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: touch.comfortable,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roadWarn: { borderColor: palette.danger },
  roadBlocked: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
  roadName: { color: palette.text, fontSize: font.body, lineHeight: lineHeight.body },
  roadMeta: { color: palette.gold, fontSize: font.tiny, lineHeight: lineHeight.tiny },
  roadMetaWarn: { color: palette.danger },
  more: { minHeight: touch.min, justifyContent: 'center' },
  faces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  faceCell: { alignItems: 'center', width: 64 },
  faceName: { color: palette.text, fontSize: font.tiny, marginTop: spacing.xxs },
  faceRole: { color: palette.faint, fontSize: 9 },
  moreLabel: { color: palette.gold, fontSize: font.small },
})
