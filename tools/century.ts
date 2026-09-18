/**
 * Век мира без игрока.
 *
 * Не тест, а измерительный прогон: мир считается ровно тем же путём, каким его
 * догоняет игра (`tickDays` сутками, следом `tickPolitics`), и с него снимается
 * всё, что можно посчитать. Нужен затем, чтобы перед этапом 7 знать, каков мир
 * без живых армий, — иначе потом не с чем будет сравнивать.
 *
 * Запуск: npx tsx tools/century.ts [лет] [зёрна через запятую]
 */
import { musterBands, tickBands } from '../packages/engine/src/band'
import type { Band } from '../packages/engine/src/band'
import { tickDiplomacy } from '../packages/engine/src/diplomacy'
import { createSettlements, priceOf } from '../packages/engine/src/economy'
import type { Settlement } from '../packages/engine/src/economy'
import { foodSecurity, tickDays } from '../packages/engine/src/life'
import { createRng } from '../packages/engine/src/rng'
import { createPolitics, isRebel, tickPolitics } from '../packages/engine/src/war'
import type { Politics, War } from '../packages/engine/src/war'
import { generateWorld } from '../packages/engine/src/world/generate'
import { kingdomOf } from '../packages/engine/src/world/queries'
import type { World } from '../packages/engine/src/world/types'

type Settlements = Readonly<Record<string, Settlement>>

interface Snapshot {
  readonly year: number
  readonly population: number
  readonly alive: number
  readonly starving: number
  readonly banditry: number
  readonly wars: number
  readonly rebels: number
  readonly grainVillage: number
  readonly grainCity: number
}

interface Run {
  readonly seed: number
  readonly years: number
  readonly ms: number
  readonly snapshots: readonly Snapshot[]
  readonly famines: number
  readonly faminesDeaths: number
  readonly abandoned: number
  readonly resettled: number
  readonly warsDeclared: number
  readonly peaces: number
  readonly raids: number
  readonly raidLosses: number
  readonly rebellions: number
  readonly warDays: number
  readonly longestWar: number
  readonly warPairs: ReadonlyMap<string, number>
  readonly archmageDays: Readonly<Record<string, number>>
  readonly byKingdom: ReadonlyMap<string, { start: number; end: number }>
  readonly byArchetype: ReadonlyMap<string, { start: number; end: number; places: number }>
  readonly worstBanditry: readonly [string, number][]
  readonly finalPopulation: number
  readonly peak: Snapshot
  readonly trough: Snapshot
  readonly rebelsAtEnd: number
  readonly lordsAtEnd: number
  readonly placesUnderRebels: number
  readonly rebelWarsAtEnd: number
  readonly taken: number
  readonly clashes: number
  readonly clashFallen: number
  readonly submitted: number
  readonly lordsFell: number
  readonly bandsAtEnd: number
  readonly warriorsAtEnd: number
  readonly landStart: ReadonlyMap<string, number>
  readonly landEnd: ReadonlyMap<string, number>
  readonly changedHands: number
  readonly alliancesMade: number
  readonly alliancesBroken: number
  readonly joinedWars: number
  readonly tributes: number
  readonly alliancesAtEnd: number
  readonly tributesAtEnd: number
}

function population(settlements: Settlements): number {
  let sum = 0
  for (const settlement of Object.values(settlements)) sum += settlement.population
  return sum
}

function alive(settlements: Settlements): number {
  return Object.values(settlements).filter((s) => s.population > 0).length
}

