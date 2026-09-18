import {
  BUILDINGS,
  CAMP_HOURS,
  type Command,
  type GameState,
  PLACE_LABELS,
  type Passage,
  type PlaceKind,
  SHIPPING_COST,
  SHIPS,
  SHIP_KINDS,
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
  fordShut,
  formatDuration,
  hours,
  isOwnedByPlayer,
  isSite,
  jobsAt,
  journeyLeft,
  kingdomOf,
  landHolderOf,
  lanesFrom,
  lordById,
  lordSays,
  matchesAt,
  offersAt,
  partySize,
  passageCost,
  plagueAt,
  repairPrice,
  resalePrice,
  roadsFrom,
  seaHours,
  shipCarries,
  shipDef,
  timeOfDay,
  waitHours,
} from '@tpg/engine'
import { useState } from 'react'
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
  Card,
  Chip,
  Chips,
  Dim,
  Faint,
  Meter,
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
  const reasonFor = (command: Command): string | null => {
    const check = canApply(game, command)
    return check.ok ? null : check.message
  }
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

  // В пути дом выглядит иначе: не место, а дорога. Всё, что требует места —
  // торг, работа, люди, — под открытым небом недоступно (ROAD_COMMANDS в ядре),
  // поэтому и показывать его незачем.
  if (game.journey) return <OnTheRoad game={game} dispatch={dispatch} width={width} />

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
        {settlement ? null : (
          // У кургана хозяина нет, но земля под ним чья-то: держит тот, кто
          // держит главное место провинции.
          <Dim>{`Земля: ${ownerName(game, landHolderOf(game.world, game.settlements, game.locationId))}`}</Dim>
        )}
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
            // Отрезок пути показывает, куда он ведёт и чем пахнет: у места без
            // жителей это его собственная дурная слава, а не разбой округи.
            const wild = isSite(target.archetype) ? SITES[target.archetype] : null
            const grim = (wild?.danger ?? 0) >= 0.35
            // Весной брод под водой: чип остаётся на месте, но говорит почему
            // (этап 34).
            const flooded = fordShut(game.world, road.to, dayOf(game.time))
            return (
              <Road
                key={road.to}
                name={target.name}
                kind={target.archetype}
                meta={`${formatDuration(hours(dead ? road.hours * 2 : road.hours))}${danger ? ' · разбой' : ''}${grim ? ' · недоброе место' : ''}${plagueThere ? ' · мор' : ''}${dead ? ' · заросла' : ''}${flooded ? ' · половодье' : ''}`}
                warn={danger || plagueThere || grim || flooded}
                blocked={!canApply(game, command).ok}
                onPress={() => dispatch(command)}
              />
            )
          })}
        </Chips>
      </Section>

      <SeaSection game={game} dispatch={dispatch} />

      {settlement ? null : (
        <Section title="Что здесь делают">
          <Card
            glyph={<Icon name="rest" size={20} color={palette.info} />}
            title="Встать лагерем"
            description="Костёр, котелок и очередь караулить. Под небом отдыхаешь хуже, чем под крышей, и не знаешь, кто выйдет на огонь."
            meta={`${CAMP_HOURS} ч`}
            reason={reasonFor({ type: 'camp' })}
            onPress={() => dispatch({ type: 'camp' })}
          />
          {site && SITES[site].find ? (
            <Card
              glyph={<Icon name="journal" size={20} color={palette.gold} />}
              title={
                game.searchedSites.includes(game.locationId) ? 'Здесь уже осмотрено' : 'Осмотреться'
              }
              description="Место без жителей не пустое. Ищут выживанием или ловкостью рук, и находят один раз."
              meta="3 ч"
              reason={reasonFor({ type: 'search' })}
              onPress={() => dispatch({ type: 'search' })}
              tone="gold"
            />
          ) : null}
          {jobs === 0 ? <Dim>Работы здесь нет: за неё берутся там, где кто-то платит.</Dim> : null}
          {jobs > 0 ? (
            <Card
              glyph={<Icon name="earn" size={20} color={palette.gold} />}
              title="Работа земли"
              description="Тут платят не в лавке, а за то, что возьмёшь руками."
              meta={`${jobs} ${plural(jobs, 'работа', 'работы', 'работ')}`}
              onPress={() => openSheet('earn')}
            />
          ) : null}
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
  kind,
  meta,
  warn,
  blocked,
  onPress,
}: {
  name: string
  kind: PlaceKind
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
      <View style={styles.roadHead}>
        <Icon name={kind} size={16} color={warn ? palette.warn : palette.faint} />
        <Text style={styles.roadName}>{name}</Text>
      </View>
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
  // Разорение — не навсегда: у места с хозяином видно, что его отстраивают.
  const founded = game.world.locations[game.locationId]?.population ?? 0
  if (settlement.owner && settlement.population < founded * 0.9) {
    parts.push({ text: 'отстраивается', tone: 'warn' })
  }
  // Каким вышел год, видно по тому, что стоит в полях: игроку это важно знать
  // до того, как в амбарах станет пусто.
  if (settlement.harvest < 0.7) parts.push({ text: 'недород', tone: 'danger' })
  else if (settlement.harvest < 0.9) parts.push({ text: 'год тощий', tone: 'warn' })
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

/**
 * Дорога.
 *
 * Путь занимает часы, и эти часы видно: полоса, сколько осталось, через что
 * идёшь. Отсюда же два решения, которых у мгновенного перемещения быть не
 * могло: повернуть назад и встать лагерем прямо на дороге.
 */
/**
 * Море отсюда (этап 35).
 *
 * Гавань — это не строчка в описании места, а развилка: куда плыть и чьим
 * судном. Способ выбирается отдельно от цели нарочно — цена и скорость зависят
 * от него сильнее, чем от того, куда идти: своё судно уходит когда хочешь,
 * нанятое стоит денег, а на попутное не пустят дружину.
 */
function SeaSection({
  game,
  dispatch,
}: {
  game: GameState
  dispatch: (command: Command) => void
}) {
  const lanes = lanesFrom(game.world, game.locationId)
  const [chosen, setChosen] = useState<string | null>(null)
  if (lanes.length === 0) return null
  const target = lanes.find((lane) => lane.to === chosen) ?? lanes[0]
  if (!target) return null
  const people = partySize(game.party) + 1
  const manners: { manner: Passage; title: string; description: string }[] = [
    {
      manner: 'own',
      title: 'Своим судном',
      description: game.ship
        ? `«${game.ship.name}» — уходит когда скажешь и берёт ${shipCarries(game.ship)} душ.`
        : 'Своего судна у тебя нет: его покупают тут же, в гавани.',
    },
    {
      manner: 'hire',
      title: 'Нанять судно',
      description: 'Судно с командой на один переход: дорого, зато сразу и почти на всех.',
    },
    {
      manner: 'aboard',
      title: 'Попутным',
      description: 'Подсесть к чужому шкиперу: гроши, но ждать отплытия и идти дольше.',
    },
  ]

  return (
    <>
      <Section title="Морем отсюда" aside={`${lanes.length} путей`}>
        <Chips>
          {lanes.map((lane) => {
            const place = game.world.locations[lane.to]
            if (!place) return null
            return (
              <Chip
                key={lane.to}
                label={`${place.name} · ${formatDuration(hours(lane.hours))}`}
                active={lane.to === target.to}
                onPress={() => setChosen(lane.to)}
              />
            )
          })}
        </Chips>
        {manners.map((one) => {
          const command: Command = { type: 'sail', toLocationId: target.to, manner: one.manner }
          const going = seaHours(target.hours, one.manner, game.ship)
          const price = passageCost(one.manner, going, people)
          const wait = waitHours(one.manner)
          // Часы своего судна считаются по этому судну. Нет судна — нет и
          // часов: показывать чужие было бы враньём.
          const unknown = one.manner === 'own' && !game.ship
          return (
            <Card
              key={one.manner}
              glyph={<Icon name="port" size={20} color={palette.gold} />}
              title={one.title}
              description={one.description}
              meta={
                unknown
                  ? 'судна нет'
                  : `${formatDuration(hours(going))} ходу${price > 0 ? ` · ${price} монет` : ''}${
                      wait > 0 ? ` · ждать ${formatDuration(hours(wait))}` : ''
                    }`
              }
              reason={reasonOf(canApply(game, command))}
              onPress={() => dispatch(command)}
            />
          )
        })}
      </Section>

      <Section title="Пристань">
        {game.ship ? (
          <>
            <Card
              glyph={<Icon name="port" size={20} color={palette.info} />}
              title={`«${game.ship.name}» · ${shipDef(game.ship).label.toLowerCase()}`}
              description={shipDef(game.ship).description}
              meta={`целость ${Math.round(game.ship.condition * 100)}% · содержание ${shipDef(game.ship).upkeep} в день`}
            />
            <Card
              glyph={<Icon name="tools" size={20} color={palette.gold} />}
              title="Починить"
              description="Проконопатить, просмолить, сменить снасти. После шторма это не роскошь."
              meta={`${repairPrice(game.ship)} монет`}
              reason={reasonOf(canApply(game, { type: 'repairShip' }))}
              onPress={() => dispatch({ type: 'repairShip' })}
            />
            <Card
              glyph={<Icon name="caravan" size={20} color={palette.gold} />}
              title={`Пустить в торг до ${game.world.locations[target.to]?.name ?? '…'}`}
              description="Судно станет доходом, а не ходом: оно будет ходить само, торговать разницей цен и однажды не вернётся."
              meta={`${SHIPPING_COST} монет на товар`}
              reason={reasonOf(canApply(game, { type: 'foundShipping', awayId: target.to }))}
              onPress={() => dispatch({ type: 'foundShipping', awayId: target.to })}
            />
            <Card
              glyph={<Icon name="silver" size={20} color={palette.dim} />}
              title="Продать"
              description="Судно уйдёт к другому хозяину, а море останется чужим."
              meta={`${resalePrice(game.ship)} монет`}
              reason={reasonOf(canApply(game, { type: 'sellShip' }))}
              onPress={() => dispatch({ type: 'sellShip' })}
            />
          </>
        ) : (
          SHIP_KINDS.map((kind) => {
            const def = SHIPS[kind]
            return (
              <Card
                key={kind}
                glyph={<Icon name="port" size={20} color={palette.gold} />}
                title={`Купить: ${def.label.toLowerCase()}`}
                description={def.description}
                meta={`${def.price} монет · ${def.carries} душ · ${def.upkeep} в день`}
                reason={reasonOf(canApply(game, { type: 'buyShip', kind }))}
                onPress={() => dispatch({ type: 'buyShip', kind })}
              />
            )
          })
        )}
      </Section>
    </>
  )
}

function OnTheRoad({
  game,
  dispatch,
  width,
}: {
  game: GameState
  dispatch: (command: Command) => void
  width: number
}) {
  const journey = game.journey
  if (!journey) return null
  const from = game.world.locations[journey.fromId]
  const to = game.world.locations[journey.toId]
  const left = journeyLeft(journey)
  const wild = to && isSite(to.archetype) ? SITES[to.archetype] : null
  // В море всё то же самое и всё другое: часы идут, но лагерем не встают, и
  // впереди не разбой, а погода (этап 35).
  const atSea = journey.sea === true
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.scene}>
        <View style={styles.sceneArt}>
          <Scene
            archetype={to?.archetype ?? 'village'}
            timeOfDay={timeOfDay(game.time)}
            width={Math.max(200, width - spacing.lg * 2)}
            height={96}
          />
        </View>
        <View style={styles.sceneKind}>
          <Icon name={atSea ? 'port' : 'road'} size={18} color={palette.faint} />
          <Icon
            name={atSea ? 'coast' : (to?.terrain ?? 'plains')}
            size={18}
            color={palette.faint}
          />
          <Faint>
            {atSea
              ? `В МОРЕ · ${game.ship && journey.manner === 'own' ? `«${game.ship.name}»` : journey.manner === 'hire' ? 'нанятое судно' : 'попутное судно'}`
              : `В ПУТИ · ${TERRAIN_LABELS[to?.terrain ?? 'plains']}`}
          </Faint>
        </View>
        <Title>{to?.name ?? '…'}</Title>
        <Dim>{`из ${from?.name ?? '…'} · осталось ${formatDuration(hours(Math.ceil(left)))}`}</Dim>
        <View style={styles.roadMeter}>
          {/* Полоса в часах, а не в процентах: игрок считает дорогу часами. */}
          <Meter
            value={journey.hours - left}
            max={journey.hours}
            label={`Пройдено из ${journey.hours} ч`}
          />
        </View>
        {wild && !atSea ? <Dim>{wild.description}</Dim> : null}
        {atSea ? <Dim>Вокруг вода. Вахту стоят по очереди, берега не видно.</Dim> : null}
        <RoadState game={game} />
      </View>

      <Section title={atSea ? 'Что делают в море' : 'Что делают в пути'}>
        <Card
          glyph={<Icon name={atSea ? 'port' : 'road'} size={20} color={palette.gold} />}
          title={atSea ? 'Идти прежним курсом' : 'Идти дальше'}
          description={
            atSea
              ? 'Часы идут сами: ускорь время наверху, и берег покажется.'
              : 'Часы идут сами: ускорь время наверху, и дорога кончится.'
          }
          meta={`${formatDuration(hours(Math.ceil(left)))} до места`}
          onPress={() => dispatch({ type: 'tick', minutes: 60 })}
        />
        {atSea ? null : (
          <Card
            glyph={<Icon name="rest" size={20} color={palette.info} />}
            title="Встать лагерем"
            description="Ночёвка под небом прямо на дороге: отдохнёшь хуже, чем под крышей, и неизвестно, кто выйдет на огонь."
            meta={`${CAMP_HOURS} ч`}
            reason={reasonOf(canApply(game, { type: 'camp' }))}
            onPress={() => dispatch({ type: 'camp' })}
          />
        )}
        <Card
          glyph={<Icon name="map" size={20} color={palette.dim} />}
          title={atSea ? 'Повернуть к прежнему берегу' : 'Повернуть назад'}
          description={`Обратно в ${from?.name ?? 'откуда вышел'}: столько же, сколько уже прошёл.`}
          meta={formatDuration(hours(Math.ceil(journey.hours - left)))}
          onPress={() => dispatch({ type: 'turnBack' })}
        />
      </Section>
    </ScrollView>
  )
}