function run(seed: number, years: number): Run {
  const world = generateWorld(seed)
  let settlements = createSettlements(world)
  const [politicsStart, owned] = createPolitics(world, settlements, createRng(seed))
  settlements = owned
  let politics: Politics = politicsStart
  let rng = createRng(seed + 1000)
  const [initial, afterMuster] = musterBands(politicsStart, settlements, createRng(seed + 7))
  let bands: readonly Band[] = initial
  rng = afterMuster

  const village = pick(world, 'village')
  const city = pick(world, 'capital')

  const byKingdom = new Map<string, { start: number; end: number }>()
  const byArchetype = new Map<string, { start: number; end: number; places: number }>()
  for (const [id, settlement] of Object.entries(settlements)) {
    const kingdom = kingdomOf(world, id)?.id ?? '—'
    const kingdomRow = byKingdom.get(kingdom) ?? { start: 0, end: 0 }
    kingdomRow.start += settlement.population
    byKingdom.set(kingdom, kingdomRow)
    const archetype = world.locations[id]?.archetype ?? '—'
    const archetypeRow = byArchetype.get(archetype) ?? { start: 0, end: 0, places: 0 }
    archetypeRow.start += settlement.population
    archetypeRow.places += 1
    byArchetype.set(archetype, archetypeRow)
  }

  // Чья земля: по держателю, а не по скелету мира. Ради этого блок и затеян —
  // если за век числа не сдвинулись, значит войска ходят впустую.
  const landOf = (): Map<string, number> => {
    const tally = new Map<string, number>()
    for (const settlement of Object.values(settlements)) {
      if (settlement.population <= 0 || !settlement.owner) continue
      const side = sideOfOwner(settlement.owner)
      tally.set(side, (tally.get(side) ?? 0) + 1)
    }
    return tally
  }
  const sideOfOwner = (owner: string): string => {
    if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
    const lord = politics.lords.find((candidate) => candidate.id === owner)
    if (!lord) return 'ничьи'
    return lord.kingdomId ?? 'мятежники'
  }
  const landStart = landOf()
  const ownerAtStart = new Map(
    Object.entries(settlements).map(([id, settlement]) => [id, settlement.owner]),
  )

  const snapshots: Snapshot[] = []
  const warPairs = new Map<string, number>()
  const archmageDays: Record<string, number> = { free: 0, busy: 0, refused: 0 }
  const seenWars = new Map<string, number>()
  const wasAlive = new Set(Object.keys(settlements).filter((id) => settlements[id]?.population > 0))

  let famines = 0
  let faminesDeaths = 0
  let abandoned = 0
  let resettled = 0
  let warsDeclared = 0
  let peaces = 0
  let raids = 0
  let raidLosses = 0
  let rebellions = 0
  let warDays = 0
  let longestWar = 0
  let taken = 0
  let clashes = 0
  let clashFallen = 0
  let submitted = 0
  let lordsFell = 0
  let alliancesMade = 0
  let alliancesBroken = 0
  let joinedWars = 0
  let tributes = 0

  const began = Date.now()
  for (let day = 1; day <= years * 365; day += 1) {
    const life = tickDays(world, settlements, 1)
    settlements = life.settlements
    for (const event of life.events) {
      if (event.type === 'famine') {
        famines += 1
        faminesDeaths += event.deaths
      } else {
        abandoned += 1
      }
    }

    const turn = tickPolitics(world, politics, settlements, day, rng)
    politics = turn.politics
    settlements = turn.settlements
    rng = turn.rng

    const talks = tickDiplomacy(world, politics, day, rng)
    politics = talks.politics
    rng = talks.rng
    for (const event of talks.events) {
      if (event.type === 'allianceMade') alliancesMade += 1
      else if (event.type === 'allianceBroken') alliancesBroken += 1
      else if (event.type === 'joinedWar') joinedWars += 1
    }

    const march = tickBands(world, politics, settlements, bands, rng)
    bands = march.bands
    settlements = march.settlements
    politics = march.politics
    rng = march.rng
    for (const event of march.events) {
      if (event.type === 'bandRaid') {
        raids += 1
        raidLosses += event.lost
      } else if (event.type === 'bandTook') {
        taken += 1
      } else if (event.type === 'bandClash') {
        clashes += 1
        clashFallen += event.fallen
      } else if (event.type === 'lordSubmits') {
        submitted += 1
      } else if (event.type === 'lordFell') {
        lordsFell += 1
      }
    }
    for (const event of turn.events) {
      if (event.type === 'tribute') {
        tributes += 1
        continue
      }
      if (event.type === 'warDeclared') {
        warsDeclared += 1
        warPairs.set(pairKey(event.war), (warPairs.get(pairKey(event.war)) ?? 0) + 1)
        seenWars.set(warKey(event.war), day)
      } else if (event.type === 'peace') {
        peaces += 1
        const started = seenWars.get(warKey(event.war))
        if (started !== undefined) longestWar = Math.max(longestWar, day - started)
        seenWars.delete(warKey(event.war))
      } else if (event.type === 'raid') {
        raids += 1
        raidLosses += event.lost
      } else if (event.type === 'rebellion') {
        rebellions += 1
      }
    }
    warDays += politics.wars.length
    for (const archmage of Object.values(politics.archmages)) {
      archmageDays[archmage.state] = (archmageDays[archmage.state] ?? 0) + 1
    }
    // Место, которое ожило после запустения, — отдельная новость.
    for (const [id, settlement] of Object.entries(settlements)) {
      if (settlement.population > 0 && !wasAlive.has(id)) {
        wasAlive.add(id)
        resettled += 1
      } else if (settlement.population <= 0) {
        wasAlive.delete(id)
      }
    }

    if (day % 365 === 0) {
      snapshots.push(snapshot(world, settlements, politics, day / 365, village, city))
    }
  }
  const ms = Date.now() - began

  for (const [id, settlement] of Object.entries(settlements)) {
    const kingdom = kingdomOf(world, id)?.id ?? '—'
    const kingdomRow = byKingdom.get(kingdom)
    if (kingdomRow) kingdomRow.end += settlement.population
    const archetype = world.locations[id]?.archetype ?? '—'
    const archetypeRow = byArchetype.get(archetype)
    if (archetypeRow) archetypeRow.end += settlement.population
  }

  const worstBanditry = Object.entries(settlements)
    .map(([id, settlement]) => [world.locations[id]?.name ?? id, settlement.banditry] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => [name, value] as [string, number])

  const rebels = politics.lords.filter(isRebel)
  const placesUnderRebels = Object.values(settlements).filter((s) =>
    rebels.some((lord) => lord.id === s.owner),
  ).length
  const rebelWarsAtEnd = politics.wars.filter((war) => war.reason.startsWith('мятеж')).length

  const peak = snapshots.reduce((best, s) => (s.population > best.population ? s : best))
  const trough = snapshots.reduce((worst, s) => (s.population < worst.population ? s : worst))

  return {
    seed,
    years,
    ms,
    snapshots,
    famines,
    faminesDeaths,
    abandoned,
    resettled,
    warsDeclared,
    peaces,
    raids,
    raidLosses,
    rebellions,
    warDays,
    longestWar,
    warPairs,
    archmageDays,
    byKingdom,
    byArchetype,
    worstBanditry,
    finalPopulation: population(settlements),
    peak,
    trough,
    rebelsAtEnd: rebels.length,
    lordsAtEnd: politics.lords.length,
    placesUnderRebels,
    rebelWarsAtEnd,
    taken,
    clashes,
    clashFallen,
    submitted,
    lordsFell,
    landStart,
    landEnd: landOf(),
    alliancesMade,
    alliancesBroken,
    joinedWars,
    tributes,
    alliancesAtEnd: politics.alliances.length,
    tributesAtEnd: politics.tributes.length,
    changedHands: Object.entries(settlements).filter(
      ([id, settlement]) => ownerAtStart.get(id) !== settlement.owner,
    ).length,
    bandsAtEnd: bands.length,
    warriorsAtEnd: bands.reduce(
      (sum, band) => sum + Object.values(band.units).reduce((a, b) => a + (b ?? 0), 0),
      0,
    ),
  }
}