/**
 * Каково на дороге прямо сейчас.
 *
 * Ночью идут медленнее и нарываются чаще; дурная слава земли впереди — это то,
 * ради чего стоит встать лагерем до света.
 */
function RoadState({ game }: { game: GameState }) {
  const journey = game.journey
  if (!journey) return null
  if (journey.sea) {
    const worn = game.ship && journey.manner === 'own' && game.ship.condition < 0.6
    return (
      <View style={styles.state}>
        <Text style={[styles.stateWord, { color: palette.warn }]}>в море не сворачивают</Text>
        {worn ? (
          <Text style={[styles.stateWord, { color: palette.danger }]}>судно течёт</Text>
        ) : null}
      </View>
    )
  }
  const dark = timeOfDay(game.time) === 'night'
  const to = game.world.locations[journey.toId]
  const wild = to && isSite(to.archetype) ? SITES[to.archetype] : null
  const banditry = game.settlements[journey.toId]?.banditry ?? 0
  const parts: { text: string; tone: 'warn' | 'danger' }[] = []
  if (dark) parts.push({ text: 'ночь: идёшь медленнее', tone: 'warn' })
  if (banditry > 0.4) parts.push({ text: 'впереди разбой', tone: 'danger' })
  if ((wild?.danger ?? 0) >= 0.35) parts.push({ text: 'недоброе место', tone: 'danger' })
  if (parts.length === 0) return null
  return (
    <View style={styles.state}>
      {parts.map((part) => (
        <Text
          key={part.text}
          style={[
            styles.stateWord,
            { color: part.tone === 'danger' ? palette.danger : palette.warn },
          ]}
        >
          {part.text}
        </Text>
      ))}
    </View>
  )
}

/** Почему нельзя — если нельзя. */
function reasonOf(verdict: ReturnType<typeof canApply>): string | undefined {
  return verdict.ok ? undefined : verdict.message
}

function formatPopulation(value: number): string {
  // Ядро считает людей дробью: суточная прибавка деревни меньше человека, и
  // округление съедало бы её целиком (life.ts). Игроку дробь показывать нечего.
  return Math.round(value).toLocaleString('ru-RU').replace(/ /g, ' ')
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const styles = StyleSheet.create({
  roadMeter: { marginTop: spacing.sm, width: '100%' },
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
  roadHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
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