function snapshot(
  world: World,
  settlements: Settlements,
  politics: Politics,
  year: number,
  village: string,
  city: string,
): Snapshot {
  const living = Object.values(settlements).filter((s) => s.population > 0)
  const banditry = living.reduce((sum, s) => sum + s.banditry, 0) / Math.max(1, living.length)
  return {
    year,
    population: population(settlements),
    alive: alive(settlements),
    starving: living.filter((s) => foodSecurity(s) < 0.3).length,
    banditry,
    wars: politics.wars.length,
    rebels: politics.lords.filter(isRebel).length,
    grainVillage: settlements[village] ? priceOf(world, settlements[village], 'grain') : 0,
    grainCity: settlements[city] ? priceOf(world, settlements[city], 'grain') : 0,
  }
}

function pick(world: World, archetype: string): string {
  const found = Object.values(world.locations).find((l) => l.archetype === archetype)
  if (!found) throw new Error(`нет места вида «${archetype}»`)
  return found.id
}

const pairKey = (war: War) => [war.a, war.b].sort().join(' ↔ ')
const warKey = (war: War) => `${pairKey(war)}|${war.since}`

// ——— отчёт ———

const years = Number(process.argv[2] ?? 100)
const seeds = (process.argv[3] ?? '1,2,3').split(',').map(Number)

console.log(`\n=== ВЕК МИРА БЕЗ ИГРОКА: ${years} лет, зёрна ${seeds.join(', ')} ===\n`)

const runs = seeds.map((seed) => run(seed, years))
const first = runs[0]
if (!first) throw new Error('нечего считать: не задано ни одного зерна')
const world = generateWorld(first.seed)

console.log(`--- Зерно ${first.seed}: подробно ---\n`)
const startPopulation = first.snapshots.length > 0 ? population(createSettlements(world)) : 0
console.log(`Население:      ${startPopulation} → ${first.finalPopulation}`)
console.log(
  `Пик / дно:      ${first.peak.population} (год ${first.peak.year}) / ${first.trough.population} (год ${first.trough.year})`,
)
console.log(
  `Живых мест:     ${first.snapshots[first.snapshots.length - 1]?.alive} из ${Object.keys(world.locations).length}`,
)
console.log(`Запустело:      ${first.abandoned}, заселено заново: ${first.resettled}`)
console.log(`Голод:          ${first.famines} случаев, ${first.faminesDeaths} умерших`)
console.log(
  `Войны:          объявлено ${first.warsDeclared}, миров ${first.peaces}, ` +
    `войно-дней ${first.warDays}, самая долгая ${(first.longestWar / 365).toFixed(1)} лет`,
)
console.log(`Разорения:      ${first.raids} набегов, ${first.raidLosses} погибших`)
console.log(
  `Мятежи:         ${first.rebellions} за век; к концу мятежников ${first.rebelsAtEnd} из ` +
    `${first.lordsAtEnd} лордов, под ними ${first.placesUnderRebels} мест, ` +
    `мятежных войн идёт ${first.rebelWarsAtEnd}`,
)
const archmageTotal = Object.values(first.archmageDays).reduce((a, b) => a + b, 0)
console.log(
  `Архимаги:       ${Object.entries(first.archmageDays)
    .map(([state, days]) => `${state} ${((days / archmageTotal) * 100).toFixed(0)}%`)
    .join(', ')}`,
)
console.log(
  `Дружины:        ${first.clashes} стычек (${first.clashFallen} полегло), ` +
    `${first.taken} мест взято осадой, ${first.submitted} мятежников присягнули заново, ` +
    `${first.lordsFell} лордов пало`,
)
console.log(
  `Договоры:       ${first.tributes} раз положили дань, союзов ${first.alliancesMade} ` +
    `(распалось ${first.alliancesBroken}), по союзу вступили в войну ${first.joinedWars} раз; ` +
    `к концу союзов ${first.alliancesAtEnd}, даней ${first.tributesAtEnd}`,
)
console.log(`К концу:        ${first.bandsAtEnd} дружин, ${first.warriorsAtEnd} человек под ружьём`)
console.log(
  `Время счёта:    ${first.ms} мс на ${years} лет (${(first.ms / years).toFixed(1)} мс/год)`,
)

console.log(`\nЗемля по держателю (мест из ${Object.keys(world.locations).length}):`)
for (const side of new Set([...first.landStart.keys(), ...first.landEnd.keys()])) {
  const name = world.kingdoms[side]?.name ?? side
  const was = first.landStart.get(side) ?? 0
  const now = first.landEnd.get(side) ?? 0
  const arrow = now > was ? '↑' : now < was ? '↓' : '='
  console.log(
    `  ${name.padEnd(30)} ${String(was).padStart(3)} → ${String(now).padStart(3)}  ${arrow}`,
  )
}
console.log(`  за век сменили хозяина: ${first.changedHands} мест`)

console.log('\nПо королевствам:')
for (const [id, row] of first.byKingdom) {
  const name = world.kingdoms[id]?.name ?? id
  const change = row.start > 0 ? ((row.end / row.start - 1) * 100).toFixed(0) : '—'
  console.log(
    `  ${name.padEnd(28)} ${String(row.start).padStart(7)} → ${String(row.end).padStart(7)}  (${change}%)`,
  )
}

console.log('\nПо видам мест:')
for (const [archetype, row] of [...first.byArchetype].sort((a, b) => b[1].end - a[1].end)) {
  const change = row.start > 0 ? ((row.end / row.start - 1) * 100).toFixed(0) : '—'
  console.log(
    `  ${archetype.padEnd(12)} ${String(row.places).padStart(2)} мест  ${String(row.start).padStart(7)} → ${String(row.end).padStart(7)}  (${change}%)`,
  )
}

console.log('\nПо десятилетиям:')
console.log('  год   население  живых  голодных  разбой  войн  мятежн.  зерно(дер/стол)')
for (const s of first.snapshots) {
  if (s.year % 10 !== 0) continue
  console.log(
    `  ${String(s.year).padStart(3)}  ${String(s.population).padStart(9)}  ${String(s.alive).padStart(5)}  ` +
      `${String(s.starving).padStart(8)}  ${s.banditry.toFixed(2).padStart(6)}  ${String(s.wars).padStart(4)}  ` +
      `${String(s.rebels).padStart(7)}  ${s.grainVillage.toFixed(1).padStart(5)}/${s.grainCity.toFixed(1)}`,
  )
}

console.log('\nГде разбойнее всего к концу:')
for (const [name, value] of first.worstBanditry) {
  console.log(`  ${name.padEnd(24)} ${(value * 100).toFixed(0)}%`)
}

console.log('\nКто с кем воевал чаще:')
for (const [pair, count] of [...first.warPairs].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
  const names = pair.split(' ↔ ').map((id) => world.kingdoms[id]?.name ?? id)
  console.log(`  ${names.join(' — ').padEnd(52)} ${count} раз`)
}

console.log('\n--- Разброс по зёрнам ---\n')
console.log('  зерно  население         живых  голод   войн-дней  набегов  мятежей  мс')
for (const r of runs) {
  const last = r.snapshots[r.snapshots.length - 1]
  if (!last) continue
  console.log(
    `  ${String(r.seed).padStart(5)}  ${String(r.finalPopulation).padStart(9)}  ` +
      `${String(last.alive).padStart(11)}  ${String(r.famines).padStart(5)}  ` +
      `${String(r.warDays).padStart(9)}  ${String(r.raids).padStart(7)}  ${String(r.rebellions).padStart(7)}  ${String(r.ms).padStart(5)}`,
  )
}

// Детерминизм: тот же век из того же зерна обязан совпасть до числа.
const again = run(first.seed, Math.min(years, 20))
const control = run(first.seed, Math.min(years, 20))
console.log(
  `\nДетерминизм (${Math.min(years, 20)} лет дважды): ${
    again.finalPopulation === control.finalPopulation &&
    again.warDays === control.warDays &&
    again.raids === control.raids
      ? `совпало (${again.finalPopulation} чел., ${again.warDays} войно-дней)`
      : `РАЗОШЛОСЬ: ${again.finalPopulation} ≠ ${control.finalPopulation}`
  }`,
)
