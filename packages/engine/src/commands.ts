import {
  ACCLAIM,
  ACCLAIM_WORDS,
  givingCost,
  hasGiven,
  strangerCost,
  titleWorth,
  wouldRecall,
} from './acclaim'
import { ANNALS, ANNALS_WORDS, memoryOf, writeCost } from './annals'
import {
  BIND_DEFS,
  FAITH,
  FAITH_WORDS,
  HOLY_DEED_DEFS,
  type HolyDeedId,
  anointedOf,
  boundBy,
  deedCost,
  faithWorld,
} from './anoint'
import type { AttributeId } from './attributes'
import { ATTRIBUTE_LABELS, ATTRIBUTE_MAX } from './attributes'
import { BALANCE, BALANCE_WORDS, betrayers, warPressure } from './balance'
import type { Band, BandEvent, GarrisonOrder } from './band'
import { bandSize, bandsOnLeg, clash, nextHop, roadHours, tickBands } from './band'
import type { Battle, BattleSide, GroupId, OrderId } from './battle'
import {
  ORDER_LABELS,
  ROUT_MORALE,
  fleeBattle,
  resolveDuel,
  resolveRound,
  startBattle,
  unformUp,
  unitsSize,
} from './battle'
import {
  BEHEST_DEFS,
  BEHEST_WORDS,
  type Behest,
  type BehestKind,
  behestPlan,
  handFor,
  outcomeOf,
  recallable,
} from './behest'
import {
  BIAS,
  BIAS_WORDS,
  beliefOf,
  biasDef,
  biasLedger,
  biasOf,
  errorSays,
  loudEnough,
  ownStrengthAs,
  shadedBy,
} from './bias'
import {
  BLIND,
  BLIND_WORDS,
  bannersLift,
  besiegedOf,
  bluffWorth,
  defectorAt,
  garrisonGuess,
  reliefKnown,
  storesGuess,
} from './blind'
import { type OrderSway, brothersAt, startSway, swayOf, tickOrders } from './brother'
import { type Brotherhood, canFound, charterById, ownCharterFeels } from './brotherhood'
import {
  type Campaign,
  type CampaignAim,
  type Dispatch,
  type HostOrder,
  SUPPLY,
  aimDef,
  aimFor,
  campaignOf,
  campaignReport,
  dispatchDelay,
  dispatchesOf,
  frontsOf,
  hostById,
  hostsOf,
  orderDef,
  supplyOf,
} from './campaign'
import { type Captive, LORD_CAPTURE_CHANCE, captiveFrom, fateOutcome } from './captive'
import type { IntrigueKind } from './castle'
import {
  FAVOUR_AUDIENCE,
  courtOf,
  denounceTargets,
  favourOf,
  intriguesFor,
  judgeOf,
  lordHere,
  lordTemper,
  receptionFor,
} from './castle'
import {
  type Casus,
  casusDef,
  casusFor,
  casusWords,
  envoyAt,
  envoyTemperDef,
  envoyYields,
  stubbornOf,
  termAbout,
  termWords,
  termsFor,
} from './casus'
import type { ChainProgress } from './chain'
import { chainDef, chainsOfferedAt, stepDone } from './chain'
import type { Character } from './character'
import {
  FATIGUE_MAX,
  attributeForSkill,
  carried,
  carriedWeight,
  carryCapacity,
  fatigueFactor,
  skillLevel,
} from './character'
import { type Generation, type Marks, closeGeneration, withMark } from './chronicle'
import type { Censure } from './church'
import {
  CHURCH,
  censureDue,
  churchAsk,
  churchLedger,
  churchOf,
  crusadersAgainst,
  defianceCost,
  interdictBite,
  wantDef,
} from './church'
import type { Pact } from './city'
import {
  CITY,
  citiesOf,
  cityAsks,
  cityLedger,
  cityOf,
  pactAt,
  pactPrice,
  pactsOf,
  riotCost,
  riotRisk,
  sideOfAsk,
} from './city'
import {
  COMEBACK,
  COMEBACK_WORDS,
  ROAD_DEFS,
  type RoadId,
  oldClaim,
  roadsBack,
  secondTime,
} from './comeback'
import type { CompanionRole } from './companion'
import type { Companion } from './companion'
import {
  DEED_SKILL,
  bestSkill,
  companionDef,
  following,
  hireCompanion,
  quarrelsOf,
  wishDone,
  wishNeeds,
  wishOf,
  witness,
} from './companion'
import type { Commission, Company } from './company'
import {
  COMPANY,
  commissionOffer,
  companiesOf,
  companyById,
  companyDef,
  companyUnits,
  crownPlaces,
  hireBids,
  hiringCrowns,
  idleHarm,
  patienceLeft,
  rivalsFor,
  treacheryChance,
  upfrontFor,
  wageOf,
} from './company'
import {
  CONGRESS_COST,
  type Congress,
  type CongressQuestion,
  type CongressRecord,
  congressPlan,
  congressQuestions,
  congressesOf,
  questionDef,
  tally,
  voteOf,
  votePrice,
} from './congress'
import type { Availability, Content, Requirements } from './content'
import { CONTENT } from './content'
import { DEBATE_MINUTES, DEBATE_XP, STUDENT_UPKEEP } from './content/books'
import {
  type CharterId,
  FOUND_COST,
  FOUND_RENOWN,
  INTERDICT_DAYS,
  INTERDICT_STANDING,
  SEND_BANDITRY,
  SEND_COST,
  SEND_STANDING,
} from './content/brothers'
import type { BuildingId } from './content/buildings'
import { BUILDINGS, BUILDING_IDS } from './content/buildings'
import { TOURNEY_FEE, TOURNEY_PURSE } from './content/castle'
import { ENVOY_FAVOUR } from './content/casus'
import type { ChainDef } from './content/chains'
import { CENSURE_DEFS } from './content/church'
import type { CityAsk } from './content/city'
import { COMPANY_WORDS, TEMPER_DEFS } from './content/companies'
import type { CompanionDef, DeedId } from './content/companions'
import { COMPANIONS, DEED_LABELS, TEMPERS } from './content/companions'
import { COURT_TEMPER_DEFS } from './content/courtier'
import { CRAFT_MASTERS } from './content/craft'
import type { SlotId } from './content/equipment'
import { ITEMS_BY_ID, SLOT_IDS } from './content/equipment'
import {
  JUSTICE_DEFS,
  type JusticeLevel,
  LEVY_DEFS,
  type LevyLevel,
  TAX_DEFS,
  TOLL_DEFS,
  TOUR_HOURS,
  type TaxLevel,
  type TollLevel,
} from './content/estate'
import { FEAST_DOINGS, PILGRIM_DAYS, PILGRIM_PIETY, RITES_BY_ID } from './content/faith'
import { EXCOMMUNICATED } from './content/faith'
import {
  type Circle,
  SHAME_DEFS,
  SINGER_FAME,
  SINGER_HOURS,
  SINGER_PRICE,
  type ShameId,
} from './content/fame'
import { type CaptiveFate, SAP_DAYS, type SiegeMove } from './content/field'
import { GOAL_CHANGE_FAME, MILESTONE_RENOWN } from './content/goals'
import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import { GOSSIP_WORDS, type TalkKind } from './content/gossip'
import { AILMENT_DEFS, type Ailment, HERB_GOOD, POTIONS, POTIONS_BY_ID } from './content/heal'
import { KIN_ASK, KIN_GIFT, UPBRINGING_MINUTES } from './content/home'
import { KNOWN as KNOWN_DEFS } from './content/known'
import { TEMPER_LINES } from './content/lines'
import { FACTION_FAVOUR, FACTION_SPITE, type FactionId, type LordDeedId } from './content/lords'
import {
  ARCHMAGE_DEED_LABELS,
  ARTIFACTS,
  ARTIFACTS_BY_ID,
  FEAR_PIETY,
  FEAR_STANDING,
  FIND_CHANCE,
  HONE_HOURS,
  HONE_USES,
  LOSE_CHANCE,
  RAIN_HARVEST,
  WAR_MAGES,
  WEATHER_LABELS,
  WIND_HARVEST,
} from './content/lore'
import { ROWS_BY_ID } from './content/merchants'
import { NAVY_WORDS, WARSHIP_DEFS, type WarshipKind } from './content/navy'
import type { AnswerId } from './content/overture'
import type { MediatorKind, PeaceTerm } from './content/peace'
import type { QuarterId } from './content/quarters'
import type { ConcessionId } from './content/revolt'
import {
  GUARD_HIRE,
  GUARD_WAGE,
  INN_COST,
  PATROL_HOURS,
  SAILOR_HIRE,
  SAILOR_WAGE,
} from './content/road'
import type { ShipKind } from './content/ships'
import { SHIPS, SHIP_NAMES } from './content/ships'
import { SITES } from './content/sites'
import type { SpellDef, SpellWhere } from './content/spells'
import { SPELLS_BY_ID } from './content/spells'
import { TONES, TOPICS_BY_ID } from './content/talk'
import type { TroopId } from './content/troops'
import { TROOPS, TROOP_FOOD_PER_DAY } from './content/troops'
import {
  CACHE_GOODS,
  CACHE_MONEY,
  CAMP_MANNER_DEFS,
  type CampManner,
  FIRE_BOND,
  FIRE_MORALE,
  HUNT_FATIGUE,
  HUNT_HOURS,
  TRACK_DEFS,
  TRACK_HOURS,
  TRACK_SKILL,
} from './content/wild'
import { JESTER_MORALE, RECRUITER_PRICE, THIEF_SHARE } from './content/year'
import type { CourtChoice } from './court'
import { courtCase, vassalsOf } from './court'
import {
  COURTIER,
  askWords,
  asksNow,
  careerWords,
  courtWantDef,
  courtierAt,
  courtiersOf,
  endsNow,
  leavesSoon,
  voiceOf,
} from './courtier'
import type { CechMembership } from './craft'
import {
  CECH_DUES,
  CECH_DUES_DAYS,
  cechAt,
  cechLets,
  cechPay,
  experienceOf,
  masterHires,
  masterOf,
  masterPay,
  masterPraises,
  masterTeaches,
  qualityFrom,
  qualityLabel,
  rankOfShifts,
  shiftsOf,
} from './craft'
import { CURVE, curveOf, curveSays } from './curve'
import {
  AUDIENCE,
  AUDIENCE_WORDS,
  type Matter,
  attentionOf,
  dayOfRule,
  delegatedWorth,
  doorway,
  matterDef,
  matterFatigue,
  overdue,
  ruleYear,
  whoTakes,
} from './day'
import {
  DECEIT,
  DECEIT_DEFS,
  DECEIT_WORDS,
  deceitOf,
  deceitWord,
  seeThrough,
  willBreak,
} from './deceit'
import { tickDiplomacy } from './diplomacy'
import {
  DISPATCH,
  DISPATCH_WORDS,
  type FieldOrder,
  INTENT_DEFS,
  type IntentId,
  actsOn,
  captainOf,
  fieldReport,
  foesNear,
  linkTo,
} from './dispatch'
import { DREAD, DREAD_WORDS, dreadOf, dreadSeen, firstOf, rumouredWay, wayTruth } from './dread'
import {
  PRIME_AGE,
  ageOf,
  agedAttributes,
  deathChance,
  heirCharacter,
  heirOf,
  maybeBirth,
} from './dynasty'
import type { Settlement } from './economy'
import { quoteBuy, quoteSell, recruitPool, withStock } from './economy'
import {
  type Embassy,
  type EmbassyErrand,
  type HostAnswer,
  embassiesOf,
  embassyCost,
  embassyDays,
  embassyDef,
  embassyPossible,
  embassyWeight,
  envoyChoices,
  hostAnswerDef,
} from './embassy'
import type { Enterprise } from './enterprise'
import { CARAVAN_COST, SHIPPING_COST, WORKSHOP_COST, tickEnterprises } from './enterprise'
import {
  ENVOY,
  ENVOY_WORDS,
  SHOW_DEFS,
  type ShowKind,
  envoySight,
  envoyWords,
  guestNow,
  showTo,
} from './envoy'
import { gearBonus, horseCarry, repairCost, withItem } from './equipment'
import { ERA, ERA_DEFS, ERA_WORDS, type EraId, eraFor, eraNow, eraSigns, eraTweaks } from './era'
import { errandKindOf, errandsAt } from './errand'
import {
  type Law,
  arrearsFactor,
  brokenAt,
  daysAway,
  isBroken,
  lawBanditry,
  lawMood,
  lawOf,
  levyRate,
  pleaOf,
  seneschalDef,
  seneschalOf,
  sinceSeen,
  skimOf,
  taxTake,
  tollTake,
  workDef,
  working,
  worksRepairCost,
  worksWages,
} from './estate'
import type { GameEvent, LogKind } from './events'
import { appointCost, balanceOf, intrigueNow, partiesOf, sidesWith } from './faction'
import { FAIR_TRADE_BONUS, fairAt, feastAt } from './fair'
import { FALLEN, FALLEN_WORDS, exileAt, realmLost, whatRemains } from './fallen'
import {
  ALL_CIRCLES,
  type Fame,
  type Shame,
  circleDef,
  coverShames,
  fameOf,
  shameBefore,
  shameDef,
  singerAt,
  withDeed,
} from './fame'
import { groundFor, orderNeeds, veteranShare, woundedOf } from './field'
import { FOG, sightingsNow, surpriseOf, withSightings } from './fog'
import {
  type EngineId,
  SIEGE,
  type TermId,
  engineDays,
  engineDef,
  enginePrice,
  enginesLeft,
  fortOf,
  holdOut,
  mouthsOf,
  offersFor,
  storeDays,
  stormCost,
} from './fort'
import { goalDef, goalOf, goalStepDone, milestoneKey } from './goal'
import {
  GOSSIP,
  type Talk,
  alive,
  checkedWord,
  gossipLedger,
  gossipOf,
  hear,
  heardAt,
  start as startGossip,
  stepped,
  talkWords,
} from './gossip'
import { GROWTH, GROWTH_WORDS, rustOf } from './growth'
import {
  GUESS,
  GUESS_WORDS,
  PLAYER_AIM_DEFS,
  type PlayerAim,
  guessAim,
  tellsOf,
  trueAim,
} from './guess'
import {
  type SickWhere,
  ailmentDef,
  ailmentHolds,
  ailmentOf,
  ailmentPace,
  ailmentsHere,
  festerChance,
  festered,
  healerAt,
  healerDef,
  healerPrice,
  healerSpeed,
  maimChance,
  potionCount,
  potionDef,
  woundKindDef,
  woundKindOf,
} from './heal'
import { HEIRS, HEIRS_WORDS, heirWay, reignChanged, troubled } from './heirs'
import { HIDDEN, HIDDEN_WORDS, denounceOffer, denounceWord, lossLedger, shading } from './hidden'
import {
  PLAYER,
  dailyTax,
  dailyTolls,
  freeSlots,
  garrisonLimit,
  garrisonSize,
  garrisonWages,
  hasBuilding,
  holdingsOf,
  isOwnedByPlayer,
  takeLand,
} from './holding'
import type { Home } from './home'
import {
  atHome,
  bentWords,
  canRetire,
  canTeachChild,
  childBent,
  homeComfort,
  homeDef,
  homesAt,
  kinOf,
} from './home'
import {
  INHERIT,
  type LawId,
  claimantsOf,
  heirLawOf,
  heirUnder,
  lawDef,
  partitionOf,
  regencyFor,
  strifeOf,
  successionView,
} from './inherit'
import type { Journey } from './journey'
import { journeyLeft, legHoursFor, paceOf } from './journey'
import type { Knowledge } from './knowledge'
import {
  BLIND_DANGER,
  BLIND_SLOW,
  describeLand,
  knowsPlace,
  mapsFor,
  reveal,
  rumourAt,
  seenFrom,
} from './knowledge'
import { type Word, bring, forgetOld, truthOf } from './known'
import {
  KEY_DEFS,
  LEAGUE,
  LEAGUE_WORDS,
  keyTo,
  leagueAgainst,
  leagueNow,
  whoToCall,
} from './league'
import {
  LEVER,
  LEVER_DEFS,
  LEVER_WORDS,
  MIGHT,
  buyPeaceCost,
  crownDebtsOf,
  debtAfterBeat,
  loanWanted,
  mightCost,
} from './lever'
import { LIES, lieLedger, mistakeOf, remember, trustOf, trustWords, weigh, whoGains } from './lies'
import type { HarvestEvent, LifeEvent } from './life'
import { LIFE, foodSecurity, rollHarvest, tickDays } from './life'
import {
  LINEAGE,
  LINEAGE_WORDS,
  LOSS_DEFS,
  heirGets,
  houseNow,
  houseWay,
  lossesOf,
  raisedShare,
} from './lineage'
import { crownOf, factionDef, factionKey, factionMood, heirRegard, withLordDeed } from './lordlife'
import {
  type Artifact,
  type Spellcraft,
  type Weather,
  artifactDef,
  artifactPower,
  craftOf,
  fearOf,
  hasWeather,
  masteryLuck,
  masteryOf,
  masteryWord,
  spellPower,
  withUse,
  withUses,
} from './lore'
import { MAGIC_RANKS, nextRank, rankTier } from './magic'
import type { PriceLog } from './market'
import { recordPrices } from './market'
import { opinionPrice, playStyle, worldOpinion } from './memory'
import type { Dealing, HagglePush } from './merchant'
import {
  NO_DEALING,
  dealingWith,
  haggle,
  merchantBuyPrice,
  merchantById,
  merchantSellPrice,
  merchantsAt,
  orderFrom,
  talesOf,
} from './merchant'
import { seenStrength, strengthOf } from './mind'
import { MOULD, MOULD_WORDS, mouldOf, retrainCost, seenAs } from './mould'
import type { Blockade, Letter, Warship } from './navy'
import {
  NAVY,
  afloat,
  blockadeBite,
  blockadesOf,
  crownFleet,
  fleetCarries,
  fleetForce,
  fleetUpkeep,
  landingLoss,
  landingSites,
  navyOf,
  prizeAt,
  seaFight,
  seaLedger,
  seaSupplied,
  shipForce,
  warshipDef,
  windAt,
} from './navy'
import {
  type Appointment,
  ERRAND_COST,
  type OfficeErrandId,
  type OfficeId,
  type Offices,
  candidatesFor,
  chancellorCalm,
  courtPressure,
  courtWages,
  errandsFor,
  fitness,
  isAway,
  musterBonus,
  officeDef,
  officeErrandDef,
  officerAt,
  skimGuard,
  treasuryBonus,
} from './office'
import type { Interdict, Membership, OrderPower } from './order'
import {
  DUES_DAYS,
  EXPELLED,
  canWield,
  charterFeels,
  feudChill,
  interdictedAt,
  orderById,
  ordersAt,
  ownOrder,
  ownOrderHere,
  rankLabel,
  rankOf,
} from './order'
import type { Overture, Pledge } from './overture'
import {
  OVERTURE,
  OVERTURE_WORDS,
  coalitionAgainst,
  counterWeight,
  isLiar,
  overtureDef,
  overtureLedger,
  overturesOf,
  overturesToday,
  pledgesOf,
  wordOf,
} from './overture'
import type { Party } from './party'
import {
  DESERTION_MORALE,
  EDIBLE,
  dailyFood,
  dailyWages,
  gearFactor,
  partyCapacity,
  partySize,
  partyStrength,
  troopCount,
  veteransOf,
  withUnits,
} from './party'
import { PATH_DEFS, PATH_WORDS, type PathId, serviceTeaches, trialById, trialOdds } from './paths'
import type { Grievance, PeaceRecord, Talks } from './peace'
import {
  PEACE,
  PEACE_WORDS,
  asksOf,
  grievanceFrom,
  grievancesOf,
  grudgeRipe,
  harshness,
  mediatorDef,
  mediatorsFor,
  offerWeight,
  peaceChronicle,
  peacesOf,
  shameOf,
  talksOf,
  termDef,
  warToll,
} from './peace'
import { PICTURE, PICTURE_WORDS, canSeePicture, crownPicture, pictureSays } from './picture'
import { isAvailableAt } from './place'
import type { Plague, PlagueEvent } from './plague'
import { plagueAt, tickPlague } from './plague'
import { aimEra, orderAim, orderAimLabel, tickTrade } from './plans'
import {
  PRIMACY,
  PRIMACY_WORDS,
  TEMPER_LOOK,
  courtSplit,
  firstPays,
  goingQuiet,
  rightlyFirst,
} from './primacy'
import { PROGRESSION, applyCharacterXp, applySkillXp } from './progression'
import {
  PROOF,
  PROOF_DEFS,
  PROOF_WORDS,
  type Proof,
  type ProofKind,
  forgerySeen,
  proofsAvailable,
  showWorth,
} from './proof'
import {
  activityOf,
  arrivalQuarter,
  hasQuarters,
  quarterFor,
  quarterWhere,
  quartersOf,
  walkMinutes,
} from './quarter'
import { describeQuest, isComplete, offersAt } from './quest'
import type { Quest } from './quest'
import { RACE, RACE_WORDS, dragsOn, risking, whoLeads } from './race'
import {
  RANSOM,
  RANSOM_WORDS,
  ownRansom,
  haggleRansomFor as ransomHaggle,
  yoursTaken,
} from './ransom'
import {
  type ArrearsAnswer,
  type Charters,
  RELIEF_DAYS,
  arrearsDef,
  charterOf,
  debtors,
  libertyOffers,
  realmMood,
  realmYear,
  takeAt,
} from './realm'
import { REPORT, auditOf, purseAsReported, reportFrom, reporterAt, skimAt } from './report'
import { isShunned, lordRep, placeRep, priceFactor, withLordRep, withPlaceRep } from './reputation'
import type { Reputation } from './reputation'
import {
  RESIDENT,
  RESIDENT_WORDS,
  type Resident,
  nativeShare,
  residentAt,
  residentCost,
  residentWords,
  riskNow,
  theirResidents,
  theyLearn,
} from './resident'
import {
  REVOLT,
  bribePriceFor,
  concessionsFor,
  courtMood,
  grudgeScore,
  grudgesOf,
  lessonWords,
  mercyGain,
  plotAgainst,
  reprisalCost,
} from './revolt'
import { HOLD_DEFS, type HoldId, RISK, RISK_WORDS, otherFight, siegeOnMe } from './risk'
import type { Rng } from './rng'
import { nextFloat, nextInt, rollChance } from './rng'
import {
  bountyFor,
  caravanMaster,
  caravanTemperDef,
  crewMood,
  crewNeeded,
  crewOf,
  crewPace,
  crewWages,
  guardLimit,
  guardsOf,
  moodWord,
  mutinous,
  ownRoads,
  patrolCost,
  patrolEffect,
  pirateById,
  pirateNear,
  shipsAt,
  skipperDef,
  skipperOf,
  travellersAt,
  wagonsOf,
} from './road'
import {
  type RoyalMarriage,
  bloodClaims,
  childless,
  dowryFor,
  marriagesOf,
  marriedTo,
  reignOf,
  royalHouse,
  yearsToSuccession,
} from './royal'
import {
  RUSE,
  RUSE_DEFS,
  RUSE_WORDS,
  type Ruse,
  type RuseKind,
  aliveRuses,
  pulledBy,
  ruseFrom,
  ruseLedger,
  ruseWord,
  seesThrough,
  theirRuses,
  walkedInto,
} from './ruse'
import {
  SELF_TAUGHT_FEE,
  canGrantHere,
  isSelfTaught,
  masterAttitude,
  masterStance,
  schoolAt,
} from './school'
import {
  type HostRole,
  ROLE_DEFS,
  SCOUT,
  SCOUT_WORDS,
  askLocals,
  eyesCost,
  probeCost,
  probeWord,
  roleOf,
  scoutsOf,
  wearOf,
} from './scout'
import {
  anniversariesOf,
  calendarOf,
  fairFolkAt,
  hasFairFolk,
  skyDef,
  skyOf,
  skyRoad,
  skySight,
} from './season'
import {
  SECRET,
  SECRET_WORDS,
  caughtDouble,
  doubleGames,
  exposeCost,
  hushCost,
  keepersOf,
  leakNow,
  theirSecrets,
} from './secret'
import type { SettleEvent } from './settle'
import { tickSettling } from './settle'
import {
  digsFaster,
  foolsGuest,
  hidesSpy,
  holdsOut,
  looksQuicker,
  noticesClash,
  obeysBetter,
  ordersRideFaster,
  persuadesAt,
  readsLetters,
  remembersDays,
  ridersSpeed,
  ridesQuicker,
  scoutReach,
  siegeHolds,
  sparesMen,
  steadyUnder,
  stealsCheaper,
  survivalReach,
  wallsBetter,
} from './sheet'
import type { Passage, Ship } from './ship'
import {
  ABOARD_MAX,
  HIRE_MAX,
  PASSAGE_LABELS,
  battered,
  fits,
  passageCost,
  repairPrice,
  resalePrice,
  seaHours,
  shipCarries,
  shipDef,
  shipUpkeep,
  waitHours,
} from './ship'
import type { Siege } from './siege'
import {
  bribeChance,
  bribePrice,
  enginesOf,
  sallyChance,
  sapLeft,
  surrenderChance,
  wallsUnderSiege,
} from './siege'
import {
  type Look,
  SIGHT,
  SIGHT_WORDS,
  blindShare,
  knowMap,
  lookCost,
  looksOf,
  seeAt,
  tourPlan,
} from './sight'
import type { SkillId } from './skills'
import { SKILLS } from './skills'
import { battlePower, bestSpell, castChance } from './spell'
import {
  CAUGHT,
  RUMOUR,
  type Spy,
  type SpySeat,
  bribeTargets,
  catchChance,
  leakFactor,
  reportOf,
  seatDef,
  spiesOf,
  spyCost,
  spyIn,
  spyWages,
  watchers,
} from './spy'
import type { GameState } from './state'
import { appendLog } from './state'
import {
  bookById,
  bookProgress,
  bookRead,
  booksAt,
  canRead,
  canTakeStudent,
  hasBook,
  studentDone,
  studentNameFor,
} from './study'
import { answerOf, speakerById, stillTalks } from './talk'
import { warReckon } from './tally'
import {
  canPilgrimage,
  feastDoingsAt,
  feastHere,
  graceFor,
  isHolySite,
  offeringFor,
  pietyOf,
  priestAt,
  templeAccepts,
} from './temple'
import { THEIREND, THEIREND_WORDS, endNear, theirEnd } from './theirend'
import { THEIRWAY, crownWay, theirWay, theirWaySays, wouldChange } from './theirway'
import { DAYS_PER_YEAR, timeOfDay } from './time'
import type { GameTime } from './time'
import type { TimeWindow } from './time'
import {
  DAY_WINDOW,
  HARVEST_DAY,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  crossedDayOfYear,
  dayOf,
  formatDuration,
  formatWindow,
  hours,
  isWithinWindow,
  nextTimeOfDay,
  seasonOf,
} from './time'
import {
  CORONATION,
  type Claim,
  type Crowning,
  claimAgainst,
  claimable,
  claimsOf,
  coronationPlan,
  hirePrice,
  recognisedBy,
  recognitionOf,
  styleOf,
  titleOf,
} from './title'
import {
  type Debt,
  EMPTY_PURSE,
  type LenderId,
  type QueuedWork,
  type RaiseWay,
  canRaise,
  creditLimit,
  debtTo,
  debtsOf,
  ledger,
  lenderAngry,
  lenderDef,
  lends,
  queueOf,
  raiseCost,
  raiseDef,
  worksPrice,
} from './treasury'
import {
  type SecretId,
  type Treaty,
  type TreatyKind,
  breachCost,
  guarantorFee,
  leakChance,
  liveTreaties,
  secretDef,
  treatiesOf,
  treatyBetween,
  treatyDef,
  treatyWords,
} from './treaty'
import { DOOR_DEFS, UNION, UNION_WORDS, doorsTo, unionOf, unionWorld, whoIsLeft } from './union'
import {
  type Oath,
  RAISE_MOOD,
  answersCall,
  fiefsOf,
  grantable,
  lordFromCompanion,
  loyaltyDrift,
  oathFor,
  oathOf,
  oathWords,
  serviceOf,
  shareOf,
  swearCandidates,
  titleForFiefs,
} from './vassal'
import type { Lord } from './war'
import { allied, pairOf, relationOf } from './war'
import type { Politics } from './war'
import type { WarEvent } from './war'
import { atWar, banditBand, lordById, tickPolitics, warband, warsOf } from './war'
import {
  BOND_DEFS,
  TIED_DEFS,
  WARD,
  WARD_WORDS,
  breakingWord,
  calledOn,
  canGuarantee,
  guarantorOf,
  handOver,
  tiedTo,
  wantsHand,
} from './ward'
import { WAY, recognisedBySides } from './way'
import type { WildMemory } from './wild'
import {
  denizenOf,
  gameHere,
  hermitGiftDef,
  hermitOf,
  huntChance,
  huntHurtChance,
  huntSpoils,
  huntYield,
  lairStrength,
  tracksAt,
  wildAt,
} from './wild'
import { iceBound, isHarbour, lanesFrom } from './world/lanes'
import { kingdomOf, neighbourSettlements, regionOf, roadsFrom } from './world/queries'
import { fordShut } from './world/rivers'
import type { World } from './world/types'
import { TERRAIN_LABELS, isSettlement, isSite } from './world/types'
import { bedridden, defeatOutcome, healWound } from './wounds'

/**
 * Команды — единственный способ изменить состояние (п.2 дизайн-документа).
 * UI не мутирует состояние сам: он отправляет команду и получает новое.
 */
export type Command =
  /** Просто идущее время: мир живёт, пока игрок стоит и смотрит. */
  | { readonly type: 'tick'; readonly minutes: number }
  | { readonly type: 'travel'; readonly toLocationId: string }
  | { readonly type: 'goQuarter'; readonly quarterId: QuarterId }
  | { readonly type: 'askAround' }
  | { readonly type: 'buyMap'; readonly regionId: string }
  | { readonly type: 'haggle'; readonly merchantId: string; readonly push: HagglePush }
  | {
      readonly type: 'buyFrom'
      readonly merchantId: string
      readonly good: GoodId
      readonly amount: number
    }
  | {
      readonly type: 'sellTo'
      readonly merchantId: string
      readonly good: GoodId
      readonly amount: number
    }
  | { readonly type: 'takeOrder'; readonly merchantId: string }
  | { readonly type: 'askPrices'; readonly merchantId: string }
  /** Цех города (этап 50): вступить и выйти. */
  | { readonly type: 'joinCech' }
  | { readonly type: 'leaveCech' }
  /** Взять ученика в свою мастерскую (этап 50). */
  | { readonly type: 'takeApprentice' }
  /** Храм и вера (этап 51): обряд, вклад, праздник, паломничество. */
  | { readonly type: 'rite'; readonly riteId: string }
  | { readonly type: 'donate'; readonly amount: number }
  | { readonly type: 'joinFeast'; readonly doingId: string }
  | { readonly type: 'pilgrimage' }
  /** Двор чужого лорда (этап 52): приём, дела двора, турнир, суд. */
  | { readonly type: 'seekAudience'; readonly lordId: string; readonly gift: number }
  | {
      readonly type: 'courtIntrigue'
      readonly lordId: string
      readonly kind: IntrigueKind
      readonly targetId?: string
    }
  | { readonly type: 'tourney'; readonly lordId: string }
  | { readonly type: 'petition'; readonly lordId: string }
  /** Разговор (этап 53): спросить человека о том, что он знает. */
  | { readonly type: 'talk'; readonly speakerId: string; readonly topicId: string }
  /** Помочь спутнику с его делом (этап 54). */
  | { readonly type: 'grantWish'; readonly companionId: string }
  /** Учение (этап 55): книги, спор в школе, свой ученик. */
  | { readonly type: 'buyBook'; readonly bookId: string }
  | { readonly type: 'readBook'; readonly bookId: string }
  | { readonly type: 'debate' }
  | { readonly type: 'takeStudent' }
  /** Дом и семья (этап 56). */
  | { readonly type: 'buyHome'; readonly kind: string }
  | { readonly type: 'storeAtHome'; readonly good: GoodId; readonly amount: number }
  | { readonly type: 'takeFromHome'; readonly good: GoodId; readonly amount: number }
  | { readonly type: 'teachChild'; readonly childName: string }
  | { readonly type: 'helpKin'; readonly kinId: string }
  | { readonly type: 'retire' }
  /** Уйти морем: своим судном, нанятым или попутным (этап 35). */
  | { readonly type: 'sail'; readonly toLocationId: string; readonly manner: Passage }
  /** Купить судно в порту, починить своё, продать своё. */
  | { readonly type: 'buyShip'; readonly kind: ShipKind }
  | { readonly type: 'repairShip' }
  | { readonly type: 'sellShip' }
  | { readonly type: 'hire'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'disband'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'battleOrders'; readonly orders: Readonly<Record<GroupId, OrderId>> }
  | { readonly type: 'battleFlee' }
  | { readonly type: 'battleEnd'; readonly prisoners: 'ransom' | 'recruit' | 'release' }
  /** Поединок: герой лично против лучшего из чужих. Один на бой. */
  | { readonly type: 'duel' }
  /** Откупиться от морских разбойников: заплатить и разойтись (этап 36). */
  | { readonly type: 'payTribute' }
  /** Выкупиться из плена сейчас, не дожидаясь, пока отпустят. */
  | { readonly type: 'payRansom' }
  | { readonly type: 'takeService'; readonly kingdomId: string }
  | { readonly type: 'leaveService' }
  | { readonly type: 'seekEnemy' }
  /** Напасть на войско, стоящее здесь же: война перестаёт быть фоном. */
  | { readonly type: 'attackBand'; readonly bandId: string }
  /** Позвать с собой именного человека. */
  | { readonly type: 'recruitCompanion'; readonly companionId: string }
  | { readonly type: 'dismissCompanion'; readonly companionId: string }
  /** Встать лагерем там, где нет крыши. */
  | { readonly type: 'camp'; readonly manner?: CampManner }
  | { readonly type: 'hunt' }
  | { readonly type: 'setGoal'; readonly goalId: string }
  | { readonly type: 'hireSinger'; readonly circle: Circle }
  | { readonly type: 'watchJesters' }
  | { readonly type: 'askFaction'; readonly kingdomId: string; readonly factionId: FactionId }
  | {
      readonly type: 'meetEnvoy'
      /** С этапа 79 (П4) отвечают ещё двумя способами: тянуть и унизить. */
      readonly answer: 'yes' | 'no' | 'press' | 'delay' | 'humiliate'
    }
  | { readonly type: 'declareWar'; readonly kingdomId: string }
  | { readonly type: 'offerPeace'; readonly kingdomId: string }
  | { readonly type: 'seeHealer' }
  | { readonly type: 'brewPotion'; readonly potionId: string }
  | { readonly type: 'drinkPotion'; readonly potionId: string }
  | { readonly type: 'gatherHerbs' }
  | { readonly type: 'clearLair' }
  | { readonly type: 'lootCache' }
  | { readonly type: 'visitHermit' }
  | { readonly type: 'readTracks' }
  /** Осмотреться в глуши: что здесь лежит, кроме земли. */
  | { readonly type: 'search' }
  /** Взяться за поручение с лицом. */
  | { readonly type: 'startChain'; readonly chainId: string }
  /** Выкупить пленного спутника: дорого, зато сразу. */
  | { readonly type: 'ransomCompanion'; readonly companionId: string }
  /** Поручить спутнику дело: держать лен или вести караван. */
  | { readonly type: 'assignCompanion'; readonly companionId: string; readonly role: CompanionRole }
  /** Завести своё дело. */
  | { readonly type: 'foundCaravan'; readonly awayId: string }
  /** Отдать своё судно в морской торг: оно ходит само и однажды не вернётся. */
  | { readonly type: 'foundShipping'; readonly awayId: string }
  | { readonly type: 'foundWorkshop' }
  | { readonly type: 'closeEnterprise'; readonly enterpriseId: string }
  /** Закрыть ворота своего места от мора. */
  | { readonly type: 'quarantine' }
  /** Посвататься к дому лорда: брак — это договор, а не украшение. */
  | { readonly type: 'proposeMarriage'; readonly lordId: string }
  | { readonly type: 'build'; readonly building: BuildingId }
  | { readonly type: 'station'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'withdraw'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'besiege' }
  | { readonly type: 'siegeWait'; readonly days: number }
  | { readonly type: 'siegeAssault' }
  | { readonly type: 'siegeSap'; readonly days: number }
  | { readonly type: 'siegeParley' }
  | { readonly type: 'siegeBribe' }
  | { readonly type: 'captiveFate'; readonly captiveId: string; readonly fate: CaptiveFate }
  | { readonly type: 'inquire' }
  | { readonly type: 'hireGuards'; readonly enterpriseId: string; readonly count: number }
  | { readonly type: 'meetCaravan'; readonly enterpriseId: string }
  | { readonly type: 'foundInn' }
  | { readonly type: 'patrolRoad'; readonly toId: string; readonly riders: number }
  | { readonly type: 'hireCrew'; readonly count: number }
  | { readonly type: 'payCrew' }
  | { readonly type: 'takeBerth'; readonly shipId: string }
  | { readonly type: 'huntPirate'; readonly pirateId: string }
  | {
      readonly type: 'setLaw'
      readonly tax?: TaxLevel
      readonly toll?: TollLevel
      readonly levy?: LevyLevel
      readonly justice?: JusticeLevel
    }
  | { readonly type: 'answerPlea'; readonly locationId: string }
  | { readonly type: 'repairBuilding'; readonly locationId: string; readonly building: BuildingId }
  | { readonly type: 'tourHolding' }
  | { readonly type: 'replaceSeneschal' }
  | { readonly type: 'honeSpell'; readonly spellId: string }
  | { readonly type: 'makeArtifact'; readonly defId: string }
  | { readonly type: 'orderSend'; readonly locationId: string }
  | { readonly type: 'orderPatronage' }
  | { readonly type: 'orderInterdict'; readonly locationId: string }
  | { readonly type: 'orderPardon'; readonly locationId: string }
  | {
      readonly type: 'foundBrotherhood'
      readonly name: string
      readonly charterId: CharterId
    }
  | { readonly type: 'siegeLift' }
  | { readonly type: 'askForFief' }
  | { readonly type: 'buyItem'; readonly itemId: string }
  | { readonly type: 'craftItem'; readonly itemId: string }
  | { readonly type: 'repairItem'; readonly slot: SlotId }
  | { readonly type: 'outfitParty'; readonly weapons: number }
  | { readonly type: 'giveFood'; readonly amount: number }
  /** Вступить в орден или гильдию там, где они стоят, и выйти (этап 42). */
  | { readonly type: 'joinOrder'; readonly orderId: string }
  | { readonly type: 'leaveOrder' }
  /** Сотворить заклинание вне боя (этап 41). */
  | { readonly type: 'cast'; readonly spellId: string }
  /** Сдать товар тому, кто ждёт его к ярмарке (этап 39). */
  | { readonly type: 'deliverGoods'; readonly good: GoodId; readonly amount: number }
  | { readonly type: 'takeQuest'; readonly questId: string }
  | { readonly type: 'finishQuest'; readonly questId: string }
  | { readonly type: 'abandonQuest'; readonly questId: string }
  | { readonly type: 'proclaimRealm'; readonly name: string }
  | { readonly type: 'inviteLord'; readonly lordId: string }
  /**
   * Присяга (этап 74, В1 и В2): землю в лен — и человека под руку. Условия
   * ставит он, а не ты: чем платит, что оставляет себе и сколько людей ведёт.
   */
  | { readonly type: 'swearOath'; readonly lordId: string; readonly locationId: string }
  /** Созвать вассалов по присяге (этап 74, В3). */
  | { readonly type: 'summonVassals' }
  /** Посольство (этап 79): послать своего человека или письмо к чужой короне. */
  | {
      readonly type: 'sendEnvoy'
      readonly to: string
      readonly errand: EmbassyErrand
      readonly envoyId?: string
      readonly byLetter?: boolean
      /** Договор (этап 80): тайная статья и свидетель, если они есть. */
      readonly secret?: SecretId
      readonly guarantor?: string
    }
  /** Кампания (этап 84): цель войны, свои части и приказы им. */
  | { readonly type: 'setCampaign'; readonly against: string; readonly aim?: CampaignAim }
  | { readonly type: 'formHost'; readonly troop: TroopId; readonly count: number }
  | {
      readonly type: 'orderHost'
      readonly hostId: string
      readonly order: HostOrder
      readonly targetId?: string
    }
  | { readonly type: 'recallHost'; readonly hostId: string }
  /** Осадное дело (этап 85): машины, условия сдачи, своя крепость. */
  | { readonly type: 'buildEngine'; readonly engine: EngineId }
  | { readonly type: 'siegeTerms'; readonly term: TermId }
  | { readonly type: 'stockFort'; readonly locationId: string; readonly days: number }
  | {
      readonly type: 'garrisonOrder'
      readonly locationId: string
      readonly order: GarrisonOrder
    }
  /** Наёмники (этап 86): нанять роту, заплатить, распустить, наняться самому. */
  | { readonly type: 'hireCompany'; readonly companyId: string; readonly days: number }
  | { readonly type: 'payCompany'; readonly companyId: string }
  | { readonly type: 'dismissCompany'; readonly companyId: string }
  | { readonly type: 'takeCommission'; readonly kingdomId: string; readonly days: number }
  | { readonly type: 'leaveCommission' }
  /** Флот и десант (этап 87). */
  | { readonly type: 'buildWarship'; readonly kind: WarshipKind }
  | { readonly type: 'landTroops'; readonly locationId: string; readonly men: number }
  | { readonly type: 'blockadePort'; readonly locationId: string }
  | { readonly type: 'liftBlockade'; readonly locationId: string }
  | { readonly type: 'huntTrade'; readonly locationId: string }
  | { readonly type: 'seaSortie'; readonly locationId: string }
  | { readonly type: 'askLetter'; readonly against: string }
  /** Склад (этап 126): переучиться с одного дела на другое. */
  | { readonly type: 'retrain'; readonly from: SkillId; readonly to: SkillId }
  /** Путь дома (этап 132): растить наследника своими часами. */
  | { readonly type: 'raiseHeir' }
  /** Путь короны (этап 131): дар за признание и смотр того, кто ещё не признал. */
  | { readonly type: 'giftRecognition'; readonly to: string }
  /** Путь торга (этап 133): заём короне и откуп от войны. */
  | { readonly type: 'lendToCrown'; readonly to: string }
  | { readonly type: 'buyPeaceWith'; readonly against: string }
  /** Путь веры (этап 134): дар, собор, поход по призыву, кара еретиков. */
  | { readonly type: 'churchDeed'; readonly deed: HolyDeedId }
  /** Коалиция (этап 136): разобрать чужую по одному и собрать свою против первого. */
  | { readonly type: 'breakLeague'; readonly member: string }
  | { readonly type: 'callLeague'; readonly against: string }
  /** Оборона своего (этап 153, Рс0) и чужой бой (Рс0б). */
  | { readonly type: 'holdWalls'; readonly move: HoldId }
  | { readonly type: 'joinFight'; readonly side: string }
  /** Путь обратно (этап 152): вернуть своё одной из четырёх дорог. */
  | { readonly type: 'claimBack'; readonly road: RoadId }
  /** Изгнание (этап 151): пойти к чужому двору, когда своего нет. */
  | { readonly type: 'goIntoExile'; readonly at: string }
  /** Плен (этап 150): выкупить своего и поторговаться за чужого. */
  | { readonly type: 'ransomOwn'; readonly id: string }
  | { readonly type: 'haggleRansom'; readonly captiveId: string; readonly offer: number }
  /** Летопись (этап 147): писать свою — дело, которое стоит серебра и правды. */
  | { readonly type: 'writeAnnals' }
  /** Эпоха (этап 146): чем держава её встречает. */
  | { readonly type: 'meetEra'; readonly answer: string }
  /** Чужой конец (этап 142): принять исход и стать первым человеком победителя. */
  | { readonly type: 'serveWinner' }
  /** Цена первенства (этап 139): идти тихо или громко. */
  | { readonly type: 'goQuiet' }
  | { readonly type: 'goLoud' }
  /** Признание (этап 138): признать чужого и отозвать своё признание. */
  | { readonly type: 'recogniseCrown'; readonly of: string }
  | { readonly type: 'recallRecognition'; readonly of: string }
  /** Поручительство и рука (этап 137). */
  | { readonly type: 'giveGuarantee'; readonly of: string }
  | { readonly type: 'takeUnderHand'; readonly of: string }
  | { readonly type: 'seekHand'; readonly patron: string }
  /** Испытание (этап 124): выйти на турнир, охоту, диспут, смотр, мост, ярмарку. */
  | { readonly type: 'takeTrial'; readonly trialId: string }
  /** Чужое слово (этап 121): сдержит ли он обещанное. */
  | { readonly type: 'weighPledge'; readonly of: string }
  /** Чужое заблуждение (этап 120): чем он ошибается о тебе. */
  | { readonly type: 'weighError'; readonly of: string }
  /** Чужая голова (этап 118): узнать, из чего исходит эта корона. */
  | { readonly type: 'askPicture'; readonly of: string }
  /** Постоянный посол (этап 117): посадить своего человека при чужом дворе и отозвать. */
  | { readonly type: 'seatResident'; readonly at: string }
  | { readonly type: 'recallResident'; readonly at: string }
  /** Чужие договоры (этап 116): добыть доказательство и предъявить его миру. */
  | {
      readonly type: 'getProof'
      readonly kind: ProofKind
      readonly a: string
      readonly b: string
      readonly against?: string
    }
  | { readonly type: 'showProof'; readonly proofId: string }
  | { readonly type: 'accuse'; readonly a: string; readonly b: string }
  /** Тайна (этап 115): купить молчание, выведать чужой сговор. */
  | { readonly type: 'hushSecret'; readonly treatyId: string }
  | { readonly type: 'prySecret'; readonly a: string; readonly b: string }
  /** Чужой посол (этап 114): решить, что ему показать. */
  | { readonly type: 'showGuest'; readonly show: ShowKind }
  /** Осада вслепую (этап 113): что видно из-под стен, блеф, перебежчик, знамёна. */
  | { readonly type: 'weighSiege' }
  | { readonly type: 'bluffParley' }
  | { readonly type: 'buyDefector' }
  | { readonly type: 'raiseBanners'; readonly locationId: string }
  /** Обман (этап 112): завести ложный лагерь, демонстрацию, слух или засаду. */
  | {
      readonly type: 'makeRuse'
      readonly kind: RuseKind
      readonly locationId: string
      readonly hostId?: string
    }
  | { readonly type: 'dropRuse'; readonly ruseId: string }
  /** Поле (этап 111): дать части замысел и спросить с неё донесение. */
  | { readonly type: 'setIntent'; readonly hostId: string; readonly intent: IntentId | null }
  | { readonly type: 'askHost'; readonly hostId: string }
  /** Глаза (этап 110): послать часть смотреть, поставить завесу, спросить местных. */
  | { readonly type: 'setRole'; readonly hostId: string; readonly role: HostRole | null }
  | { readonly type: 'askLocals' }
  | { readonly type: 'probeBand'; readonly bandId: string }
  /** Приказ (этап 108): послать велённое в своё место и отозвать с дороги. */
  | { readonly type: 'sendBehest'; readonly kind: BehestKind; readonly locationId: string }
  | { readonly type: 'recallBehest'; readonly behestId: string }
  /** День государя (этап 107): разобрать дело самому или передать своему. */
  | { readonly type: 'hearMatter'; readonly matterId: string }
  | { readonly type: 'handMatter'; readonly matterId: string }
  /** Утайка (этап 105): выслушать доносчика или прогнать. */
  | { readonly type: 'hearDenounce'; readonly pay: boolean }
  /** Люди двора (этап 104): исполнить просьбу своего или отказать. */
  | { readonly type: 'answerCourtier'; readonly office: OfficeId; readonly grant: boolean }
  /** Свои глаза (этап 102): объехать державу, послать человека смотреть. */
  | { readonly type: 'rideOut' }
  | { readonly type: 'sendLook'; readonly locationId: string }
  /** Молва (этап 101): пустить свою, проверить услышанную. */
  | {
      readonly type: 'startTalk'
      readonly kind: TalkKind
      readonly about: string
      readonly value: number | string
    }
  | { readonly type: 'checkTalk'; readonly talkId: string }
  /** Донесения своих (этап 100): проверить место ревизией. */
  | { readonly type: 'orderAudit'; readonly locationId: string }
  /** Мир и его цена (этап 88): сесть за стол, предложить условия, встать. */
  | { readonly type: 'openTalks'; readonly against: string; readonly mediator?: MediatorKind }
  | { readonly type: 'tableTerms'; readonly terms: readonly PeaceTerm[] }
  | { readonly type: 'endTalks' }
  /** Церковь (этап 96): исполнить просьбу или отказать. */
  | { readonly type: 'answerChurch'; readonly yield: boolean }
  /** Города (этап 95): ответить городу, дать вольность по договору. */
  | { readonly type: 'answerCity'; readonly locationId: string; readonly ask: CityAsk }
  | {
      readonly type: 'grantPact'
      readonly locationId: string
      readonly guarantor?: string
    }
  /** Мятеж (этап 94): унять уступкой или силой. */
  | { readonly type: 'appeasePlot'; readonly concession: ConcessionId }
  | { readonly type: 'crushPlot' }
  /** Наследство (этап 93): поставить закон. */
  | { readonly type: 'setHeirLaw'; readonly law: LawId }
  /** Чужие послы (этап 91): принять, отказать, торговаться. */
  | { readonly type: 'answerOverture'; readonly id: string; readonly answer: AnswerId }
  /** Съезд корон (этап 83): созвать, купить голос. */
  | {
      readonly type: 'callCongress'
      readonly question: CongressQuestion
      readonly about?: string
    }
  | { readonly type: 'buyVote'; readonly kingdomId: string }
  /** Соглядатаи (этап 82): завести, отозвать, купить советника, пустить слух. */
  | { readonly type: 'plantSpy'; readonly kingdomId: string; readonly seat: SpySeat }
  | { readonly type: 'recallSpy'; readonly kingdomId: string }
  | { readonly type: 'bribeAdvisor'; readonly kingdomId: string; readonly lordId: string }
  | { readonly type: 'spreadRumour'; readonly kingdomId: string }
  /** Заявить право на чужой трон по крови (этап 81, Р4). */
  | { readonly type: 'claimThrone'; readonly kingdomId: string }
  /** Порвать договор (этап 80, Г3). */
  | { readonly type: 'breakTreaty'; readonly treatyId: string }
  /** Титул (этап 78): венчаться на царство и заявить право на чужую землю. */
  | { readonly type: 'crownSelf' }
  | { readonly type: 'pressClaim'; readonly provinceId: string; readonly against: string }
  /** Казна державы (этап 77): занять, отдать, поставить людей, строить. */
  | { readonly type: 'borrow'; readonly lender: LenderId; readonly amount: number }
  | { readonly type: 'repay'; readonly lender: LenderId; readonly amount: number }
  | {
      readonly type: 'raiseMen'
      readonly locationId: string
      readonly way: RaiseWay
      readonly men: number
    }
  | { readonly type: 'queueWork'; readonly locationId: string; readonly building: BuildingId }
  /** Закон державы (этап 76): вольность городу и ответ недоимщику. */
  | { readonly type: 'grantCharter'; readonly locationId: string }
  | {
      readonly type: 'answerArrears'
      readonly locationId: string
      readonly answer: ArrearsAnswer
    }
  /** Двор (этап 75): назначить, отставить, послать с поручением. */
  | { readonly type: 'appoint'; readonly officeId: OfficeId; readonly holderId: string }
  | { readonly type: 'dismissOfficer'; readonly officeId: OfficeId }
  | { readonly type: 'sendOfficer'; readonly officeId: OfficeId; readonly errandId: OfficeErrandId }
  /** Двор (этап 43): пожаловать лен вассалу, отнять его, рассудить дело. */
  | { readonly type: 'grantFief'; readonly lordId: string; readonly locationId: string }
  | { readonly type: 'revokeFief'; readonly locationId: string }
  | { readonly type: 'judge'; readonly caseId: string; readonly choice: CourtChoice }
  | { readonly type: 'buy'; readonly good: GoodId; readonly amount: number }
  | { readonly type: 'sell'; readonly good: GoodId; readonly amount: number }
  | { readonly type: 'work'; readonly jobId: string }
  | { readonly type: 'study'; readonly courseId: string }
  | { readonly type: 'takeExam'; readonly examId: string }
  | { readonly type: 'rest'; readonly hours: number }
  | { readonly type: 'sleep' }
  | { readonly type: 'turnBack' }
  | { readonly type: 'spendSkillPoint'; readonly skillId: SkillId }
  | { readonly type: 'spendAttributePoint'; readonly attributeId: AttributeId }

export type FailureCode =
  | 'unknownAction'
  | 'requirements'
  | 'noMoney'
  | 'exhausted'
  | 'closed'
  | 'noPoints'
  | 'maxed'
  | 'rankNotEligible'
  | 'unavailableHere'
  | 'inBattle'
  | 'noRecruits'
  | 'notYours'
  | 'shunned'
  | 'noRoom'
  | 'noGoods'
  | 'overloaded'
  | 'captive'
  | 'wounded'
  | 'onTheRoad'
  | 'flood'
  | 'ice'
  | 'elsewhere'
  | 'invalid'

export type CommandResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly code: FailureCode; readonly message: string }

/** Сколько усталости снимает час отдыха и час сна. */
export const REST_RECOVERY_PER_HOUR = 6
export const SLEEP_RECOVERY_PER_HOUR = 12
/** Максимум, который можно «переждать» одной командой. */
export const MAX_REST_HOURS = 12

/**
 * Что можно делать в пути.
 *
 * Всё остальное требует места, а места под ногами нет: под открытым небом не с
 * кем торговать, некому платить за учёбу и негде наниматься. Список нарочно
 * лежит одним куском, а не проверками по всем пятидесяти командам: так видно,
 * чем дорога отличается от деревни.
 */
const ROAD_COMMANDS: ReadonlySet<Command['type']> = new Set([
  'tick',
  'turnBack',
  'camp',
  'rest',
  'sleep',
  'battleOrders',
  'battleFlee',
  'battleEnd',
  'payTribute',
  'cast',
  'duel',
  'payRansom',
  'attackBand',
  'assignCompanion',
  'dismissCompanion',
  'disband',
  'giveFood',
  'outfitParty',
  'abandonQuest',
  'spendSkillPoint',
  'spendAttributePoint',
])

export function applyCommand(
  state: GameState,
  command: Command,
  content: Content = CONTENT,
): CommandResult {
  // Пока идёт бой, мир стоит: ничем, кроме боя, заняться нельзя.
  const fighting = state.battle !== null
  const isBattleCommand =
    command.type === 'battleOrders' ||
    command.type === 'battleFlee' ||
    command.type === 'battleEnd' ||
    command.type === 'duel' ||
    command.type === 'payTribute'
  if (state.over) return fail('invalid', 'Эта история закончена.')
  if (fighting && !isBattleCommand) return fail('inBattle', 'Сейчас не до того — идёт бой.')
  if (!fighting && isBattleCommand) return fail('invalid', 'Боя нет.')
  // В плену можно только ждать, спать и платить: остальное решает тот, кто держит.
  const captivity = state.character.captivity
  if (captivity && !CAPTIVE_COMMANDS.has(command.type)) {
    return fail(
      'captive',
      `Ты в плену, держит ${foeName(state, captivity.captorId)}: жди или плати.`,
    )
  }
  // Рана тяжелее половины — постель: ни дороги, ни работы, ни боя.
  const wound = state.character.wound
  if (wound && bedridden(wound) && BEDRIDDEN_BLOCKS.has(command.type)) {
    return fail('wounded', `Рана не пускает: ещё ${wound.daysLeft} суток в постели.`)
  }
  // В пути — только то, что делают в пути.
  if (state.journey && !ROAD_COMMANDS.has(command.type)) {
    const to = state.world.locations[state.journey.toId]?.name ?? 'дальше'
    return fail(
      'onTheRoad',
      `Ты в пути в ${to}: осталось ${formatDuration(hours(Math.ceil(journeyLeft(state.journey))))}.`,
    )
  }

  // В большом месте дело делают в своём квартале (этап 45): за работой — на
  // рынок, к наставнику — в школу, к лорду — в замок. Мелкое место кварталов не
  // знает, и там всё под рукой.
  // Пустой квартал не держит: это сейв до 0.5 или герой, которого в город
  // поставили минуя дорогу; первый же переход по кварталам всё расставит.
  const activity = activityOf(command)
  if (activity && !state.journey && state.quarter) {
    const needed = quarterFor(state, activity, state.locationId)
    if (needed && state.quarter !== needed) {
      return fail(
        'elsewhere',
        `Это ${quarterWhere(needed)}, а ты ${quarterWhere(state.quarter ?? 'gate')}: ${formatDuration(walkMinutes(state.world, state.locationId))} ходу.`,
      )
    }
  }

  switch (command.type) {
    case 'tick':
      return tick(state, command.minutes)
    case 'goQuarter':
      return goQuarter(state, command.quarterId)
    case 'askAround':
      return askAround(state)
    case 'buyMap':
      return buyMap(state, command.regionId)
    case 'haggle':
      return haggleWith(state, command.merchantId, command.push)
    case 'buyFrom':
      return buyFrom(state, command.merchantId, command.good, command.amount)
    case 'sellTo':
      return sellTo(state, command.merchantId, command.good, command.amount)
    case 'takeOrder':
      return takeOrder(state, command.merchantId)
    case 'askPrices':
      return askPrices(state, command.merchantId)
    case 'joinCech':
      return joinCech(state)
    case 'leaveCech':
      return leaveCech(state)
    case 'takeApprentice':
      return takeApprentice(state)
    case 'rite':
      return rite(state, command.riteId)
    case 'donate':
      return donate(state, command.amount)
    case 'joinFeast':
      return joinFeast(state, command.doingId)
    case 'pilgrimage':
      return pilgrimage(state)
    case 'seekAudience':
      return seekAudience(state, command.lordId, command.gift)
    case 'courtIntrigue':
      return courtIntrigue(state, command.lordId, command.kind, command.targetId)
    case 'tourney':
      return tourney(state, command.lordId)
    case 'petition':
      return petition(state, command.lordId)
    case 'talk':
      return talk(state, command.speakerId, command.topicId)
    case 'grantWish':
      return grantWish(state, command.companionId)
    case 'buyBook':
      return buyBook(state, command.bookId)
    case 'readBook':
      return readBook(state, command.bookId)
    case 'debate':
      return debate(state)
    case 'takeStudent':
      return takeStudent(state)
    case 'buyHome':
      return buyHome(state, command.kind)
    case 'storeAtHome':
      return storeAtHome(state, command.good, command.amount)
    case 'takeFromHome':
      return takeFromHome(state, command.good, command.amount)
    case 'teachChild':
      return teachChild(state, command.childName)
    case 'helpKin':
      return helpKin(state, command.kinId)
    case 'retire':
      return retire(state)
    case 'travel':
      return travel(state, command.toLocationId)
    case 'sail':
      return sail(state, command.toLocationId, command.manner)
    case 'buyShip':
      return buyShip(state, command.kind)
    case 'repairShip':
      return repairShip(state)
    case 'sellShip':
      return sellShip(state)
    case 'turnBack':
      return turnBack(state)
    case 'hire':
      return hire(state, command.troop, command.count)
    case 'disband':
      return disband(state, command.troop, command.count)
    case 'battleOrders':
      return battleOrders(state, command.orders)
    case 'battleFlee':
      return battleFlee(state)
    case 'battleEnd':
      return battleEnd(state, command.prisoners)
    case 'duel':
      return duel(state)
    case 'payTribute':
      return payTribute(state)
    case 'payRansom':
      return payRansom(state)
    case 'takeService':
      return takeService(state, command.kingdomId)
    case 'leaveService':
      return leaveService(state)
    case 'seekEnemy':
      return seekEnemy(state)
    case 'attackBand':
      return attackBand(state, command.bandId)
    case 'recruitCompanion':
      return recruitCompanion(state, command.companionId)
    case 'camp':
      return camp(state, command.manner ?? 'sleep')
    case 'hunt':
      return hunt(state)
    case 'setGoal':
      return setGoal(state, command.goalId)
    case 'hireSinger':
      return hireSinger(state, command.circle)
    case 'watchJesters':
      return watchJesters(state)
    case 'askFaction':
      return askFaction(state, command.kingdomId, command.factionId)
    case 'meetEnvoy':
      return meetEnvoy(state, command.answer)
    case 'declareWar':
      return declareWar(state, command.kingdomId)
    case 'offerPeace':
      return offerPeace(state, command.kingdomId)
    case 'seeHealer':
      return seeHealer(state)
    case 'brewPotion':
      return brewPotion(state, command.potionId)
    case 'drinkPotion':
      return drinkPotion(state, command.potionId)
    case 'gatherHerbs':
      return gatherHerbs(state)
    case 'clearLair':
      return clearLair(state)
    case 'lootCache':
      return lootCache(state)
    case 'visitHermit':
      return visitHermit(state)
    case 'readTracks':
      return readTracks(state)
    case 'search':
      return search(state)
    case 'startChain':
      return startChain(state, command.chainId)
    case 'ransomCompanion':
      return ransomCompanion(state, command.companionId)
    case 'dismissCompanion':
      return dismissCompanion(state, command.companionId)
    case 'assignCompanion':
      return assignCompanion(state, command.companionId, command.role)
    case 'foundCaravan':
      return foundCaravan(state, command.awayId)
    case 'foundShipping':
      return foundShipping(state, command.awayId)
    case 'foundWorkshop':
      return foundWorkshop(state)
    case 'closeEnterprise':
      return closeEnterprise(state, command.enterpriseId)
    case 'proposeMarriage':
      return proposeMarriage(state, command.lordId)
    case 'quarantine':
      return quarantine(state)
    case 'build':
      return build(state, command.building)
    case 'station':
      return moveToGarrison(state, command.troop, command.count)
    case 'withdraw':
      return moveFromGarrison(state, command.troop, command.count)
    case 'besiege':
      return besiege(state)
    case 'siegeWait':
      return siegeWait(state, command.days)
    case 'siegeAssault':
      return siegeAssault(state)
    case 'siegeSap':
      return siegeSap(state, command.days)
    case 'siegeParley':
      return siegeParley(state)
    case 'siegeBribe':
      return siegeBribe(state)
    case 'captiveFate':
      return captiveFate(state, command.captiveId, command.fate)
    case 'inquire':
      return inquire(state)
    case 'hireGuards':
      return hireGuards(state, command.enterpriseId, command.count)
    case 'meetCaravan':
      return meetCaravan(state, command.enterpriseId)
    case 'foundInn':
      return foundInn(state)
    case 'patrolRoad':
      return patrolRoad(state, command.toId, command.riders)
    case 'hireCrew':
      return hireCrew(state, command.count)
    case 'payCrew':
      return payCrew(state)
    case 'takeBerth':
      return takeBerth(state, command.shipId)
    case 'huntPirate':
      return huntPirate(state, command.pirateId)
    case 'setLaw':
      return setLaw(state, command)
    case 'answerPlea':
      return answerPlea(state, command.locationId)
    case 'repairBuilding':
      return repairBuilding(state, command.locationId, command.building)
    case 'tourHolding':
      return tourHolding(state)
    case 'replaceSeneschal':
      return replaceSeneschal(state)
    case 'honeSpell':
      return honeSpell(state, command.spellId)
    case 'makeArtifact':
      return makeArtifact(state, command.defId)
    case 'orderSend':
      return orderSend(state, command.locationId)
    case 'orderPatronage':
      return orderPatronage(state)
    case 'orderInterdict':
      return orderInterdict(state, command.locationId)
    case 'orderPardon':
      return orderPardon(state, command.locationId)
    case 'foundBrotherhood':
      return foundBrotherhood(state, command.name, command.charterId)
    case 'siegeLift':
      return siegeLift(state)
    case 'askForFief':
      return askForFief(state)
    case 'buyItem':
      return buyItem(state, command.itemId)
    case 'craftItem':
      return craftItem(state, command.itemId)
    case 'repairItem':
      return repairItem(state, command.slot)
    case 'outfitParty':
      return outfitParty(state, command.weapons)
    case 'giveFood':
      return giveFood(state, command.amount)
    case 'deliverGoods':
      return deliverGoods(state, command.good, command.amount)
    case 'cast':
      return cast(state, command.spellId)
    case 'joinOrder':
      return joinOrder(state, command.orderId)
    case 'leaveOrder':
      return leaveOrder(state)
    case 'takeQuest':
      return takeQuest(state, command.questId)
    case 'finishQuest':
      return finishQuest(state, command.questId)
    case 'abandonQuest':
      return abandonQuest(state, command.questId)
    case 'proclaimRealm':
      return proclaimRealm(state, command.name)
    case 'inviteLord':
      return inviteLord(state, command.lordId)
    case 'swearOath':
      return swearOath(state, command.lordId, command.locationId)
    case 'summonVassals':
      return summonVassals(state)
    case 'sendEnvoy':
      return sendEnvoy(state, command.to, command.errand, command.envoyId, command.byLetter, {
        ...(command.secret ? { secret: command.secret } : {}),
        ...(command.guarantor ? { guarantor: command.guarantor } : {}),
      })
    case 'setCampaign':
      return setCampaign(state, command.against, command.aim)
    case 'formHost':
      return formHost(state, command.troop, command.count)
    case 'orderHost':
      return orderHost(state, command.hostId, command.order, command.targetId)
    case 'recallHost':
      return recallHost(state, command.hostId)
    case 'buildEngine':
      return buildEngine(state, command.engine)
    case 'siegeTerms':
      return siegeTerms(state, command.term)
    case 'stockFort':
      return stockFort(state, command.locationId, command.days)
    case 'garrisonOrder':
      return garrisonOrder(state, command.locationId, command.order)
    case 'hireCompany':
      return hireCompany(state, command.companyId, command.days)
    case 'payCompany':
      return payCompany(state, command.companyId)
    case 'dismissCompany':
      return dismissCompany(state, command.companyId)
    case 'takeCommission':
      return takeCommission(state, command.kingdomId, command.days)
    case 'leaveCommission':
      return leaveCommission(state)
    case 'buildWarship':
      return buildWarship(state, command.kind)
    case 'landTroops':
      return landTroops(state, command.locationId, command.men)
    case 'blockadePort':
      return blockadePort(state, command.locationId)
    case 'liftBlockade':
      return liftBlockade(state, command.locationId)
    case 'huntTrade':
      return huntTrade(state, command.locationId)
    case 'seaSortie':
      return seaSortie(state, command.locationId)
    case 'retrain':
      return retrain(state, command.from, command.to)
    case 'raiseHeir':
      return raiseHeir(state)
    case 'giftRecognition':
      return giftRecognition(state, command.to)
    case 'lendToCrown':
      return lendToCrown(state, command.to)
    case 'buyPeaceWith':
      return buyPeaceWith(state, command.against)
    case 'churchDeed':
      return churchDeed(state, command.deed)
    case 'breakLeague':
      return breakLeague(state, command.member)
    case 'callLeague':
      return callLeague(state, command.against)
    case 'holdWalls':
      return holdWalls(state, command.move)
    case 'joinFight':
      return joinFight(state, command.side)
    case 'claimBack':
      return claimBack(state, command.road)
    case 'goIntoExile':
      return goIntoExile(state, command.at)
    case 'ransomOwn':
      return ransomOwn(state, command.id)
    case 'haggleRansom':
      return haggleRansom(state, command.captiveId, command.offer)
    case 'writeAnnals':
      return writeAnnals(state)
    case 'meetEra':
      return meetEra(state, command.answer)
    case 'serveWinner':
      return serveWinner(state)
    case 'goQuiet':
      return goQuiet(state)
    case 'goLoud':
      return goLoud(state)
    case 'recogniseCrown':
      return recogniseCrown(state, command.of)
    case 'recallRecognition':
      return recallRecognition(state, command.of)
    case 'giveGuarantee':
      return giveGuarantee(state, command.of)
    case 'takeUnderHand':
      return takeUnderHand(state, command.of)
    case 'seekHand':
      return seekHand(state, command.patron)
    case 'takeTrial':
      return takeTrial(state, command.trialId)
    case 'weighPledge':
      return weighPledge(state, command.of)
    case 'weighError':
      return weighError(state, command.of)
    case 'askPicture':
      return askPicture(state, command.of)
    case 'seatResident':
      return seatResident(state, command.at)
    case 'recallResident':
      return recallResident(state, command.at)
    case 'getProof':
      return getProof(state, command.kind, command.a, command.b, command.against ?? PLAYER)
    case 'showProof':
      return showProof(state, command.proofId)
    case 'accuse':
      return accuse(state, command.a, command.b)
    case 'hushSecret':
      return hushSecret(state, command.treatyId)
    case 'prySecret':
      return prySecret(state, command.a, command.b)
    case 'showGuest':
      return showGuest(state, command.show)
    case 'weighSiege':
      return weighSiege(state)
    case 'bluffParley':
      return bluffParley(state)
    case 'buyDefector':
      return buyDefector(state)
    case 'raiseBanners':
      return raiseBanners(state, command.locationId)
    case 'makeRuse':
      return makeRuse(state, command.kind, command.locationId, command.hostId ?? null)
    case 'dropRuse':
      return dropRuse(state, command.ruseId)
    case 'setIntent':
      return setIntent(state, command.hostId, command.intent)
    case 'askHost':
      return askHost(state, command.hostId)
    case 'setRole':
      return setRole(state, command.hostId, command.role)
    case 'askLocals':
      return askLocalsHere(state)
    case 'probeBand':
      return probeBand(state, command.bandId)
    case 'sendBehest':
      return sendBehest(state, command.kind, command.locationId)
    case 'recallBehest':
      return recallBehest(state, command.behestId)
    case 'hearMatter':
      return hearMatter(state, command.matterId)
    case 'handMatter':
      return handMatter(state, command.matterId)
    case 'hearDenounce':
      return hearDenounce(state, command.pay)
    case 'answerCourtier':
      return answerCourtier(state, command.office, command.grant)
    case 'rideOut':
      return rideOut(state)
    case 'sendLook':
      return sendLook(state, command.locationId)
    case 'startTalk':
      return startTalk(state, command.kind, command.about, command.value)
    case 'checkTalk':
      return checkTalk(state, command.talkId)
    case 'orderAudit':
      return orderAudit(state, command.locationId)
    case 'openTalks':
      return openTalks(state, command.against, command.mediator)
    case 'tableTerms':
      return tableTerms(state, command.terms)
    case 'endTalks':
      return endTalks(state)
    case 'answerOverture':
      return answerOverture(state, command.id, command.answer)
    case 'setHeirLaw':
      return setHeirLaw(state, command.law)
    case 'appeasePlot':
      return appeasePlot(state, command.concession)
    case 'crushPlot':
      return crushPlot(state)
    case 'answerChurch':
      return answerChurch(state, command.yield)
    case 'answerCity':
      return answerCity(state, command.locationId, command.ask)
    case 'grantPact':
      return grantPact(state, command.locationId, command.guarantor)
    case 'askLetter':
      return askLetter(state, command.against)
    case 'callCongress':
      return callCongress(state, command.question, command.about)
    case 'buyVote':
      return buyVote(state, command.kingdomId)
    case 'plantSpy':
      return plantSpy(state, command.kingdomId, command.seat)
    case 'recallSpy':
      return recallSpy(state, command.kingdomId)
    case 'bribeAdvisor':
      return bribeAdvisor(state, command.kingdomId, command.lordId)
    case 'spreadRumour':
      return spreadRumour(state, command.kingdomId)
    case 'claimThrone':
      return claimThrone(state, command.kingdomId)
    case 'breakTreaty':
      return breakTreaty(state, command.treatyId)
    case 'crownSelf':
      return crownSelf(state)
    case 'pressClaim':
      return pressClaim(state, command.provinceId, command.against)
    case 'borrow':
      return borrow(state, command.lender, command.amount)
    case 'repay':
      return repay(state, command.lender, command.amount)
    case 'raiseMen':
      return raiseMen(state, command.locationId, command.way, command.men)
    case 'queueWork':
      return queueWork(state, command.locationId, command.building)
    case 'grantCharter':
      return grantCharter(state, command.locationId)
    case 'answerArrears':
      return answerArrears(state, command.locationId, command.answer)
    case 'appoint':
      return appoint(state, command.officeId, command.holderId)
    case 'dismissOfficer':
      return dismissOfficer(state, command.officeId)
    case 'sendOfficer':
      return sendOfficer(state, command.officeId, command.errandId)
    case 'grantFief':
      return grantFief(state, command.lordId, command.locationId)
    case 'revokeFief':
      return revokeFief(state, command.locationId)
    case 'judge':
      return judge(state, command.caseId, command.choice)
    case 'buy':
      return buy(state, command.good, command.amount)
    case 'sell':
      return sell(state, command.good, command.amount)
    case 'work':
      return work(state, command.jobId, content)
    case 'study':
      return study(state, command.courseId, content)
    case 'takeExam':
      return takeExam(state, command.examId, content)
    case 'rest':
      return rest(state, command.hours)
    case 'sleep':
      return sleep(state)
    case 'spendSkillPoint':
      return spendSkillPoint(state, command.skillId)
    case 'spendAttributePoint':
      return spendAttributePoint(state, command.attributeId)
  }
}

/**
 * Можно ли выполнить команду прямо сейчас — и если нет, то почему.
 *
 * Специально сделано прогоном самой команды: `applyCommand` — чистая функция,
 * результат просто выбрасывается. Так интерфейс показывает ровно ту причину
 * отказа, которую получит при нажатии, и правила не приходится дублировать
 * второй раз «для кнопок» (а потом ловить расхождения).
 */
export function canApply(
  state: GameState,
  command: Command,
  content: Content = CONTENT,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly code: FailureCode; readonly message: string } {
  const result = applyCommand(state, command, content)
  return result.ok ? { ok: true } : { ok: false, code: result.code, message: result.message }
}

/** Что доступно в плену. */
const CAPTIVE_COMMANDS: ReadonlySet<Command['type']> = new Set<Command['type']>([
  'tick',
  'rest',
  'sleep',
  'payRansom',
  'spendSkillPoint',
  'spendAttributePoint',
])

/** Чего не сделать с постели. */
const BEDRIDDEN_BLOCKS: ReadonlySet<Command['type']> = new Set<Command['type']>([
  'travel',
  'work',
  'study',
  'takeExam',
  'seekEnemy',
  'attackBand',
  'besiege',
  'siegeAssault',
  'siegeSap',
  'foundCaravan',
])

/**
 * Праздник: в этот день не работают и не учат (этап 39).
 *
 * У каждой короны год немного свой: в Робле неделя поста, у племён конский
 * праздник. Отказ говорит, какой именно, — чтобы игрок знал, что это не
 * поломка, а обычай.
 */
function checkFeast(state: GameState, what: string): CommandResult | null {
  const feast = feastAt(state.world, state.locationId, dayOf(state.time))
  if (!feast) return null
  return fail('closed', `Сегодня ${feast.name}: ${what}.`)
}

/** Как зовут того, кто стоит напротив: лорд, корона или просто разбойники. */
export function foeName(state: GameState, foeId: string | null): string {
  if (!foeId || foeId === 'bandits') return 'разбойники'
  if (foeId === 'pirates') return 'морские разбойники'
  if (foeId.startsWith('crown:')) {
    return state.world.kingdoms[foeId.slice('crown:'.length)]?.name ?? 'короны'
  }
  const lord = lordById(state.politics, foeId)
  return lord ? `${lord.title} ${lord.name}` : 'чужих'
}

// --- команды ---------------------------------------------------------------

/**
 * Переход в соседнюю по дороге локацию.
 *
 * Дорога — это просто длинное действие: модель времени из п.11.1 принимает её
 * без переделки. Ходить можно только к соседу, дальний путь складывается из
 * нескольких переходов — потом в них будет чему случаться.
 */
/**
 * Выйти в путь.
 *
 * Команда больше не переносит героя: она ставит его на дорогу. Дальше идут
 * часы — те же самые, которыми живёт мир, — и путь двигается вместе с ними
 * (`walk`). Прийти можно только дойдя.
 */
/**
 * Перейти в другой квартал (этап 45).
 *
 * Стоит времени, но немного, и ничего больше: город не дорога, засад в нём
 * нет. В месте без кварталов идти некуда.
 */
/** Пришёл — увидел: земля под ногами и то, куда отсюда ведут дороги (этап 46). */
function see(draft: Draft, locationId: string): void {
  // Приезд в своё владение записывается сам (этап 61, В5): недоимка и смелость
  // управляющего считаются от того, когда хозяина видели последний раз.
  if (draft.settlements[locationId]?.owner === PLAYER) {
    draft.visits = { ...draft.visits, [locationId]: dayOf(draft.time) }
  }
  if (!draft.knowledge) return
  draft.knowledge = reveal(draft.knowledge, seenFrom(draft.world, locationId))
}

function goQuarter(state: GameState, quarterId: QuarterId): CommandResult {
  const here = quartersOf(state, state.locationId)
  if (!here.includes(quarterId)) return fail('unavailableHere', 'Такого квартала здесь нет.')
  if ((state.quarter ?? null) === quarterId)
    return fail('invalid', `Ты уже ${quarterWhere(quarterId)}.`)
  const draft = open(state)
  advance(draft, walkMinutes(state.world, state.locationId))
  draft.quarter = quarterId
  return close(draft)
}

/**
 * Расспросить в корчме (этап 46).
 *
 * Слух — то, что тут все знают: ближайшая незнакомая герою земля. Стоит
 * кружки и часа. Ничего незнакомого поблизости — и слухов нет.
 */
const RUMOUR_PRICE = 5

function askAround(state: GameState): CommandResult {
  if (!state.knowledge) return fail('invalid', 'Ты и так знаешь всё, что здесь знают.')
  if (!state.settlements[state.locationId]) {
    return fail('unavailableHere', 'Расспрашивать здесь некого.')
  }
  if (state.character.money < RUMOUR_PRICE) {
    return fail('noMoney', `Без кружки не разговорятся: нужно ${RUMOUR_PRICE}.`)
  }
  const rumour = rumourAt(state, state.locationId)
  const draft = open(state)
  addMoney(draft, -RUMOUR_PRICE)
  advance(draft, hours(1))
  if (!rumour) {
    notice(draft, 'В корчме говорят о том, что ты и сам видел: ничего нового.')
    return close(draft)
  }
  draft.knowledge = reveal(state.knowledge, [rumour.provinceId])
  const via = state.world.locations[rumour.viaId]?.name ?? 'дорога'
  notice(draft, `В корчме слышал: за ${via} лежит ${describeLand(state.world, rumour.provinceId)}.`)
  return close(draft)
}

/** Купить карту области (этап 46): знание — товар. */
function buyMap(state: GameState, regionId: string): CommandResult {
  if (!state.knowledge) return fail('invalid', 'Карта тебе ни к чему: ты знаешь эти земли.')
  const map = mapsFor(state, state.locationId).find((one) => one.regionId === regionId)
  if (!map) return fail('unavailableHere', 'Такой карты здесь не продают.')
  if (state.character.money < map.price) {
    return fail('noMoney', `За карту просят ${map.price}, а у тебя ${state.character.money}.`)
  }
  const region = state.world.regions[regionId]
  const draft = open(state)
  addMoney(draft, -map.price)
  advance(draft, 30)
  draft.knowledge = reveal(state.knowledge, region?.provinceIds ?? [])
  notice(draft, `Куплена карта: ${map.name}. Открыто земель: ${map.fresh}.`)
  return close(draft)
}

function travel(state: GameState, toLocationId: string): CommandResult {
  const destination = state.world.locations[toLocationId]
  if (!destination) return fail('unknownAction', 'Такого места нет.')

  const road = roadsFrom(state.world, state.locationId).find(
    (candidate) => candidate.to === toLocationId,
  )
  if (!road) return fail('unknownAction', `Отсюда нет прямой дороги в ${destination.name}.`)

  // Весной брод уходит под воду: мелкое место — не мост (rivers.ts). Обход
  // есть всегда, потому что реку переходят не в одном месте.
  if (fordShut(state.world, toLocationId, dayOf(state.time))) {
    return fail('flood', `Половодье: ${destination.name} под большой водой, вброд не пройти.`)
  }

  // К мёртвому месту дорога заросла: идти вдвое дольше (band.ts, OVERGROWN).
  const roadHoursNow = roadHours(state.world, state.settlements, state.locationId, road.to)
  // Незнакомой землёй идут дольше: дороги не знаешь, спрашиваешь, плутаешь
  // (этап 46). Незнание чего-то стоит — и считается.
  const blind = !knowsPlace(state, toLocationId)
  // Погода дня (этап 67, Я4): не время года, а сегодняшнее небо. В дождь
  // дорога раскисает, в туман плутают, в буран не идут вовсе — идут медленно.
  const sky = skyOf(state.world, state.locationId, dayOf(state.time))
  const walking = Math.round(
    legHoursFor(
      roadHoursNow,
      paceOf(state.party, state.character.wound !== null) * ailmentPace(state),
      seasonOf(dayOf(state.time)),
    ) *
      (blind ? BLIND_SLOW : 1) *
      skyRoad(sky),
  )
  const blocked = checkFatigue(state.character, travelFatigue(walking))
  if (blocked) return blocked

  const from = state.world.locations[state.locationId]
  const draft = open(state)
  if (sky !== 'clear') notice(draft, `${skyDef(sky).label}: ${skyDef(sky).about}`, 'world')
  notice(
    draft,
    `Дорога${from ? ` из ${from.name}` : ''} в ${destination.name}: ${formatDuration(hours(walking))} пути${
      roadHoursNow > road.hours ? ' — заросла, идти дольше' : ''
    }${blind ? ' — земля незнакомая, идти вслепую' : ''}.`,
  )
  draft.journey = { fromId: state.locationId, toId: toLocationId, hours: walking, done: 0 }
  return close(draft)
}

/**
 * Уйти морем.
 *
 * Тот же путь, что и по дороге, только часы считает вода: расстояние по морю,
 * судно и то, чьё оно. Способов три, и это не три кнопки одного и того же.
 * Своё судно уходит когда хочешь и берёт всю дружину, но стоит как три
 * каравана и тонет вместе с тобой. Нанятое — дорого за раз, зато сразу и
 * почти на всех. Попутное — гроши, но ждать отплытия, идти дольше и взять с
 * собой шестерых: чужому шкиперу рать на палубе не нужна.
 */
function sail(state: GameState, toLocationId: string, manner: Passage): CommandResult {
  const destination = state.world.locations[toLocationId]
  if (!destination) return fail('unknownAction', 'Такого места нет.')
  const lane = lanesFrom(state.world, state.locationId).find((one) => one.to === toLocationId)
  if (!lane) return fail('unknownAction', `Отсюда нет морского пути в ${destination.name}.`)
  // Зимой море встаёт: до весны никто никуда не идёт (этап 38). Но лёд можно
  // распустить словом (этап 60, А3) — на восемь суток, не дольше.
  const today = dayOf(state.time)
  if (iceBound(today) && !hasWeather(state, state.locationId, 'thaw', today)) {
    return fail('ice', 'Море встало. До весны из гавани не выйти.')
  }
  // А можно, наоборот, поднять бурю — и тогда из этой гавани не выйдет никто,
  // включая того, кто её позвал.
  if (hasWeather(state, state.locationId, 'gale', today)) {
    return fail('ice', 'Море стоит стеной: буря, которую позвали, не спрашивает, чья она.')
  }
  if (manner === 'own' && !state.ship) {
    return fail('requirements', 'Своего судна у тебя нет.')
  }
  if (!fits(manner, state.party, state.ship)) {
    const people = partySize(state.party) + 1
    return fail(
      'noRoom',
      manner === 'own'
        ? `На борт влезет ${shipCarries(state.ship as NonNullable<typeof state.ship>)}, а вас ${people}.`
        : manner === 'hire'
          ? `Столько на нанятое судно не берут: ${people} против ${HIRE_MAX}.`
          : `Попутный шкипер возьмёт шестерых, а не ${people}. Рать на чужой палубе никому не нужна.`,
    )
  }

  // Ход своего судна считают руки, а не только корпус (этап 62, К4): недобор
  // команды замедляет вполтора раза, а нрав шкипера — в свою сторону.
  const hours = Math.round(
    seaHours(lane.hours, manner, state.ship) *
      (manner === 'own' && state.ship ? crewPace(state.ship) : 1),
  )
  const people = partySize(state.party) + 1
  const cost = Math.round(
    passageCost(manner, hours, people) * (ownOrderHere(state)?.perks.sea ?? 1),
  )
  if (cost > state.character.money) {
    return fail('noMoney', `За перевоз просят ${cost}, а у тебя ${state.character.money}.`)
  }
  const blocked = checkFatigue(state.character, travelFatigue(hours) / 2)
  if (blocked) return blocked

  const draft = open(state)
  const wait = waitHours(manner)
  if (cost > 0) addMoney(draft, -cost)
  notice(
    draft,
    `Морем в ${destination.name}: ${formatDuration(hoursOf(hours))} ходу, ${PASSAGE_LABELS[manner]}${
      cost > 0 ? `, за ${cost}` : ''
    }.${wait > 0 ? ` Отплытие ждали ${formatDuration(hoursOf(wait))}.` : ''}`,
  )
  // Ожидание отплытия — это уже время: чужое судно уходит по своей надобности.
  if (wait > 0) advance(draft, hoursOf(wait))
  draft.journey = {
    fromId: state.locationId,
    toId: toLocationId,
    hours,
    done: 0,
    sea: true,
    manner,
  }
  return close(draft)
}

/** Часы в минуты — в этом файле `hours` уже занято именем импорта. */
function hoursOf(count: number): number {
  return hours(count)
}

/**
 * Купить судно.
 *
 * Только в гавани, из которой есть куда плыть: судно продают там, где его
 * строят и держат. Цена — как у трёх караванов, и это правильная цена: корабль
 * открывает половину карты и тонет вместе со всем, что на нём.
 */
function buyShip(state: GameState, kind: ShipKind): CommandResult {
  const def = SHIPS[kind]
  if (!def) return fail('unknownAction', 'Таких судов не строят.')
  if (lanesFrom(state.world, state.locationId).length === 0) {
    return fail('unavailableHere', 'Судно покупают в гавани, а не здесь.')
  }
  if (state.ship) return fail('requirements', 'У тебя уже есть судно. Двумя сразу не ходят.')
  if (state.character.money < def.price) {
    return fail(
      'noMoney',
      `За ${def.label.toLowerCase()} просят ${def.price}, а у тебя ${state.character.money}.`,
    )
  }

  const draft = open(state)
  const [index, afterName] = nextInt(draft.rng, 0, SHIP_NAMES.length - 1)
  draft.rng = afterName
  const name = SHIP_NAMES[index] ?? 'Чайка'
  addMoney(draft, -def.price)
  advance(draft, hoursOf(3))
  draft.ship = { kind, name, condition: 1 }
  notice(draft, `Куплено судно: ${def.label.toLowerCase()} «${name}» за ${def.price}.`, 'trade')
  return close(draft)
}

function repairShip(state: GameState): CommandResult {
  const ship = state.ship
  if (!ship) return fail('requirements', 'Чинить нечего: судна нет.')
  if (lanesFrom(state.world, state.locationId).length === 0) {
    return fail('unavailableHere', 'Судно чинят в гавани.')
  }
  const price = Math.round(repairPrice(ship) * (ownOrderHere(state)?.perks.sea ?? 1))
  if (price <= 0) return fail('invalid', `«${ship.name}» и так цела.`)
  if (state.character.money < price) {
    return fail('noMoney', `Починка стоит ${price}, а у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hoursOf(8))
  draft.ship = { ...ship, condition: 1 }
  notice(draft, `«${ship.name}» проконопачена и просмолена. Отдано ${price}.`, 'trade')
  return close(draft)
}

function sellShip(state: GameState): CommandResult {
  const ship = state.ship
  if (!ship) return fail('requirements', 'Продавать нечего.')
  if (lanesFrom(state.world, state.locationId).length === 0) {
    return fail('unavailableHere', 'Судно продают в гавани.')
  }
  const price = resalePrice(ship)
  const draft = open(state)
  addMoney(draft, price)
  advance(draft, hoursOf(2))
  draft.ship = null
  notice(draft, `«${ship.name}» продана за ${price}.`, 'trade')
  return close(draft)
}

/**
 * Откупиться.
 *
 * Морскому разбойнику нужен не бой, а груз: он берёт мзду и уходит, потому что
 * драка на воде дорога обеим сторонам. На суше такого выбора нет — там от
 * разбойников уходят или отбиваются, — и в этом разница между дорогой и морем:
 * в море есть с кем договориться, но платить приходится всегда.
 *
 * Цена — по головам на чужой палубе: чем их больше, тем наглее запрос. Отряд
 * это запоминает: платить вместо драки дёшево для кошелька и дорого для духа.
 */
const TRIBUTE_PER_HEAD = 22

function payTribute(state: GameState): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  // Откупаются от моря: и от безымянной шайки, и от морского лорда, у которого
  // с этапа 62 есть имя. Имя цены не меняет — меняет то, кому платишь.
  const lord = battle.foeId ? pirateById(state.world, battle.foeId) : null
  if (battle.foeId !== 'pirates' && !lord) {
    return fail('invalid', 'С этими не договариваются.')
  }
  if (battle.outcome !== 'ongoing') return fail('invalid', 'Всё уже решилось.')
  const asked = Math.max(40, Math.round(unitsSize(battle.enemy.units) * TRIBUTE_PER_HEAD))
  if (state.character.money < asked) {
    return fail('noMoney', `За проход просят ${asked}, а у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -asked)
  draft.battle = null
  // Дух падает: люди видели, как их провели мимо драки за деньги.
  draft.party = { ...draft.party, morale: Math.max(0, draft.party.morale - 8) }
  notice(draft, `Заплачено ${asked} — и чёрный парус отвернул. Люди молчат.`)
  return close(draft)
}

/** Повернуть назад: то, чего у мгновенного перемещения быть не могло. */
function turnBack(state: GameState): CommandResult {
  const journey = state.journey
  if (!journey) return fail('invalid', 'Ты никуда не идёшь.')
  const draft = open(state)
  const home = state.world.locations[journey.fromId]?.name ?? 'откуда вышел'
  notice(draft, `Поворот назад: обратно в ${home}.`)
  // Пройденное становится оставшимся: назад идти ровно столько, сколько прошёл.
  draft.journey = {
    fromId: journey.toId,
    toId: journey.fromId,
    hours: journey.hours,
    done: journey.hours - journey.done,
  }
  return close(draft)
}

/**
 * Часы пути.
 *
 * Дорога идёт вместе с миром: сколько прошло времени, столько и прошли. Отсюда
 * же берутся усталость и навык — не разом на выходе, а по мере ходьбы.
 */
/**
 * Ночью идут медленнее.
 *
 * Не запрет, а цена: в темноте можно идти, но за час проходишь три пятых
 * дневного. Вместе с ночной опасностью (`NIGHT_DANGER`) это и делает привал
 * решением: встать лагерем до света или тащиться впотьмах.
 */
const NIGHT_PACE = 0.6

function walk(draft: Draft, minutes: number): void {
  const journey = draft.journey
  if (!journey || minutes <= 0) return
  // Море идёт по своим правилам: там не ночуют на обочине и не встречают
  // обозов (этап 35).
  if (journey.sea) {
    float(draft, minutes)
    return
  }
  const dark =
    timeOfDay(draft.base.time) === 'night' && (draft.character.lit ?? 0) <= draft.base.time
  const walked = Math.min(
    (minutes / MINUTES_PER_HOUR) * (dark ? NIGHT_PACE : 1),
    journeyLeft(journey),
  )
  if (walked <= 0) return
  addFatigue(draft, travelFatigue(walked))
  practice(draft, 'athletics', walked * 2.5)
  practice(draft, 'survival', walked * 1.5)
  const done = Math.round((journey.done + walked) * 100) / 100
  if (done < journey.hours) {
    draft.journey = { ...journey, done }
    // Пока идём — дорога сама по себе: кто ждёт впереди и кто говорит рядом.
    roadWatch(draft, journey)
    roadTalk(draft)
    // Опасность считается по часам на дороге, а не по пройденному: ночью и
    // идёшь медленнее, и ждут чаще, поэтому ночной переход стоит вдвое дороже
    // дневного при той же земле.
    roadAmbush(draft, journey, minutes / MINUTES_PER_HOUR)
    roadMeet(draft, journey, minutes / MINUTES_PER_HOUR)
    return
  }

  // Пришли.
  draft.journey = null
  draft.locationId = journey.toId
  draft.quarter = arrivalQuarter(draft, journey.toId)
  see(draft, journey.toId)
  const place = draft.world.locations[journey.toId]
  notice(draft, `Пришли: ${place?.name ?? 'место'}.`)
  roadTalk(draft)
}

/**
 * Час под парусом.
 *
 * Тот же счётчик часов, что и на дороге, но всё остальное другое. Ночь не
 * замедляет: судно идёт и в темноте, вахту стоят по очереди. Устают вдвое
 * меньше — идёт судно, а не ты. И вместо засады на отрезке — погода и те, кто
 * ходит под чужим флагом.
 */
const SEA_FATIGUE = 0.5

function float(draft: Draft, minutes: number): void {
  const journey = draft.journey
  if (!journey || minutes <= 0) return
  const sailed = Math.min(minutes / MINUTES_PER_HOUR, journeyLeft(journey))
  if (sailed <= 0) return
  addFatigue(draft, Math.round(travelFatigue(sailed) * SEA_FATIGUE))
  practice(draft, 'survival', sailed * 1.2)
  const done = Math.round((journey.done + sailed) * 100) / 100
  if (done < journey.hours) {
    draft.journey = { ...journey, done }
    seaWeather(draft, sailed)
    seaRaiders(draft, sailed)
    return
  }

  // Пришли.
  draft.journey = null
  draft.locationId = journey.toId
  // С моря сходят на пристань, а не к воротам.
  draft.quarter = hasQuarters(draft, journey.toId) ? 'harbour' : null
  see(draft, journey.toId)
  const place = draft.world.locations[journey.toId]
  notice(draft, `Сошли на берег: ${place?.name ?? 'гавань'}.`)
  roadTalk(draft)
}

/**
 * Погода в море.
 *
 * Шторм и штиль — это одно и то же с точки зрения пути: время, которого не
 * было в расчёте. Разница в том, что штиль только держит, а шторм ещё и треплет
 * судно и заставляет выбрасывать за борт товар. Своё судно от этого ветшает —
 * потому его и чинят в порту, а не «оно само».
 */
const STORM_CHANCE = 0.022
const CALM_CHANCE = 0.03

function seaWeather(draft: Draft, hoursAtSea: number): void {
  const journey = draft.journey
  if (!journey || hoursAtSea <= 0) return
  // Тишь (этап 41): море спит до самого берега.
  if (journey.calm) return

  const [calm, afterCalm] = rollChance(draft.rng, Math.min(0.5, CALM_CHANCE * hoursAtSea))
  draft.rng = afterCalm
  if (calm) {
    const [lost, afterLost] = nextInt(draft.rng, 1, 4)
    draft.rng = afterLost
    draft.journey = { ...journey, hours: journey.hours + lost }
    notice(draft, `Штиль. Парус повис, и ${formatDuration(hours(lost))} прошли впустую.`, 'world')
    return
  }

  const [storm, afterStorm] = rollChance(draft.rng, Math.min(0.5, STORM_CHANCE * hoursAtSea))
  draft.rng = afterStorm
  if (!storm) return
  const [blown, afterBlown] = nextInt(draft.rng, 2, 7)
  draft.rng = afterBlown
  const current = draft.journey
  if (current) draft.journey = { ...current, hours: current.hours + blown }
  notice(draft, `Шторм. Судно отнесло, и до берега ещё ${formatDuration(hours(blown))}.`, 'world')

  // За борт идёт то, что тяжелее людей.
  const [share, afterShare] = nextFloat(draft.rng)
  draft.rng = afterShare
  if (share < 0.45) tossCargo(draft)

  const ship = draft.ship
  if (!ship) return
  const [force, afterForce] = nextInt(draft.rng, 6, 18)
  draft.rng = afterForce
  const beaten = battered(ship, force / 100)
  draft.ship = beaten
  if (beaten.condition > 0) {
    notice(draft, `«${ship.name}» приняла воды: целость ${Math.round(beaten.condition * 100)}%.`)
    return
  }
  // Судно не пережило. Хозяина подобрали — судно нет.
  draft.ship = null
  notice(draft, `«${ship.name}» не выдержала. Судна больше нет; вас сняли с обломков.`, 'world')
  // Вместе с судном тонет и чужой груз: за фрахт теперь не заплатят, а тот, кто
  // его доверил, это запомнит.
  const freight = draft.quests.filter((quest) => quest.type === 'freight')
  if (freight.length > 0) {
    draft.quests = draft.quests.filter((quest) => quest.type !== 'freight')
    for (const lost of freight) {
      draft.reputation = withPlaceRep(draft.reputation, lost.issuerLocationId, -6)
    }
    notice(draft, 'Чужой груз ушёл на дно вместе с судном. Об этом узнают в порту.', 'trade')
  }
}

/** Что выбрасывают за борт: половину самого тяжёлого из котомки. */
function tossCargo(draft: Draft): void {
  const inventory = { ...draft.character.inventory }
  let worst: GoodId | null = null
  let most = 0
  for (const [good, amount] of Object.entries(inventory)) {
    if ((amount ?? 0) > most) {
      most = amount ?? 0
      worst = good as GoodId
    }
  }
  if (!worst || most <= 0) return
  const lost = Math.max(1, Math.round(most / 2))
  inventory[worst] = most - lost
  draft.character = { ...draft.character, inventory }
  notice(draft, `За борт пошло ${lost} — ${GOODS[worst].label.toLowerCase()}. Волна не спрашивает.`)
}

/**
 * Те, кто ходит под чужим флагом.
 *
 * В море разбойник опаснее дорожного: уйти некуда, и свидетелей не остаётся.
 * Отряд принимает бой на палубе, одиночку обирают до нитки — как и на дороге,
 * только дороже.
 */
const PIRATE_CHANCE = 0.012

/**
 * Насколько чаще ждут в дальних водах.
 *
 * Пути к островам идут мимо бухт, в которые заходят не спрашивая позволения:
 * там чужого паруса вдвое больше, чем на виду у корон. Это и есть разница
 * между морем внутренним и морем открытым.
 */
const WILD_WATERS = 2

function seaRaiders(draft: Draft, hoursAtSea: number): void {
  if (draft.battle || hoursAtSea <= 0) return
  const journey = draft.journey
  const offshore = [journey?.fromId, journey?.toId].some((id) => {
    const provinceId = id ? draft.base.world.locations[id]?.provinceId : undefined
    return provinceId ? draft.base.world.provinces[provinceId]?.island === true : false
  })
  const risk = PIRATE_CHANCE * (offshore ? WILD_WATERS : 1)
  const [met, afterMet] = rollChance(draft.rng, Math.min(0.4, risk * hoursAtSea))
  draft.rng = afterMet
  if (!met) return

  if (partySize(draft.party) >= 3) {
    const [band, afterBand] = banditBand(0.6, 400, draft.rng)
    draft.rng = afterBand
    // У пирата есть имя (этап 62, К6): ближайший к этой воде морской лорд.
    const lord = pirateNear(draft.base.world, draft.locationId)
    draft.battle = startBattle(
      draft.party,
      lord ? { ...band, name: `${lord.name} ${lord.byname}` } : band,
      'coast',
      {
        foeId: lord?.id ?? 'pirates',
        // Абордаж — та же теснота, что у брода: на сходнях дерутся по трое.
        ground: 'ford',
        veterans: veteransOf(draft.party),
      },
    )
    notice(draft, 'Из-за мыса вышли под чёрным парусом. Уйти некуда — только драться.')
    return
  }
  const loss = Math.round(draft.character.money * 0.4)
  if (loss > 0) addMoney(draft, -loss)
  tossCargo(draft)
  notice(
    draft,
    loss > 0
      ? `Пираты взяли ${loss} монет и ушли. Могли и за борт.`
      : 'Пираты обшарили и отпустили: взять нечего.',
  )
}

/**
 * Что видно с дороги.
 *
 * Войско на том конце отрезка видно заранее — это и есть разница между «идти» и
 * «оказаться»: у мгновенного перемещения предупредить было некогда.
 */
function roadWatch(draft: Draft, journey: Journey): void {
  if (journey.done > 0) return
  const hosts = draft.bands.filter((band) => band.locationId === journey.toId && !band.travel)
  const host = hosts[0]
  if (!host) return
  const where = draft.base.world.locations[journey.toId]?.name ?? 'впереди'
  notice(
    draft,
    `Впереди на дороге войско: ${foeName(draft.base, host.lordId)} у ${where}.`,
    'world',
  )
}

/**
 * Насколько часто на отрезке сходятся лицом к лицу.
 *
 * Не каждый час: дорога широка, обозы расходятся, войско видит путника раньше,
 * чем путник войско. Но за долгий переход мимо чужой рати не пройти.
 */
const MEET_CHANCE = 0.2

/**
 * Встреча с чужой дружиной на отрезке.
 *
 * Перехват работает в обе стороны: не только игрок ловит идущих грабить, но и
 * его самого можно поймать в поле. Воюющие берут в бой, прочие расходятся — и о
 * них говорят.
 */
function roadMeet(draft: Draft, journey: Journey, hoursOnRoad: number): void {
  if (draft.battle || hoursOnRoad <= 0) return
  const met = bandsOnLeg(draft.bands, journey.fromId, journey.toId)[0]
  if (!met) return
  const [meets, afterMeet] = rollChance(draft.rng, Math.min(0.6, MEET_CHANCE * hoursOnRoad))
  draft.rng = afterMeet
  if (!meets) return

  const side = draft.service ?? draft.realm?.name ?? null
  const theirs = met.kingdomId ?? met.lordId
  const hostile = side !== null && atWar(draft.politics, side, theirs)
  const who = foeName(draft.base, met.lordId)
  if (!hostile || partySize(draft.party) < 2) {
    notice(draft, `Разминулись на дороге: ${who} идёт своей дорогой.`, 'world')
    return
  }
  const ahead = draft.base.world.locations[journey.toId]
  // Встретить на дороге то, о чём не знал, — и есть внезапность (этап 109, Т4).
  const ambush = surpriseOf(draft.base, draft.base.world, PLAYER, met, dayOf(draft.time))
  if (ambush.surprised) {
    const hit = Math.round(ambush.moraleHit * steadyUnder(draft.character))
    draft.party = { ...draft.party, morale: Math.max(0, draft.party.morale - hit) }
    notice(draft, `${who}: ${ambush.says} Дух −${hit}.`, 'war')
  }
  draft.bands = draft.bands.filter((one) => one.id !== met.id)
  const enemy: BattleSide = {
    name: who,
    units: met.units,
    morale: draft.party.morale > 0 ? met.morale : met.morale,
    fatigue: 0,
  }
  draft.battle = startBattle(draft.party, enemy, ahead?.terrain ?? 'plains', {
    foeId: met.kingdomId ? `crown:${met.kingdomId}` : met.lordId,
    ground: groundFor(ahead?.terrain ?? 'plains', 'road'),
    veterans: veteransOf(draft.party),
    sight: skySight(skyOf(draft.base.world, draft.locationId, dayOf(draft.time))),
  })
  notice(draft, `На дороге встретились: ${who}. Расходиться поздно.`)
}

/** Сколько народу «водится» в глуши: у места без жителей своего населения нет. */
const WILD_PARTY = 500

/**
 * Встреча на дороге.
 *
 * Шайки водятся там, где голодно и разорено, поэтому опасность дороги — прямое
 * следствие экономики, а не случайное событие по таймеру. Одиночку не убивают,
 * а обирают: драться с ним незачем.
 */
/**
 * Насколько опасна земля места: разбой округи и дурная слава самой глуши.
 *
 * Опасность пути — свойство земли, а не только разбойной округи. Пока она
 * считалась по разбою места назначения, в урочище и на перевале не могло
 * случиться ничего: поселения там нет, а значит нет и разбоя.
 */
function dangerAt(draft: Draft, locationId: string): number {
  const here = draft.base.world.locations[locationId]
  if (!here) return 0
  const banditry = draft.settlements[locationId]?.banditry ?? 0
  const wild = isSite(here.archetype) ? SITES[here.archetype].danger : 0
  // Незнакомая земля опаснее: не знаешь, где ждут (этап 46).
  const blind = knowsPlace(draft.base, locationId) ? 1 : BLIND_DANGER
  return Math.min(0.45, (0.02 + banditry * 0.5 + wild * 0.3) * blind)
}

/**
 * Встреча на отрезке пути.
 *
 * Засада случается **на дороге**, а не в точке прибытия: земля отрезка — это
 * оба его конца, и хуже тот, что хуже. Считается на каждый час пути, поэтому
 * долгая дорога и правда опаснее короткой, а ночь опаснее дня — в темноте на
 * тракте ждут чаще.
 */
const NIGHT_DANGER = 1.6
/** За сколько часов пути набирается опасность целого отрезка старого мира. */
const AMBUSH_SPAN = 4

function roadAmbush(draft: Draft, journey: Journey, hoursOnRoad: number): void {
  if (hoursOnRoad <= 0) return
  const ahead = dangerAt(draft, journey.toId)
  const behind = dangerAt(draft, journey.fromId)
  const land = Math.max(ahead, behind)
  const night = timeOfDay(draft.time) === 'night' ? NIGHT_DANGER : 1
  const risk = Math.min(0.5, (land / AMBUSH_SPAN) * hoursOnRoad * night)
  const [meets, afterMeet] = rollChance(draft.rng, risk)
  draft.rng = afterMeet
  if (!meets) return
  // Ждут там, где хуже: у того конца отрезка, чья земля опаснее.
  ambush(draft, ahead >= behind ? journey.toId : journey.fromId, true)
}

function ambush(draft: Draft, locationId: string, onTheRoad = false): void {
  const here = draft.base.world.locations[locationId]
  if (!here) return
  // Оберег (этап 41): пока он держится, засада ждёт кого-то другого.
  if ((draft.character.warded ?? 0) > draft.time) return
  // На земле своего ордена своих трогают реже (этап 42).
  const roads = ownOrderHere(draft.base, locationId)?.perks.roads ?? 1
  if (roads < 1) {
    const [spared, afterSpare] = rollChance(draft.rng, 1 - roads)
    draft.rng = afterSpare
    if (spared) return
  }
  const settlement = draft.settlements[locationId]
  const banditry = settlement?.banditry ?? 0
  const wild = isSite(here.archetype) ? SITES[here.archetype].danger : 0
  if (!onTheRoad) {
    const risk = Math.min(0.45, 0.02 + banditry * 0.5 + wild * 0.3)
    const [meets, afterMeet] = rollChance(draft.rng, risk)
    draft.rng = afterMeet
    if (!meets) return
  }

  const terrain = here.terrain
  const lurking = Math.max(banditry, wild)
  const around = settlement?.population ?? WILD_PARTY
  if (partySize(draft.party) >= 3) {
    const [band, afterBand] = banditBand(lurking, around, draft.rng)
    draft.rng = afterBand
    draft.battle = startBattle(draft.party, band, terrain, {
      foeId: 'bandits',
      ground: groundFor(terrain, 'road'),
      veterans: veteransOf(draft.party),
      sight: skySight(skyOf(draft.base.world, draft.locationId, dayOf(draft.time))),
    })
    notice(
      draft,
      onTheRoad
        ? `На дороге ждали: разбойники. ${TERRAIN_LABELS[terrain]} — хорошее место для засады.`
        : 'На дороге ждали: разбойники.',
    )
    return
  }

  const loss = Math.round(draft.character.money * 0.3)
  if (loss > 0) addMoney(draft, -loss)
  notice(
    draft,
    loss > 0
      ? `Разбойники вытрясли ${loss} монет и отпустили.`
      : 'Разбойники обшарили и отпустили: взять нечего.',
  )
}

/**
 * Мороз забирает своё.
 *
 * Ночь в поле зимой — это не «отдохнул хуже»: это отмороженные пальцы у того,
 * кто не умеет ночевать в снегу. Выживание убирает беду почти совсем, и это тот
 * случай, когда навык виден не числом в листе, а тем, что с тобой не случилось.
 */
function frostbite(draft: Draft): void {
  if (draft.character.wound) return
  if ((draft.character.warded ?? 0) > draft.time) return
  const skill = skillLevel(draft.character, 'survival')
  const risk = Math.max(0, 0.3 - skill * 0.04)
  const [bitten, afterRoll] = rollChance(draft.rng, risk)
  draft.rng = afterRoll
  if (!bitten) return
  const [days, afterDays] = nextInt(draft.rng, 3, 7)
  draft.rng = afterDays
  draft.character = { ...draft.character, wound: { daysLeft: days, severity: 0.2 } }
  notice(draft, 'Мороз достал: пальцы не гнутся, лицо в белых пятнах. Это пройдёт, но не завтра.')
}

/** Дорога выматывает примерно как работа: три с половиной единицы за час хода. */
export function travelFatigue(roadHours: number): number {
  return Math.round(roadHours * 3.5)
}

/**
 * Ход времени сам по себе.
 *
 * Отдельная команда, а не часть каждой другой: мир должен идти и тогда, когда
 * игрок ничего не делает. Стоять — не то же самое, что отдыхать: усталость
 * сходит вдвое медленнее, чем на привале.
 */
function tick(state: GameState, minutes: number): CommandResult {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MINUTES_PER_DAY) {
    return fail('invalid', 'Столько времени за раз не проходит.')
  }
  const draft = open(state)
  advance(draft, Math.round(minutes))
  // Час часов — это час ходьбы, если герой в пути. Отдых и лагерь время тратят,
  // но с места не двигают: идут тогда, когда идут.
  walk(draft, Math.round(minutes))
  if (!state.journey) {
    addFatigue(draft, (-REST_RECOVERY_PER_HOUR / 2) * (minutes / MINUTES_PER_HOUR))
  }
  return close(draft)
}

/**
 * Содержание судна.
 *
 * Корабль ест деньги и тогда, когда стоит у причала: смола, канаты и те, кто
 * его стережёт. Нечем платить — судно не исчезает, оно просто ветшает: команда
 * расходится, течь не конопатят. Это и есть разница между «купил корабль» и
 * «держу корабль».
 */
function paySailors(draft: Draft, days: number): void {
  const ship = draft.ship
  if (!ship || days <= 0) return
  // Палуба живёт своим счётом (этап 62, К4): жалованье команде идёт сверх
  // содержания судна, и заплаченная команда молчит о том, о чём иначе
  // заговорила бы. Нрав шкипера тянет настроение в свою сторону каждый день.
  const wages = crewWages(ship) * days
  const drift = skipperDef(skipperOf(ship).temper).mood * days
  let mood = crewMood(ship)
  if (draft.character.money >= wages) {
    if (wages > 0) addMoney(draft, -wages)
    mood = Math.min(100, mood + drift + days * 0.2)
  } else {
    // Не заплатили — ропщут, и чем дольше, тем громче.
    mood = Math.max(0, mood + drift - days * 2.5)
  }
  draft.ship = { ...ship, crew: crewOf(ship), mood: Math.round(mood) }
  if (mutinous(draft.ship) && crewOf(ship) > 0) {
    const [rises, afterRoll] = rollChance(draft.rng, 0.06 * days)
    draft.rng = afterRoll
    if (rises) {
      const skipper = skipperOf(ship)
      // Бунт: палуба уходит со шкипером, а судно остаётся — без рук оно никуда
      // не пойдёт, пока не наберёшь новых.
      draft.ship = { ...draft.ship, crew: 0, mood: 40 }
      notice(
        draft,
        `Команда «${ship.name}» ушла с ${skipper.name}ом на берег. Судно стоит: рук на нём нет.`,
        'trade',
      )
    }
  }
  const due = shipUpkeep(ship) * days
  if (draft.character.money >= due) {
    addMoney(draft, -due)
    return
  }
  addMoney(draft, -draft.character.money)
  const rot = Math.min(0.5, 0.015 * days)
  // Считаем от того судна, что уже в черновике: команда и её настроение только
  // что записаны, и терять их здесь было бы ошибкой.
  const now = draft.ship ?? ship
  const worn = Math.max(0, Math.round((now.condition - rot) * 100) / 100)
  draft.ship = worn > 0 ? { ...now, condition: worn } : null
  notice(
    draft,
    worn > 0
      ? `Платить команде «${ship.name}» нечем: судно ветшает у причала.`
      : `«${ship.name}» брошена и растащена: на содержание не нашлось денег.`,
    'trade',
  )
}

/**
 * Взнос ордену.
 *
 * Раз в месяц, сам собой: есть деньги — уплачено, нет — положение падает, и
 * тот, кто не платит долго, вылетает. Это и есть «служат и вылетают»: орден
 * держит своих не клятвой, а счётом.
 */
function payDues(draft: Draft): void {
  const membership = draft.guild
  const order = membership ? orderById(membership.orderId) : null
  if (!membership || !order) return
  const today = dayOf(draft.time)
  while (draft.guild && today > draft.guild.paidUntil) {
    const next = draft.guild.paidUntil + DUES_DAYS
    if (draft.character.money >= order.dues) {
      addMoney(draft, -order.dues)
      draft.guild = { ...draft.guild, paidUntil: next }
    } else {
      draft.guild = { ...draft.guild, paidUntil: next }
      addStanding(draft, -10, `${order.name}: взнос не внесён.`)
    }
  }
}

/** Сдвинуть положение в ордене — и вылететь, если упало ниже терпимого. */
function addStanding(draft: Draft, delta: number, why: string): void {
  const membership = draft.guild
  const order = membership ? orderById(membership.orderId) : null
  if (!membership || !order) return
  const standing = Math.max(-100, Math.min(200, membership.standing + delta))
  const before = rankOf(order, membership.standing)
  draft.guild = { ...membership, standing }
  if (standing <= EXPELLED) {
    draft.guild = null
    notice(draft, `${order.name} отказал тебе от дома: ${why}`, 'world')
    draft.reputation = withLordRep(draft.reputation, `order:${order.id}`, -30)
    return
  }
  const after = rankOf(order, standing)
  if (after > before)
    notice(draft, `${order.name}: теперь ты ${rankLabel(order, standing)}.`, 'world')
  else if (delta < 0) notice(draft, why, 'world')
}

function joinOrder(state: GameState, orderId: string): CommandResult {
  const order = orderById(orderId)
  if (!order) return fail('unknownAction', 'Такого ордена нет.')
  if (state.guild) return fail('invalid', 'Ты уже в ордене. Двум господам не служат.')
  if (!ordersAt(state.world, state.locationId).some((one) => one.id === orderId)) {
    return fail('unavailableHere', `${order.name} здесь не стоит.`)
  }
  // Кого выгнали, обратно не берут скоро: память у ордена долгая.
  if (lordRep(state.reputation, `order:${order.id}`) <= -20) {
    return fail('shunned', `${order.name} тебя помнит и не примет.`)
  }
  // Церковь и корона (этап 51, Х6): отлучённого в церковный орден не берут, и
  // это не мелочь — отлучение закрывает двери, а не портит настроение.
  if (order.kind === 'church' && pietyOf(state) <= EXCOMMUNICATED) {
    return fail('shunned', `${order.name} не принимает отлучённого. Сперва покайся.`)
  }
  const draft = open(state)
  advance(draft, hours(2))
  draft.guild = {
    orderId,
    standing: 0,
    since: dayOf(draft.time),
    paidUntil: dayOf(draft.time) + DUES_DAYS,
  }
  if (draft.character.money >= order.dues) addMoney(draft, -order.dues)
  notice(
    draft,
    `Принят: ${order.name}, ${order.ranks[0]?.label ?? ''}. Взнос ${order.dues} в месяц.`,
    'world',
  )
  return close(draft)
}

function leaveOrder(state: GameState): CommandResult {
  const order = ownOrder(state)
  if (!order) return fail('invalid', 'Ты ни в чём не состоишь.')
  const draft = open(state)
  draft.guild = null
  // Ушёл сам — не враг, но и не свой: берут обратно не сразу.
  draft.reputation = withLordRep(draft.reputation, `order:${order.id}`, -10)
  notice(draft, `${order.name} оставлен.`, 'world')
  return close(draft)
}

/** Сколько времени уходит на сделку — торг не бывает мгновенным. */
export const TRADE_MINUTES = 15

/** Сколько времени уходит на набор людей. */
export const HIRE_MINUTES = 60

function hire(state: GameState, troop: TroopId, count: number): CommandResult {
  const def = TROOPS[troop]
  if (!def) return fail('unknownAction', 'Таких не бывает.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')

  const here = state.world.locations[state.locationId]
  const settlement = state.settlements[state.locationId]
  if (!here || !settlement) return fail('invalid', 'Непонятно, где находится герой.')
  // На ярмарку приходят наёмники (этап 39): в дни торга здесь можно найти
  // тех, кого в этом месте обычно не найдёшь, лишь бы людей хватало.
  const fair = fairAt(state.world, state.locationId, dayOf(state.time)) !== null
  if (
    !isSettlement(here.archetype) ||
    (!fair && !def.where.includes(here.archetype)) ||
    settlement.population < def.minPopulation
  ) {
    return fail('unavailableHere', `${def.label} здесь не найдёшь.`)
  }
  if (settlement.recruits < count) {
    return fail(
      'noRecruits',
      `Столько людей тут не наберёшь: готовых идти всего ${Math.floor(settlement.recruits)}.`,
    )
  }
  // Свой орден нанимает своим дешевле (этап 42). А на ярмарке стоит вербовщик
  // с бочонком (этап 67, Я3), и у него дешевле, чем в казарме.
  const recruiter = hasFairFolk(state.world, state.locationId, dayOf(state.time), 'recruiter')
  // За кем имя, к тому идут дешевле (этап 78, Т6): слава государя работает на
  // державу, а не только на приём в замке.
  const cost = Math.round(
    def.hireCost *
      count *
      (ownOrderHere(state)?.perks.hire ?? 1) *
      (recruiter ? RECRUITER_PRICE : 1) *
      hirePrice(state),
  )
  if (state.character.money < cost) {
    return fail('noMoney', `Не хватает денег: нужно ${cost}, есть ${state.character.money}.`)
  }

  const draft = open(state)
  if (recruiter) {
    notice(draft, 'Вербовщик у бочонка машет рукой: у него берут дешевле.', 'people')
  }
  notice(draft, `Нанято: ${def.label.toLowerCase()} — ${count}, за ${cost}.`)
  advance(draft, HIRE_MINUTES)
  addMoney(draft, -cost)
  draft.party = withUnits(draft.party, troop, count)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: { ...settlement, recruits: settlement.recruits - count },
  }
  practice(draft, 'command', count * 4)
  return close(draft)
}

function disband(state: GameState, troop: TroopId, count: number): CommandResult {
  if (!TROOPS[troop]) return fail('unknownAction', 'Таких не бывает.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')
  if (troopCount(state.party, troop) < count) return fail('invalid', 'Столько у тебя нет.')

  const draft = open(state)
  notice(draft, `Распущено: ${TROOPS[troop].label.toLowerCase()} — ${count}.`)
  draft.party = withUnits(draft.party, troop, -count)
  return close(draft)
}

function battleOrders(state: GameState, orders: Readonly<Record<GroupId, OrderId>>): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.outcome !== 'ongoing') return fail('invalid', 'Бой окончен — пора подводить итоги.')
  // Приказ по чину (этап 58, Б4): обходу с фланга и обманному отходу учат, а не
  // догадываются. «Командование» перестало быть просто множителем силы.
  const command = skillLevel(state.character, 'command')
  for (const order of Object.values(orders)) {
    const needs = orderNeeds(order)
    if (command < needs) {
      return fail(
        'requirements',
        `«${ORDER_LABELS[order]}» — приказ не для всякого: нужно командование ${needs}, у тебя ${command}.`,
      )
    }
  }

  const draft = open(state)
  const hero = gearBonus(state.character)
  // Раненый герой стоит в строю вполсилы.
  const woundFactor = 1 - (state.character.wound?.severity ?? 0) * 0.5
  const result = resolveRound(
    battle,
    orders,
    {
      command,
      magic: skillLevel(state.character, 'magic'),
      spells: {
        fire: spellInBattle(state, 'fire'),
        curse: spellInBattle(state, 'curse'),
        ward: spellInBattle(state, 'ward'),
      },
      // Снаряжение отряда множит силу строя, железо героя прибавляет своё.
      gear: gearFactor(state.party),
      heroAttack: hero.attack * woundFactor,
      heroDefense: hero.defense * woundFactor,
    },
    draft.rng,
  )
  draft.rng = result.rng
  draft.battle = battleTalk(draft, result.battle)
  draft.party = {
    ...draft.party,
    units: unformUp(result.battle.groups),
    morale: result.battle.morale,
  }
  // Бой идёт по своим часам, но не бесплатно: раунд — это время, силы и железо.
  advance(draft, 20)
  addFatigue(draft, 4)
  practice(draft, 'command', 12)
  wearGear(draft)
  if (result.battle.outcome !== 'ongoing') {
    notice(draft, result.battle.outcome === 'won' ? 'Бой выигран.' : 'Бой проигран.')
  }
  return close(draft)
}

function battleFlee(state: GameState): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.outcome !== 'ongoing') return fail('invalid', 'Бой уже окончен.')

  const draft = open(state)
  const result = fleeBattle(battle, draft.rng)
  draft.rng = result.rng
  draft.battle = result.battle
  draft.party = {
    ...draft.party,
    units: unformUp(result.battle.groups),
    morale: result.battle.morale,
  }
  advance(draft, 30)
  addFatigue(draft, 12)
  notice(draft, 'Отход.')
  // Уход с поля — позор, а не минус к числу (этап 68, Ф6): перекрыть его можно
  // только победой, и не одной.
  if (partySize(state.party) >= 6) shameOn(draft, 'fled')
  return close(draft)
}

/**
 * Поединок.
 *
 * Клинок мастера должен быть виден в бою, а не только в цифре навыка: герой
 * выходит один против лучшего из чужих. Выигрыш ломает чужой дух и может
 * кончить бой без сечи, проигрыш — расстраивает своих и оставляет рану.
 */
function duel(state: GameState): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.outcome !== 'ongoing') return fail('invalid', 'Бой окончен.')
  if (battle.duel !== 'none') return fail('invalid', 'Второго поединка не принимают.')
  if (state.character.wound) return fail('wounded', 'С раной на поединок не выходят.')

  const draft = open(state)
  const gear = gearBonus(state.character)
  const skill = Math.max(
    skillLevel(state.character, 'lightWeapons'),
    skillLevel(state.character, 'heavyWeapons'),
  )
  const result = resolveDuel(
    battle,
    {
      skill,
      strength: state.character.attributes.strength,
      agility: state.character.attributes.agility,
      attack: gear.attack,
      defense: gear.defense,
    },
    draft.rng,
  )
  draft.rng = result.rng
  draft.battle = result.battle
  draft.party = { ...draft.party, morale: result.battle.morale }
  advance(draft, 15)
  addFatigue(draft, 10)
  const weapon: SkillId =
    skillLevel(state.character, 'heavyWeapons') > skillLevel(state.character, 'lightWeapons')
      ? 'heavyWeapons'
      : 'lightWeapons'
  practice(draft, weapon, 30)
  wearGear(draft)
  if (result.won) {
    draft.renown += 1
    notice(draft, `Поединок выигран: их ${TROOPS[result.champion].label.toLowerCase()} пал.`, 'war')
  } else {
    // Проигранный поединок — не смерть, но и не царапина: неделя вполсилы.
    patch(draft, { wound: { daysLeft: 7, severity: 0.25 } })
    notice(draft, 'Поединок проигран: тебя оттащили к своим с раной.', 'war')
  }
  if (result.battle.outcome !== 'ongoing') {
    notice(draft, result.battle.outcome === 'won' ? 'Бой выигран.' : 'Бой проигран.')
  }
  return close(draft)
}

/** Выкуп: заплатить сейчас и выйти на волю, не дожидаясь, пока отпустят сами. */
function payRansom(state: GameState): CommandResult {
  const captivity = state.character.captivity
  if (!captivity) return fail('invalid', 'Ты на воле.')
  if (state.character.money < captivity.ransom) {
    return fail(
      'noMoney',
      `Просят ${captivity.ransom}, а у тебя ${state.character.money}. Остаётся ждать.`,
    )
  }
  const draft = open(state)
  addMoney(draft, -captivity.ransom)
  patch(draft, { captivity: null })
  notice(draft, `Выкуп уплачен: ${captivity.ransom}. Ты на воле.`, 'war')
  advance(draft, hours(2))
  return close(draft)
}

/** Итоги боя: добыча, пленные и то, что с ними делать. */
function battleEnd(state: GameState, prisoners: 'ransom' | 'recruit' | 'release'): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.outcome === 'ongoing') return fail('invalid', 'Бой ещё идёт.')

  const draft = open(state)
  draft.battle = null

  // Раненые (этап 58, Б3): не всякий упавший убит. Кто держит поле — подбирает
  // своих; кто бежал — оставил их там, где они легли.
  const held = battle.outcome === 'won'
  const wounded = woundedOf(battle.fallen ?? {}, held)
  let healed = 0
  for (const [troop, count] of Object.entries(wounded)) {
    if (!count) continue
    draft.party = withUnits(draft.party, troop as TroopId, count)
    healed += count
  }
  if (healed > 0) {
    notice(draft, `Своих подобрали с поля: ${healed} раненых встанут в строй.`, 'war')
  } else if (!held && unitsSize(battle.fallen ?? {}) > 0) {
    notice(draft, 'Раненых пришлось оставить на поле. Их там и добьют.', 'war')
  }

  if (battle.outcome === 'won') {
    addMoney(draft, battle.spoils.money)
    takeSpoils(draft, battle)
    takeCaptive(draft, battle)
    draft.renown += 1
    draft.battlesWon += 1
    // Спутники растут делами, а не годами (этап 54): бой — дело тяжёлое.
    seasonCompanions(draft, true)
    seeDeed(draft, 'winBattle')

    // Голова морского лорда стоит денег (этап 62, К6): цену объявляет гавань,
    // которой он надоел, и платят её там же — сразу, потому что доказательство
    // при тебе.
    const hunted = battle.foeId ? pirateById(state.world, battle.foeId) : null
    if (hunted) {
      const bounty = bountyFor(hunted)
      addMoney(draft, bounty)
      draft.renown += 1
      notice(
        draft,
        `${hunted.name} ${hunted.byname} больше не выйдет в море. За голову дано ${bounty}.`,
        'war',
      )
    }

    // Дело ордена «убрать чужих» (этап 59, О1) делается там, где стоит враг:
    // выиграл бой в том месте — дело сделано.
    draft.quests = draft.quests.map((quest) =>
      quest.type === 'orderFoe' && quest.targetLocationId === state.locationId
        ? { ...quest, progress: quest.amount }
        : quest,
    )

    // Побитая шайка — это меньше разбоя в округе и доброе слово в месте.
    if (!battle.stake) {
      const settlement = draft.settlements[state.locationId]
      if (settlement && settlement.banditry > 0) {
        draft.settlements = {
          ...draft.settlements,
          [state.locationId]: { ...settlement, banditry: Math.max(0, settlement.banditry - 0.25) },
        }
        draft.reputation = withPlaceRep(draft.reputation, state.locationId, 6)
      }
    }

    // Взятие: место меняет хозяина и надолго это запоминает.
    if (battle.stake?.type === 'siege') {
      seizePlace(draft, battle.stake.locationId, 'storm')
    }
    // Стены устояли: уцелевшие из гарнизона возвращаются на них, ополчение
    // расходится по домам, место это помнит.
    if (battle.stake?.type === 'defense') {
      restoreGarrison(draft, battle.stake)
      const name = state.world.locations[battle.stake.locationId]?.name ?? 'место'
      draft.reputation = withPlaceRep(draft.reputation, battle.stake.locationId, 10)
      draft.renown += 1
      notice(draft, `${name}: стены устояли.`, 'war')
    }
    const captured = battle.spoils.prisoners
    if (captured > 0) {
      if (prisoners === 'ransom') {
        addMoney(draft, captured * 8)
        notice(draft, `Пленных продали за ${captured * 8}.`)
      } else if (prisoners === 'recruit') {
        const joined = Math.max(1, Math.round(captured / 2))
        draft.party = withUnits(draft.party, 'militia', joined)
        notice(draft, `К отряду пристало ${joined} из пленных.`)
      } else {
        draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 5) }
        notice(draft, 'Пленных отпустили восвояси.')
        seeDeed(draft, 'sparePrisoners')
      }
    }
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 10) }
  } else if (battle.outcome === 'lost') {
    // Своё место пало: оно уходит тому, кто взял его.
    if (battle.stake?.type === 'defense') {
      const fallen = draft.settlements[battle.stake.locationId]
      const name = state.world.locations[battle.stake.locationId]?.name ?? 'место'
      if (fallen && battle.foeId) {
        draft.settlements = {
          ...draft.settlements,
          [battle.stake.locationId]: {
            ...fallen,
            owner: battle.foeId === 'bandits' ? null : battle.foeId,
            garrison: {},
            population: Math.round(fallen.population * 0.93),
          },
        }
        notice(draft, `${name} взят: стены не удержали.`, 'war')
      }
    }
    defeat(draft, battle.foeId)
  } else if (battle.stake?.type === 'defense') {
    // Отошли со стен: гарнизон уцелевших держит их дальше, но осада не снята.
    restoreGarrison(draft, battle.stake)
  }
  // Ветераны (этап 58, Б5): кто ушёл с поля живым — уже не новобранец. Считаем
  // по тому, что осталось в строю: взятые в бою пленные ветеранами не станут.
  draft.party = { ...draft.party, veterans: partySize(draft.party) }
  return close(draft)
}

/**
 * Трофеи вещами (этап 58, Б3).
 *
 * Снятое с чужого строя железо и чужой обоз кладут на спины. Что не влезло —
 * остаётся на поле: победа, которую некому унести, тоже бывает.
 */
function takeSpoils(draft: Draft, battle: Battle): void {
  const goods = battle.spoils.goods
  if (!goods) return
  const capacity = partyCapacity(draft.character, draft.party) + horseCarry(draft.character)
  let left = capacity - carriedWeight(draft.character)
  const taken: string[] = []
  let dropped = 0
  // Сперва дорогое: оружие и железо, потом хлеб.
  const order = Object.entries(goods).sort(
    (a, b) => GOODS[b[0] as GoodId].basePrice - GOODS[a[0] as GoodId].basePrice,
  )
  for (const [id, amount] of order) {
    const good = id as GoodId
    const weight = GOODS[good].weight
    const fits = weight > 0 ? Math.floor(left / weight) : (amount ?? 0)
    const take = Math.min(amount ?? 0, Math.max(0, fits))
    if (take > 0) {
      addGoods(draft, good, take)
      left -= take * weight
      taken.push(`${GOODS[good].label.toLowerCase()} ${take}`)
    }
    dropped += (amount ?? 0) - take
  }
  if (taken.length > 0) notice(draft, `С поля снято: ${taken.join(', ')}.`)
  if (dropped > 0) notice(draft, `Ещё ${dropped} осталось лежать: унести некому.`)
}

/**
 * Пленный лорд (этап 58, Б6).
 *
 * Разбитая дружина иногда отдаёт и самого хозяина. Дальше это не строка в
 * отчёте, а решение: выкуп, присяга, милость или верёвка.
 */
function takeCaptive(draft: Draft, battle: Battle): void {
  const candidate = captiveFrom(draft.base, battle.foeId, dayOf(draft.time))
  if (!candidate) return
  const [caught, afterCatch] = rollChance(draft.rng, LORD_CAPTURE_CHANCE)
  draft.rng = afterCatch
  if (!caught) return
  draft.captives = [...(draft.captives ?? []), candidate]
  notice(
    draft,
    `Среди пленных — сам ${candidate.name}, ${candidate.title.toLowerCase()}. Теперь решать тебе.`,
    'war',
  )
}

/**
 * Место переходит к тебе (этап 58, Б2).
 *
 * Взятое приступом и сданное по условиям — не одно и то же. Приступ стоит
 * людей, хлеба и памяти: место помнит грабёж полвека. Сдача по условиям
 * обходится гарнизоном, который расходится, и обидой прежнего хозяина — но не
 * ненавистью города.
 */
function seizePlace(draft: Draft, locationId: string, mode: 'storm' | 'terms'): void {
  const taken = draft.settlements[locationId]
  // Чем кончилась осада — приступом или тем, что ты понял больше их (этап 113).
  if (mode === 'storm') {
    draft.siegeLog = { ...draft.siegeLog, byWalls: draft.siegeLog.byWalls + 1 }
  }
  const name = draft.base.world.locations[locationId]?.name ?? 'место'
  if (taken) {
    // Провинция следует за главным местом: взяв его, берёшь и остальное,
    // что держал прежний хозяин здесь же (holding.ts, `takeLand`).
    const before = holdingsOf(draft.settlements, PLAYER).length
    draft.settlements = takeLand(draft.base.world, draft.settlements, locationId, PLAYER)
    const stormed = mode === 'storm'
    draft.settlements = {
      ...draft.settlements,
      [locationId]: {
        ...taken,
        owner: PLAYER,
        garrison: {},
        population: Math.round(taken.population * (stormed ? 0.93 : 0.99)),
        banditry: Math.min(1, taken.banditry + (stormed ? 0.25 : 0.05)),
        stock: { ...taken.stock, grain: Math.round(taken.stock.grain * (stormed ? 0.6 : 0.85)) },
      },
    }
    const gained = holdingsOf(draft.settlements, PLAYER).length - before
    notice(
      draft,
      stormed
        ? `${name} взят. Людей поубавилось, и они это запомнят.`
        : `${name} сдан на условиях. Ворота открыли сами.`,
    )
    if (gained > 1) {
      notice(draft, `С ним пошла вся провинция: мест стало на ${gained} больше.`, 'world')
    }
    if (stormed) {
      seeDeed(draft, 'sack')
      shameOn(draft, 'burned')
    }
    draft.reputation = withPlaceRep(draft.reputation, locationId, stormed ? -45 : -8)
    if (taken.owner && !taken.owner.startsWith('crown:') && taken.owner !== PLAYER) {
      draft.reputation = withLordRep(draft.reputation, taken.owner, stormed ? -25 : -18)
      // Лорд помнит не число, а дело (этап 66, Л4).
      draft.lordDeeds = withLordDeed(draft.lordDeeds, taken.owner, 'robbed')
    }
  }
  draft.siege = null
}

/** Уцелевшие из гарнизона — обратно на стены, ополчение — по домам. */
function restoreGarrison(
  draft: Draft,
  stake: Extract<NonNullable<Battle['stake']>, { type: 'defense' }>,
): void {
  const settlement = draft.settlements[stake.locationId]
  if (!settlement) return
  let units = draft.party.units
  const garrison: Partial<Record<TroopId, number>> = {}
  for (const [troop, count] of Object.entries(stake.garrison)) {
    const back = Math.min(count ?? 0, units[troop as TroopId] ?? 0)
    if (back <= 0) continue
    garrison[troop as TroopId] = back
    units = withUnits({ ...draft.party, units }, troop as TroopId, -back).units
  }
  const levyLeft = Math.min(stake.levy, units.militia ?? 0)
  if (levyLeft > 0) units = withUnits({ ...draft.party, units }, 'militia', -levyLeft).units
  draft.party = { ...draft.party, units }
  draft.settlements = { ...draft.settlements, [stake.locationId]: { ...settlement, garrison } }
}

/**
 * Поражение.
 *
 * Раньше проигранный бой значил обобранный кошель и полтора процента смерти —
 * то есть ничего. Теперь его выносят с поля раненым, реже берут в плен и лишь
 * иногда он не встаёт; смерть — настоящая, дальше играет наследник.
 */
function defeat(draft: Draft, foeId: string | null): void {
  const lost = Math.round(draft.character.money * 0.5)
  addMoney(draft, -lost)
  addFatigue(draft, 40)
  if (lost > 0) notice(draft, `Разбитых обобрали: потеряно ${lost}.`)
  // Вещь с чарами теряется там же, где кошель (этап 60, А6): взявший поле
  // берёт и то, что на нём осталось.
  if (draft.artifacts.length > 0) {
    const [taken, afterTake] = rollChance(draft.rng, LOSE_CHANCE)
    draft.rng = afterTake
    if (taken) {
      const [pick, afterPick] = nextInt(draft.rng, 0, draft.artifacts.length - 1)
      draft.rng = afterPick
      const gone = draft.artifacts[pick]
      draft.artifacts = draft.artifacts.filter((_, index) => index !== pick)
      const def = gone ? artifactDef(gone.defId) : null
      if (def) notice(draft, `${def.label} остался на поле. Теперь он чужой.`, 'war')
    }
  }

  const captor = foeId ?? 'bandits'
  const [outcome, afterOutcome] = defeatOutcome(
    draft.rng,
    captor,
    draft.character.money,
    skillLevel(draft.character, 'fortitude'),
  )
  draft.rng = afterOutcome
  if (outcome.type === 'wounded') {
    patch(draft, { wound: outcome.wound })
    notice(draft, `Тебя вынесли с поля раненым: ${outcome.wound.daysLeft} суток в постели.`, 'war')
    return
  }
  if (outcome.type === 'captured') {
    patch(draft, { captivity: outcome.captivity })
    // Отряд разбежался, спутники — кто как: часть попадает в плен вместе с тобой.
    const scattered: Partial<Record<TroopId, number>> = {}
    for (const [troop, count] of Object.entries(draft.party.units)) {
      const left = Math.floor((count ?? 0) / 2)
      if (left > 0) scattered[troop as TroopId] = left
    }
    draft.party = { ...draft.party, units: scattered, morale: 30 }
    draft.companions = draft.companions.map((companion) => {
      if (companion.captive || companion.role.type !== 'party') return companion
      const [taken, next] = rollChance(draft.rng, 0.3)
      draft.rng = next
      if (taken) notice(draft, `${companion.name} тоже в плену.`, 'people')
      return taken ? { ...companion, captive: true } : companion
    })
    notice(
      draft,
      `Ты в плену, держит ${foeName(draft.base, captor)}. Выкуп — ${outcome.captivity.ransom}, иначе ждать ${outcome.captivity.daysLeft} суток.`,
      'war',
    )
    return
  }
  notice(draft, 'Этот бой стал последним.', 'war')
  succeed(draft, dayOf(draft.time))
}

/**
 * Своя земля: строить, ставить гарнизон и снимать его.
 *
 * Всё это доступно только держателю. Владеть — значит платить: постройка стоит
 * денег и суток, гарнизон стоит жалованья и ест местный хлеб.
 */
function build(state: GameState, building: BuildingId): CommandResult {
  const def = BUILDINGS[building]
  if (!def) return fail('unknownAction', 'Такого не строят.')
  const settlement = state.settlements[state.locationId]
  const here = state.world.locations[state.locationId]
  if (!settlement || !here) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isOwnedByPlayer(settlement)) return fail('notYours', 'Это не твоя земля.')
  if (!isSettlement(here.archetype) || (def.where && !def.where.includes(here.archetype))) {
    return fail('unavailableHere', 'В таком месте это не построишь.')
  }
  if (hasBuilding(settlement, building)) return fail('invalid', 'Уже стоит.')
  if (settlement.building) return fail('noRoom', 'Здесь уже идёт стройка.')
  if (freeSlots(state.world, settlement) <= 0) return fail('noRoom', 'Свободного места больше нет.')
  if (state.character.money < def.cost) {
    return fail('noMoney', `Не хватает денег: нужно ${def.cost}, есть ${state.character.money}.`)
  }

  const draft = open(state)
  notice(draft, `Заложено: ${def.label.toLowerCase()} — ${def.days} суток работы.`)
  advance(draft, hours(2))
  addMoney(draft, -def.cost)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: { ...settlement, building: { id: building, daysLeft: def.days } },
  }
  return close(draft)
}

function moveToGarrison(state: GameState, troop: TroopId, count: number): CommandResult {
  if (!TROOPS[troop]) return fail('unknownAction', 'Таких не бывает.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isOwnedByPlayer(settlement)) return fail('notYours', 'Это не твоя земля.')
  if (troopCount(state.party, troop) < count) return fail('invalid', 'Столько у тебя нет.')
  if (garrisonSize(settlement) + count > garrisonLimit(state.world, settlement)) {
    return fail('noRoom', 'Столько здесь не разместить — нужны казармы.')
  }

  const draft = open(state)
  notice(draft, `В гарнизон: ${TROOPS[troop].label.toLowerCase()} — ${count}.`)
  draft.party = withUnits(draft.party, troop, -count)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: {
      ...settlement,
      garrison: { ...settlement.garrison, [troop]: (settlement.garrison[troop] ?? 0) + count },
    },
  }
  return close(draft)
}

function moveFromGarrison(state: GameState, troop: TroopId, count: number): CommandResult {
  if (!TROOPS[troop]) return fail('unknownAction', 'Таких не бывает.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isOwnedByPlayer(settlement)) return fail('notYours', 'Это не твоя земля.')
  if ((settlement.garrison[troop] ?? 0) < count) return fail('invalid', 'Столько в гарнизоне нет.')

  const draft = open(state)
  notice(draft, `Из гарнизона: ${TROOPS[troop].label.toLowerCase()} — ${count}.`)
  draft.party = withUnits(draft.party, troop, count)
  const garrison = { ...settlement.garrison }
  const left = (garrison[troop] ?? 0) - count
  if (left <= 0) delete garrison[troop]
  else garrison[troop] = left
  draft.settlements = { ...draft.settlements, [state.locationId]: { ...settlement, garrison } }
  return close(draft)
}

/**
 * Осада (DESIGN.md, п.5: осады — отдельная фаза того же боя).
 *
 * Стены не делают отдельной игры: это множитель обороны в тех же раундах.
 * Зато у осаждающего есть второе оружие — время: сидеть под стенами дешевле,
 * чем лезть на них, но пока сидишь, тебя самого надо кормить.
 */
function besiege(state: GameState): CommandResult {
  if (state.siege) return fail('invalid', 'Ты уже стоишь под стенами.')
  const settlement = state.settlements[state.locationId]
  const here = state.world.locations[state.locationId]
  if (!settlement || !here) return fail('invalid', 'Непонятно, где находится герой.')
  if (isOwnedByPlayer(settlement)) return fail('invalid', 'Это и так твоё.')
  if (partySize(state.party) < 8) return fail('invalid', 'С такими силами стены не обложишь.')
  if (!hostileTo(state, settlement)) {
    return fail('invalid', 'Это место тебе не враг — на него незачем идти.')
  }

  const draft = open(state)
  notice(draft, `${here.name} обложен. Дальше — ждать или штурмовать.`)
  advance(draft, hours(6))
  addFatigue(draft, 10)
  draft.siege = { locationId: state.locationId, days: 0 }
  return close(draft)
}

/** Сидеть под стенами: у осаждённых кончается хлеб, у осаждающих — терпение. */
function siegeWait(state: GameState, days: number): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  if (!Number.isInteger(days) || days <= 0 || days > 10) {
    return fail('invalid', 'Ждать можно от суток до десяти.')
  }
  const settlement = state.settlements[siege.locationId]
  if (!settlement) return fail('invalid', 'Осаждать нечего.')

  const draft = open(state)
  notice(draft, `Осада: ${days} сут. под стенами.`)
  advance(draft, hours(24 * days))
  addFatigue(draft, days * 4)
  // Блокада: в город не везут ничего, запасы тают быстрее обычного.
  blockade(draft, siege.locationId, days)
  draft.siege = { ...siege, days: siege.days + days }
  // Плотники не ждут приказа: работы идут, пока войско стоит (этап 85, О2).
  advanceWorks(draft, days)
  // Гарнизон не сидит сложа руки (этап 58, Б2).
  sally(draft, siege.locationId)
  return close(draft)
}

function siegeAssault(state: GameState): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const settlement = state.settlements[siege.locationId]
  const here = state.world.locations[siege.locationId]
  if (!settlement || !here) return fail('invalid', 'Осаждать нечего.')

  const draft = open(state)
  // Изголодавшийся гарнизон дерётся хуже: за это и сидят под стенами.
  const starving = Math.max(0.35, foodSecurity(settlement))
  const defenders: BattleSide = {
    name: `Гарнизон: ${here.name}`,
    units:
      garrisonSize(settlement) > 0
        ? settlement.garrison
        : { militia: Math.max(4, Math.round(settlement.population / 120)) },
    morale: Math.round(45 + starving * 35 - siege.days * 2),
    fatigue: 0,
  }
  // Крепость считается целиком (этап 85, О1 и О4): стены, башни и машины.
  const fort = fortOf(state, state.world, siege.locationId)
  const cost = fort ? stormCost(fort, enginesOf(siege), siege.breached === true) : null
  const walls = cost ? cost.walls : wallsUnderSiege(wallsFor(settlement), siege)
  // Союзное войско под теми же стенами идёт на приступ первым.
  const softened = allyStrikesFirst(draft, defenders, siege.locationId, walls, 1)
  if (!softened) {
    draft.siege = null
    notice(draft, `${here.name} взяли союзники: тебе остались стены без ворот.`, 'war')
    advance(draft, hours(2))
    return close(draft)
  }
  // Цена подхода: с башен бьют, пока идёшь. Машины эту цену сбивают.
  if (cost && cost.losses > 0) {
    const fallen = Math.round(partySize(draft.party) * cost.losses)
    if (fallen > 0) {
      draft.party = withUnits(draft.party, worstTroop(draft.party), -fallen)
      notice(draft, `${cost.says} Не дошло ${fallen}.`, 'war')
    }
  }
  draft.battle = startBattle(draft.party, softened, here.terrain, {
    stake: { type: 'siege', locationId: siege.locationId },
    wallBonus: walls,
    foeId: settlement.owner,
    ground: 'walls',
    veterans: veteransOf(draft.party),
  })
  notice(draft, `Штурм: ${here.name}.`)
  advance(draft, hours(2))
  addFatigue(draft, 8)
  return close(draft)
}

/**
 * Подкоп (этап 58, Б2).
 *
 * Шесть суток работы под стеной — и кладка садится. Риск свой: подкоп
 * обваливается на копателей, а гарнизон, услышав кирки, выходит на вылазку.
 */
function siegeSap(state: GameState, days: number): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  if (siege.breached) return fail('invalid', 'Стена уже проломлена — копать больше некуда.')
  if (!Number.isInteger(days) || days <= 0 || days > 6) {
    return fail('invalid', 'Копать можно от суток до шести.')
  }
  if (partySize(state.party) < 8) return fail('invalid', 'Подкоп — работа на многих.')
  const settlement = state.settlements[siege.locationId]
  const here = state.world.locations[siege.locationId]
  if (!settlement || !here) return fail('invalid', 'Осаждать нечего.')

  const draft = open(state)
  // Тяжёлый труд копает быстрее (этап 122, А2): те же сутки дают больше сажен.
  const dug = Math.min(Math.round(days * digsFaster(state.character)), sapLeft(siege))
  advance(draft, hours(24 * days))
  addFatigue(draft, days * 7)
  blockade(draft, siege.locationId, days)
  const sapDays = (siege.sapDays ?? 0) + dug
  const breached = sapDays >= SAP_DAYS
  draft.siege = { ...siege, days: siege.days + days, sapDays, breached }
  advanceWorks(draft, days)
  // Земля не любит, когда её копают: чем глубже, тем чаще садится свод.
  const [collapsed, afterCollapse] = rollChance(draft.rng, 0.08 * days)
  draft.rng = afterCollapse
  if (collapsed) {
    const lost = Math.max(1, Math.round(partySize(draft.party) * 0.05))
    draft.party = withUnits(draft.party, worstTroop(draft.party), -lost)
    notice(draft, `Свод осел. Под землёй осталось ${lost}.`, 'war')
  }
  notice(
    draft,
    breached
      ? `Кладка села: в стене ${here.name} пролом. Приступ пойдёт вдвое легче.`
      : `Копали ${days} сут. Осталось ${Math.max(0, SAP_DAYS - sapDays)}.`,
    'war',
  )
  if (!breached) sally(draft, siege.locationId)
  return close(draft)
}

/**
 * Требовать сдачи (этап 58, Б2).
 *
 * Слушают голодные и проломленные. Сдача по условиям дешевле приступа для
 * обеих сторон: гарнизон уходит, город цел, но прежний хозяин обиды не забудет.
 */
function siegeParley(state: GameState): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const settlement = state.settlements[siege.locationId]
  const here = state.world.locations[siege.locationId]
  if (!settlement || !here) return fail('invalid', 'Осаждать нечего.')

  const draft = open(state)
  advance(draft, hours(3))
  const chance = surrenderChance(settlement, siege)
  const [yields, afterRoll] = rollChance(draft.rng, chance)
  draft.rng = afterRoll
  if (!yields) {
    notice(
      draft,
      `С надвратной башни отвечают коротко: «Стены целы, хлеб есть». (${Math.round(chance * 100)} из ста)`,
      'war',
    )
    return close(draft)
  }
  seizePlace(draft, siege.locationId, 'terms')
  draft.renown += 1
  return close(draft)
}

/**
 * Купить ворота (этап 58, Б2).
 *
 * В городе всегда есть тот, кому надоело. Цена его — по тому, что он теряет, а
 * согласие — по тому, насколько ему уже нечего есть.
 */
function siegeBribe(state: GameState): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const settlement = state.settlements[siege.locationId]
  const here = state.world.locations[siege.locationId]
  if (!settlement || !here) return fail('invalid', 'Осаждать нечего.')
  const price = bribePrice(state, settlement)
  if (state.character.money < price) {
    return fail('noMoney', `За ворота просят ${price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  advance(draft, hours(6))
  addMoney(draft, -price)
  const [opened, afterRoll] = rollChance(draft.rng, bribeChance(state, settlement, siege))
  draft.rng = afterRoll
  if (!opened) {
    notice(draft, `Серебро взяли, ворота не открыли. ${price} ушло в чужой кошель.`, 'war')
    return close(draft)
  }
  notice(draft, 'Ночью калитку отворили изнутри.', 'war')
  seizePlace(draft, siege.locationId, 'terms')
  return close(draft)
}

/**
 * Работы под стенами (этап 85, О2).
 *
 * Машину строят сутками, пока войско стоит: осада тем и отличается от штурма,
 * что время в ней работает на того, кто умеет его тратить.
 */
function advanceWorks(draft: Draft, days: number): void {
  const siege = draft.siege
  if (!siege?.works) return
  // Работы под стенами идут быстрее у того, кто умеет работать (этап 122).
  const daysLeft = siege.works.daysLeft - days * digsFaster(draft.character)
  if (daysLeft > 0) {
    draft.siege = { ...siege, works: { ...siege.works, daysLeft } }
    return
  }
  const def = engineDef(siege.works.id)
  const { works: _done, ...rest } = siege
  draft.siege = { ...rest, engines: [...enginesOf(siege), siege.works.id] }
  notice(draft, `${def.label} готов: ${def.about}`, 'war')
}

/**
 * Вылазка (этап 58, Б2).
 *
 * Гарнизон не сидит: пока у него есть силы, он выходит бить копателей и жечь
 * лестницы. Это и есть разница между осадой и отсчётом суток.
 */
function sally(draft: Draft, locationId: string): void {
  if (draft.battle) return
  const settlement = draft.settlements[locationId]
  const here = draft.base.world.locations[locationId]
  const siege = draft.siege
  if (!settlement || !here || !siege) return
  const [out, afterRoll] = rollChance(draft.rng, sallyChance(settlement, siege))
  draft.rng = afterRoll
  if (!out) return
  const garrison = garrisonSize(settlement)
  const sortie = Math.max(4, Math.round(garrison * 0.5))
  const units: Partial<Record<TroopId, number>> = {}
  let left = sortie
  for (const [troop, count] of Object.entries(settlement.garrison)) {
    const take = Math.min(left, Math.round((count ?? 0) * 0.5))
    if (take > 0) units[troop as TroopId] = take
    left -= take
    if (left <= 0) break
  }
  if (unitsSize(units) === 0) units.militia = sortie
  draft.battle = startBattle(
    draft.party,
    { name: `Вылазка: ${here.name}`, units, morale: 70, fatigue: 0 },
    here.terrain,
    {
      foeId: settlement.owner,
      // Вылазка идёт не на стены, а в лагерь: здесь камень никому не помогает.
      ground: 'camp',
      veterans: veteransOf(draft.party),
    },
  )
  notice(draft, `Из ворот ${here.name} вышли: ${unitsSize(units)}. Бьют по работам.`, 'war')
}

/** Блокада: пока войско стоит под стенами, в город не везут ничего. */
function blockade(draft: Draft, locationId: string, days: number): void {
  const settlement = draft.settlements[locationId]
  if (!settlement) return
  draft.settlements = {
    ...draft.settlements,
    [locationId]: {
      ...settlement,
      stock: {
        ...settlement.stock,
        grain: Math.max(0, settlement.stock.grain * (1 - 0.15 * days)),
        fish: Math.max(0, settlement.stock.fish * (1 - 0.2 * days)),
      },
    },
  }
}

/** Кого ставят на грязную работу: того, кто дешевле всех. */
function worstTroop(party: Party): TroopId {
  let worst: TroopId = 'militia'
  let cheapest = Number.POSITIVE_INFINITY
  for (const [troop, count] of Object.entries(party.units)) {
    if (!count) continue
    const cost = TROOPS[troop as TroopId].hireCost
    if (cost < cheapest) {
      cheapest = cost
      worst = troop as TroopId
    }
  }
  return worst
}

/**
 * Судьба пленного (этап 58, Б6).
 *
 * Выкуп, присяга, милость или верёвка. Мир помнит каждое: сам пленный, его
 * родня по короне и молва о тебе.
 */
function captiveFate(state: GameState, captiveId: string, fate: CaptiveFate): CommandResult {
  const captive = (state.captives ?? []).find((one) => one.id === captiveId)
  if (!captive) return fail('invalid', 'Такого пленного у тебя нет.')

  const draft = open(state)
  const outcome = fateOutcome(state, captive, fate)
  draft.captives = (draft.captives ?? []).filter((one) => one.id !== captiveId)
  if (outcome.money !== 0) addMoney(draft, outcome.money)
  if (outcome.ownFavour !== 0) {
    draft.reputation = withLordRep(draft.reputation, captive.id, outcome.ownFavour)
  }
  if (outcome.kinFavour !== 0 && captive.kingdomId) {
    for (const lord of draft.politics.lords) {
      if (lord.kingdomId !== captive.kingdomId || lord.id === captive.id) continue
      draft.reputation = withLordRep(draft.reputation, lord.id, outcome.kinFavour)
    }
  }
  draft.renown += outcome.renown
  if (fate === 'execute') seeDeed(draft, 'sack')
  if (fate === 'release') seeDeed(draft, 'sparePrisoners')
  // И это он помнит лично (этап 66, Л4): милость и верёвку помнят дольше денег.
  if (fate === 'release') draft.lordDeeds = withLordDeed(draft.lordDeeds, captive.id, 'saved')
  if (fate === 'oath') draft.lordDeeds = withLordDeed(draft.lordDeeds, captive.id, 'served')
  advance(draft, hours(2))
  notice(draft, outcome.word, 'war')
  return close(draft)
}

// --- орден в деле (этап 59) -------------------------------------------------

/**
 * Дознание (этап 59, О1).
 *
 * Церковь послала выслушать тех, кто говорит не то. Дело решается на месте и
 * своей головой: чем лучше о тебе тут думают, тем охотнее говорят; строгость
 * даётся легче, чем правда.
 */
function inquire(state: GameState): CommandResult {
  const quest = state.quests.find(
    (one) => one.type === 'orderHeresy' && one.targetLocationId === state.locationId,
  )
  if (!quest) return fail('unavailableHere', 'Здесь тебе нечего дознавать.')
  if (quest.progress >= quest.amount) return fail('invalid', 'Дознание уже проведено.')

  const draft = open(state)
  advance(draft, hours(8))
  addFatigue(draft, 12)
  const known = draft.reputation.places[state.locationId] ?? 0
  // Говорят охотнее с тем, кого здесь знают, и с тем, кто умеет слушать.
  const chance = Math.max(
    0.2,
    Math.min(0.9, 0.35 + known / 200 + skillLevel(draft.character, 'persuasion') * 0.008),
  )
  const [heard, afterRoll] = rollChance(draft.rng, chance)
  draft.rng = afterRoll
  if (!heard) {
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, -4)
    notice(draft, 'Тебе улыбаются и говорят, что всё как всегда. Верить этому нельзя.')
    return close(draft)
  }
  draft.quests = draft.quests.map((one) =>
    one.id === quest.id ? { ...one, progress: one.amount } : one,
  )
  // Дознание оставляет след: место помнит того, кто приходил спрашивать.
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, -10)
  notice(draft, 'Ты выслушал всех, кого стоило. Теперь есть что сказать братьям.', 'world')
  return close(draft)
}

/**
 * Послать братьев (этап 59, О2).
 *
 * Ступень — власть: на верхах орденом можно двигать. Братья идут туда, куда
 * сказано, и делают то, что орден умеет: режут разбой на своей земле. Стоит
 * это казны и части твоего положения — распоряжаться чужими людьми даром не
 * выходит.
 */
function orderSend(state: GameState, locationId: string): CommandResult {
  const order = ownOrder(state)
  const power = canWield(state, 'send')
  if (!order || !state.guild) return fail('requirements', power.reason)
  if (!power.can) return fail('requirements', power.reason)
  const settlement = state.settlements[locationId]
  const place = state.world.locations[locationId]
  if (!settlement || !place) return fail('invalid', 'Туда посылать некого и незачем.')
  if (state.character.money < SEND_COST) {
    return fail('noMoney', `На это нужно ${SEND_COST}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -SEND_COST)
  addStanding(draft, -SEND_STANDING, `${order.name}: братьев послали по твоему слову.`)
  draft.settlements = {
    ...draft.settlements,
    [locationId]: {
      ...settlement,
      banditry: Math.max(0, settlement.banditry - SEND_BANDITRY),
    },
  }
  draft.reputation = withPlaceRep(draft.reputation, locationId, 12)
  advance(draft, hours(4))
  notice(draft, `${order.name} послал братьев в ${place.name}. На дорогах станет тише.`, 'world')
  return close(draft)
}

/**
 * Заступничество перед лордом (этап 59, О4).
 *
 * Орден говорит с короной на равных, и брат высокой ступени может попросить,
 * чтобы за него сказали. Слово ордена весит тем больше, чем больше веса у него
 * самого (О3).
 */
function orderPatronage(state: GameState): CommandResult {
  const order = ownOrder(state)
  const power = canWield(state, 'patronage')
  if (!order || !state.guild) return fail('requirements', power.reason)
  if (!power.can) return fail('requirements', power.reason)
  const lord = lordHere(state)
  if (!lord) return fail('unavailableHere', 'Здесь не перед кем заступаться.')
  if (order.feud.kingdoms.includes(lord.kingdomId ?? '')) {
    return fail(
      'requirements',
      `${order.name} с этой короной в ссоре: такое слово только навредит.`,
    )
  }

  const draft = open(state)
  advance(draft, hours(3))
  // Вес ордена в мире решает, слушают ли его.
  const weight = swayOf(draft.orderSway, order.id)
  const favour = Math.round(6 + weight / 12)
  draft.reputation = withLordRep(draft.reputation, lord.id, favour)
  addStanding(draft, -6, `${order.name}: за тебя просили.`)
  notice(
    draft,
    `За тебя сказал ${order.name}. ${lord.name} слушает такие слова внимательнее твоих.`,
    'world',
  )
  return close(draft)
}

/**
 * Запрет (этап 59, О4).
 *
 * Высшая ступень может закрыть месту то, чем орден ему полезен: обряды,
 * защиту, торг. Место живёт без этого, пока запрет держится, и хорошо помнит,
 * кто его наложил.
 */
function orderInterdict(state: GameState, locationId: string): CommandResult {
  const order = ownOrder(state)
  const power = canWield(state, 'interdict')
  if (!order || !state.guild) return fail('requirements', power.reason)
  if (!power.can) return fail('requirements', power.reason)
  const place = state.world.locations[locationId]
  if (!place) return fail('invalid', 'Такого места нет.')
  if (!ordersAt(state.world, locationId).some((one) => one.id === order.id)) {
    return fail('unavailableHere', `${order.name} там не стоит: запрещать нечего.`)
  }
  const day = dayOf(state.time)
  if (interdictedAt(state, locationId, day)) return fail('invalid', 'Там и так запрет.')

  const draft = open(state)
  advance(draft, hours(4))
  addStanding(draft, -INTERDICT_STANDING, `${order.name}: запрет твоим словом.`)
  draft.interdicts = [
    ...draft.interdicts,
    { locationId, orderId: order.id, untilDay: day + INTERDICT_DAYS },
  ]
  draft.reputation = withPlaceRep(draft.reputation, locationId, -30)
  notice(draft, `${place.name} под запретом: ${INTERDICT_DAYS} суток без братьев.`, 'world')
  return close(draft)
}

/** Помиловать: снять свой же запрет раньше срока. Такое помнят долго. */
function orderPardon(state: GameState, locationId: string): CommandResult {
  const order = ownOrder(state)
  const power = canWield(state, 'pardon')
  if (!order || !state.guild) return fail('requirements', power.reason)
  if (!power.can) return fail('requirements', power.reason)
  const day = dayOf(state.time)
  if (!interdictedAt(state, locationId, day)) return fail('invalid', 'Там нет запрета.')
  const place = state.world.locations[locationId]

  const draft = open(state)
  advance(draft, hours(2))
  draft.interdicts = draft.interdicts.filter((one) => one.locationId !== locationId)
  draft.reputation = withPlaceRep(draft.reputation, locationId, 35)
  seeDeed(draft, 'sparePrisoners')
  notice(draft, `${place?.name ?? 'Место'} помиловано. Такое помнят дольше запрета.`, 'world')
  return close(draft)
}

/**
 * Своё братство (этап 59, О6).
 *
 * Шестая сила на карте бывает не только землёй (этап 30), но и уставом. Своё
 * заводят с верха чужого ордена или с чистого места — и дальше свой устав
 * судит тебя так же, как чужие судили раньше.
 */
function foundBrotherhood(state: GameState, name: string, charterId: CharterId): CommandResult {
  const check = canFound(state)
  if (!check.can) return fail('requirements', check.reason)
  const clean = name.trim()
  if (clean.length < 3) return fail('invalid', 'У братства должно быть имя.')
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')

  const draft = open(state)
  addMoney(draft, -FOUND_COST)
  advance(draft, hours(12))
  draft.brotherhood = {
    name: clean,
    kind: 'order',
    charterId,
    since: dayOf(draft.time),
    seats: [state.locationId],
    brothers: Math.max(2, Math.round(draft.renown / 2)),
  }
  draft.renown += FOUND_RENOWN
  // Уходя со своим уставом, из чужого ордена выходят: в двух сразу не состоят.
  if (draft.guild) {
    notice(draft, 'Ты вышел из братства, в котором вырос. Так делают не все.')
    draft.guild = null
  }
  notice(
    draft,
    `${clean} основано в ${here.name}. Устав: ${charterById(charterId).label.toLowerCase()}.`,
    'world',
  )
  return close(draft)
}

// --- своя земля изнутри (этап 61) -------------------------------------------

/**
 * Закон (этап 61, В3).
 *
 * Четыре решения: подать, пошлина, набор, суд. Дешёвого выбора нет — за каждое
 * что-то отдаёшь. Ставят закон на своей земле и сразу на всю: у владетеля один
 * обычай, а не разный в каждой деревне.
 */
function setLaw(
  state: GameState,
  changes: {
    readonly tax?: TaxLevel
    readonly toll?: TollLevel
    readonly levy?: LevyLevel
    readonly justice?: JusticeLevel
  },
): CommandResult {
  if (holdingsOf(state.settlements, PLAYER).length === 0) {
    return fail('requirements', 'Закон ставят на своей земле, а её у тебя нет.')
  }
  const before = lawOf(state)
  const law: Law = {
    tax: changes.tax ?? before.tax,
    toll: changes.toll ?? before.toll,
    levy: changes.levy ?? before.levy,
    justice: changes.justice ?? before.justice,
  }
  if (
    law.tax === before.tax &&
    law.toll === before.toll &&
    law.levy === before.levy &&
    law.justice === before.justice
  ) {
    return fail('invalid', 'Это и так твой обычай.')
  }

  const draft = open(state)
  draft.law = law
  advance(draft, hours(2))
  const words: string[] = []
  if (law.tax !== before.tax) words.push(TAX_DEFS[law.tax].label)
  if (law.toll !== before.toll) words.push(TOLL_DEFS[law.toll].label)
  if (law.levy !== before.levy) words.push(LEVY_DEFS[law.levy].label)
  if (law.justice !== before.justice) words.push(JUSTICE_DEFS[law.justice].label)
  notice(draft, `Объявлено по всей твоей земле: ${words.join(', ')}.`, 'world')
  // Решение слышат сразу, а платят за него потом: настроение ложится в память
  // мест по суткам (`estateLife`), а не одним ударом.
  return close(draft)
}

/**
 * Ответить на просьбу (этап 61, В2).
 *
 * Просят об одном — о том, что болит сильнее. Просьба о постройке — это работа
 * и деньги; о суде — день у себя на дворе; о подати — снятый обычай. Отказ
 * приходит сам, когда кончается терпение.
 */
function answerPlea(state: GameState, locationId: string): CommandResult {
  const settlement = state.settlements[locationId]
  if (!settlement || !isOwnedByPlayer(settlement)) return fail('invalid', 'Это не твоя земля.')
  const day = dayOf(state.time)
  const plea = pleaOf(state, settlement, day)
  if (!plea) return fail('invalid', 'Здесь ни о чём не просят.')
  if (state.locationId !== locationId) {
    return fail('unavailableHere', 'Отвечают глядя в глаза: надо быть на месте.')
  }

  if (plea.def.building) {
    const done = build(state, plea.def.building)
    if (!done.ok) return done
    const draft = open(done.state)
    draft.pleas = withoutPlea(draft.pleas, locationId)
    draft.reputation = withPlaceRep(draft.reputation, locationId, plea.def.granted)
    notice(draft, `${plea.def.label}: об этом просили. Здесь это запомнят.`, 'people')
    return close(draft)
  }

  if (plea.def.id === 'tax') {
    if (lawOf(state).tax !== 'heavy') return fail('invalid', 'Подать и так не тяжела.')
    const draft = open(state)
    draft.law = { ...lawOf(state), tax: 'plain' }
    draft.pleas = withoutPlea(draft.pleas, locationId)
    draft.reputation = withPlaceRep(draft.reputation, locationId, plea.def.granted)
    advance(draft, hours(2))
    notice(draft, 'Тяжёлая подать снята. Об этом узнают раньше, чем ты уедешь.', 'world')
    return close(draft)
  }

  // Суд: день на своём дворе. Разбирают ссоры, и это стоит времени, а не денег.
  const draft = open(state)
  advance(draft, hours(8))
  addFatigue(draft, 14)
  practice(draft, 'persuasion', 12)
  draft.pleas = withoutPlea(draft.pleas, locationId)
  draft.reputation = withPlaceRep(draft.reputation, locationId, plea.def.granted)
  draft.settlements = {
    ...draft.settlements,
    [locationId]: {
      ...settlement,
      banditry: Math.max(0, settlement.banditry - 0.04),
    },
  }
  notice(draft, 'Ты сидел с утра до темна и рассудил всех. Ссор стало меньше.', 'people')
  return close(draft)
}

function withoutPlea(
  pleas: Readonly<Record<string, { askId: string; askedDay: number }>>,
  locationId: string,
): Readonly<Record<string, { askId: string; askedDay: number }>> {
  const next = { ...pleas }
  delete next[locationId]
  return next
}

/**
 * Починить постройку (этап 61, В4).
 *
 * Мельница, которая встала, не мелет: пока её не починят, её как будто нет.
 * Чинят за деньги и на месте — издалека не починишь.
 */
function repairBuilding(state: GameState, locationId: string, building: BuildingId): CommandResult {
  const settlement = state.settlements[locationId]
  if (!settlement || !isOwnedByPlayer(settlement)) return fail('invalid', 'Это не твоя земля.')
  if (!isBroken(state, locationId, building)) return fail('invalid', 'Это и так работает.')
  if (state.locationId !== locationId) return fail('unavailableHere', 'Чинят на месте.')
  const price = worksRepairCost(building)
  if (state.character.money < price) {
    return fail('noMoney', `Починка стоит ${price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hours(6))
  draft.works = {
    ...draft.works,
    [locationId]: brokenAt(draft, locationId).filter((one) => one !== building),
  }
  if (!settlement.buildings.includes(building)) {
    draft.settlements = {
      ...draft.settlements,
      [locationId]: { ...settlement, buildings: [...settlement.buildings, building] },
    }
  }
  notice(draft, `${BUILDINGS[building].label} снова работает.`)
  return close(draft)
}

/**
 * Объезд (этап 61, В5).
 *
 * Хозяин не может быть везде, и там, где его давно не было, платят хуже, а
 * управляющий смелеет. Объезд — это день на дворе: счёт, недоимка и то, что
 * люди видели тебя своими глазами.
 */
function tourHolding(state: GameState): CommandResult {
  const settlement = state.settlements[state.locationId]
  if (!settlement || !isOwnedByPlayer(settlement)) return fail('invalid', 'Это не твоя земля.')
  const day = dayOf(state.time)
  // Недоимка считается от последнего счёта, а не от приезда: можно просидеть в
  // своём доме год и ни разу не заглянуть в книги.
  const away = sinceSeen(state, state.locationId, day)

  const draft = open(state)
  advance(draft, hours(TOUR_HOURS))
  addFatigue(draft, 12)
  draft.visits = { ...draft.visits, [state.locationId]: day }
  // Недоимка, которую забыли занести: чем дольше не был, тем больше лежит.
  const owed = Math.round(
    dailyTax(settlement, foodSecurity(settlement)) * Math.min(30, away) * 0.35,
  )
  if (owed > 0) addMoney(draft, owed)
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, 4)
  const seneschal = seneschalOf(state.locationId)
  notice(
    draft,
    owed > 0
      ? `${seneschal.name} показал счёт: недоимки ${owed}. ${seneschalDef(seneschal.temper).about}`
      : `${seneschal.name} показал счёт. Всё сходится.`,
  )
  return close(draft)
}

/**
 * Сменить управляющего (этап 61, В1).
 *
 * Вора не исправишь — его меняют. Но человек, которого здесь знают, уходит со
 * своими людьми: место это чувствует, и новый будет не лучше по выбору, а по
 * случаю.
 */
function replaceSeneschal(state: GameState): CommandResult {
  const settlement = state.settlements[state.locationId]
  if (!settlement || !isOwnedByPlayer(settlement)) return fail('invalid', 'Это не твоя земля.')
  const day = dayOf(state.time)
  const seneschal = seneschalOf(state.locationId)

  const draft = open(state)
  advance(draft, hours(4))
  // Смена записывается как свежий приезд: новый человек первое время честен
  // просто потому, что не освоился.
  draft.visits = { ...draft.visits, [state.locationId]: day }
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, -6)
  notice(
    draft,
    `${seneschal.name} отставлен. На дворе это обсуждают, и не в твою пользу.`,
    'people',
  )
  return close(draft)
}

// --- дела и дороги (этап 62) ------------------------------------------------

/**
 * Нанять охрану к обозу (этап 62, К1).
 *
 * Охрана не отменяет разбой — она делает нападение невыгодным: грабят обоз с
 * охраной реже, а уносят меньше. Платить ей приходится всякий день, идёт обоз
 * или стоит.
 */
function hireGuards(state: GameState, enterpriseId: string, count: number): CommandResult {
  const enterprise = state.enterprises.find((one) => one.id === enterpriseId)
  if (!enterprise) return fail('unknownAction', 'Такого дела у тебя нет.')
  if (enterprise.kind !== 'caravan') return fail('invalid', 'Охрану берут к обозу.')
  if (!Number.isInteger(count) || count === 0) return fail('invalid', 'Сколько именно?')
  const now = guardsOf(enterprise)
  const limit = guardLimit(enterprise)
  const wanted = Math.max(0, Math.min(limit, now + count))
  if (wanted === now) {
    return fail('invalid', count > 0 ? `Больше ${limit} обоз не прокормит.` : 'Отпускать некого.')
  }
  const added = wanted - now
  const price = added > 0 ? added * GUARD_HIRE : 0
  if (state.character.money < price) {
    return fail('noMoney', `На это нужно ${price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  if (price > 0) addMoney(draft, -price)
  advance(draft, hours(2))
  draft.enterprises = draft.enterprises.map((one) =>
    one.id === enterpriseId ? { ...one, guards: wanted } : one,
  )
  const master = caravanMaster(enterpriseId)
  notice(
    draft,
    added > 0
      ? `${master.name} берёт ${added} в охрану: теперь при обозе ${wanted}. Жалованье ${wanted * GUARD_WAGE} в сутки.`
      : `При обозе осталось ${wanted} охраны.`,
    'trade',
  )
  return close(draft)
}

/**
 * Встретить свой обоз в пути (этап 62, К1).
 *
 * Обоз — не строка в отчёте: если ты стоишь там же, где он, можно подойти,
 * поговорить с караванщиком и взять из ящика выручку. Заодно узнаёшь, каков он.
 */
function meetCaravan(state: GameState, enterpriseId: string): CommandResult {
  const enterprise = state.enterprises.find((one) => one.id === enterpriseId)
  if (!enterprise) return fail('unknownAction', 'Такого дела у тебя нет.')
  if (enterprise.locationId !== state.locationId || enterprise.travel) {
    return fail('unavailableHere', 'Обоза здесь нет: он в пути.')
  }
  const master = caravanMaster(enterprise.id)
  const def = caravanTemperDef(master.temper)

  const draft = open(state)
  advance(draft, hours(1))
  // Ящик: то, что дело принесло и чего ты ещё не брал.
  const box = Math.max(0, Math.round(enterprise.earned))
  if (box > 0) {
    addMoney(draft, box)
    draft.enterprises = draft.enterprises.map((one) =>
      one.id === enterpriseId ? { ...one, earned: 0 } : one,
    )
  }
  notice(
    draft,
    `${master.name}, ${def.label}: «${def.about}» Повозок ${wagonsOf(enterprise)}, охраны ${guardsOf(enterprise)}.${
      box > 0 ? ` Из ящика взято ${box}.` : ' В ящике пусто.'
    }`,
    'trade',
  )
  return close(draft)
}

/**
 * Поставить постоялый двор (этап 62, К2).
 *
 * Дело не для города, а для дороги: двор живёт проезжими. Его ставят там, где
 * дороги сходятся, и он стоит пустым там, где по ним не ездят.
 */
function foundInn(state: GameState): CommandResult {
  if (state.character.money < INN_COST) {
    return fail('noMoney', `На двор нужно ${INN_COST}, у тебя ${state.character.money}.`)
  }
  if (state.enterprises.some((one) => one.kind === 'inn' && one.locationId === state.locationId)) {
    return fail('invalid', 'Один двор здесь уже твой.')
  }
  const traffic = travellersAt(state.world, state.settlements, state.locationId)
  if (traffic < 4) {
    return fail('unavailableHere', 'Здесь не ездят: двор будет стоять пустым.')
  }

  const draft = open(state)
  addMoney(draft, -INN_COST)
  advance(draft, hours(8))
  draft.enterprises = [
    ...draft.enterprises,
    {
      id: `inn:${dayOf(draft.time)}:${draft.enterprises.length}`,
      kind: 'inn',
      locationId: state.locationId,
      homeId: null,
      awayId: null,
      travel: null,
      travelTarget: null,
      invested: INN_COST,
      managerId: null,
      cargo: {},
      earned: 0,
    },
  ]
  notice(
    draft,
    `Двор поставлен. Проезжих здесь около ${Math.round(traffic)} в сутки — это и есть твой доход.`,
    'trade',
  )
  return close(draft)
}

/**
 * Держать дорогу (этап 62, К3).
 *
 * Дорога между двумя своими местами — твоя. Разъезд по ней стоит денег и сбивает
 * разбой на обоих концах: держат дорогу не законом, а людьми на ней.
 */
function patrolRoad(state: GameState, toId: string, riders: number): CommandResult {
  const road = ownRoads(state).find(
    (one) =>
      (one.fromId === state.locationId && one.toId === toId) ||
      (one.toId === state.locationId && one.fromId === toId),
  )
  if (!road) return fail('invalid', 'Это не твоя дорога: своими должны быть оба конца.')
  if (!Number.isInteger(riders) || riders < 2 || riders > 20) {
    return fail('invalid', 'В разъезд ставят от двух до двадцати.')
  }
  const price = patrolCost(road, riders)
  if (state.character.money < price) {
    return fail('noMoney', `Разъезд стоит ${price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hours(PATROL_HOURS))
  addFatigue(draft, 14)
  const drop = patrolEffect(riders)
  const settlements = { ...draft.settlements }
  for (const id of [road.fromId, road.toId]) {
    const settlement = settlements[id]
    if (!settlement) continue
    settlements[id] = { ...settlement, banditry: Math.max(0, settlement.banditry - drop) }
    draft.reputation = withPlaceRep(draft.reputation, id, 5)
  }
  draft.settlements = settlements
  const where = draft.base.world.locations[toId]?.name ?? 'соседнее место'
  notice(
    draft,
    `Разъезд прошёл дорогу до ${where}: разбой сбит на ${Math.round(drop * 100)} сотых.`,
    'world',
  )
  return close(draft)
}

/**
 * Набрать команду (этап 62, К4).
 *
 * Корабль — это прежде всего люди. Недобор рук замедляет ход вполтора раза, а
 * неплатёж кончается тем, чем всегда кончается неплатёж на палубе.
 */
function hireCrew(state: GameState, count: number): CommandResult {
  const ship = state.ship
  if (!ship) return fail('requirements', 'Своего судна у тебя нет.')
  if (!isHarbour(state.world, state.locationId)) {
    return fail('unavailableHere', 'Матросов берут в гавани.')
  }
  if (!Number.isInteger(count) || count === 0) return fail('invalid', 'Сколько именно?')
  const need = crewNeeded(ship)
  const now = crewOf(ship)
  const wanted = Math.max(0, Math.min(need, now + count))
  if (wanted === now) {
    return fail(
      'invalid',
      count > 0 ? `Больше ${need} на такое судно не нужно.` : 'Списывать некого.',
    )
  }
  const added = wanted - now
  const price = added > 0 ? added * SAILOR_HIRE : 0
  if (state.character.money < price) {
    return fail('noMoney', `На это нужно ${price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  if (price > 0) addMoney(draft, -price)
  advance(draft, hours(3))
  draft.ship = { ...ship, crew: wanted, mood: crewMood(ship) }
  const skipper = skipperOf(ship)
  notice(
    draft,
    added > 0
      ? `${skipper.name} (${skipperDef(skipper.temper).label}) взял ${added} на борт: рук ${wanted} из ${need}.`
      : `На борту осталось ${wanted} рук.`,
    'trade',
  )
  return close(draft)
}

/**
 * Рассчитать команду (этап 62, К4).
 *
 * Жалованье за месяц вперёд: палуба, которой заплатили, молчит о том, о чём
 * иначе заговорила бы.
 */
function payCrew(state: GameState): CommandResult {
  const ship = state.ship
  if (!ship) return fail('requirements', 'Своего судна у тебя нет.')
  const crew = crewOf(ship)
  if (crew === 0) return fail('invalid', 'Платить некому.')
  const price = crew * SAILOR_WAGE * 30
  if (state.character.money < price) {
    return fail('noMoney', `На месяц жалованья нужно ${price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hours(1))
  draft.ship = { ...ship, mood: Math.min(100, crewMood(ship) + 30) }
  notice(draft, `Команде заплачено за месяц: ${price}. ${moodWord(crewMood(draft.ship))}.`, 'money')
  return close(draft)
}

/**
 * Уйти с попутным шкипером (этап 62, К5).
 *
 * У пристани всегда кто-то стоит, и он идёт откуда-то и куда-то. Место на его
 * палубе стоит дешевле, чем нанять судно, но идёт он в свою гавань, а не в твою.
 */
function takeBerth(state: GameState, shipId: string): CommandResult {
  const day = dayOf(state.time)
  const found = shipsAt(state.world, state.locationId, day).find((one) => one.id === shipId)
  if (!found) return fail('unknownAction', 'Такого судна у пристани нет.')
  if (state.character.money < found.berth) {
    return fail(
      'noMoney',
      `${found.skipper} просит ${found.berth}, у тебя ${state.character.money}.`,
    )
  }
  if (partySize(state.party) + 1 > ABOARD_MAX) {
    return fail('noRoom', `${found.skipper} возьмёт шестерых, а не ${partySize(state.party) + 1}.`)
  }
  const sailing = sail(state, found.fromId, 'aboard')
  if (!sailing.ok) return sailing
  const draft = open(sailing.state)
  addMoney(draft, -found.berth)
  notice(
    draft,
    `«${found.name}» под рукой ${found.skipper}а идёт домой, и ты с ним. Место — ${found.berth}.`,
    'trade',
  )
  return close(draft)
}

/**
 * Охота на морского лорда (этап 62, К6).
 *
 * У пирата есть имя, гавань и цена за голову. Идти к нему — дело добровольное:
 * он сидит в глухом месте у воды, и по дороге туда никто не поможет.
 */
function huntPirate(state: GameState, pirateId: string): CommandResult {
  const lord = pirateById(state.world, pirateId)
  if (!lord) return fail('unknownAction', 'О таком не слышали.')
  if (!state.ship) return fail('requirements', 'К нему идут своим судном.')
  if (!isHarbour(state.world, state.locationId)) {
    return fail('unavailableHere', 'Выходить в море надо из гавани.')
  }
  if (partySize(state.party) < 6) return fail('requirements', 'С такими силами его не брать.')

  const draft = open(state)
  advance(draft, hours(12))
  addFatigue(draft, 16)
  const [band, afterBand] = warband(lord.strength, draft.rng)
  draft.rng = afterBand
  draft.battle = startBattle(
    draft.party,
    { ...band, name: `${lord.name} ${lord.byname}` },
    'coast',
    {
      foeId: lord.id,
      // Абордаж: теснота сходней, и обходить некуда.
      ground: 'ford',
      veterans: veteransOf(draft.party),
    },
  )
  notice(
    draft,
    `${lord.name} ${lord.byname} вышел навстречу сам. За его голову дают ${bountyFor(lord)}.`,
    'war',
  )
  return close(draft)
}

// --- мор, раны и лекари (этап 64) -------------------------------------------

/**
 * Пойти к лекарю (этап 64, Ж1).
 *
 * Лекарь — человек с именем, выучкой и ценой: учёный берёт как за учёность и
 * чистит рану так, что она не гноится; цирюльник дёшев и шьёт тем, чем брил.
 * Гноящуюся рану он чистит — это единственное, что её вообще лечит.
 */
function seeHealer(state: GameState): CommandResult {
  const healer = healerAt(state.world, state.settlements, state.locationId)
  if (!healer) return fail('unavailableHere', 'Здесь некому лечить.')
  const wound = state.character.wound
  const ailment = ailmentOf(state)
  if (!wound && !ailment) return fail('invalid', 'Лечить нечего: ты цел.')
  const price = wound ? healerPrice(healer, wound) : 20
  if (state.character.money < price) {
    return fail('noMoney', `${healer.name} просит ${price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hours(4))
  const def = healerDef(healer.kind)
  notice(draft, `${healer.name}, ${def.label}: «${def.about}»`, 'people')
  if (wound) {
    // Чистка: гной убирают, и рана снова начинает заживать.
    const cleaned = wound.festering
      ? { ...wound, festering: false, severity: Math.max(0.1, wound.severity - 0.2) }
      : wound
    const faster = healWound(cleaned, 2, healerSpeed(healer))
    patch(draft, { wound: faster })
    notice(
      draft,
      wound.festering
        ? 'Он вскрыл и промыл. Больно, зато теперь заживёт.'
        : `${woundKindDef(woundKindOf(wound)).label} рана: перевязано как надо.`,
    )
  }
  if (ailment) {
    draft.ailment = null
    notice(draft, `${ailmentDef(ailment).label} отпустила: ${ailmentDef(ailment).cure}.`, 'people')
  }
  return close(draft)
}

/**
 * Сварить зелье (этап 64, Ж4).
 *
 * Травничество — ремесло: собрать, сварить, продать. Трав на зелье уходит
 * больше, чем кажется, и берутся за него не с первой ступени.
 */
function brewPotion(state: GameState, potionId: string): CommandResult {
  const def = potionDef(potionId)
  if (!def) return fail('unknownAction', 'Такого не варят.')
  const healing = skillLevel(state.character, 'healing')
  if (healing < def.needsHealing) {
    return fail(
      'requirements',
      `За такое берутся с лекарского ${def.needsHealing}, у тебя ${healing}.`,
    )
  }
  const herbs = state.character.inventory[HERB_GOOD] ?? 0
  if (herbs < def.herbs) {
    return fail('noGoods', `Нужно трав ${def.herbs}, у тебя ${herbs}.`)
  }

  const draft = open(state)
  addGoods(draft, HERB_GOOD, -def.herbs)
  advance(draft, def.minutes)
  addFatigue(draft, 10)
  practice(draft, 'healing', 14)
  draft.potions = { ...draft.potions, [def.id]: potionCount(draft, def.id) + 1 }
  notice(draft, `${def.label} готово. ${def.about}`)
  return close(draft)
}

/** Выпить своё зелье (этап 64, Ж4): то, ради чего его и варили. */
function drinkPotion(state: GameState, potionId: string): CommandResult {
  const def = potionDef(potionId)
  if (!def) return fail('unknownAction', 'Такого не варят.')
  if (potionCount(state, potionId) <= 0) return fail('noGoods', `${def.label} у тебя нет.`)

  const draft = open(state)
  draft.potions = { ...draft.potions, [def.id]: potionCount(draft, def.id) - 1 }
  advance(draft, 15)
  if (def.id === 'salve') {
    const wound = draft.character.wound
    if (wound) {
      patch(draft, { wound: { ...wound, festering: false } })
      notice(draft, 'Мазь жжёт, но гной уходит.')
    } else notice(draft, 'Мазь пригодится потом.')
  } else if (def.id === 'brew') {
    const wound = draft.character.wound
    if (wound) {
      const left = wound.daysLeft - 6
      patch(draft, { wound: left > 0 ? { ...wound, daysLeft: left } : null })
    }
    if (draft.ailment) {
      notice(draft, `${ailmentDef(draft.ailment.kind).label} отступила.`, 'people')
      draft.ailment = null
    }
    notice(draft, 'Отвар горек, и через час становится легче.')
  } else if (def.id === 'tonic') {
    addFatigue(draft, -35)
    notice(draft, 'Как будто спал полночи. Только сердце частит.')
  } else {
    draft.ailment = null
    notice(draft, 'Противоядие выпито. Если было чего — уже нет.')
  }
  return close(draft)
}

/**
 * Собрать трав (этап 64, Ж4).
 *
 * Травы растут не в лавке: их собирают в лесу, на лугу и по склонам. Сколько
 * соберёшь — по земле, времени года и умению.
 */
function gatherHerbs(state: GameState): CommandResult {
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  if (state.settlements[state.locationId] && !state.journey) {
    return fail('unavailableHere', 'В селе трав не собирают: там всё вытоптано.')
  }
  const season = seasonOf(dayOf(state.time))
  if (season === 'winter') return fail('unavailableHere', 'Зимой трав нет: всё под снегом.')
  const blocked = checkFatigue(state.character, 12)
  if (blocked) return blocked

  const draft = open(state)
  advance(draft, hours(3))
  addFatigue(draft, 12)
  practice(draft, 'healing', 10)
  practice(draft, 'survival', 8)
  const healing = skillLevel(state.character, 'healing')
  const good = here.terrain === 'desert' || here.terrain === 'steppe' ? 0.6 : 1
  const [roll, afterRoll] = nextFloat(draft.rng)
  draft.rng = afterRoll
  const found = Math.max(1, Math.round((2 + healing * 0.2) * good * (0.6 + roll * 0.8)))
  addGoods(draft, HERB_GOOD, found)
  notice(draft, `Собрано трав: ${found}. Не всякая из них лекарственная, но разберёшься.`, 'money')
  return close(draft)
}

/**
 * Болезни отряда (этап 64, Ж5).
 *
 * Болеют не от случая, а от места: цинга в море без зелени, лихорадка в топях,
 * кровавый понос там, где тесно и вода дурная. Болезнь держится, пока держится
 * причина, — и уходит сама, когда причина кончилась.
 *
 * С этапа 73 хворей двенадцать, и причина у каждой лежит в содержимом
 * (`AILMENT_DEFS`): здесь только сборка того, где герой стоит, и один бросок.
 */
function sicken(draft: Draft, days: number): void {
  if (days <= 0) return
  const where = sickWhere(draft)
  const current = draft.ailment
  if (current) {
    // Хворь держится, пока держится причина: вышел из топей — и лихорадка
    // отпускает сама, хоть и не в тот же день.
    if (!ailmentHolds(current.kind, where)) {
      const [better, afterRoll] = rollChance(draft.rng, 0.12 * days)
      draft.rng = afterRoll
      if (better) {
        notice(draft, `${ailmentDef(current.kind).label} отпустила сама.`, 'people')
        draft.ailment = null
        return
      }
    }
    // Пока болеет — теряет дух: болезнь не урон, а условие.
    const harm = ailmentDef(current.kind).morale * days
    draft.party = { ...draft.party, morale: Math.max(0, draft.party.morale - harm) }
    return
  }
  // Чем здесь можно заболеть — говорит таблица (этап 73, Б6): двенадцать
  // хворей, у каждой своя причина, и все они читаются одинаково. Бросок один на
  // все разом: по броску на хворь — это двенадцать бросков в сутки ради одного
  // события в месяц.
  const risks = ailmentsHere(where)
  if (risks.length === 0) return
  let none = 1
  for (const risk of risks) none *= (1 - risk.chance) ** days
  const [sick, afterRoll] = rollChance(draft.rng, 1 - none)
  draft.rng = afterRoll
  if (!sick) return
  const total = risks.reduce((sum, risk) => sum + risk.chance, 0)
  const [roll, afterPick] = nextFloat(draft.rng)
  draft.rng = afterPick
  let edge = roll * total
  for (const risk of risks) {
    edge -= risk.chance
    if (edge > 0) continue
    draft.ailment = { kind: risk.ailment, since: dayOf(draft.time) }
    notice(draft, AILMENT_DEFS[risk.ailment].about, 'war')
    return
  }
}

/**
 * Где герой стоит — так, как это видят хвори.
 *
 * Одно место сборки на все двенадцать: иначе каждая новая хворь тянула бы за
 * собой свою ветку в такте (этап 73, Б6).
 */
function sickWhere(draft: Draft): SickWhere {
  const here = draft.base.world.locations[draft.locationId]
  const settlement = draft.settlements[draft.locationId]
  // Свежая еда в котомке — и цинги не будет: причина не в море, а в том, что в
  // море нечего есть зелёного.
  const fresh = (draft.character.inventory.herbs ?? 0) + (draft.character.inventory.wine ?? 0)
  const people = settlement?.population ?? here?.population ?? 0
  return {
    atSea: draft.journey?.sea === true && fresh <= 0,
    terrain: here?.terrain ?? null,
    archetype: here?.archetype ?? null,
    season: seasonOf(dayOf(draft.time)),
    onRoad: draft.journey !== null,
    besieged: draft.siege !== null || plagueAt(draft.plagues, draft.locationId) !== null,
    hungry: draft.party.hungryDays >= 3,
    crowded: people >= 12000 && !(settlement?.buildings.includes('bathhouse') ?? false),
    // В глуши — значит не в месте: урочища и святыни живут вне списка мест.
    inWilds: here === undefined,
  }
}

// --- война с причиной (этап 65) ---------------------------------------------

/**
 * Посольство (этап 65, Т2).
 *
 * Мир, союз и дань — разговор, а не бросок. Посол приезжает в столицу с чем-то
 * одним, и говорить с ним можно тремя способами: согласиться, отказать или
 * дожать. Дожимают убеждением, и у каждого нрава своя мера уступчивости.
 */
function meetEnvoy(
  state: GameState,
  answer: 'yes' | 'no' | 'press' | 'delay' | 'humiliate',
): CommandResult {
  const day = dayOf(state.time)
  const envoy = envoyAt(state.world, state.politics, state.locationId, day)
  if (!envoy) return fail('unavailableHere', 'Послов здесь сейчас нет.')
  if (!state.service && !state.realm) {
    return fail('requirements', 'За корону говорит тот, кто ей служит или сам себе корона.')
  }
  const mine =
    state.service ??
    Object.values(state.world.kingdoms).find((one) => one.capitalId === state.locationId)?.id ??
    null
  if (!mine) return fail('invalid', 'Непонятно, за кого ты говоришь.')

  const draft = open(state)
  advance(draft, hours(3))
  practice(draft, 'persuasion', 18)
  const def = envoyTemperDef(envoy.temper)
  notice(draft, `${envoy.name}, ${def.label} посол: «${def.about}»`, 'people')
  if (answer === 'no') {
    // Отказ помнят: отношение корон — не пустая цифра.
    draft.politics = withRelation(draft.politics, mine, envoy.fromKingdomId, -8)
    notice(draft, 'Ты отказал. Он поклонился ровно настолько, насколько должен.', 'war')
    return close(draft)
  }
  // Тянуть и унизить (этап 79, П4): не отказ и не согласие — но тоже ответ,
  // и его помнят дольше отказа.
  if (answer === 'delay' || answer === 'humiliate') {
    const def = hostAnswerDef(answer)
    draft.politics = withRelation(draft.politics, mine, envoy.fromKingdomId, def.relation)
    notice(
      draft,
      answer === 'delay'
        ? 'Ты не сказал ни да, ни нет. Он остался ждать и считать дни.'
        : `${envoy.name} выведен со двора при всех. Такое помнят и через колено.`,
      'war',
    )
    if (answer === 'humiliate') seeDeed(draft, 'sack')
    return close(draft)
  }
  const yields = envoyYields(envoy, skillLevel(draft.character, 'persuasion'))
  if (answer === 'press') {
    const [gives, afterRoll] = rollChance(draft.rng, Math.min(0.9, yields / 2.5))
    draft.rng = afterRoll
    if (!gives) {
      draft.politics = withRelation(draft.politics, mine, envoy.fromKingdomId, -4)
      notice(draft, 'Он не уступил и запомнил, что его давили.', 'war')
      return close(draft)
    }
    notice(draft, 'Он уступил больше, чем собирался. Дома его за это не похвалят.', 'world')
  }
  if (envoy.asks === 'peace') {
    draft.politics = {
      ...draft.politics,
      wars: draft.politics.wars.filter((war) => !sameSides(war, mine, envoy.fromKingdomId)),
    }
    draft.politics = withRelation(draft.politics, mine, envoy.fromKingdomId, 15)
    notice(draft, `Мир с ${kingdomName(draft.base, envoy.fromKingdomId)} заключён.`, 'war')
  } else if (envoy.asks === 'alliance') {
    draft.politics = {
      ...draft.politics,
      alliances: [
        ...draft.politics.alliances,
        { a: mine, b: envoy.fromKingdomId, since: day, byMarriage: false },
      ],
    }
    draft.politics = withRelation(draft.politics, mine, envoy.fromKingdomId, 20)
    notice(draft, `Союз с ${kingdomName(draft.base, envoy.fromKingdomId)}.`, 'world')
  } else if (envoy.asks === 'tribute') {
    // Дань, которую с тебя просят: заплатить — значит признать.
    draft.politics = {
      ...draft.politics,
      tributes: draft.politics.tributes.filter(
        (one) => !(one.from === mine && one.to === envoy.fromKingdomId),
      ),
    }
    notice(draft, 'Дань прощена: он увозит слово, а не серебро.', 'money')
  } else {
    draft.politics = withRelation(draft.politics, mine, envoy.fromKingdomId, 10)
    notice(draft, 'Проход через землю разрешён. Это дешевле войны.', 'world')
  }
  // Говорить за корону — тратить свою милость у неё.
  if (state.service) {
    const liege = draft.politics.lords.find((one) => one.kingdomId === state.service)
    if (liege) draft.reputation = withLordRep(draft.reputation, liege.id, -ENVOY_FAVOUR)
  }
  return close(draft)
}

/** Воюют ли эти двое. */
function sameSides(war: { a: string; b: string }, a: string, b: string): boolean {
  return (war.a === a && war.b === b) || (war.a === b && war.b === a)
}

function withRelation(politics: GameState['politics'], a: string, b: string, delta: number) {
  const key = [a, b].sort().join('|')
  const now = politics.relations[key] ?? 0
  return {
    ...politics,
    relations: { ...politics.relations, [key]: Math.max(-100, Math.min(100, now + delta)) },
  }
}

function kingdomName(state: GameState, kingdomId: string): string {
  return state.world.kingdoms[kingdomId]?.name ?? kingdomId
}

/**
 * Своя война (этап 65, Т5).
 *
 * Своё владение объявляет войну теми же правилами, что и корона: нужен повод, и
 * повод берётся из мира. Без повода воюют тоже — но это называется честолюбием,
 * и соседи это видят.
 */
function declareWar(state: GameState, kingdomId: string): CommandResult {
  if (!state.realm)
    return fail('requirements', 'Войну объявляет тот, у кого есть своё имя на карте.')
  if (!state.world.kingdoms[kingdomId]) return fail('unknownAction', 'Такой короны нет.')
  if (atWar(state.politics, PLAYER, kingdomId)) return fail('invalid', 'Вы и так воюете.')
  // За кого поручился, на того не ходят (этап 137, Га3).
  if (tiedTo(state, PLAYER, kingdomId)) {
    return fail('requirements', TIED_DEFS.war.says)
  }

  const draft = open(state)
  // Война против того, с кем у тебя бумага, — это и есть разрыв (этап 80, Г3).
  const day0 = dayOf(state.time)
  const paper = treatyBetween(state, PLAYER, kingdomId, day0)
  if (paper && (paper.kind === 'peace' || paper.kind === 'alliance')) {
    const cost = breachCost(paper)
    draft.treaties = treatiesOf(draft).map((one) =>
      one.id === paper.id ? { ...one, brokenBy: PLAYER } : one,
    )
    for (const id of Object.keys(state.world.kingdoms)) {
      if (id === kingdomId) continue
      draft.politics = withRelation(draft.politics, PLAYER, id, cost.world)
    }
    shameOn(draft, 'broke')
    notice(
      draft,
      `${treatyDef(paper.kind).label} с ${kingdomName(state, kingdomId)} порван объявлением войны.`,
      'war',
    )
  }
  // Заявленное право — готовый повод (этап 78, Т5): на него и ссылаются, а
  // кубик остаётся тем, кому не на что сослаться.
  const claim = claimAgainst(state, kingdomId)
  const [found, afterCasus] = casusFor(
    draft.base.world,
    draft.politics,
    draft.settlements,
    PLAYER,
    kingdomId,
    draft.rng,
  )
  draft.rng = afterCasus
  const casus: Casus = claim ? { kind: claim.kind, provinceId: claim.provinceId } : found
  const day = dayOf(draft.time)
  draft.politics = {
    ...draft.politics,
    wars: [
      ...draft.politics.wars,
      { a: PLAYER, b: kingdomId, since: day, reason: casusWords(draft.base.world, casus), casus },
    ],
  }
  draft.politics = withRelation(draft.politics, PLAYER, kingdomId, -30)
  // Помазаннику война без права не прощается (этап 134, Вр4).
  if (casus.kind === 'ambition' && boundBy(draft.base, draft.base.world, 'war', day)) {
    draft.churchAnger = Math.max(0, (draft.churchAnger ?? 0) + FAITH.warAnger)
    notice(draft, BIND_DEFS.war.says, 'world')
  }
  advance(draft, hours(4))
  notice(
    draft,
    `${state.realm.name} объявляет войну короне ${kingdomName(state, kingdomId)}. Повод: ${casusWords(draft.base.world, casus)}. «${casusDef(casus.kind).says}»`,
    'war',
  )
  return close(draft)
}

/**
 * Предложить мир (этап 65, Т3 и Т5).
 *
 * Условия следуют из повода и из того, кто сильнее: за землю требуют землю, за
 * набеги — виновного. Слабый платит, сильный получает.
 */
function offerPeace(state: GameState, kingdomId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Мир заключает тот, кто воюет своим именем.')
  const war = state.politics.wars.find((one) => sameSides(one, PLAYER, kingdomId))
  if (!war) return fail('invalid', 'С этой короной ты не воюешь.')

  const draft = open(state)
  advance(draft, hours(6))
  practice(draft, 'persuasion', 20)
  const mine = holdingsOf(draft.settlements, PLAYER).length
  const theirs = Object.values(draft.settlements).filter(
    (one) => one.owner === `crown:${kingdomId}` && one.population > 0,
  ).length
  const ratio = theirs === 0 ? 1 : Math.min(1, mine / Math.max(1, theirs))
  const term = war.casus ? termsFor(war.casus, 1 / Math.max(0.2, ratio)) : 'nothing'
  // Мирятся не всегда: у иного повода своё упрямство.
  const [agreed, afterRoll] = rollChance(
    draft.rng,
    Math.min(
      0.9,
      (0.35 + skillLevel(draft.character, 'persuasion') * 0.01) / stubbornOf(war.casus),
    ),
  )
  draft.rng = afterRoll
  if (!agreed) {
    notice(
      draft,
      `${kingdomName(state, kingdomId)} отвечает отказом: «${casusDef(war.casus?.kind ?? 'ambition').says}»`,
      'war',
    )
    return close(draft)
  }
  draft.politics = {
    ...draft.politics,
    wars: draft.politics.wars.filter((one) => !sameSides(one, PLAYER, kingdomId)),
  }
  draft.politics = withRelation(draft.politics, PLAYER, kingdomId, 20)
  // Сильный берёт дань, слабый платит: условия видны, и они настоящие.
  if (ratio > 1.2) {
    draft.politics = {
      ...draft.politics,
      tributes: [
        ...draft.politics.tributes,
        { from: kingdomId, to: PLAYER, perDay: 6, untilDay: dayOf(draft.time) + 360 },
      ],
    }
  } else if (ratio < 0.8) {
    addMoney(draft, -Math.min(draft.character.money, 200))
  }
  notice(
    draft,
    `Мир с ${kingdomName(state, kingdomId)}. Условия: ${termWords(term)} — ${termAbout(term)}`,
    'war',
  )
  return close(draft)
}

// --- лорды как люди (этап 66) -----------------------------------------------

/**
 * Пойти к придворной партии (этап 66, Л6).
 *
 * При всякой короне их две пары, и они всегда об одном: воевать или копить,
 * старая кровь или новые люди. Милость одной — немилость другой: это и делает
 * двор двором, а не списком имён.
 */
function askFaction(state: GameState, kingdomId: string, factionId: FactionId): CommandResult {
  const kingdom = state.world.kingdoms[kingdomId]
  if (!kingdom) return fail('unknownAction', 'Такой короны нет.')
  if (state.locationId !== kingdom.capitalId) {
    return fail('unavailableHere', 'Партии сидят при дворе, а двор — в столице.')
  }
  const mood = factionMood(state, kingdomId, factionId)
  if (mood < -40) return fail('shunned', 'Эти с тобой разговаривать не станут.')

  const draft = open(state)
  advance(draft, hours(4))
  practice(draft, 'persuasion', 16)
  const def = factionDef(factionId)
  const against = def.against
  draft.factions = {
    ...draft.factions,
    [factionKey(kingdomId, factionId)]: Math.min(100, mood + FACTION_FAVOUR),
    [factionKey(kingdomId, against)]: Math.max(
      -100,
      factionMood(draft, kingdomId, against) - FACTION_SPITE,
    ),
  }
  // Поддержка партии — это и милость её людей: лорды короны смотрят на тебя
  // её глазами.
  const crown = crownOf(kingdomId)
  notice(
    draft,
    `${def.label} при дворе ${crown.title}а ${crown.name}а: «${def.asks}» Тебя услышали.`,
    'people',
  )
  notice(draft, `${factionDef(against).label} этого не простит.`, 'people')
  return close(draft)
}

/**
 * Посмотреть скоморохов (этап 67, Я3).
 *
 * Дудки, медведь и непристойная песня про соседнего барона. Отряду это стоит
 * часа и нескольких монет, а даёт то, чего не даёт жалованье.
 */
function watchJesters(state: GameState): CommandResult {
  const day = dayOf(state.time)
  if (!hasFairFolk(state.world, state.locationId, day, 'jester')) {
    return fail('unavailableHere', 'Скоморохов здесь нет: ярмарка не всякий день.')
  }
  const price = Math.max(2, partySize(state.party))
  if (state.character.money < price) return fail('noMoney', `На это нужно хотя бы ${price}.`)

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hours(2))
  addFatigue(draft, -5)
  draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + JESTER_MORALE) }
  draft.companions = draft.companions.map((one) =>
    one.captive ? one : { ...one, mood: Math.min(100, one.mood + 3) },
  )
  notice(
    draft,
    'Медведь пляшет, дудки врут, песня про соседнего барона непристойна до слёз. Отряд доволен.',
    'people',
  )
  return close(draft)
}

/**
 * Воры в толпе (этап 67, Я3).
 *
 * На ярмарке всегда работают. Кошелёк режут у того, кто зазевался, — и это
 * единственное, чем ярмарка бывает дорога.
 */
function pickpockets(draft: Draft): void {
  const day = dayOf(draft.time)
  if (!hasFairFolk(draft.base.world, draft.locationId, day, 'thief')) return
  if (draft.character.money <= 0) return
  const watchful = skillLevel(draft.character, 'sleight') + skillLevel(draft.character, 'survival')
  const [cut, afterRoll] = rollChance(draft.rng, Math.max(0.05, 0.3 - watchful * 0.01))
  draft.rng = afterRoll
  if (!cut) return
  const lost = Math.max(1, Math.round(draft.character.money * THIEF_SHARE))
  addMoney(draft, -lost)
  notice(draft, `В толпе срезали кошель: ${lost}. Вора искать поздно.`, 'money')
}

/**
 * Нанять певца (этап 68, Ф5).
 *
 * Славу нельзя купить, а рассказ о ней — можно. Певец не врёт: он выбирает, о
 * чём петь, и поёт это там, где слушают. Круг решает, кому эта песня в уши.
 */
function hireSinger(state: GameState, circle: Circle): CommandResult {
  const settlement = state.settlements[state.locationId]
  if (!settlement || settlement.population < 400) {
    return fail('unavailableHere', 'Петь тут некому и незачем: слушателей нет.')
  }
  if (state.character.money < SINGER_PRICE) {
    return fail('noMoney', `Певец просит ${SINGER_PRICE}, у тебя ${state.character.money}.`)
  }
  const shame = shameBefore(state, circle)

  const draft = open(state)
  addMoney(draft, -SINGER_PRICE)
  advance(draft, hours(SINGER_HOURS))
  const singer = singerAt(state.locationId, dayOf(draft.time))
  // Песня прибавляет славы тому кругу, для которого её заказали. Но позор
  // песней не перекрывают: о нём люди помнят своё.
  draft.fame = {
    ...draft.fame,
    [circle]: Math.max(-100, Math.min(100, fameOf(draft, circle) + SINGER_FAME)),
  }
  notice(
    draft,
    `${singer} поёт о тебе для ${circleDef(circle).label}: ${circleDef(circle).about}`,
    'people',
  )
  if (shame) {
    notice(
      draft,
      `Но «${shameDef(shame.id).label}» песней не перекрыть: ${shameDef(shame.id).says}`,
      'people',
    )
  }
  return close(draft)
}

/** Записать позор: не минус к славе, а история (этап 68, Ф6). */
function shameOn(draft: Draft, id: ShameId): void {
  if (draft.shames.some((one) => one.id === id)) return
  draft.shames = [...draft.shames, { id, since: dayOf(draft.time), covered: 0 }]
  notice(draft, `${shameDef(id).says}`, 'people')
}

/**
 * Выбрать или сменить цель жизни (этап 70, Ц1 и Ц6).
 *
 * Цель ничего не запрещает: она называет, ради чего всё это. Сменить её можно —
 * но мир замечает: бросил меч ради книги — и говорить о тебе станут иначе.
 */
function setGoal(state: GameState, goalId: string): CommandResult {
  const goal = goalDef(goalId)
  if (!goal) return fail('unknownAction', 'Такой цели нет.')
  if (state.goal === goalId) return fail('invalid', 'Ты и так идёшь к этому.')

  const draft = open(state)
  const before = goalOf(state)
  draft.goal = goalId
  advance(draft, hours(1))
  if (before) {
    // Смена цели — тоже поступок: круги, которым ты был нужен прежним, это
    // отмечают.
    const cooled: Record<string, number> = { ...draft.fame }
    for (const circle of ALL_CIRCLES) {
      const value = cooled[circle] ?? 0
      if (value > 0) cooled[circle] = Math.max(0, value + GOAL_CHANGE_FAME)
    }
    draft.fame = cooled
    notice(
      draft,
      `Ты оставил прежнее («${before.label}») ради нового: ${goal.label}. Те, кто знал тебя прежним, это заметят.`,
      'people',
    )
  } else {
    notice(draft, `${goal.label}. «${goal.says}»`, 'people')
  }
  return close(draft)
}

/**
 * Вехи (этап 70, Ц2).
 *
 * Веха не назначается — она замечается: первая земля, первый лен, свадьба,
 * ранг. Проверяется по тому, что уже есть в состоянии, и отмечается один раз.
 */
function markMilestones(draft: Draft): void {
  const goal = goalOf(draft.base)
  if (!goal) return
  const taken = new Set(draft.milestones)
  for (const [index, step] of goal.steps.entries()) {
    const key = milestoneKey(goal.id, index)
    if (taken.has(key)) continue
    if (!goalStepDone(draft.base, step)) continue
    draft.milestones = [...draft.milestones, key]
    draft.renown += MILESTONE_RENOWN
    notice(draft, `Веха: ${step.label}. Это и есть то, ради чего.`, 'people')
  }
}

function siegeLift(state: GameState): CommandResult {
  if (!state.siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const draft = open(state)
  notice(draft, 'Осада снята.')
  draft.siege = null
  return close(draft)
}

/** Земля за службу: корона жалует лен тому, кто себя показал. */
function askForFief(state: GameState): CommandResult {
  if (!state.service) return fail('invalid', 'Земли просят у того, кому служат.')
  if (state.renown < 3) {
    return fail('requirements', `За тобой мало славы: нужно 3 победы, есть ${state.renown}.`)
  }
  const crown = `crown:${state.service}`
  const here = kingdomOf(state.world, state.locationId)
  if (here?.id !== state.service) {
    return fail('unavailableHere', 'Просить надо там, где тебя слышат, — на землях сюзерена.')
  }

  // Жалуют не лучшее: самое мелкое из того, что держит корона.
  const candidates = Object.values(state.settlements)
    .filter((settlement) => settlement.owner === crown)
    .filter((settlement) => state.world.locations[settlement.locationId]?.archetype !== 'capital')
    .sort((a, b) => a.population - b.population)
  const granted = candidates[0]
  if (!granted) return fail('unavailableHere', 'У короны нет свободной земли для тебя.')

  const draft = open(state)
  const name = state.world.locations[granted.locationId]?.name ?? 'земля'
  notice(draft, `Пожалован лен: ${name}.`)
  seeDeed(draft, 'takeFief')
  advance(draft, hours(3))
  draft.settlements = {
    ...draft.settlements,
    [granted.locationId]: { ...granted, owner: PLAYER },
  }
  draft.renown = Math.max(0, draft.renown - 3)
  return close(draft)
}

/** Враждебно ли место: воюет ли его держатель с тем, за кого стоит игрок. */
function hostileTo(state: GameState, settlement: Settlement): boolean {
  const owner = settlement.owner
  if (!owner) return true
  const side = state.service
  if (!side) return false
  const ownerSide = owner.startsWith('crown:')
    ? owner.slice('crown:'.length)
    : (lordById(state.politics, owner)?.kingdomId ?? owner)
  return atWar(state.politics, side, ownerSide)
}

/**
 * Снаряжение (этап 6, блок E).
 *
 * Купленное надевается сразу, прежнее уходит за полцены: возиться со складом на
 * телефоне незачем. Вещь не по силам и не по выучке помогает хуже — это
 * считается числом, а не запрещается.
 */
function buyItem(state: GameState, itemId: string): CommandResult {
  const item = ITEMS_BY_ID[itemId]
  if (!item) return fail('unknownAction', 'Такого не продают.')
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isSettlement(here.archetype) || !item.where.includes(here.archetype)) {
    return fail('unavailableHere', 'Здесь такого не делают и не возят.')
  }
  // Именную вещь делают в одной короне и за её пределы не возят.
  if (item.kingdomId && kingdomOf(state.world, state.locationId)?.id !== item.kingdomId) {
    return fail('unavailableHere', 'Такое делают не здесь, и сюда не возят.')
  }
  const shunned = checkWelcome(state)
  if (shunned) return shunned

  const price = Math.round(item.price * priceFactor(placeRep(state.reputation, state.locationId)))
  if (state.character.money < price) {
    return fail('noMoney', `Не хватает денег: нужно ${price}, есть ${state.character.money}.`)
  }

  const draft = open(state)
  const old = state.character.equipment[item.slot]
  const oldItem = old ? ITEMS_BY_ID[old.id] : null
  notice(draft, `Куплено: ${item.label.toLowerCase()} за ${price}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, -price)
  if (oldItem && old) {
    const resale = Math.round((oldItem.price * old.condition) / 100 / 2)
    addMoney(draft, resale)
    notice(draft, `Прежнее сдано за ${resale}.`)
  }
  patch(draft, {
    equipment: withItem(draft.character.equipment, item.slot, { id: item.id, condition: 100 }),
  })
  practice(draft, 'trade', 6)
  return close(draft)
}

/** Ковка: из железа и инструментов, купленных там, где они дёшевы. */
function craftItem(state: GameState, itemId: string): CommandResult {
  const item = ITEMS_BY_ID[itemId]
  if (!item?.craft) return fail('unknownAction', 'Это не выковать.')
  const settlement = state.settlements[state.locationId]
  const here = state.world.locations[state.locationId]
  if (!settlement || !here) return fail('invalid', 'Непонятно, где находится герой.')
  const canForge =
    hasBuilding(settlement, 'smithy') || here.archetype === 'city' || here.archetype === 'capital'
  if (!canForge) return fail('unavailableHere', 'Здесь нет кузницы.')

  const skill = skillLevel(state.character, 'engineering')
  if (skill < item.craft.engineering) {
    return fail('requirements', `Нужна «Инженерия» ${item.craft.engineering} (есть ${skill}).`)
  }
  if ((state.character.inventory.iron ?? 0) < item.craft.iron) {
    return fail('noGoods', `Нужно железа: ${item.craft.iron}.`)
  }
  if ((state.character.inventory.tools ?? 0) < item.craft.tools) {
    return fail('noGoods', `Нужно инструментов: ${item.craft.tools}.`)
  }

  const draft = open(state)
  // Вещь выходит с клеймом (этап 50): чья работа, где сделана и какова.
  const [roll, afterRoll] = nextFloat(draft.rng)
  draft.rng = afterRoll
  const rank = rankOfShifts(shiftsOf(state, 'forgeBlade') + shiftsOf(state, 'smithyHand'))
  const quality = qualityFrom(skill, rank, roll)
  const mark = {
    maker: state.character.name,
    place: here.name,
    quality,
  }
  notice(draft, `Выковано: ${item.label.toLowerCase()} — ${qualityLabel(quality)}.`)
  advance(draft, hours(10))
  addFatigue(draft, 25)
  addGoods(draft, 'iron', -item.craft.iron)
  addGoods(draft, 'tools', -item.craft.tools)
  patch(draft, {
    equipment: withItem(draft.character.equipment, item.slot, {
      id: item.id,
      condition: 100,
      mark,
    }),
  })
  practice(draft, 'engineering', 45)
  return close(draft)
}

function repairItem(state: GameState, slot: SlotId): CommandResult {
  const worn = state.character.equipment[slot]
  const item = worn ? ITEMS_BY_ID[worn.id] : null
  if (!worn || !item) return fail('invalid', 'Тут нечего чинить.')
  if (worn.condition >= 100) return fail('invalid', 'Вещь и так цела.')
  const cost = repairCost(item, worn.condition, worn.mark?.quality)
  if (state.character.money < cost) {
    return fail('noMoney', `Починка стоит ${cost}, есть ${state.character.money}.`)
  }

  const draft = open(state)
  notice(draft, `Починено: ${item.label.toLowerCase()} за ${cost}.`)
  advance(draft, hours(3))
  addMoney(draft, -cost)
  patch(draft, {
    equipment: withItem(draft.character.equipment, slot, { id: worn.id, condition: 100 }),
  })
  return close(draft)
}

/** Снарядить отряд: оружие из поклажи идёт людям, а не на рынок. */
function outfitParty(state: GameState, weapons: number): CommandResult {
  if (!Number.isInteger(weapons) || weapons <= 0) return fail('invalid', 'Сколько именно?')
  if ((state.character.inventory.weapons ?? 0) < weapons) {
    return fail('noGoods', `Оружия столько нет: есть ${state.character.inventory.weapons ?? 0}.`)
  }
  const size = partySize(state.party)
  if (size === 0) return fail('invalid', 'Снаряжать некого.')

  const draft = open(state)
  const gain = Math.min(1 - draft.party.gear, weapons / size / 2)
  if (gain <= 0.001) return fail('invalid', 'Отряд и так одет во всё, что нашлось.')
  addGoods(draft, 'weapons', -weapons)
  draft.party = { ...draft.party, gear: Math.min(1, draft.party.gear + gain) }
  notice(draft, `Отряд снаряжён лучше: ${Math.round(draft.party.gear * 100)}%.`)
  advance(draft, hours(2))
  return close(draft)
}

/**
 * Привезти хлеб.
 *
 * Самое прямое доброе дело в этой игре: у тебя есть зерно, здесь голодают.
 * Это же и самый честный источник хорошего имени.
 */
function giveFood(state: GameState, amount: number): CommandResult {
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  if ((state.character.inventory.grain ?? 0) < amount) {
    return fail('noGoods', `Зерна столько нет: есть ${state.character.inventory.grain ?? 0}.`)
  }
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')

  const draft = open(state)
  const hungry = foodSecurity(settlement) < 0.6
  addGoods(draft, 'grain', -amount)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: {
      ...settlement,
      stock: { ...settlement.stock, grain: settlement.stock.grain + amount },
    },
  }
  // За хлеб в голод благодарны втрое: сытому городу подарок — просто товар.
  const gain = Math.round((amount / 20) * (hungry ? 3 : 1))
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, gain)
  const owner = settlement.owner
  if (owner && !owner.startsWith('crown:') && owner !== PLAYER) {
    draft.reputation = withLordRep(draft.reputation, owner, Math.round(gain / 2))
  }
  draft.quests = draft.quests.map((quest) =>
    quest.type === 'bringFood' && quest.targetLocationId === state.locationId
      ? { ...quest, progress: quest.progress + amount }
      : quest,
  )
  notice(draft, hungry ? 'Хлеб роздан. Здесь это запомнят.' : 'Хлеб оставлен в амбаре.')
  if (hungry) seeDeed(draft, 'feedHungry')
  advance(draft, hours(2))
  return close(draft)
}

// --- поручения --------------------------------------------------------------

/** Что стоит за приказом кругу: сильнейшее известное заклинание рода. */
function spellInBattle(
  state: GameState,
  family: 'fire' | 'curse' | 'ward',
): { readonly power: number; readonly label: string } | null {
  const spell = bestSpell(state.character, family)
  if (!spell) return null
  // Мастерство и вещи с чарами считаются здесь (этап 60, А5 и А6): круг бьёт
  // тем, что маг знает, — и тем сильнее, чем чаще он это делал.
  const power = battlePower(state.character, family) * spellPower(state, spell, dayOf(state.time))
  return { power, label: spell.label }
}

/**
 * Сотворить заклинание вне боя (этап 41).
 *
 * Заклинание — содержимое: команда читает, что оно делает и чего стоит, и
 * ветвится только по роду действия. Неудача стоит того же, что удача, —
 * усталость и время уходят, чуда нет. Это и есть цена: магия дорога, иначе она
 * съедает остальную игру.
 */
function cast(state: GameState, spellId: string): CommandResult {
  const spell = SPELLS_BY_ID[spellId]
  if (!spell) return fail('unknownAction', 'Такого заклинания нет.')
  if (spell.where === 'battle') return fail('invalid', 'Это творят в бою, по приказу кругу.')
  const magic = skillLevel(state.character, 'magic')
  if (magic < spell.requiredSkill) {
    return fail(
      'requirements',
      `«${spell.label}» даётся с навыка ${spell.requiredSkill}, у тебя ${magic}.`,
    )
  }
  const where = castingPlace(state)
  if (spell.where !== 'anywhere' && spell.where !== where) {
    return fail('unavailableHere', `«${spell.label}» здесь не творят: не то место.`)
  }
  const blocked = checkFatigue(state.character, spell.fatigue)
  if (blocked) return blocked

  const draft = open(state)
  advance(draft, spell.minutes)
  addFatigue(draft, spell.fatigue)
  practice(draft, 'magic', 6 + spell.requiredSkill / 4)
  const day = dayOf(draft.time)
  // Заклинание как ремесло (этап 60, А5): мастерство добавляет к удаче, но
  // ничего не открывает — открывает по-прежнему навык.
  const mastery = masteryOf(craftOf(state, spell.id), day)
  const luck = Math.min(0.97, castChance(magic, spell) + masteryLuck(mastery))
  const [done, afterRoll] = rollChance(draft.rng, luck)
  draft.rng = afterRoll
  // Засечка ставится и за неудачу: учит и она.
  draft.spellcraft = withUse(draft.spellcraft, spell.id, day)
  magicSeen(draft, spell)
  if (!done) {
    notice(draft, `«${spell.label}» не далось: сила ушла в песок.`)
    return close(draft)
  }
  applySpell(draft, spell)
  const grown = masteryOf(craftOf(draft, spell.id), day)
  if (grown > mastery) {
    notice(draft, `«${spell.label}» идёт ${masteryWord(grown)}: это уже твоё.`, 'people')
  }
  return close(draft)
}

/**
 * Цена магии (этап 60, А4).
 *
 * Чары творят не в пустоте. Деревня видит то, чего не понимает, и запоминает
 * это надолго; город видел всякое. Храм не любит чужой силы, а брат церковного
 * ордена отвечает перед своими за то, что делает своими руками.
 */
function magicSeen(draft: Draft, spell: SpellDef): void {
  const settlement = draft.settlements[draft.locationId]
  if (!settlement || settlement.population <= 0) return
  const chill = fearOf(settlement.population)
  draft.reputation = withPlaceRep(draft.reputation, draft.locationId, chill)
  const priest = priestAt(draft.base.world, draft.settlements, draft.locationId)
  if (priest) {
    draft.piety = Math.max(-100, Math.min(100, draft.piety + FEAR_PIETY))
  }
  const own = ownOrder(draft.base)
  if (own?.kind === 'church') {
    addStanding(draft, FEAR_STANDING, `${own.name}: колдовство своими руками.`)
  }
  if (chill <= -5) {
    notice(
      draft,
      `${draft.base.world.locations[draft.locationId]?.name ?? 'Место'} видело, что ты делал. Здесь это не забудут.`,
      'people',
    )
  }
  void spell
}

/**
 * Упражняться в чарах (этап 60, А5).
 *
 * В школе есть с кем повторять и кому смотреть на руки: четыре повторения за
 * шесть часов против одного в поле. Ступени это не открывает — только доводит
 * то, что уже знаешь.
 */
function honeSpell(state: GameState, spellId: string): CommandResult {
  const spell = SPELLS_BY_ID[spellId]
  if (!spell) return fail('unknownAction', 'Такого заклинания нет.')
  const magic = skillLevel(state.character, 'magic')
  if (magic < spell.requiredSkill) {
    return fail('requirements', `«${spell.label}» тебе пока не даётся вовсе.`)
  }
  if (!schoolAt(state.world, state.locationId)) {
    return fail('unavailableHere', 'Упражняются там, где есть школа: нужен тот, кто поправит.')
  }
  const blocked = checkFatigue(state.character, 25)
  if (blocked) return blocked

  const draft = open(state)
  const day = dayOf(draft.time)
  const before = masteryOf(craftOf(state, spell.id), day)
  advance(draft, hours(HONE_HOURS))
  addFatigue(draft, 25)
  practice(draft, 'magic', 8)
  draft.spellcraft = withUses(draft.spellcraft, spell.id, HONE_USES, day)
  const after = masteryOf(craftOf(draft, spell.id), day)
  notice(
    draft,
    after > before
      ? `«${spell.label}» идёт ${masteryWord(after)}: повторение взяло своё.`
      : `«${spell.label}» повторено ${HONE_USES} раза. Пока то же, но ближе.`,
  )
  return close(draft)
}

/** Где герой сейчас — для того, какие чары уместны. */
function castingPlace(state: GameState): SpellWhere {
  if (state.journey?.sea) return 'sea'
  if (state.journey) return 'road'
  const here = state.world.locations[state.locationId]
  if (here && isSite(here.archetype)) return 'site'
  return 'place'
}

function applySpell(draft: Draft, spell: SpellDef): void {
  const effect = spell.effect
  switch (effect.kind) {
    case 'heal': {
      const wound = draft.character.wound
      if (!wound) {
        notice(draft, `«${spell.label}»: лечить некого — ты цел.`)
        return
      }
      const left = wound.daysLeft - effect.days
      draft.character = {
        ...draft.character,
        wound: left > 0 ? { ...wound, daysLeft: left } : null,
      }
      notice(
        draft,
        left > 0
          ? `«${spell.label}»: рана затянется на ${effect.days} суток раньше.`
          : `«${spell.label}»: рана закрылась.`,
      )
      return
    }
    case 'calm': {
      const journey = draft.journey
      if (!journey) return
      // Снимает то, что прибавил шторм, но не короче самого пути.
      const hours = Math.max(journey.done + 1, journey.hours - effect.hours)
      draft.journey = { ...journey, hours, calm: true }
      notice(draft, `«${spell.label}»: волна легла, и шторм этот переход обойдёт.`)
      return
    }
    case 'wind': {
      const journey = draft.journey
      if (!journey) return
      const left = journey.hours - journey.done
      const hours = Math.max(journey.done + 1, Math.round(journey.hours - left * effect.share))
      draft.journey = { ...journey, hours }
      notice(draft, `«${spell.label}»: до берега на ${journey.hours - hours} ч ближе.`)
      return
    }
    case 'guard':
      draft.character = { ...draft.character, warded: draft.time + hours(effect.hours) }
      notice(draft, `«${spell.label}»: до утра тебя обойдут и засада, и мороз.`)
      return
    case 'light':
      draft.character = { ...draft.character, lit: draft.time + hours(effect.hours) }
      notice(draft, `«${spell.label}»: ночь над дорогой светла, как день.`)
      return
    case 'insight':
      draft.character = { ...draft.character, insight: true }
      notice(draft, `«${spell.label}»: видно, где лежит. Осталось взять.`)
      return
    case 'weather': {
      // Погода по зову (этап 60, А3): её зовут на место и на считанные сутки.
      const until = dayOf(draft.time) + effect.days
      draft.weather = [
        ...draft.weather.filter(
          (one) => !(one.locationId === draft.locationId && one.kind === effect.weather),
        ),
        { locationId: draft.locationId, kind: effect.weather, untilDay: until },
      ]
      const words = WEATHER_LABELS[effect.weather]
      notice(draft, `«${spell.label}»: ${words.label}. ${words.about}`, 'world')
      return
    }
    case 'mend': {
      const ship = draft.ship
      if (!ship) {
        notice(draft, `«${spell.label}»: чинить нечего — судна нет.`)
        return
      }
      draft.ship = {
        ...ship,
        condition: Math.min(1, Math.round((ship.condition + effect.condition) * 100) / 100),
      }
      notice(
        draft,
        `«${spell.label}»: «${ship.name}» держит воду. Целость ${Math.round((draft.ship.condition ?? 0) * 100)}%.`,
      )
      return
    }
    case 'bless': {
      const settlement = draft.settlements[draft.locationId]
      if (!settlement) return
      const grain = settlement.population * LIFE.foodPerPerson * effect.days
      draft.settlements = {
        ...draft.settlements,
        [draft.locationId]: {
          ...settlement,
          stock: { ...settlement.stock, grain: settlement.stock.grain + grain },
        },
      }
      draft.reputation = withPlaceRep(draft.reputation, draft.locationId, 1 + effect.days)
      notice(
        draft,
        `«${spell.label}»: хлеба в амбарах прибавилось на ${effect.days} ${effect.days === 1 ? 'день' : 'дня'}. Здесь это запомнят.`,
      )
      return
    }
    case 'cleanse':
      draft.cleansed = { locationId: draft.locationId, untilDay: dayOf(draft.time) + effect.days }
      notice(draft, `«${spell.label}»: мор здесь берёт вполовину на ${effect.days} суток.`)
      return
    default:
      return
  }
}

/**
 * Сдать товар к ярмарке.
 *
 * Поручение «к ярмарке» — единственное, у которого срок и есть условие: товар
 * нужен к торгу, а не вообще. Сдают его тому, кто просил, и в счёт идёт только
 * тот товар, что просили.
 */
function deliverGoods(state: GameState, good: GoodId, amount: number): CommandResult {
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  if (carried(state.character, good) < amount) {
    return fail('noGoods', `У тебя нет столько: ${GOODS[good].label.toLowerCase()}.`)
  }
  // Сдают и к ярмарке (этап 39), и по заказу купца (этап 49): дело одно —
  // привезённое перекладывают из своей поклажи в чужой амбар.
  const waiting = state.quests.filter(
    (quest) =>
      (quest.type === 'fairGoods' ||
        quest.type === 'merchantOrder' ||
        // Рынок гильдии открывают там, куда послали, а не там, где взяли дело
        // (этап 59, О1): товар надо продать в чужом месте.
        quest.type === 'orderMarket') &&
      (quest.type === 'orderMarket'
        ? quest.targetLocationId === state.locationId
        : quest.issuerLocationId === state.locationId) &&
      quest.good === good &&
      quest.progress < quest.amount,
  )
  if (waiting.length === 0) return fail('unavailableHere', 'Этого здесь никто не ждёт.')
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')

  const draft = open(state)
  addGoods(draft, good, -amount)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: {
      ...settlement,
      stock: { ...settlement.stock, [good]: settlement.stock[good] + amount },
    },
  }
  let left = amount
  draft.quests = draft.quests.map((quest) => {
    if (!waiting.some((one) => one.id === quest.id) || left <= 0) return quest
    const take = Math.min(left, quest.amount - quest.progress)
    left -= take
    return { ...quest, progress: quest.progress + take }
  })
  notice(draft, `Сдано: ${GOODS[good].label.toLowerCase()}, ${amount}.`)
  advance(draft, TRADE_MINUTES)
  return close(draft)
}

function takeQuest(state: GameState, questId: string): CommandResult {
  if (state.quests.some((quest) => quest.id === questId)) {
    return fail('invalid', 'Это уже на тебе.')
  }
  // Дела ордена дают в его доме и только своим (этап 59, О1) — их ищут там же,
  // где и рыночные поручения: для игрока это один список.
  const offer =
    offersAt(state).find((quest) => quest.id === questId) ??
    errandsAt(state).find((quest) => quest.id === questId)
  if (!offer) return fail('unknownAction', 'Такого здесь не просят.')
  // Чужой груз кладут в свой трюм: без судна фрахт не берут (этап 36).
  if (offer.type === 'freight' && !state.ship) {
    return fail('requirements', 'Груз возят своим судном, а его у тебя нет.')
  }

  const draft = open(state)
  notice(draft, `Взято: ${describeQuest(state, offer).toLowerCase()}.`)
  if (errandKindOf(offer.type)) notice(draft, 'Это дело братства. Спросят по уставу.')
  draft.quests = [...draft.quests, offer]
  advance(draft, 30)
  return close(draft)
}

function finishQuest(state: GameState, questId: string): CommandResult {
  const quest = state.quests.find((candidate) => candidate.id === questId)
  if (!quest) return fail('unknownAction', 'Ты такого не брал.')
  // За фрахт платят там, где груз ждут, а не там, где его взяли: судно идёт в
  // один конец, и возвращаться за деньгами было бы разорением.
  const payAt = quest.type === 'freight' ? quest.targetLocationId : quest.issuerLocationId
  if (state.locationId !== payAt) {
    return fail(
      'unavailableHere',
      quest.type === 'freight'
        ? 'Груз ждут в другой гавани.'
        : 'За наградой идут к тому, кто просил.',
    )
  }
  if (!isComplete(state, quest)) return fail('requirements', 'Дело ещё не сделано.')

  const draft = open(state)
  // Дело, взятое в месте ордена, — служба ордену: платят больше и помнят (этап 42).
  const order = ownOrderHere(state, quest.issuerLocationId)
  const reward = Math.round(quest.reward * (order?.perks.reward ?? 1))
  notice(draft, `Награда за дело: ${reward}.`)
  addMoney(draft, reward)
  if (order) addStanding(draft, 12, `${order.name}: службу заметили.`)
  // Купец помнит, кто привёз в срок: это и есть «рынок помнит тебя» (этап 49).
  if (quest.merchantId) {
    rememberDeal(draft, quest.merchantId, { standing: 12, deals: 1 })
    notice(draft, 'Заказ сдан в срок — такое на рынке помнят.')
  }
  draft.reputation = withPlaceRep(draft.reputation, quest.issuerLocationId, 10)
  const owner = state.settlements[quest.issuerLocationId]?.owner
  if (owner && !owner.startsWith('crown:') && owner !== PLAYER) {
    draft.reputation = withLordRep(draft.reputation, owner, 8)
    draft.lordDeeds = withLordDeed(draft.lordDeeds, owner, 'served')
  }
  draft.renown += 1
  draft.quests = draft.quests.filter((candidate) => candidate.id !== questId)
  advance(draft, 30)
  return close(draft)
}

function abandonQuest(state: GameState, questId: string): CommandResult {
  const quest = state.quests.find((candidate) => candidate.id === questId)
  if (!quest) return fail('unknownAction', 'Ты такого не брал.')
  const draft = open(state)
  notice(draft, 'Дело брошено. Об этом узнают.')
  seeDeed(draft, 'abandonQuest')
  shameOn(draft, 'broke')
  draft.reputation = withPlaceRep(draft.reputation, quest.issuerLocationId, -8)
  if (quest.merchantId) failedOrder(draft, quest.merchantId)
  draft.quests = draft.quests.filter((candidate) => candidate.id !== questId)
  return close(draft)
}

// --- своё имя на карте ------------------------------------------------------

/** Провозгласить своё владение: шестая сила на карте (DESIGN.md, п.9). */
function proclaimRealm(state: GameState, name: string): CommandResult {
  if (state.realm) return fail('invalid', 'Твоё имя уже на карте.')
  const holdings = holdingsOf(state.settlements, PLAYER)
  if (holdings.length < 2) {
    return fail('requirements', `Мало земли: нужно два владения, есть ${holdings.length}.`)
  }
  const title = name.trim() === '' ? 'Вольное владение' : name.trim()

  const draft = open(state)
  notice(draft, `Провозглашено: ${title}. Соседи это заметят.`)
  draft.realm = { name: title, sinceDay: dayOf(draft.time) }
  // Тот, чью землю ты держишь, воспримет это как мятеж.
  const former = state.service
  if (former) {
    draft.service = null
    draft.politics = {
      ...draft.politics,
      wars: [
        ...draft.politics.wars,
        { a: former, b: PLAYER, since: dayOf(state.time), reason: 'самозванство и захват земель' },
      ],
    }
    notice(draft, 'Прежний сюзерен объявил тебя мятежником.')
  }
  advance(draft, hours(4))
  return close(draft)
}

/**
 * Что вассалы думают о поступках сюзерена.
 *
 * Не устав и не нрав — просто здравый смысл человека, чья земля рядом:
 * тому, кто жжёт города, не хочется служить, тому, кто щадит и платит, — легче.
 */
const VASSALS_FEEL: Readonly<Partial<Record<DeedId, number>>> = {
  sack: -5,
  raid: -3,
  sparePrisoners: 2,
  winBattle: 2,
  feedHungry: 1,
  starve: -3,
}

/** Доля подати, которую вассал отдаёт с пожалованной земли. */
export const VASSAL_SHARE = 0.3

/** Сдвинуть верность своих лордов: всех или одного. */
function shiftVassals(draft: Draft, delta: number, only: string | null): void {
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((lord) =>
      lord.kingdomId === PLAYER && (only === null || lord.id === only)
        ? { ...lord, loyalty: Math.max(0, Math.min(100, lord.loyalty + delta)) }
        : lord,
    ),
  }
}

/**
 * Пожаловать лен (этап 43).
 *
 * Своё место — своему лорду: земля переходит к нему, он платит с неё долю и
 * верит тебе крепче. Отдать можно только своё и только тому, кто под твоей
 * рукой: чужому лорду не жалуют, чужую землю не раздают.
 */
function grantFief(state: GameState, lordId: string, locationId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Жалуют от имени: у тебя нет своего.')
  const lord = lordById(state.politics, lordId)
  if (!lord || lord.kingdomId !== PLAYER) return fail('invalid', 'Он не под твоей рукой.')
  const settlement = state.settlements[locationId]
  if (!settlement || settlement.owner !== PLAYER) return fail('notYours', 'Это не твоя земля.')
  const draft = open(state)
  draft.settlements = {
    ...draft.settlements,
    [locationId]: { ...settlement, owner: lordId },
  }
  shiftVassals(draft, 20, lordId)
  advance(draft, hours(3))
  const name = state.world.locations[locationId]?.name ?? 'земля'
  notice(draft, `${name} пожалована: ${lord.title} ${lord.name} держит её от тебя.`, 'world')
  return close(draft)
}

/**
 * Отнять лен.
 *
 * Земля возвращается, лорд помнит, остальные — смотрят: отнятое у одного
 * пугает всех. Это и есть цена, без которой раздача земли была бы бесплатной.
 */
function revokeFief(state: GameState, locationId: string): CommandResult {
  const settlement = state.settlements[locationId]
  const holder = settlement ? lordById(state.politics, settlement.owner ?? '') : null
  if (!settlement || !holder || holder.kingdomId !== PLAYER) {
    return fail('invalid', 'Эту землю не твой вассал держит.')
  }
  const draft = open(state)
  draft.settlements = {
    ...draft.settlements,
    [locationId]: { ...settlement, owner: PLAYER },
  }
  shiftVassals(draft, -5, null)
  shiftVassals(draft, -25, holder.id)
  // Отнятое помнит он сам, и помнит дольше, чем дают (этап 66, Л4).
  draft.lordDeeds = withLordDeed(draft.lordDeeds, holder.id, 'robbed')
  advance(draft, hours(3))
  const name = state.world.locations[locationId]?.name ?? 'земля'
  const left = fiefsOf(draft.settlements, holder.id).length
  if (left === 0) {
    // Лорд без земли — не лорд: присяга кончается вместе с леном, и он уходит
    // со двора человеком без держания (этап 74, В6).
    draft.politics = {
      ...draft.politics,
      lords: draft.politics.lords.filter((one) => one.id !== holder.id),
    }
    const oaths = { ...draft.oaths }
    delete oaths[holder.id]
    draft.oaths = oaths
    notice(
      draft,
      `${name} отнята. ${holder.title} ${holder.name} остался без земли и ушёл со двора.`,
      'world',
    )
    return close(draft)
  }
  notice(
    draft,
    `${name} отнята у ${holder.title.toLowerCase()} ${holder.name}. Остальные это заметили.`,
    'world',
  )
  return close(draft)
}

/**
 * Рассудить дело (этап 43).
 *
 * Дело выводится из земли и дня (`courtCase`); здесь — только последствия.
 * Выбор всегда кому-то стоит: земле, лорду или казне.
 */
function judge(state: GameState, caseId: string, choice: CourtChoice): CommandResult {
  const current = courtCase(state)
  if (!current || current.id !== caseId) return fail('invalid', 'Такого дела на суде нет.')
  if (!current.choices.some((one) => one.id === choice)) {
    return fail('invalid', 'Так это дело не решают.')
  }
  const here = state.settlements[state.locationId]
  if (!here || here.owner !== PLAYER) {
    return fail('unavailableHere', 'Двор держат на своей земле.')
  }
  const draft = open(state)
  draft.courtDay = dayOf(draft.time)
  advance(draft, hours(4))
  const [first, second] = current.lords
  switch (choice) {
    case 'first':
    case 'second': {
      const won = choice === 'first' ? first : second
      const lost = choice === 'first' ? second : first
      if (won) {
        shiftVassals(draft, 12, won.id)
        draft.lordDeeds = withLordDeed(draft.lordDeeds, won.id, 'gifted')
      }
      if (lost) {
        shiftVassals(draft, -10, lost.id)
        // Проигравший помнит не число, а то, что его не услышали (этап 76, З2).
        draft.lordDeeds = withLordDeed(draft.lordDeeds, lost.id, 'refused')
      }
      notice(
        draft,
        `Межа отдана: ${won?.title ?? ''} ${won?.name ?? ''}. ${lost?.name ?? ''} ушёл молча.`,
        'world',
      )
      break
    }
    case 'split':
      if (first) shiftVassals(draft, -3, first.id)
      if (second) shiftVassals(draft, -3, second.id)
      notice(draft, 'Пустошь поделена пополам. Довольных нет, врагов тоже.', 'world')
      break
    case 'ransom': {
      // Откуп (этап 76, З2): платит тот, у кого больше людей, — ему и межа.
      const richer = first && second ? (first.strength >= second.strength ? first : second) : first
      const poorer = richer === first ? second : first
      const price = Math.round((richer?.strength ?? 10) * 6)
      addMoney(draft, price)
      if (richer) {
        shiftVassals(draft, 4, richer.id)
        draft.lordDeeds = withLordDeed(draft.lordDeeds, richer.id, 'gifted')
      }
      if (poorer) {
        shiftVassals(draft, -16, poorer.id)
        draft.lordDeeds = withLordDeed(draft.lordDeeds, poorer.id, 'robbed')
      }
      // Так судят не только те, кто платил: об этом узнают все.
      shiftVassals(draft, -4, null)
      notice(
        draft,
        `Межа отдана тому, кто заплатил: ${price} в казну. ${poorer?.name ?? 'Второй'} ушёл, не поклонившись.`,
        'world',
      )
      break
    }
    case 'peasants':
      if (first) {
        shiftVassals(draft, -12, first.id)
        draft.lordDeeds = withLordDeed(draft.lordDeeds, first.id, 'refused')
      }
      if (current.locationId)
        draft.reputation = withPlaceRep(draft.reputation, current.locationId, 12)
      notice(draft, 'Ты взял сторону крестьян. Лорд поклонился и запомнил.', 'world')
      break
    case 'lord':
      if (first) shiftVassals(draft, 8, first.id)
      if (current.locationId)
        draft.reputation = withPlaceRep(draft.reputation, current.locationId, -8)
      notice(draft, 'Ты оставил суд лорду. Крестьяне разошлись без слов.', 'world')
      break
    case 'grant': {
      const held = current.locationId ? draft.settlements[current.locationId] : undefined
      const lost = held ? Math.round(dailyTax(held, foodSecurity(held)) * 30) : 0
      addMoney(draft, -lost)
      if (current.locationId)
        draft.reputation = withPlaceRep(draft.reputation, current.locationId, 10)
      notice(draft, `Подати прощены на месяц: казна недосчитается ${lost}.`, 'world')
      break
    }
    case 'refuse':
      if (current.locationId)
        draft.reputation = withPlaceRep(draft.reputation, current.locationId, -6)
      notice(draft, 'Подати взяты в срок. Старшины ушли, не поклонившись.', 'world')
      break
    default:
      break
  }
  return close(draft)
}

/** Принять лорда под свою руку: уходят к тому, кому верят больше, чем короне. */
function inviteLord(state: GameState, lordId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Под чью руку? У тебя нет своего имени.')
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lord.kingdomId === PLAYER) return fail('invalid', 'Он и так твой.')
  if (lord.loyalty > 35) return fail('requirements', 'Он слишком верен своей короне.')
  if (lordRep(state.reputation, lordId) < 30) {
    return fail('requirements', 'Он тебя недостаточно знает, чтобы идти под твою руку.')
  }

  const draft = open(state)
  notice(draft, `${lord.title} ${lord.name} пошёл под твою руку.`)
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((candidate) =>
      candidate.id === lordId ? { ...candidate, kingdomId: PLAYER, loyalty: 55 } : candidate,
    ),
  }
  // Перешедший со своей землёй присягает по обычаю: землю ему не жаловали, и
  // условий он не ставил (этап 74, В2).
  const day = dayOf(state.time)
  draft.oaths = {
    ...draft.oaths,
    [lordId]: {
      gives: 'both',
      share: VASSAL_SHARE,
      justice: true,
      levy: 0.3,
      sinceDay: day,
    },
  }
  advance(draft, hours(3))
  return close(draft)
}

/**
 * Присяга (этап 74, В1 и В2).
 *
 * Лен даётся не даром и не всякому: вассал смотрит на тебя, на себя и на землю
 * и ставит свои условия. Отказ — тоже ответ, и он объясним словами; после
 * отказа человек помнит, что его звали и он сказал «нет».
 */
function swearOath(state: GameState, lordId: string, locationId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Присягают имени: у тебя его ещё нет.')
  // Своего человека сперва поднимают в лорды: спутник, севший на землю,
  // перестаёт быть спутником (этап 74, В1).
  const companion = state.companions.find((one) => one.id === lordId)
  if (companion) return raiseCompanion(state, companion, locationId)
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lord.kingdomId === PLAYER) return fail('invalid', 'Он и так под твоей рукой.')
  if (!swearCandidates(state).some((one) => one.id === lordId)) {
    return fail('requirements', 'Ему есть кому служить: своей короне он верен.')
  }
  const settlement = state.settlements[locationId]
  if (!settlement || !grantable(state, locationId)) {
    return fail('notYours', 'Жалуют своё и живое: это место не подходит.')
  }
  if (state.locationId !== locationId) {
    return fail('unavailableHere', 'Землю жалуют, стоя на ней.')
  }

  const day = dayOf(state.time)
  const offer = oathFor(state, lord, locationId, day)
  const draft = open(state)
  advance(draft, hours(3))
  notice(draft, `${lord.title} ${lord.name}: «${offer.asks}»`, 'people')
  if (!offer.accepts) {
    notice(draft, `${lord.name}: «${offer.says}»`, 'people')
    // Отказавший помнит, что его звали: во второй раз он говорит то же самое,
    // пока не изменится то, из-за чего он отказал.
    draft.lordDeeds = withLordDeed(draft.lordDeeds, lord.id, 'refused')
    return close(draft)
  }

  const fiefs = fiefsOf(draft.settlements, lord.id).length + 1
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((one) =>
      one.id === lordId
        ? { ...one, kingdomId: PLAYER, loyalty: 55, title: titleForFiefs(fiefs) }
        : one,
    ),
  }
  draft.settlements = {
    ...draft.settlements,
    [locationId]: { ...settlement, owner: lordId },
  }
  draft.oaths = { ...draft.oaths, [lordId]: offer.terms }
  draft.lordDeeds = withLordDeed(draft.lordDeeds, lord.id, 'gifted')
  const where = state.world.locations[locationId]?.name ?? 'земля'
  notice(
    draft,
    `${lord.name}: «${offer.says}» ${where} за ним; по присяге — ${oathWords(offer.terms, lord)}.`,
    'world',
  )
  draft.renown += 1
  return close(draft)
}

/**
 * Поднять своего в лорды (этап 74, В1).
 *
 * Первый вассал у начинающего государя — не перебежчик с чужой земли, а тот,
 * кто с ним ходил. Спутник с земли уходит из отряда: держать лен и идти за
 * тобой по дорогам — разные жизни.
 */
function raiseCompanion(state: GameState, companion: Companion, locationId: string): CommandResult {
  if (companion.captive) return fail('invalid', 'Он в плену: ему не до земли.')
  if (companion.mood < RAISE_MOOD) {
    return fail('requirements', `${companion.name} тебе не настолько верит, чтобы сесть на землю.`)
  }
  const settlement = state.settlements[locationId]
  if (!settlement || !grantable(state, locationId)) {
    return fail('notYours', 'Жалуют своё и живое: это место не подходит.')
  }
  if (state.locationId !== locationId) {
    return fail('unavailableHere', 'Землю жалуют, стоя на ней.')
  }

  const draft = open(state)
  const day = dayOf(draft.time)
  const index = draft.politics.lords.filter((one) => one.kingdomId === PLAYER).length + 1
  const lord = lordFromCompanion(companion, settlement, index, day)
  draft.politics = { ...draft.politics, lords: [...draft.politics.lords, lord] }
  draft.settlements = {
    ...draft.settlements,
    [locationId]: { ...settlement, owner: lord.id },
  }
  // Условия свои он ставит по тому нраву, который у него теперь есть.
  const offer = oathFor({ ...draft.base, politics: draft.politics }, lord, locationId, day)
  draft.oaths = { ...draft.oaths, [lord.id]: offer.terms }
  draft.companions = draft.companions.filter((one) => one.id !== companion.id)
  advance(draft, hours(4))
  const where = state.world.locations[locationId]?.name ?? 'земля'
  notice(
    draft,
    `${companion.name} сел на землю: ${lord.title} ${lord.name}, ${where}. По присяге — ${oathWords(offer.terms, lord)}.`,
    'world',
  )
  draft.renown += 1
  return close(draft)
}

/**
 * Созвать вассалов (этап 74, В3).
 *
 * Присяга становится видимой только здесь: одни приводят людей, другие
 * присылают извинения. Кто придёт — известно заранее (`serviceOf`), и в этом
 * весь смысл: верность копится годами, а нужна в один день.
 */
function summonVassals(state: GameState): CommandResult {
  const vassals = vassalsOf(state)
  if (vassals.length === 0) return fail('requirements', 'Звать некого: под твоей рукой никого.')
  const draft = open(state)
  // Люди идут не мгновенно: сбор — это двое суток дороги для всех разом.
  advance(draft, hours(48))
  const day = dayOf(draft.time)
  let came = 0
  let units = draft.party.units
  const oaths: Record<string, Oath> = { ...draft.oaths }
  for (const lord of vassals) {
    const oath = oathOf(draft, lord.id)
    const men = serviceOf(lord, oath)
    if (!answersCall(lord, oath)) {
      notice(
        draft,
        oath?.gives === 'tax'
          ? `${lord.title} ${lord.name} платит подать, а не кровь: людей не прислал.`
          : `${lord.title} ${lord.name} на зов не вышел.`,
        'war',
      )
      if (oath && oath.gives !== 'tax') shiftVassals(draft, -3, lord.id)
      continue
    }
    // Маршал собирает людей лучше, чем ты сам (этап 75, Д1).
    const brought = Math.round(men * musterBonus(draft.base, day))
    came += brought
    // Ведёт он своих: две трети ополчения, треть — люди при оружии.
    const militia = Math.max(1, Math.round(brought * 0.66))
    const armed = Math.max(0, brought - militia)
    units = {
      ...units,
      militia: (units.militia ?? 0) + militia,
      ...(armed > 0 ? { manAtArms: (units.manAtArms ?? 0) + armed } : {}),
    }
    if (oath) oaths[lord.id] = { ...oath, calledDay: day }
    notice(draft, `${lord.title} ${lord.name} привёл ${brought} человек.`, 'war')
    // Собранные люди — не даровые: двор пустеет, и это помнят.
    shiftVassals(draft, -2, lord.id)
  }
  draft.oaths = oaths
  draft.party = { ...draft.party, units }
  if (came === 0)
    notice(draft, 'Никто не пришёл. Это и есть цена присяги, которой не верят.', 'war')
  else notice(draft, `Собрано по присяге: ${came} человек.`, 'war')
  return close(draft)
}

/**
 * Послать посольство (этап 79, П1–П3, П5).
 *
 * Свой ход в дипломатии: человека снаряжают, посылают и ждут. Ответ придёт не
 * сегодня и не от тебя: пока посол в дороге, чужая корона живёт своей жизнью, и
 * к его приезду её замысел может стать другим.
 */
function sendEnvoy(
  state: GameState,
  to: string,
  errand: EmbassyErrand,
  envoyId?: string,
  byLetter?: boolean,
  paper?: { readonly secret?: SecretId; readonly guarantor?: string },
): CommandResult {
  const possible = embassyPossible(state, to, errand)
  if (!possible.can) return fail('requirements', possible.why)
  // С того, за кого ручаешься, дани не просят (этап 137, Га3).
  if ((errand === 'tribute' || errand === 'threat') && tiedTo(state, PLAYER, to)) {
    return fail('requirements', TIED_DEFS.tribute.says)
  }
  const letter = byLetter === true
  const day = dayOf(state.time)
  const envoy = letter
    ? null
    : (envoyChoices(state, day).find((one) => one.id === envoyId) ??
      envoyChoices(state, day)[0] ??
      null)
  if (!letter && !envoy) return fail('requirements', 'Послать некого: нужен свой человек.')
  // Свидетель берёт своё вперёд: без его доли он и не поедет (этап 80, Г4).
  const fee = paper?.guarantor ? guarantorFee({ kind: 'alliance' }) : 0
  // Непризнанному дороже всё, что делается через чужие руки (этап 138, Пр4), а
  // первому — ещё дороже (этап 139, Це1).
  const dearer = strangerCost(state, state.world, day)
  const first = firstPays(state, state.world, day)
  const cost = Math.round((embassyCost(errand, letter) + fee) * dearer.times * first.times)
  if (state.character.money < cost) {
    return fail('noMoney', `На дары, дорогу${fee > 0 ? ' и свидетеля' : ''} нужно ${cost}.`)
  }
  if (paper?.guarantor && !state.world.kingdoms[paper.guarantor]) {
    return fail('invalid', 'Такой короны в свидетели не позовёшь.')
  }

  const draft = open(state)
  addMoney(draft, -cost)
  const days = embassyDays(letter)
  const embassy: Embassy = {
    id: `embassy:${to}:${day}`,
    to,
    errand,
    envoyId: envoy?.id ?? null,
    envoyName: envoy?.name ?? 'письмо',
    byLetter: letter,
    sentDay: day,
    backDay: day + days,
    ...(paper?.secret ? { secret: paper.secret } : {}),
    ...(paper?.guarantor ? { guarantor: paper.guarantor } : {}),
  }
  draft.embassies = [...embassiesOf(draft), embassy]
  advance(draft, hours(3))
  const name = kingdomName(state, to)
  notice(
    draft,
    letter
      ? `Письмо в ${name}: ${embassyDef(errand).label}. Ответа ждать ${days} суток.`
      : `${envoy?.name} поехал в ${name}: ${embassyDef(errand).label}. Вернётся через ${days} суток.`,
    'world',
  )
  return close(draft)
}

/**
 * Венчаться на царство (этап 78, Т4).
 *
 * Обряд не делает королём — королём делает земля (`titleOf`). Смысл венчания в
 * другом: кто приехал. Приехавшие признают тебя навсегда, а не приехавшие —
 * тоже ответ, и его слышат все.
 */
function crownSelf(state: GameState): CommandResult {
  // Тихий не коронуется: в том и тишина (этап 139, Це3).
  if (goingQuiet(state)) {
    return fail('requirements', `${PRIMACY_WORDS.quiet} Венчание на царство — дело громкое.`)
  }
  if (!state.realm) return fail('requirements', 'Венчают державу, а не человека.')
  const day = dayOf(state.time)
  const plan = coronationPlan(state, day)
  if (!plan.can) return fail('requirements', plan.why)

  const draft = open(state)
  addMoney(draft, -plan.cost)
  draft.crowned = {
    day,
    titleId: titleOf(state),
    guests: plan.guests,
    absent: plan.absent,
  }
  // Те, кто приехал, теплеют: они видели обряд своими глазами.
  for (const one of recognisedBy(state, day)) {
    if (one.standing === 'pretender') continue
    draft.politics = withRelation(draft.politics, PLAYER, one.kingdomId, 8)
  }
  draft.renown += 5
  seeDeed(draft, 'takeFief')
  advance(draft, hours(24 * CORONATION.days))
  const missed = plan.absent.length > 0 ? ` Не приехали: ${plan.absent.join(', ')}.` : ''
  notice(
    draft,
    `Венчание: ${styleOf(state)}. Приехали — ${plan.guests.join(', ') || 'никто'}.${missed}`,
    'world',
  )
  return close(draft)
}

/**
 * Заявить право на чужую землю (этап 78, Т5).
 *
 * Право берётся не из желания: это провинция, где ты и правда держишь землю
 * рядом с чужой. Заявленное право живёт в состоянии и становится поводом к
 * войне (этап 65) — тем самым, который признают и соседи.
 */
function pressClaim(state: GameState, provinceId: string, against: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Право заявляет держава, а не человек.')
  const claim = claimable(state).find(
    (one) => one.provinceId === provinceId && one.against === against,
  )
  if (!claim) return fail('invalid', 'На эту землю тебе не на что сослаться.')
  const day = dayOf(state.time)
  const draft = open(state)
  draft.claims = [...claimsOf(draft), { ...claim, sinceDay: day }]
  // Тот, на чью землю заявлено право, это слышит.
  draft.politics = withRelation(draft.politics, PLAYER, against, -12)
  advance(draft, hours(4))
  const province = state.world.provinces[provinceId]?.name ?? 'земля'
  const name = state.world.kingdoms[against]?.name ?? against
  notice(draft, `Право на ${province} заявлено вслух. ${name} это услышал.`, 'world')
  return close(draft)
}

/**
 * Занять (этап 77, К4).
 *
 * Дают не всякому и не сколько попросишь: купеческий дом смотрит на имя, храм —
 * на благочестие, гильдия — на то, знают ли тебя вообще. Потолок считается от
 * годового прихода державы, а не из воздуха: занимают под землю, а не под
 * обещание.
 */
function borrow(state: GameState, lender: LenderId, amount: number): CommandResult {
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  const def = lenderDef(lender)
  if (!lends(state, lender)) return fail('shunned', `${def.label}: «${def.refuses}»`)
  const day = dayOf(state.time)
  const limit = creditLimit(state, state.world, lender, day)
  if (amount > limit) {
    return fail('requirements', `${def.label} даст не больше ${limit}: считают по твоей земле.`)
  }
  const draft = open(state)
  addMoney(draft, amount)
  const current = debtTo(draft, lender)
  draft.debts = [
    ...debtsOf(draft).filter((one) => one.lender !== lender),
    {
      lender,
      owed: (current?.owed ?? 0) + amount,
      sinceDay: current?.sinceDay ?? day,
      paidDay: day,
    },
  ]
  advance(draft, hours(2))
  notice(draft, `${def.label}: «${def.gives}» Взято ${amount}.`, 'money')
  return close(draft)
}

/** Отдать долг: хоть сколько-нибудь, лишь бы не молчать. */
function repay(state: GameState, lender: LenderId, amount: number): CommandResult {
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  const debt = debtTo(state, lender)
  if (!debt) return fail('invalid', 'Этому ты ничего не должен.')
  if (state.character.money < amount) return fail('noMoney', 'Столько у тебя нет.')
  const paid = Math.min(amount, Math.ceil(debt.owed))
  const draft = open(state)
  addMoney(draft, -paid)
  const day = dayOf(draft.time)
  const left = Math.max(0, debt.owed - paid)
  draft.debts =
    left <= 0.5
      ? debtsOf(draft).filter((one) => one.lender !== lender)
      : debtsOf(draft).map((one) =>
          one.lender === lender ? { ...one, owed: left, paidDay: day } : one,
        )
  advance(draft, hours(1))
  notice(
    draft,
    left <= 0.5
      ? `${lenderDef(lender).label}: долг закрыт.`
      : `${lenderDef(lender).label}: отдано ${paid}, осталось ${Math.round(left)}.`,
    'money',
  )
  return close(draft)
}

/**
 * Поставить людей под ружьё (этап 77, К3).
 *
 * Три способа и три разные цены за одну и ту же тысячу: ополчение берут даром и
 * платят за это памятью мест, набор берут за серебро, дружину — за серебро и за
 * жалованье навсегда. Люди встают в гарнизон того места, где их взяли.
 */
function raiseMen(state: GameState, locationId: string, way: RaiseWay, men: number): CommandResult {
  if (!Number.isInteger(men) || men <= 0) return fail('invalid', 'Сколько именно?')
  const settlement = state.settlements[locationId]
  if (!settlement || settlement.owner !== PLAYER) return fail('notYours', 'Это не твоя земля.')
  const def = raiseDef(way)
  const possible = canRaise(state, settlement, way, state.character.money)
  if (possible <= 0) {
    return fail(
      way === 'levy' ? 'requirements' : 'noMoney',
      way === 'levy' ? 'Брать некого: людей в месте не осталось.' : 'На это нет денег.',
    )
  }
  const taken = Math.min(men, possible)
  const cost = raiseCost(way, taken)
  if (state.character.money < cost) return fail('noMoney', `Нужно ${cost}.`)
  const limit = garrisonLimit(state.world, settlement)
  if (garrisonSize(settlement) + taken > limit) {
    return fail('requirements', `В гарнизон здесь больше ${limit} не поместится.`)
  }

  const draft = open(state)
  if (cost > 0) addMoney(draft, -cost)
  const troop: TroopId = way === 'levy' ? 'militia' : way === 'hire' ? 'spearman' : 'manAtArms'
  draft.settlements = {
    ...draft.settlements,
    [locationId]: {
      ...settlement,
      recruits: way === 'levy' ? Math.max(0, settlement.recruits - taken) : settlement.recruits,
      garrison: {
        ...settlement.garrison,
        [troop]: (settlement.garrison[troop] ?? 0) + taken,
      },
    },
  }
  if (def.mood !== 0) {
    draft.reputation = withPlaceRep(draft.reputation, locationId, def.mood * taken)
  }
  advance(draft, hours(6))
  const name = state.world.locations[locationId]?.name ?? 'место'
  notice(
    draft,
    `${name}: ${def.label} — ${taken} человек${cost > 0 ? `, ${cost} из казны` : ' и ни монеты'}.`,
    'war',
  )
  return close(draft)
}

/**
 * Поставить стройку в очередь державы (этап 77, К5).
 *
 * Строит не место, а держава: очередь идёт по порядку, платит казна, и пока
 * денег нет, стройка ждёт. Обоз и надзор стоят сверх цены самой постройки.
 */
function queueWork(state: GameState, locationId: string, building: BuildingId): CommandResult {
  const settlement = state.settlements[locationId]
  if (!settlement || settlement.owner !== PLAYER) return fail('notYours', 'Это не твоя земля.')
  if (settlement.buildings.includes(building)) return fail('invalid', 'Это здесь уже стоит.')
  if (queueOf(state).some((one) => one.locationId === locationId && one.building === building)) {
    return fail('invalid', 'Это уже в очереди.')
  }
  if (freeSlots(state.world, settlement) <= 0) {
    return fail('requirements', 'Здесь больше строить негде.')
  }
  const draft = open(state)
  draft.queue = [...queueOf(draft), { locationId, building, paid: 0 }]
  advance(draft, hours(1))
  const name = state.world.locations[locationId]?.name ?? 'место'
  notice(
    draft,
    `В очередь: ${BUILDINGS[building].label.toLowerCase()} в ${name} — ${worksPrice(building)} серебром.`,
    'world',
  )
  return close(draft)
}

/**
 * Дать городу вольность (этап 76, З4).
 *
 * Город платит разом и дальше живёт по договору: судит сам, держит свою стражу
 * и отдаёт тебе меньше половины прежнего. Это не милость и не потеря — это
 * обмен: деньги и спокойствие сейчас против подати потом.
 */
function grantCharter(state: GameState, locationId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Вольности даёт держава, а не человек.')
  const day = dayOf(state.time)
  const offer = libertyOffers(state, day).find((one) => one.locationId === locationId)
  if (!offer) return fail('invalid', 'Этот город вольности не просит.')
  const draft = open(state)
  addMoney(draft, offer.price)
  draft.charters = {
    ...draft.charters,
    [locationId]: { kind: 'liberty', sinceDay: day, paid: offer.price },
  }
  draft.reputation = withPlaceRep(draft.reputation, locationId, 20)
  // Знать вольностей не любит: город, который судит сам, — это суд, отнятый у
  // них (этап 75, Д4 — партии это чувствуют).
  shiftVassals(draft, -4, null)
  advance(draft, hours(4))
  const name = state.world.locations[locationId]?.name ?? 'город'
  notice(draft, `${name} получил вольность: ${offer.price} в казну, и дальше по договору.`, 'world')
  return close(draft)
}

/**
 * Ответить недоимщику (этап 76, З3).
 *
 * Три ответа с разной ценой: взять силой — вернуть всё и остаться в памяти
 * надолго; договориться — половина и послабление на полгода; простить — ничего
 * и самое доброе имя. Числа маленькие, а помнят их дольше самих чисел.
 */
function answerArrears(state: GameState, locationId: string, answer: ArrearsAnswer): CommandResult {
  const day = dayOf(state.time)
  const debt = debtors(state, day).find((one) => one.locationId === locationId)
  if (!debt) return fail('invalid', 'За этим местом недоимки нет.')
  const settlement = state.settlements[locationId]
  if (!settlement) return fail('invalid', 'Такого места нет.')
  const def = arrearsDef(answer)

  const draft = open(state)
  const taken = Math.round(debt.owed * def.takes)
  if (taken > 0) addMoney(draft, taken)
  draft.reputation = withPlaceRep(draft.reputation, locationId, def.mood)
  draft.settlements = {
    ...draft.settlements,
    [locationId]: {
      ...settlement,
      banditry: Math.max(0, Math.min(1, settlement.banditry + def.banditry)),
    },
  }
  // Недоимку считают от того, когда место в последний раз видели: ответ — это и
  // есть тот самый счёт (этап 61, В5).
  draft.visits = { ...draft.visits, [locationId]: day }
  if (answer === 'deal') {
    draft.charters = {
      ...draft.charters,
      [locationId]: { kind: 'relief', sinceDay: day, untilDay: day + RELIEF_DAYS, paid: 0 },
    }
  }
  advance(draft, hours(6))
  const name = state.world.locations[locationId]?.name ?? 'место'
  notice(
    draft,
    answer === 'force'
      ? `${name}: недоимка взята силой — ${taken}. Это запомнят.`
      : answer === 'deal'
        ? `${name}: взято ${taken}, подать снижена на полгода.`
        : `${name}: недоимка прощена. Об этом будут говорить.`,
    'money',
  )
  return close(draft)
}

/**
 * Назначить на должность (этап 75, Д1 и Д2).
 *
 * Должность — работа, а не титул: её дают тому, кто по ней что-то умеет.
 * Негодного назначить можно — он будет есть жалованье и молчать на совете, и
 * это тоже решение.
 */
function appoint(state: GameState, officeId: OfficeId, holderId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Двор держат при имени: у тебя его нет.')
  const def = officeDef(officeId)
  const candidate = candidatesFor(state, officeId).find((one) => one.id === holderId)
  if (!candidate) return fail('invalid', 'Такого человека к должности не приставишь.')
  const draft = open(state)
  const seat: Appointment = {
    holderId: candidate.id,
    kind: candidate.kind,
    sinceDay: dayOf(draft.time),
  }
  draft.offices = { ...draft.offices, [officeId]: seat }
  advance(draft, hours(2))
  notice(
    draft,
    candidate.skill >= 3
      ? `${candidate.name} — твой ${def.label}. ${def.does}.`
      : `${candidate.name} — твой ${def.label}. В деле он не силён, но должность занята.`,
    'world',
  )
  return close(draft)
}

/** Отставить: жалованье остаётся в казне, дело остаётся без хозяина. */
function dismissOfficer(state: GameState, officeId: OfficeId): CommandResult {
  const seat = state.offices?.[officeId]
  if (!seat) return fail('invalid', 'Должность и так пуста.')
  const officer = officerAt(state, officeId)
  const draft = open(state)
  const offices = { ...draft.offices }
  delete offices[officeId]
  draft.offices = offices
  advance(draft, hours(1))
  notice(draft, `${officer?.name ?? 'Человек'} больше не ${officeDef(officeId).label}.`, 'world')
  // Отставленный вассал помнит это как обиду: должность при дворе — тоже милость.
  if (seat.kind === 'vassal') {
    draft.lordDeeds = withLordDeed(draft.lordDeeds, seat.holderId, 'refused')
    shiftVassals(draft, -6, seat.holderId)
  }
  return close(draft)
}

/**
 * Послать своего с поручением (этап 75, Д5).
 *
 * Пока он в отъезде, его должность пуста: сенешаль, выбивающий недоимки, не
 * смотрит за управляющими. В этом и выбор — не в том, послать или нет, а в том,
 * чем на это время пожертвовать.
 */
function sendOfficer(
  state: GameState,
  officeId: OfficeId,
  errandId: OfficeErrandId,
): CommandResult {
  const officer = officerAt(state, officeId)
  if (!officer) return fail('requirements', 'Эту должность никто не держит.')
  const day = dayOf(state.time)
  if (isAway(officer, day)) return fail('invalid', `${officer.name} уже в отъезде.`)
  const errand = errandsFor(officeId).find((one) => one.id === errandId)
  if (!errand) return fail('invalid', 'Такое поручение не по его части.')
  if (state.character.money < ERRAND_COST) {
    return fail('noMoney', `На дорогу и снаряжение нужно ${ERRAND_COST}.`)
  }
  const seat = state.offices?.[officeId]
  if (!seat) return fail('invalid', 'Эту должность никто не держит.')

  const draft = open(state)
  addMoney(draft, -ERRAND_COST)
  draft.offices = {
    ...draft.offices,
    [officeId]: { ...seat, errand: { id: errandId, untilDay: day + errand.days } },
  }
  advance(draft, hours(2))
  notice(
    draft,
    `${officer.name} уехал: ${errand.label.toLowerCase()}. Вернётся через ${errand.days} суток.`,
    'world',
  )
  return close(draft)
}

/** Не пускают ли тебя на порог: разорённые города помнят. */
function checkWelcome(state: GameState): CommandResult | null {
  // Вражда ордена с короной холодит приём на её земле (этап 42): свой орден
  // здесь — чужак, и это вычитается из того, что о тебе помнят.
  return isShunned(
    placeRep(state.reputation, state.locationId) + feudChill(state, state.locationId),
  )
    ? fail('shunned', 'Тебя тут помнят и не ждут.')
    : null
}

function takeService(state: GameState, kingdomId: string): CommandResult {
  const kingdom = state.world.kingdoms[kingdomId]
  if (!kingdom) return fail('unknownAction', 'Такого королевства нет.')
  if (state.service === kingdomId) return fail('invalid', 'Ты уже на этой службе.')
  const here = kingdomOf(state.world, state.locationId)
  if (here?.id !== kingdomId) {
    return fail('unavailableHere', 'На службу нанимают на своей земле, а не по слухам.')
  }
  // Корона не берёт на службу людей ордена, с которым в ссоре (этап 42).
  const own = ownOrder(state)
  if (own?.feud.kingdoms.includes(kingdomId)) {
    return fail('shunned', `${kingdom.name} не берёт на службу людей ордена «${own.name}».`)
  }

  const draft = open(state)
  notice(draft, `Служба принята: ${kingdom.name}.`)
  advance(draft, hours(2))
  draft.service = kingdomId
  return close(draft)
}

function leaveService(state: GameState): CommandResult {
  if (!state.service) return fail('invalid', 'Ты никому не служишь.')
  const draft = open(state)
  notice(draft, 'Служба оставлена.')
  draft.service = null
  return close(draft)
}

/** Выйти на врага: имеет смысл только на службе и только пока идёт война. */
function seekEnemy(state: GameState): CommandResult {
  if (!state.service) return fail('invalid', 'Воевать не за кого: ты никому не служишь.')
  if (warsOf(state.politics, state.service).length === 0) {
    return fail('unavailableHere', 'Сейчас твоё королевство ни с кем не воюет.')
  }
  if (partySize(state.party) < 3) return fail('invalid', 'С такими силами на войну не ходят.')

  const here = state.world.locations[state.locationId]
  const draft = open(state)
  const [enemy, afterEnemy] = warband(partyStrength(state.party) / 24, draft.rng)
  draft.rng = afterEnemy
  const war = warsOf(state.politics, state.service)[0]
  const foe = war ? (war.a === state.service ? war.b : war.a) : null
  draft.battle = startBattle(draft.party, enemy, here?.terrain ?? 'plains', {
    foeId: foe ? (state.world.kingdoms[foe] ? `crown:${foe}` : foe) : null,
    ground: groundFor(here?.terrain ?? 'plains', 'road'),
    veterans: veteransOf(draft.party),
  })
  notice(draft, 'Впереди чужие знамёна.')
  advance(draft, hours(4))
  addFatigue(draft, 10)
  return close(draft)
}

/**
 * Напасть на чужую дружину.
 *
 * До этого война шла мимо игрока: лорды воевали где-то, а он мог только
 * услышать об этом в журнале. Войско, стоящее в том же месте, — это то, во что
 * можно вмешаться: разбить осаждающих, перехватить идущих грабить, вступиться
 * за своего сюзерена. Бой идёт обычным порядком, как со всяким противником.
 */
function attackBand(state: GameState, bandId: string): CommandResult {
  if (state.battle) return fail('invalid', 'Сначала кончи бой, который идёт.')
  const band = state.bands.find((candidate) => candidate.id === bandId)
  if (!band) return fail('invalid', 'Этого войска здесь уже нет.')
  // В пути перехватывают тех, кто на том же отрезке: стоит на его конце или
  // идёт по нему навстречу. Это и есть перехват — встретить до того, как дошли.
  const onLeg = state.journey
    ? bandsOnLeg(state.bands, state.journey.fromId, state.journey.toId).some(
        (one) => one.id === bandId,
      )
    : false
  if (!onLeg && (band.locationId !== state.locationId || band.travel)) {
    return fail('unavailableHere', 'Это войско не здесь.')
  }
  if (partySize(state.party) < 2) {
    return fail('invalid', 'В одиночку на войско не ходят.')
  }
  const size = bandSize(band)
  if (size <= 0) return fail('invalid', 'Воевать там уже не с кем.')

  const here = state.world.locations[state.locationId]
  const lord = lordById(state.politics, band.lordId)
  const name = lord ? `${lord.title} ${lord.name}` : 'Королевская рать'
  const draft = open(state)
  // Разбитое войско снимается с карты сразу: исход боя решит, что с ним стало,
  // но стоять рядом целым, пока его бьют, оно не может.
  draft.bands = draft.bands.filter((candidate) => candidate.id !== bandId)

  // Оборона своих стен: войско стоит под твоим местом — гарнизон и ополчение
  // встают в строй рядом с отрядом, камень помогает тебе.
  const settlement = state.settlements[state.locationId]
  const defending =
    settlement &&
    isOwnedByPlayer(settlement) &&
    band.goal.type === 'siege' &&
    band.goal.targetId === state.locationId
  let stake: Battle['stake'] = null
  let ownWalls = 1
  if (defending) {
    const levy = Math.floor(settlement.population / 260)
    let party = draft.party
    for (const [troop, count] of Object.entries(settlement.garrison)) {
      if (count) party = withUnits(party, troop as TroopId, count)
    }
    if (levy > 0) party = withUnits(party, 'militia', levy)
    draft.party = party
    draft.settlements = {
      ...draft.settlements,
      [state.locationId]: { ...settlement, garrison: {} },
    }
    stake = { type: 'defense', locationId: state.locationId, garrison: settlement.garrison, levy }
    ownWalls = wallsFor(settlement)
  }

  const enemy: BattleSide = { name, units: band.units, morale: band.morale, fatigue: 0 }
  const softened = allyStrikesFirst(draft, enemy, state.locationId, 1, ownWalls)
  if (!softened) {
    notice(draft, `${name} разбит союзниками: тебе досталось только поле.`, 'war')
    if (stake) restoreGarrison(draft, stake)
    advance(draft, hours(2))
    return close(draft)
  }
  // Войско, о котором не знали, застаёт врасплох — и это считается духом (этап 109, Т4).
  const surprise = surpriseOf(state, state.world, PLAYER, band, dayOf(state.time))
  if (surprise.surprised) {
    // Стойкость держит строй: внезапность бьёт слабее (этап 122, А2).
    const hit = Math.round(surprise.moraleHit * steadyUnder(state.character))
    draft.party = { ...draft.party, morale: Math.max(0, draft.party.morale - hit) }
    notice(draft, `${name}: ${surprise.says} Дух −${hit}.`, 'war')
  }
  draft.battle = startBattle(draft.party, softened, here?.terrain ?? 'plains', {
    ...(stake ? { stake } : {}),
    ownWalls,
    foeId: band.lordId,
    ground: defending ? 'walls' : groundFor(here?.terrain ?? 'plains', 'road'),
    veterans: veteransOf(draft.party),
  })
  notice(draft, defending ? `${name} идёт на приступ. Ты на стенах.` : `${name} принимает бой.`)
  advance(draft, hours(2))
  addFatigue(draft, 8)
  return close(draft)
}

function wallsFor(settlement: Settlement): number {
  return hasBuilding(settlement, 'walls') ? 2.1 : 1.35
}

/** Своё ли это войско: своей короны, союзной или своего владения. */
function friendlyBand(state: GameState, band: Band): boolean {
  if (band.kingdomId === PLAYER) return true
  if (!band.kingdomId || !state.service) return false
  return band.kingdomId === state.service || allied(state.politics, state.service, band.kingdomId)
}

/**
 * Союзники бьют первыми.
 *
 * Своё войско, стоящее там же, не смотрит со стороны: оно сходится с врагом
 * до тебя, теми же правилами боя, что и дружины между собой. Тебе достаётся
 * то, что осталось; если не осталось ничего — пусто, и боя нет.
 */
function allyStrikesFirst(
  draft: Draft,
  enemy: BattleSide,
  locationId: string,
  enemyWalls: number,
  ownWalls: number,
): BattleSide | null {
  const ally = draft.bands.find(
    (band) =>
      band.locationId === locationId &&
      !band.travel &&
      bandSize(band) > 0 &&
      friendlyBand(draft.base, band),
  )
  if (!ally) return enemy
  const terrain = draft.base.world.locations[locationId]?.terrain ?? 'plains'
  const foe: Band = {
    ...ally,
    id: 'foe',
    lordId: 'foe',
    units: enemy.units,
    morale: enemy.morale,
  }
  // Кто за стенами, того стены и берегут: при обороне враг штурмует союзника.
  const behindWalls = ownWalls > 1
  const fight = behindWalls
    ? clash(foe, ally, terrain, ownWalls, draft.rng)
    : clash(ally, foe, terrain, enemyWalls, draft.rng)
  draft.rng = fight.rng
  const allyUnits = behindWalls ? fight.defender : fight.attacker
  const enemyUnits = behindWalls ? fight.attacker : fight.defender
  const allyWon = behindWalls ? !fight.attackerWon : fight.attackerWon

  draft.bands = draft.bands
    .map((band) => (band.id === ally.id ? { ...band, units: allyUnits } : band))
    .filter((band) => bandSize(band) > 0)
  const lord = lordById(draft.base.politics, ally.lordId)
  const allyName = lord ? `${lord.title} ${lord.name}` : 'Союзное войско'
  notice(draft, `${allyName} ударил первым: пало ${fight.fallen}.`, 'war')
  if (unitsSize(enemyUnits) === 0) return null
  return {
    ...enemy,
    units: enemyUnits,
    morale: Math.max(ROUT_MORALE + 5, enemy.morale - (allyWon ? 15 : 0)),
  }
}

// --- спутники ---------------------------------------------------------------

/** Кого можно встретить в этом месте: тех, кого ты ещё не звал. */
/**
 * Спутник растёт (этап 54, С5).
 *
 * Умение приходит с делами: после боя и после долгой дороги у спутника
 * прибавляется дел, а с ними — то, чем он и без того силён. Иногда остаётся
 * шрам: память о бое, в котором он выжил.
 */
function seasonCompanions(draft: Draft, hard: boolean): void {
  draft.companions = draft.companions.map((one) => {
    if (one.captive || one.role.type !== 'party') return one
    const deeds = (one.deeds ?? 0) + 1
    // Растёт то, чем он и без того силён: умение приходит от дела, а не от книг.
    const [best] = Object.entries(one.skills).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    const skills = best
      ? {
          ...one.skills,
          [best[0] as SkillId]: Math.round(((best[1] ?? 0) + DEED_SKILL) * 10) / 10,
        }
      : one.skills
    const scarred = hard && !one.scar && deeds % 7 === 0
    return {
      ...one,
      deeds,
      skills,
      ...(scarred ? { scar: 'шрам через бровь' } : {}),
    }
  })
}

/** Погибшего помнят: имя, день и место остаются в состоянии (этап 54, С4). */
function rememberFallen(draft: Draft, companion: Companion): void {
  draft.fallen = [
    ...draft.fallen,
    {
      id: companion.id,
      name: companion.name,
      day: dayOf(draft.time),
      locationId: draft.locationId,
    },
  ]
  notice(draft, `${companion.name} остался в поле. Отряд молчит.`)
}

export function companionsAt(
  state: GameState,
  locationId = state.locationId,
): readonly CompanionDef[] {
  const location = state.world.locations[locationId]
  if (!location) return []
  const population = state.settlements[locationId]?.population ?? location.population
  const taken = new Set(state.companions.map((one) => one.id))
  const kingdom = kingdomOf(state.world, locationId)?.id ?? null
  // Павшего не встретишь: он остался в поле (этап 54). Ушедший — встретишь, и
  // он будет не тот, что уходил.
  const dead = new Set(state.fallen?.map((one) => one.id) ?? [])
  return Object.values(COMPANIONS).filter(
    (def) =>
      !taken.has(def.id) &&
      !dead.has(def.id) &&
      isAvailableAt(def.where, location, population) &&
      (!def.kingdomId || def.kingdomId === kingdom),
  )
}

/**
 * Поступок на виду у спутников: нрав считает, реплики — говорят.
 *
 * До этого нрав только лежал в данных: `witness` никто не звал, и спутники
 * терпели всё. Теперь каждый заметный поступок проходит через них: кто-то
 * скажет слово, кто-то уйдёт — и об этом будет строка в летописи.
 */
function seeDeed(draft: Draft, deed: DeedId): void {
  // Карта памяти (этап 69, И5): место, где ты сделал что-то заметное,
  // перестаёт быть точкой на дороге.
  draft.marks = withMark(draft.marks, draft.locationId)
  // Пять слав вместо одной (этап 68, Ф3): круги считают то же дело по-своему.
  draft.fame = withDeed(draft.fame, deed)
  // И позор перекрывается делом того же круга, а не деньгами (Ф6).
  const covering = coverShames(draft.shames, deed)
  if (covering.covered.length > 0) {
    draft.shames = covering.shames
    for (const id of covering.covered) {
      notice(draft, `«${shameDef(id).label}» тебе больше не вспоминают.`, 'people')
    }
  } else if (covering.shames !== draft.shames) {
    draft.shames = covering.shames
  }
  // И церковь смотрит (этап 51): разорение и брошенное слово — грех, накормить
  // голодного и пощадить пленных — нет. Вера здесь счёт, а не украшение.
  const sin = PIETY_DEEDS[deed] ?? 0
  if (sin !== 0) draft.piety = Math.max(-100, Math.min(100, draft.piety + sin))
  // Свои лорды тоже смотрят (этап 43): разорение — не то, чему хотят служить.
  const felt = VASSALS_FEEL[deed] ?? 0
  if (felt !== 0 && vassalsOf(draft.base).length > 0) shiftVassals(draft, felt, null)
  // Орден судит по уставу (этап 42): тем же языком поступков, что и спутники.
  const own = ownOrder(draft.base)
  if (own && charterFeels(own, deed) !== 0) {
    addStanding(draft, charterFeels(own, deed), `${own.name}: ${DEED_LABELS[deed]}.`)
  }
  // Свой устав судит так же, как чужие (этап 59, О6). Идущее с ним приводит
  // братьев, идущее против — распускает их: устав, который пишешь сам, тем и
  // неудобен, что нарушаешь его тоже сам.
  const hood = draft.brotherhood
  if (hood) {
    const feels = ownCharterFeels(hood, deed)
    if (feels !== 0) {
      const brothers = Math.max(0, hood.brothers + (feels > 0 ? 1 : -1))
      draft.brotherhood = { ...hood, brothers }
      notice(
        draft,
        feels > 0
          ? `${hood.name}: такое по уставу. Братьев стало ${brothers}.`
          : `${hood.name}: такое не по уставу. Братьев осталось ${brothers}.`,
        'people',
      )
    }
  }
  const present = following(draft.companions)
  if (present.length === 0) return
  const result = witness(draft.companions, deed)
  draft.companions = result.companions
  // Говорит тот, кого поступок задел сильнее всего.
  let speaker: Companion | null = null
  let strongest = 0
  for (const companion of present) {
    const shift = Math.abs(TEMPERS[companion.temper]?.feels[deed] ?? 0)
    if (shift > strongest) {
      strongest = shift
      speaker = companion
    }
  }
  if (speaker) {
    const lines = TEMPER_LINES[speaker.temper].onDeed[deed] ?? []
    const line = pickLine(draft, lines)
    if (line) notice(draft, `${speaker.name}: «${line}»`, 'people')
  }
  for (const gone of result.left) {
    notice(draft, `${gone.name} уходит: «${TEMPER_LINES[gone.temper].leaving}»`, 'people')
  }
}

/** В дороге спутники иногда говорят — не каждый переход, чтобы не надоесть. */
function roadTalk(draft: Draft): void {
  const present = following(draft.companions)
  if (present.length === 0) return
  const [talks, afterTalk] = rollChance(draft.rng, 0.12)
  draft.rng = afterTalk
  if (!talks) return
  const [index, afterPick] = nextInt(draft.rng, 0, present.length - 1)
  draft.rng = afterPick
  const who = present[index]
  if (!who) return
  const line = pickLine(draft, TEMPER_LINES[who.temper].onRoad)
  if (line) notice(draft, `${who.name}: «${line}»`, 'people')
}

/** В бою между раундами: реплика ложится в рассказ боя. */
function battleTalk(draft: Draft, battle: Battle): Battle {
  const present = following(draft.companions)
  if (present.length === 0 || battle.outcome !== 'ongoing') return battle
  const [talks, afterTalk] = rollChance(draft.rng, 0.2)
  draft.rng = afterTalk
  if (!talks) return battle
  const [index, afterPick] = nextInt(draft.rng, 0, present.length - 1)
  draft.rng = afterPick
  const who = present[index]
  if (!who) return battle
  const line = pickLine(draft, TEMPER_LINES[who.temper].inBattle)
  if (!line) return battle
  return { ...battle, log: [...battle.log, `${who.name.split(' ')[0]}: «${line}»`] }
}

function pickLine(draft: Draft, lines: readonly string[]): string | null {
  if (lines.length === 0) return null
  const [index, next] = nextInt(draft.rng, 0, lines.length - 1)
  draft.rng = next
  return lines[index] ?? null
}

/** Выкуп пленного спутника: сто монет и сутки — и он снова с тобой. */
function ransomCompanion(state: GameState, companionId: string): CommandResult {
  const companion = state.companions.find((one) => one.id === companionId)
  if (!companion) return fail('invalid', 'Такого спутника у тебя нет.')
  if (!companion.captive) return fail('invalid', `${companion.name} не в плену.`)
  if (state.character.money < COMPANION_RANSOM) {
    return fail('noMoney', `За него просят ${COMPANION_RANSOM}, а у тебя ${state.character.money}.`)
  }
  const draft = open(state)
  addMoney(draft, -COMPANION_RANSOM)
  draft.companions = draft.companions.map((one) =>
    one.id === companionId ? { ...one, captive: false, mood: Math.min(100, one.mood + 10) } : one,
  )
  notice(draft, `${companion.name} выкуплен за ${COMPANION_RANSOM} и снова с тобой.`, 'people')
  advance(draft, hours(6))
  return close(draft)
}

export const COMPANION_RANSOM = 100

// --- глушь ------------------------------------------------------------------

/** Сколько часов занимает ночёвка под открытым небом. */
export const CAMP_HOURS = 8

/**
 * Лагерь.
 *
 * Сутки вне поселения были невозможны: спать можно было только там, где есть
 * крыша, поэтому дорога длиннее одного дня не существовала. Лагерь — это
 * ночёвка на земле: отдыхаешь хуже, чем в доме, и не знаешь, кто выйдет к огню.
 */
function camp(state: GameState, manner: CampManner = 'sleep'): CommandResult {
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  // В пути крыши нет по определению: заночевать можно прямо на дороге, и это
  // то решение, которого у мгновенного перемещения быть не могло.
  if (!state.journey && state.settlements[state.locationId]) {
    return fail('unavailableHere', 'Здесь есть крыша: лагерем встают там, где её нет.')
  }
  // В море костра не разводят: палуба — не обочина.
  if (state.journey?.sea) {
    return fail('unavailableHere', 'Ты в море. Тут не встают лагерем — тут стоят вахту.')
  }

  const draft = open(state)
  // Зимняя ночёвка — другое дело (этап 38): под открытым небом в мороз не
  // отдыхают, а пережидают. Выживание здесь не украшение: оно решает, встанешь
  // ты утром отдохнувшим или отмороженным.
  const winter = seasonOf(dayOf(state.time)) === 'winter'
  // Ночь в поле не одинакова (этап 63, Ш3): можно свалиться и спать, можно
  // выставить дозор, можно сидеть у огня и говорить. У каждого своя цена.
  const how = CAMP_MANNER_DEFS[manner]
  notice(
    draft,
    winter
      ? `Ночёвка в мороз: костёр, лапник и ${how.label}.`
      : state.journey
        ? `Ночёвка у дороги: ${how.label}.`
        : `Костёр, котелок и ${how.label}.`,
  )
  advance(draft, hours(CAMP_HOURS))
  // Под небом отдыхают хуже, чем под крышей: три четверти от сна в доме. В
  // мороз — вдвое хуже того.
  addFatigue(
    draft,
    -Math.round(SLEEP_RECOVERY_PER_HOUR * CAMP_HOURS * (winter ? 0.4 : 0.75) * how.rest),
  )
  practice(draft, 'survival', winter ? 30 : 18)
  if (winter) frostbite(draft)
  if (manner === 'talk') {
    // Разговоры у огня: те, каких днём не бывает. Отряд идёт дружнее, спутники
    // говорят о своём.
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + FIRE_MORALE) }
    draft.companions = draft.companions.map((one) =>
      one.captive ? one : { ...one, mood: Math.min(100, one.mood + FIRE_BOND) },
    )
    notice(draft, how.about, 'people')
    campfireTalk(draft)
  }
  // Ночь в глуши — это ещё и ночь в глуши. В пути опасность берётся у той
  // земли, к которой идёшь: она и лежит вокруг костра. Дозор эту опасность
  // вчетверо уменьшает — за то и не спят.
  if (how.risk >= 1) {
    ambush(draft, state.journey ? state.journey.toId : state.locationId)
  } else {
    const [unlucky, afterRoll] = rollChance(draft.rng, how.risk)
    draft.rng = afterRoll
    if (unlucky) ambush(draft, state.journey ? state.journey.toId : state.locationId)
    else if (manner === 'watch') notice(draft, 'Ночь прошла тихо: к огню никто не подошёл.')
  }
  return close(draft)
}

/**
 * Годовщины (этап 67, Я5).
 *
 * Год со свадьбы, год со смерти, день рождения. Не прибавка к числу, а повод:
 * спутники об этом узнают, и день выходит не такой, как другие.
 */
function markAnniversaries(draft: Draft): void {
  const day = dayOf(draft.time)
  for (const one of anniversariesOf(draft.base, day)) {
    notice(draft, `${one.label}, ${one.years}-я: «${one.says}»`, 'people')
    if (one.id === 'birthday') {
      draft.companions = draft.companions.map((candidate) =>
        candidate.captive ? candidate : { ...candidate, mood: Math.min(100, candidate.mood + 2) },
      )
    }
    if (one.id === 'mourning') {
      draft.piety = Math.max(-100, Math.min(100, draft.piety + 2))
    }
  }
}

/** Кто-то говорит у костра: тот из спутников, кому есть что сказать. */
function campfireTalk(draft: Draft): void {
  const present = following(draft.companions)
  if (present.length === 0) return
  const [pick, afterPick] = nextInt(draft.rng, 0, present.length - 1)
  draft.rng = afterPick
  const who = present[pick]
  if (!who) return
  // У костра говорят то же, что в дороге: свои слова на каждый нрав уже есть
  // (этап 54), и ночь у огня — самое их место.
  const lines = TEMPER_LINES[who.temper].onRoad
  const line = pickLine(draft, lines)
  if (line) notice(draft, `${who.name}: «${line}»`, 'people')
}

/**
 * Охота (этап 63, Ш2).
 *
 * Лес, степь и горы кормят по-разному, и зима кормит хуже лета. Дело со
 * временем, добычей и риском: зверь, который кормит, бывает и тем, кто калечит.
 */
function hunt(state: GameState): CommandResult {
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  if (state.settlements[state.locationId] && !state.journey) {
    return fail('unavailableHere', 'В селе не охотятся: тут всё уже съедено.')
  }
  const day = dayOf(state.time)
  const game = gameHere(state.world, state.locationId, day)
  if (game <= 0) return fail('unavailableHere', 'Здесь не на кого охотиться.')
  const blocked = checkFatigue(state.character, HUNT_FATIGUE)
  if (blocked) return blocked

  const draft = open(state)
  const survival = skillLevel(state.character, 'survival')
  advance(draft, hours(HUNT_HOURS))
  addFatigue(draft, HUNT_FATIGUE)
  practice(draft, 'survival', 16)
  practice(draft, 'archery', 8)
  const [lucky, afterRoll] = rollChance(draft.rng, huntChance(game, survival))
  draft.rng = afterRoll
  if (!lucky) {
    notice(draft, 'Полдня по следу — и ничего. Так бывает чаще, чем в песнях.')
    return close(draft)
  }
  const spoils = huntSpoils(draft.base.world, state.locationId)
  const [pick, afterPick] = nextInt(draft.rng, 0, Math.max(0, spoils.length - 1))
  draft.rng = afterPick
  const good = spoils[pick] ?? 'fish'
  const amount = huntYield(game, survival)
  addGoods(draft, good, amount)
  notice(draft, `Добыто: ${GOODS[good].label.toLowerCase()} — ${amount}.`, 'money')
  // Зверь бывает и тем, кто отвечает.
  const [hurt, afterHurt] = rollChance(draft.rng, huntHurtChance(survival))
  draft.rng = afterHurt
  if (hurt) {
    patch(draft, { wound: { daysLeft: 3, severity: 0.2 } })
    notice(draft, 'Зверь достал раньше, чем ты его. Три дня будешь помнить.', 'war')
  }
  return close(draft)
}

/**
 * Вывести логово (этап 63, Ш1 и Ш4).
 *
 * В глуши кто-то живёт и считает эту землю своей. Выведенное логово стоит
 * пустым полтора года — а потом там снова кто-то есть.
 */
function clearLair(state: GameState): CommandResult {
  const day = dayOf(state.time)
  if (denizenOf(state.world, state, state.locationId, day) !== 'lair') {
    return fail('unavailableHere', 'Логова здесь нет.')
  }
  if (partySize(state.party) < 2 && skillLevel(state.character, 'heavyWeapons') < 8) {
    return fail('requirements', 'В логово в одиночку не лезут.')
  }

  const draft = open(state)
  advance(draft, hours(3))
  addFatigue(draft, 14)
  const strength = lairStrength(draft.base.world, state.locationId)
  const [band, afterBand] = banditBand(1, strength * 30, draft.rng)
  draft.rng = afterBand
  draft.battle = startBattle(
    draft.party,
    { ...band, name: 'Логово' },
    draft.base.world.locations[state.locationId]?.terrain ?? 'forest',
    {
      foeId: 'bandits',
      ground: groundFor(draft.base.world.locations[state.locationId]?.terrain ?? 'forest', 'road'),
      veterans: veteransOf(draft.party),
    },
  )
  draft.wilds = {
    ...draft.wilds,
    [state.locationId]: { ...wildAt(draft, state.locationId), clearedDay: day },
  }
  notice(draft, 'Из темноты вышли те, кто здесь живёт.', 'war')
  return close(draft)
}

/**
 * Обобрать схрон (этап 63, Ш1 и Ш4).
 *
 * Разбойничья доля, спрятанная не по-крестьянски. Взятый схрон пуст почти год —
 * а потом его наполняют заново: те, кто прятал, никуда не делись.
 */
function lootCache(state: GameState): CommandResult {
  const day = dayOf(state.time)
  if (denizenOf(state.world, state, state.locationId, day) !== 'cache') {
    return fail('unavailableHere', 'Схрона здесь нет.')
  }
  const blocked = checkFatigue(state.character, 10)
  if (blocked) return blocked

  const draft = open(state)
  advance(draft, hours(2))
  addFatigue(draft, 10)
  practice(draft, 'sleight', 12)
  const [money, afterMoney] = nextInt(draft.rng, CACHE_MONEY[0], CACHE_MONEY[1])
  draft.rng = afterMoney
  addMoney(draft, money)
  const [pick, afterPick] = nextInt(draft.rng, 0, CACHE_GOODS.length - 1)
  draft.rng = afterPick
  const good = CACHE_GOODS[pick] ?? 'cloth'
  const [amount, afterAmount] = nextInt(draft.rng, 2, 8)
  draft.rng = afterAmount
  addGoods(draft, good, amount)
  draft.wilds = {
    ...draft.wilds,
    [state.locationId]: { ...wildAt(draft, state.locationId), lootedDay: day },
  }
  notice(
    draft,
    `В схроне: ${money} монет и ${GOODS[good].label.toLowerCase()} — ${amount}. Хозяева хватятся.`,
    'money',
  )
  return close(draft)
}

/**
 * Дойти до отшельника (этап 63, Ш1).
 *
 * Дым без деревни значит, что кто-то живёт один — и знает эту землю лучше всех.
 * Он даёт то, что у него есть: травы, знание, тропу или слово. Второй раз его
 * здесь не найти: он уходит дальше в глушь.
 */
function visitHermit(state: GameState): CommandResult {
  const day = dayOf(state.time)
  if (denizenOf(state.world, state, state.locationId, day) !== 'hermit') {
    return fail('unavailableHere', 'Здесь никто не живёт.')
  }

  const draft = open(state)
  const hermit = hermitOf(state.locationId, day)
  const gift = hermitGiftDef(hermit.gift)
  advance(draft, hours(3))
  notice(draft, `${hermit.name}: «${gift.says}»`, 'people')
  if (hermit.gift === 'healing') {
    const wound = draft.character.wound
    if (wound) {
      const left = wound.daysLeft - 4
      patch(draft, { wound: left > 0 ? { ...wound, daysLeft: left } : null })
      notice(draft, 'Он перевязал по-своему, и стало легче.')
    }
    addGoods(draft, 'herbs', 4)
    notice(draft, 'На дорогу дал трав.')
  } else if (hermit.gift === 'lore') {
    practice(draft, 'scholarship', 40)
    practice(draft, 'survival', 25)
    notice(draft, 'Он говорил до темноты. Половину ты понял.')
  } else if (hermit.gift === 'road') {
    // Тропа: он показывает округу — то, чего не видно с дороги.
    see(draft, state.locationId)
    if (draft.knowledge) {
      const province = draft.base.world.locations[state.locationId]?.provinceId
      if (province) draft.knowledge = reveal(draft.knowledge, [province])
    }
    notice(draft, 'Он начертил на земле то, чего нет на картах.', 'world')
  } else {
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 10) }
    draft.piety = Math.max(-100, Math.min(100, draft.piety + 4))
    notice(draft, 'Слово его простое, а идти после него легче.')
  }
  draft.wilds = {
    ...draft.wilds,
    [state.locationId]: { ...wildAt(draft, state.locationId), metDay: day },
  }
  return close(draft)
}

/**
 * Читать следы (этап 63, Ш5).
 *
 * По дороге видно, кто прошёл. Следы не выдумываются: их оставляют те, кто и
 * правда ходил рядом, — потому по ним и можно судить, куда не ходить.
 */
function readTracks(state: GameState): CommandResult {
  const survival = skillLevel(state.character, 'survival')
  if (survival < TRACK_SKILL) {
    return fail('requirements', `Следы читают с выживания ${TRACK_SKILL}, у тебя ${survival}.`)
  }
  const where = state.journey ? state.journey.toId : state.locationId
  if (state.settlements[where] && !state.journey) {
    return fail('unavailableHere', 'На улице следов не читают: тут ходят все.')
  }

  const draft = open(state)
  advance(draft, hours(TRACK_HOURS))
  addFatigue(draft, 6)
  practice(draft, 'survival', 14)
  const kind = tracksAt(draft.base.world, draft.bands, draft.base, where, dayOf(state.time))
  const def = TRACK_DEFS[kind]
  notice(draft, `Следы: ${def.label}. ${def.about}`, 'world')
  if (kind === 'host') {
    // Кто прошёл — видно и на карте: дружина рядом больше не сюрприз.
    for (const band of draft.bands) {
      const at = draft.base.world.locations[band.locationId]
      const here = draft.base.world.locations[where]
      if (!at || !here) continue
      if (Math.hypot(at.x - here.x, at.y - here.y) > 90) continue
      const lord = lordById(draft.politics, band.lordId)
      notice(
        draft,
        `Прошли: ${lord ? `${lord.title} ${lord.name}` : 'чья-то дружина'}, ${bandSize(band)} человек.`,
        'war',
      )
      break
    }
  }
  return close(draft)
}

/**
 * Осмотреться.
 *
 * Место без жителей не пустое: в кургане лежит то, ради чего его насыпали, у
 * брода стоит непривезённый тюк, в отвале — недобранная жила. Находка одна на
 * место за всю игру, иначе курган становится станком для денег.
 */
function search(state: GameState): CommandResult {
  const here = state.world.locations[state.locationId]
  if (!here || !isSite(here.archetype)) {
    return fail('unavailableHere', 'Искать имеет смысл там, где не живут люди.')
  }
  const find = SITES[here.archetype].find
  if (!find) return fail('unavailableHere', 'Здесь нечего искать.')
  if (state.searchedSites.includes(state.locationId)) {
    return fail('invalid', 'Здесь уже всё осмотрено.')
  }
  const blocked = checkFatigue(state.character, 16)
  if (blocked) return blocked

  const draft = open(state)
  draft.searchedSites = [...draft.searchedSites, state.locationId]
  advance(draft, hours(3))
  addFatigue(draft, 16)
  practice(draft, 'survival', 14)

  // Ищут выживанием либо ловкостью рук: следопыт и вор находят разное, но оба
  // находят. Ниже нужной ступени находят только следы чужой удачи.
  const skill = Math.max(
    skillLevel(state.character, 'survival'),
    skillLevel(state.character, 'sleight'),
  )
  const odds = Math.max(0.05, Math.min(0.92, 0.25 + (skill - find.need) * 0.09))
  // Зрение (этап 41): кто видел сквозь насыпь, тот не ищет вслепую.
  const insight = state.character.insight === true
  const [found, afterRoll] = insight ? [true, draft.rng] : rollChance(draft.rng, odds)
  draft.rng = afterRoll
  if (insight) draft.character = { ...draft.character, insight: false }
  if (!found) {
    notice(draft, 'Обошёл кругом, обстучал, обшарил. Ничего.')
    return close(draft)
  }

  notice(draft, find.text, 'money')
  if (find.money) {
    const [low, high] = find.money
    const [amount, afterAmount] = nextInt(draft.rng, low, high)
    draft.rng = afterAmount
    addMoney(draft, amount)
    notice(draft, `Взято: ${amount} монет.`, 'money')
  }
  if (find.good && find.amount) {
    const [low, high] = find.amount
    const [amount, afterAmount] = nextInt(draft.rng, low, high)
    draft.rng = afterAmount
    addGoods(draft, find.good, amount)
    notice(draft, `Взято: ${GOODS[find.good].label.toLowerCase()} — ${amount}.`, 'money')
  }
  if (find.grim) {
    // Могилу разрыли, приношение унесли. Округа этого не забудет.
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, -12)
    seeDeed(draft, 'sack')
  }
  // Вещь с чарами (этап 60, А6): её находит тот, кто знает, на что смотреть.
  // Без магии в глуши лежит просто старое железо.
  const magic = skillLevel(state.character, 'magic')
  if (magic >= 15) {
    const [lucky, afterLucky] = rollChance(draft.rng, FIND_CHANCE)
    draft.rng = afterLucky
    if (lucky) {
      const reachable = ARTIFACTS.filter((one) => one.needsMagic <= magic + 10)
      const [pick, afterPick] = nextInt(draft.rng, 0, Math.max(0, reachable.length - 1))
      draft.rng = afterPick
      const def = reachable[pick]
      if (def) {
        draft.artifacts = [
          ...draft.artifacts,
          {
            id: `${def.id}:${dayOf(draft.time)}`,
            defId: def.id,
            found: 'wild',
            day: dayOf(draft.time),
          },
        ]
        notice(draft, `Среди прочего — ${def.label.toLowerCase()}. ${def.about}`, 'world')
      }
    }
  }
  return close(draft)
}

/**
 * Сделать вещь с чарами (этап 60, А6).
 *
 * В школе есть тигли, книги и тот, кто скажет, где ты ошибся. Работа долгая и
 * дорогая: артефакт — не покупка, а месяц труда.
 */
function makeArtifact(state: GameState, defId: string): CommandResult {
  const def = ARTIFACTS_BY_ID[defId]
  if (!def) return fail('unknownAction', 'Такой вещи не делают.')
  if (!schoolAt(state.world, state.locationId)) {
    return fail('unavailableHere', 'Такое делают в школе: нужны тигли и тот, кто поправит.')
  }
  const magic = skillLevel(state.character, 'magic')
  if (magic < def.needsMagic) {
    return fail('requirements', `За такое берутся с навыка ${def.needsMagic}, у тебя ${magic}.`)
  }
  if (state.character.money < def.price) {
    return fail('noMoney', `Работа стоит ${def.price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -def.price)
  advance(draft, hours(24 * def.days))
  addFatigue(draft, 30)
  practice(draft, 'magic', 20)
  draft.artifacts = [
    ...draft.artifacts,
    { id: `${def.id}:${dayOf(draft.time)}`, defId: def.id, found: 'made', day: dayOf(draft.time) },
  ]
  notice(draft, `${def.label} готов. ${def.about}`, 'world')
  return close(draft)
}

// --- поручения руками -------------------------------------------------------

function startChain(state: GameState, chainId: string): CommandResult {
  const chain = chainDef(chainId)
  if (!chain) return fail('unknownAction', 'Такого поручения нет.')
  if (!chainsOfferedAt(state).some((one) => one.id === chainId)) {
    return fail('unavailableHere', 'Здесь этого не просят.')
  }
  const draft = open(state)
  draft.chains = [
    ...draft.chains,
    {
      chainId,
      step: 0,
      startedDay: dayOf(state.time),
      winsAtStart: state.battlesWon,
      givenAt: state.locationId,
    },
  ]
  notice(draft, `${chain.giver.name}: «${chain.intro}»`, 'people')
  const first = chain.steps[0]
  if (first) notice(draft, first.text, 'notice')
  advance(draft, 30)
  return close(draft)
}

/**
 * Шаги цепочек проверяются после каждой команды: мир решает, сделано ли.
 * Доставка забирает товар; последний шаг — награда и строка на прощание.
 */
function advanceChains(draft: Draft): void {
  if (draft.chains.length === 0) return
  const still: ChainProgress[] = []
  for (const progress of draft.chains) {
    const chain = chainDef(progress.chainId)
    if (!chain) continue
    let current = progress
    for (;;) {
      const step = chain.steps[current.step]
      if (!step || !stepDone(snapshotOf(draft), step, current)) break
      if (step.type === 'deliver') addGoods(draft, step.good, -step.amount)
      current = { ...current, step: current.step + 1 }
      const next = chain.steps[current.step]
      if (next) notice(draft, `${chain.title}: ${next.text}`, 'notice')
    }
    if (current.step >= chain.steps.length) {
      rewardChain(draft, chain)
      draft.doneChains = [...draft.doneChains, chain.id]
      continue
    }
    still.push(current)
  }
  draft.chains = still
}

function rewardChain(draft: Draft, chain: ChainDef): void {
  notice(draft, `${chain.giver.name}: «${chain.outro}»`, 'people')
  if (chain.reward.money > 0) addMoney(draft, chain.reward.money)
  if (chain.reward.renown) draft.renown += chain.reward.renown
  if (chain.reward.placeRep) {
    draft.reputation = withPlaceRep(draft.reputation, draft.locationId, chain.reward.placeRep)
  }
  if (chain.reward.tag && !draft.character.tags.includes(chain.reward.tag)) {
    patch(draft, { tags: [...draft.character.tags, chain.reward.tag] })
  }
  notice(draft, `Поручение «${chain.title}» исполнено: ${chain.reward.money} монет.`, 'money')
}

/** Состояние как его видят чистые проверки, собранное из черновика. */
function snapshotOf(draft: Draft): GameState {
  return {
    ...draft.base,
    world: draft.world,
    character: draft.character,
    locationId: draft.locationId,
    settlements: draft.settlements,
    companions: draft.companions,
    chains: draft.chains,
    doneChains: draft.doneChains,
    battlesWon: draft.battlesWon,
  }
}

function recruitCompanion(state: GameState, companionId: string): CommandResult {
  const def = companionDef(companionId)
  if (!def) return fail('invalid', 'Такого человека нет.')
  if (state.companions.some((one) => one.id === companionId)) {
    return fail('invalid', 'Он уже с тобой.')
  }
  if (!companionsAt(state).some((one) => one.id === companionId)) {
    return fail('unavailableHere', 'Здесь его не встретишь.')
  }
  if (state.character.money < def.fee) {
    return fail('noMoney', `Он просит ${def.fee}, а у тебя ${state.character.money}.`)
  }
  const draft = open(state)
  addMoney(draft, -def.fee)
  draft.companions = [...draft.companions, hireCompanion(def, dayOf(state.time))]
  notice(draft, `${def.name} идёт с тобой.`, 'people')
  advance(draft, hours(1))
  return close(draft)
}

function dismissCompanion(state: GameState, companionId: string): CommandResult {
  const companion = state.companions.find((one) => one.id === companionId)
  if (!companion) return fail('invalid', 'Такого спутника у тебя нет.')
  const draft = open(state)
  draft.companions = draft.companions.filter((one) => one.id !== companionId)
  // Дело без управляющего не бросают, а ведут вполсилы — см. tickEnterprises.
  draft.enterprises = draft.enterprises.map((one) =>
    one.managerId === companionId ? { ...one, managerId: null } : one,
  )
  notice(draft, `${companion.name} уходит своей дорогой.`, 'people')
  advance(draft, hours(1))
  return close(draft)
}

function assignCompanion(
  state: GameState,
  companionId: string,
  role: CompanionRole,
): CommandResult {
  const companion = state.companions.find((one) => one.id === companionId)
  if (!companion) return fail('invalid', 'Такого спутника у тебя нет.')
  if (companion.captive) return fail('invalid', `${companion.name} в плену.`)

  if (role.type === 'steward') {
    if (state.settlements[role.locationId]?.owner !== PLAYER) {
      return fail('invalid', 'Это владение не твоё.')
    }
  }
  if (role.type === 'factor') {
    const enterprise = state.enterprises.find((one) => one.id === role.enterpriseId)
    if (!enterprise) return fail('invalid', 'Такого дела у тебя нет.')
  }

  const draft = open(state)
  // Управляющий у дела один: прежнего освобождаем.
  draft.enterprises = draft.enterprises.map((one) =>
    one.managerId === companionId ? { ...one, managerId: null } : one,
  )
  if (role.type === 'factor') {
    draft.enterprises = draft.enterprises.map((one) =>
      one.id === role.enterpriseId ? { ...one, managerId: companionId } : one,
    )
  }
  draft.companions = draft.companions.map((one) =>
    one.id === companionId ? { ...one, role } : one,
  )
  notice(
    draft,
    role.type === 'party'
      ? `${companion.name} снова идёт с тобой.`
      : role.type === 'steward'
        ? `${companion.name} остаётся управлять владением.`
        : `${companion.name} берёт дело в свои руки.`,
  )
  advance(draft, hours(1))
  return close(draft)
}

// --- дела -------------------------------------------------------------------

function foundCaravan(state: GameState, awayId: string): CommandResult {
  if (state.character.money < CARAVAN_COST) {
    return fail('noMoney', `На караван нужно ${CARAVAN_COST}.`)
  }
  if (!state.world.locations[awayId]) return fail('invalid', 'Такого места нет.')
  if (awayId === state.locationId) return fail('invalid', 'Караван должен куда-то ходить.')
  if (!nextHop(state.world, state.locationId, awayId)) {
    return fail('invalid', 'Туда нет дороги.')
  }
  const draft = open(state)
  addMoney(draft, -CARAVAN_COST)
  draft.enterprises = [
    ...draft.enterprises,
    {
      id: `caravan:${dayOf(draft.time)}:${draft.enterprises.length}`,
      kind: 'caravan',
      locationId: state.locationId,
      homeId: state.locationId,
      awayId,
      travel: null,
      travelTarget: null,
      invested: CARAVAN_COST,
      managerId: null,
      cargo: {},
      earned: 0,
    },
  ]
  const where = state.world.locations[awayId]?.name ?? 'дальнее место'
  notice(draft, `Караван снаряжён: отсюда и до ${where}.`, 'trade')
  advance(draft, hours(4))
  return close(draft)
}

/**
 * Отдать судно в дело.
 *
 * Своё судно перестаёт быть твоим ходом и становится доходом: оно ходит между
 * двумя гаванями, торгует разницей цен и приносит вдвое против обоза — потому
 * что и рискует вдвое. Однажды оно не вернётся, и тогда не станет ни дохода, ни
 * корабля. Пока оно в деле, плавать самому не на чем: судно одно.
 */
function foundShipping(state: GameState, awayId: string): CommandResult {
  const ship = state.ship
  if (!ship) return fail('requirements', 'Морской торг заводят судном, а его у тебя нет.')
  if (state.character.money < SHIPPING_COST) {
    return fail('noMoney', `На товар в трюм нужно ${SHIPPING_COST}.`)
  }
  if (!state.world.locations[awayId]) return fail('invalid', 'Такого места нет.')
  if (awayId === state.locationId) return fail('invalid', 'Судно должно куда-то ходить.')
  const lane = lanesFrom(state.world, state.locationId).find((one) => one.to === awayId)
  if (!lane) return fail('invalid', 'Отсюда туда нет морского пути.')

  const draft = open(state)
  addMoney(draft, -SHIPPING_COST)
  draft.ship = null
  draft.enterprises = [
    ...draft.enterprises,
    {
      id: `shipping:${dayOf(draft.time)}:${draft.enterprises.length}`,
      kind: 'shipping',
      locationId: state.locationId,
      homeId: state.locationId,
      awayId,
      travel: null,
      travelTarget: null,
      invested: SHIPPING_COST,
      managerId: null,
      cargo: {},
      earned: 0,
      ship: ship.kind,
    },
  ]
  const where = state.world.locations[awayId]?.name ?? 'дальняя гавань'
  notice(draft, `«${ship.name}» пошла в торг: отсюда и до ${where}.`, 'trade')
  advance(draft, hours(4))
  return close(draft)
}

function foundWorkshop(state: GameState): CommandResult {
  if (state.character.money < WORKSHOP_COST) {
    return fail('noMoney', `На мастерскую нужно ${WORKSHOP_COST}.`)
  }
  const here = state.world.locations[state.locationId]
  if (
    !here ||
    (here.archetype !== 'city' && here.archetype !== 'capital' && here.archetype !== 'town')
  ) {
    return fail('unavailableHere', 'Мастерскую держат в городе, а не в поле.')
  }
  if (
    state.enterprises.some((one) => one.kind === 'workshop' && one.locationId === state.locationId)
  ) {
    return fail('invalid', 'Здесь у тебя уже есть мастерская.')
  }
  const draft = open(state)
  addMoney(draft, -WORKSHOP_COST)
  draft.enterprises = [
    ...draft.enterprises,
    {
      id: `workshop:${state.locationId}`,
      kind: 'workshop',
      locationId: state.locationId,
      homeId: null,
      awayId: null,
      travel: null,
      travelTarget: null,
      invested: WORKSHOP_COST,
      managerId: null,
      cargo: {},
      earned: 0,
    },
  ]
  notice(draft, `Мастерская открыта в месте ${here.name}.`, 'trade')
  advance(draft, hours(6))
  return close(draft)
}

function closeEnterprise(state: GameState, enterpriseId: string): CommandResult {
  const enterprise = state.enterprises.find((one) => one.id === enterpriseId)
  if (!enterprise) return fail('invalid', 'Такого дела у тебя нет.')
  const draft = open(state)
  // Половину вложенного возвращают: остальное осело в чужих карманах.
  addMoney(draft, Math.round(enterprise.invested / 2))
  // А судно возвращается целиком — если, конечно, оно ещё на плаву и хозяину
  // есть куда его принять.
  if (enterprise.ship && !draft.ship) {
    draft.ship = { kind: enterprise.ship, name: SHIP_NAMES[0] ?? 'Чайка', condition: 0.8 }
    notice(
      draft,
      `Судно вернулось к хозяину: ${SHIPS[enterprise.ship].label.toLowerCase()}.`,
      'trade',
    )
  }
  draft.enterprises = draft.enterprises.filter((one) => one.id !== enterpriseId)
  draft.companions = draft.companions.map((one) =>
    one.role.type === 'factor' && one.role.enterpriseId === enterpriseId
      ? { ...one, role: { type: 'party' } }
      : one,
  )
  notice(draft, 'Дело свёрнуто.', 'trade')
  advance(draft, hours(2))
  return close(draft)
}

// --- брак -------------------------------------------------------------------

/** За кого можно посвататься: за дом того, кто тебя знает и здесь сидит. */
export function matchesAt(state: GameState, locationId = state.locationId): readonly Lord[] {
  if (state.character.family.spouse) return []
  const owner = state.settlements[locationId]?.owner
  if (!owner || owner === PLAYER) return []
  const lord = lordById(state.politics, owner)
  return lord ? [lord] : []
}

/**
 * Сватовство.
 *
 * Дом отдаёт дочь или сына не всякому: смотрят на славу и на то, как о тебе
 * говорят. Согласие — это союз: с коронами, которым служит дом, отношения
 * теплеют, и такой союз держится дольше обычного (diplomacy.ts).
 */
function proposeMarriage(state: GameState, lordId: string): CommandResult {
  if (state.character.family.spouse) return fail('invalid', 'Ты уже в браке.')
  if (state.character.age < 16) return fail('invalid', 'Рано.')
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('invalid', 'Такого дома нет.')
  if (!matchesAt(state).some((one) => one.id === lordId)) {
    return fail('unavailableHere', 'Свататься надо там, где сидит дом.')
  }
  // Смотрят на славу и на то, что о тебе помнят.
  const opinion = lordRep(state.reputation, lordId)
  const weight = state.renown + opinion * 2
  if (weight < 40) {
    return fail('invalid', `${lord.title} ${lord.name} не отдаст своей крови безвестному.`)
  }

  // Венчает церковь (этап 51): отлучённого не венчают нигде, а в Святом
  // королевстве не венчают и нерадивого.
  const devout = kingdomOf(state.world, state.locationId)?.id === 'robl'
  if (pietyOf(state) <= EXCOMMUNICATED || (devout && pietyOf(state) < -15)) {
    return fail('shunned', 'Церковь не благословит этот брак: с тобой не станут служить.')
  }
  const draft = open(state)
  const day = dayOf(draft.time)
  const [name, afterName] = spouseName(draft.rng)
  draft.rng = afterName
  patch(draft, {
    family: {
      ...draft.character.family,
      spouse: { name, lordId, kingdomId: lord.kingdomId, sinceDay: day },
    },
  })
  // Приданое: земля даётся не всегда, а деньги — всегда.
  const dowry = 80 + Math.round(lord.strength * 6)
  addMoney(draft, dowry)
  draft.renown += 15

  // Брак с домом короны — это союз с самой короной.
  if (lord.kingdomId && draft.realm) {
    const pact = { a: draft.realm.name, b: lord.kingdomId, since: day, byMarriage: true }
    draft.politics = { ...draft.politics, alliances: [...draft.politics.alliances, pact] }
  }
  if (lord.kingdomId) {
    const key = pairOf(lord.kingdomId, lord.kingdomId)
    draft.politics = {
      ...draft.politics,
      relations: { ...draft.politics.relations, [key]: 100 },
    }
  }
  notice(draft, `Сговорено: ${name} из дома ${lord.name}. Приданое — ${dowry}.`, 'people')
  advance(draft, hours(8))
  return close(draft)
}

const SPOUSE_NAMES = ['Мирава', 'Ждана', 'Бранимир', 'Любава', 'Радогост', 'Веселина']

function spouseName(rng: Rng): [string, Rng] {
  const [index, next] = nextInt(rng, 0, SPOUSE_NAMES.length - 1)
  return [SPOUSE_NAMES[index] ?? 'Мирава', next]
}

/**
 * Закрыть ворота.
 *
 * Единственное, что против мора может сделать владетель, кроме как привести
 * лекаря: закрыть место. Мор внутри не выходит наружу и уносит меньше, но
 * торговля стоит, а люди помнят, кто их запер. Только на своей земле и только
 * пока мор идёт — открываются ворота сами, когда он отступит.
 */
function quarantine(state: GameState): CommandResult {
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  if (settlement.owner !== PLAYER) return fail('invalid', 'Запирать ворота может только хозяин.')
  if (!plagueAt(state.plagues, state.locationId))
    return fail('invalid', 'Мора здесь нет — запирать не от чего.')
  if (settlement.quarantined) return fail('invalid', 'Ворота уже закрыты.')
  const draft = open(state)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: { ...settlement, quarantined: true },
  }
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, -6)
  notice(draft, 'Ворота закрыты. Мор останется внутри — и люди это запомнят.', 'plague')
  advance(draft, hours(2))
  return close(draft)
}

/**
 * С каким навыком торгуются здесь и сейчас.
 *
 * На ярмарке продавцов много и все на виду: разница между «купить» и «продать»
 * сходится сама, как у того, кого на рынке знают (этап 39). Поэтому ярмарка —
 * прибавка к навыку, а не скидка: одна и та же линейка на все цены.
 */
export function tradeSkillAt(state: GameState): number {
  const fair = fairAt(state.world, state.locationId, dayOf(state.time))
  // Своя гильдия торгует со своими как со своими (этап 42).
  const guild = ownOrderHere(state)
  return (
    skillLevel(state.character, 'trade') + (fair ? FAIR_TRADE_BONUS : 0) + (guild?.perks.trade ?? 0)
  )
}

/**
 * Торг словом (этап 49).
 *
 * Не кнопка «скидка», а разговор: просишь уступить мягко, твёрдо или нахально.
 * Уступка держится до конца дня и только у этого купца; наглость он запомнит.
 * Торгуются раз в день: приставать к человеку каждый час — не торг.
 */
/** Купить дом (этап 56, Д3): место, куда возвращаются. */
function buyHome(state: GameState, kind: string): CommandResult {
  const def = homeDef(kind)
  if (!def) return fail('unknownAction', 'Такого дома не бывает.')
  if (!homesAt(state.world, state.settlements, state.locationId).some((one) => one.id === kind)) {
    return fail('unavailableHere', 'Здесь такого дома не купишь.')
  }
  if (state.home) {
    return fail(
      'invalid',
      `У тебя уже есть дом в ${state.world.locations[state.home.locationId]?.name ?? 'другом месте'}.`,
    )
  }
  if (state.character.money < def.price) {
    return fail('noMoney', `За дом просят ${def.price}, а у тебя ${state.character.money}.`)
  }
  const draft = open(state)
  addMoney(draft, -def.price)
  advance(draft, hours(4))
  draft.home = { kind, locationId: state.locationId, sinceDay: dayOf(state.time), stash: {} }
  notice(draft, `${def.label} теперь твой. ${def.about}`)
  return close(draft)
}

/** Оставить дома: поклажу, которую не носят с собой. */
function storeAtHome(state: GameState, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  if (!atHome(state)) return fail('unavailableHere', 'Складывать надо дома, а ты не дома.')
  const def = homeDef(state.home?.kind ?? '')
  if (!state.home || !def) return fail('invalid', 'Дома нет.')
  if (carried(state.character, good) < amount) {
    return fail('noGoods', `У тебя нет столько: ${GOODS[good].label.toLowerCase()}.`)
  }
  const stored = Object.values(state.home.stash).reduce((sum, one) => sum + one, 0)
  if (stored + amount > def.storage) {
    return fail('noRoom', `В доме больше не помещается: предел ${def.storage}.`)
  }
  const draft = open(state)
  advance(draft, 20)
  addGoods(draft, good, -amount)
  draft.home = {
    ...state.home,
    stash: { ...state.home.stash, [good]: (state.home.stash[good] ?? 0) + amount },
  }
  notice(draft, `Оставлено дома: ${GOODS[good].label.toLowerCase()}, ${amount}.`)
  return close(draft)
}

function takeFromHome(state: GameState, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  if (!atHome(state) || !state.home) return fail('unavailableHere', 'Брать надо дома.')
  if ((state.home.stash[good] ?? 0) < amount) {
    return fail('noGoods', 'Дома столько нет.')
  }
  const weight = GOODS[good].weight * amount
  const capacity = partyCapacity(state.character, state.party) + horseCarry(state.character)
  if (carriedWeight(state.character) + weight > capacity) {
    return fail('overloaded', 'Столько не унести.')
  }
  const draft = open(state)
  advance(draft, 20)
  addGoods(draft, good, amount)
  draft.home = {
    ...state.home,
    stash: { ...state.home.stash, [good]: (state.home.stash[good] ?? 0) - amount },
  }
  notice(draft, `Взято из дома: ${GOODS[good].label.toLowerCase()}, ${amount}.`)
  return close(draft)
}

/**
 * Учить ребёнка (этап 56, Д2).
 *
 * Вложенное в ребёнка — единственное, что наследник получает сверх имени: его
 * умения считаются по тому, чему ты успел научить, а не по твоему листу.
 */
function teachChild(state: GameState, childName: string): CommandResult {
  const child = state.character.family.children.find((one) => one.name === childName)
  if (!child) return fail('unknownAction', 'Такого ребёнка у тебя нет.')
  if (!atHome(state)) return fail('unavailableHere', 'Детей учат дома, а не в дороге.')
  const day = dayOf(state.time)
  const able = canTeachChild(state, child, day)
  if (!able.can) return fail('requirements', able.why)

  const draft = open(state)
  advance(draft, UPBRINGING_MINUTES)
  addFatigue(draft, 10)
  const now = (draft.upbringing[childName] ?? 0) + 1
  draft.upbringing = { ...draft.upbringing, [childName]: now }
  notice(draft, `${childName} учится у тебя: ${bentWords(child)} (вложено ${now}).`)
  return close(draft)
}

/**
 * Родня (этап 56, Д5).
 *
 * Свои просят и помогают. Отказать можно — но род это помнит, а помощь
 * возвращается тогда, когда её не ждёшь.
 */
function helpKin(state: GameState, kinId: string): CommandResult {
  const day = dayOf(state.time)
  const kin = kinOf(state.character.family, day).find((one) => one.id === kinId)
  if (!kin) return fail('unknownAction', 'Такой родни у тебя нет.')
  const draft = open(state)
  advance(draft, hours(1))
  if (kin.asks) {
    if (state.character.money < KIN_ASK) {
      return fail('noMoney', `${kin.name} просит ${KIN_ASK}, а у тебя ${state.character.money}.`)
    }
    addMoney(draft, -KIN_ASK)
    draft.renown += 1
    notice(draft, `${kin.name} получил помощь. Род это запомнит.`)
    return close(draft)
  }
  addMoney(draft, KIN_GIFT)
  notice(draft, `${kin.name} прислал ${KIN_GIFT}: у своих так заведено.`)
  return close(draft)
}

/**
 * Уйти на покой (этап 56, Д6).
 *
 * После пятидесяти пяти это не поражение, а выбор: передать имя и землю
 * взрослому наследнику и дожить своё. Играют дальше за него.
 */
function retire(state: GameState): CommandResult {
  const day = dayOf(state.time)
  if (!canRetire(state, day)) {
    return fail('requirements', 'На покой уходят в летах и когда есть кому передать.')
  }
  const heir = heirOf(state.character.family, day)
  if (!heir) return fail('requirements', 'Наследник ещё не вырос.')

  const draft = open(state)
  advance(draft, hours(8))
  const taught = draft.upbringing[heir.name] ?? 0
  draft.character = heirCharacter(state.character, heir, day)
  // Чему успел научить — то и осталось: воспитание прибавляет умений сверх
  // общей трети (этап 56, Д2).
  if (taught > 0) {
    const bent = childBent(heir)
    const skill: SkillId =
      bent === 'sword'
        ? 'heavyWeapons'
        : bent === 'book'
          ? 'scholarship'
          : bent === 'coin'
            ? 'trade'
            : bent === 'land'
              ? 'survival'
              : 'concentration'
    const progress = draft.character.skills[skill]
    draft.character = {
      ...draft.character,
      skills: {
        ...draft.character.skills,
        [skill]: { ...progress, level: progress.level + taught },
      },
    }
  }
  // Летопись рода (этап 69, И4): прежде чем имя перейдёт, колено закрывают —
  // чем он был, что успел и под каким прозвищем его запомнили.
  draft.house = [
    ...draft.house,
    closeGeneration(
      state,
      state.character.bornDay,
      day,
      holdingsOf(draft.settlements, PLAYER).length,
    ),
  ]
  // Отречение делит державу тем же законом, что и смерть (этап 93, Сл2):
  // власть кончается одинаково, кто бы её ни передавал.
  const divided = draft.realm ? divideRealm(draft, day) : null
  // Слава не наследуется целиком: сына знают по отцу вполовину.
  draft.renown = Math.floor(draft.renown / 2)
  // И слава по кругам тоже: круги помнят род, а не человека (этап 68).
  const halved: Record<string, number> = {}
  for (const [circle, value] of Object.entries(draft.fame)) halved[circle] = Math.round(value / 2)
  draft.fame = halved
  notice(
    draft,
    `Ты отошёл от дел. Теперь ты ${heir.name}, и всё, чему тебя учили, — при тебе. В летописи рода на одно колено больше.${divided ? ` ${divided}` : ''}`,
    'people',
  )
  return close(draft)
}

/** Купить книгу (этап 55, Н6): в школе — свои, в большом городе — мирские. */
function buyBook(state: GameState, bookId: string): CommandResult {
  const book = bookById(bookId)
  if (!book) return fail('unknownAction', 'Такой книги нет.')
  if (!booksAt(state).some((one) => one.id === bookId)) {
    return fail('unavailableHere', 'Здесь такой книги не продают.')
  }
  if (hasBook(state, bookId)) return fail('invalid', 'Эта книга у тебя уже есть.')
  if (state.character.money < book.price) {
    return fail('noMoney', `За книгу просят ${book.price}, а у тебя ${state.character.money}.`)
  }
  const draft = open(state)
  addMoney(draft, -book.price)
  advance(draft, 30)
  draft.books = { ...draft.books, [bookId]: { read: false, days: 0 } }
  notice(draft, `Куплена книга: ${book.label}. Читать её ${book.days} суток.`)
  return close(draft)
}

/**
 * Читать книгу (этап 55, Н6).
 *
 * Читают сутками и не наспех: за один присест прочитывается один день. Книга
 * даёт то, чего наставник не даст, — и это единственная дверь самоучки к
 * школьному знанию.
 */
function readBook(state: GameState, bookId: string): CommandResult {
  const book = bookById(bookId)
  if (!book) return fail('unknownAction', 'Такой книги нет.')
  if (!hasBook(state, bookId)) return fail('noGoods', 'У тебя нет этой книги.')
  if (bookRead(state, bookId)) return fail('invalid', 'Эту книгу ты уже прочёл.')
  const able = canRead(state, book)
  if (!able.can) return fail('requirements', able.why)
  const blocked = checkWindow(state.time, DAY_WINDOW, 'Читают при свете:')
  if (blocked) return blocked

  const draft = open(state)
  advance(draft, hours(6))
  addFatigue(draft, 12)
  const days = bookProgress(state, bookId) + 1
  const done = days >= book.days
  draft.books = { ...draft.books, [bookId]: { read: done, days } }
  if (!done) {
    practice(draft, 'scholarship', 12)
    notice(draft, `${book.label}: прочитано ${days} из ${book.days} суток.`)
    return close(draft)
  }
  for (const [skill, xp] of Object.entries(book.teaches)) {
    // По книге дальше середины не уйдёшь (этап 124, Пу5): дальше нужен человек
    // или дело. Иначе книжник вырастал бы в кресле.
    if (skillLevel(draft.character, skill as SkillId) >= PATH_DEFS.book.cap) {
      notice(draft, `${SKILLS[skill as SkillId].label}: ${PATH_WORDS.bookCap}`)
      continue
    }
    practice(draft, skill as SkillId, xp ?? 0, 'book')
  }
  notice(draft, `${book.label} прочитана. ${book.about}`)
  if (book.spellId) {
    notice(draft, 'В книге было записано заклинание — теперь оно твоё, если хватит умения.')
  }
  return close(draft)
}

/**
 * Спор в школе (этап 55, Н3).
 *
 * Ученики и магистры спорят о том, чего никто не знает наверняка. Выигравший
 * поднимается в глазах главы, проигравший узнаёт больше — и это не шутка, а
 * то, как устроено учение.
 */
function debate(state: GameState): CommandResult {
  const school = schoolAt(state.world, state.locationId)
  if (!school) return fail('unavailableHere', 'Спорить тут не с кем: школы нет.')
  const blocked = checkFatigue(state.character, 15)
  if (blocked) return blocked

  const draft = open(state)
  advance(draft, DEBATE_MINUTES)
  addFatigue(draft, 15)
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const learning = skillLevel(state.character, 'scholarship') + skillLevel(state.character, 'magic')
  const won = roll < Math.min(0.85, 0.2 + learning * 0.01)
  if (won) {
    practice(draft, 'magic', DEBATE_XP * 0.6)
    practice(draft, 'persuasion', 40)
    draft.reputation = withLordRep(draft.reputation, school.master.id, 6)
    notice(draft, `Спор в школе «${school.name}»: твоё слово осталось последним.`)
  } else {
    practice(draft, 'magic', DEBATE_XP)
    practice(draft, 'scholarship', 40)
    draft.reputation = withLordRep(draft.reputation, school.master.id, -2)
    notice(draft, `Спор в школе «${school.name}»: тебя разбили — и ты узнал больше, чем хотел.`)
  }
  return close(draft)
}

/** Взять ученика (этап 55, Н5): учить может магистр и выше. */
function takeStudent(state: GameState): CommandResult {
  const able = canTakeStudent(state)
  if (!able.can) return fail('requirements', able.why)
  const day = dayOf(state.time)
  const draft = open(state)
  advance(draft, hours(2))
  const name = studentNameFor(state.world, state.locationId, day)
  draft.student = { id: `student:${state.locationId}:${day}`, name, since: day, learned: 0 }
  notice(draft, `${name} пошёл к тебе в ученики. Кормить и учить — твоё дело.`)
  return close(draft)
}

/** Ученик учится и однажды уходит: держать его дольше нечестно. */
function tickStudent(draft: Draft, days: number): void {
  const student = draft.student
  if (!student) return
  const day = dayOf(draft.time)
  addMoney(draft, -STUDENT_UPKEEP * days)
  draft.student = { ...student, learned: student.learned + days }
  if (!studentDone(draft, day)) return
  notice(draft, `${student.name} выучился и уходит своей дорогой. Так было и с тобой когда-то.`)
  draft.renown += 2
  draft.student = null
}

/**
 * Помочь спутнику с его делом (этап 54, С2).
 *
 * Долг выкупают деньгами, учение оплачивают в школе, дом дают землёй. Месть,
 * имя и покой деньгами не купишь — они приходят делами и годами.
 */
function grantWish(state: GameState, companionId: string): CommandResult {
  const companion = state.companions.find((one) => one.id === companionId)
  if (!companion) return fail('unknownAction', 'Такого спутника у тебя нет.')
  const wish = wishOf(companion)
  if (!wish) return fail('invalid', `${companion.name} ничего не просит.`)
  if (wishDone(companion)) return fail('invalid', `У ${companion.name} это дело уже сделано.`)
  if (wish.id === 'lore') {
    const school = schoolAt(state.world, state.locationId)
    if (!school) return fail('unavailableHere', 'Учить его надо там, где есть школа.')
  }
  if (wish.cost === 0) {
    return fail('requirements', `${companion.name}: «${wish.says}» Это деньгами не решается.`)
  }
  if (state.character.money < wish.cost) {
    return fail('noMoney', `Нужно ${wish.cost}, а у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -wish.cost)
  advance(draft, hours(2))
  finishWish(draft, companionId)
  return close(draft)
}

/** Дело спутника сделано: он это помнит и остаётся твоим. */
function finishWish(draft: Draft, companionId: string): void {
  const day = dayOf(draft.time)
  draft.companions = draft.companions.map((one) => {
    if (one.id !== companionId) return one
    const wish = wishOf(one)
    if (!wish || one.wish?.doneDay !== undefined) return one
    notice(draft, `${one.name}: «${wish.done}»`)
    return {
      ...one,
      mood: Math.min(100, one.mood + 25),
      wish: { progress: wishNeeds(wish.id), doneDay: day },
    }
  })
}

/**
 * Дела спутников идут сами (этап 54).
 *
 * Месть считается боями, имя — славой, покой — сутками без крови, дом — твоей
 * землёй. Проверяется раз в сутки вместе со всем остальным миром.
 */
function advanceWishes(draft: Draft, days: number): void {
  const day = dayOf(draft.time)
  const holdings = holdingsOf(draft.settlements, PLAYER).length
  draft.companions = draft.companions.map((one) => {
    const wish = wishOf(one)
    if (!wish || one.wish?.doneDay !== undefined || one.captive) return one
    const was = one.wish?.progress ?? 0
    let progress = was
    if (wish.id === 'revenge') progress = draft.battlesWon - (one.since ? 0 : 0)
    if (wish.id === 'name') progress = draft.renown
    if (wish.id === 'home') progress = holdings > 0 ? 1 : 0
    if (wish.id === 'peace') progress = draft.battle === null ? was + days : 0
    if (progress === was) return one
    const next = { ...one, wish: { ...one.wish, progress } }
    if (progress >= wishNeeds(wish.id)) {
      notice(draft, `${one.name}: «${wish.done}»`)
      return {
        ...next,
        mood: Math.min(100, one.mood + 25),
        wish: { progress, doneDay: day },
      }
    }
    return next
  })
}

/**
 * Ссоры в отряде (этап 54, С3).
 *
 * Кто с кем не уживается, тот и тянет настроение вниз — каждый день понемногу.
 * Кто сходится, тому в походе легче.
 */
function quarrel(draft: Draft, days: number): void {
  const quarrels = quarrelsOf(draft.companions)
  if (quarrels.length === 0) return
  const shifts = new Map<string, number>()
  for (const one of quarrels) {
    shifts.set(one.a.id, (shifts.get(one.a.id) ?? 0) + one.feeling * days * 0.5)
    shifts.set(one.b.id, (shifts.get(one.b.id) ?? 0) + one.feeling * days * 0.5)
  }
  draft.companions = draft.companions.map((one) => {
    const shift = shifts.get(one.id)
    if (!shift) return one
    return { ...one, mood: Math.max(0, Math.min(100, one.mood + shift)) }
  })
}

/**
 * Разговор (этап 53).
 *
 * Спрашивают о теме, а не нажимают на реплику: отвечает человек тем, что знает
 * о мире, своим голосом и со своей правдой. Разговор стоит времени и терпения:
 * у всякого нрава оно своё, и надоевшему отвечают коротко.
 */
function talk(state: GameState, speakerId: string, topicId: string): CommandResult {
  const speaker = speakerById(state, speakerId)
  if (!speaker) return fail('unavailableHere', 'Этого человека здесь нет.')
  const topic = TOPICS_BY_ID[topicId]
  if (!topic) return fail('unknownAction', 'О таком не говорят.')
  if (!topic.kinds.includes(speaker.kind)) {
    return fail('requirements', `${speaker.name} об этом говорить не станет: не его дело.`)
  }
  if (!stillTalks(state, speaker)) {
    return fail('closed', `${speaker.name}: «${TONES[speaker.tone].tires[0]}»`)
  }

  const draft = open(state)
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  advance(draft, topic.minutes)
  const answer = answerOf(state, speaker, topicId, roll)
  notice(draft, `${speaker.name}: «${answer.text}»`)
  draft.talked = {
    ...draft.talked,
    [speakerId]: (draft.talked[speakerId] ?? 0) + topic.patience,
  }
  // Узнанное ложится туда же, куда легло бы, если б ты дошёл ногами: земля —
  // в знание мира (этап 46), цены — в записную книжку купца.
  if (answer.reveals?.provinceIds && draft.knowledge) {
    draft.knowledge = reveal(draft.knowledge, answer.reveals.provinceIds)
  }
  if (answer.reveals?.prices) {
    const day = dayOf(draft.time)
    let log = draft.priceLog
    for (const one of answer.reveals.prices) {
      const known = log[one.locationId] ?? {}
      const good = one.good as GoodId
      log = {
        ...log,
        [one.locationId]: {
          ...known,
          [good]: [...(known[good] ?? []), { day, price: one.price }],
        },
      }
    }
    draft.priceLog = log
  }
  // Разговор сближает: к тому, с кем говорили, относятся чуть теплее.
  if (speaker.kind === 'merchant') rememberDeal(draft, speakerId, { standing: 1 })
  practice(draft, 'persuasion', 6)
  return close(draft)
}

/**
 * Приём у лорда (этап 52, З1).
 *
 * В замок входят по чину: свой вассал и слуга короны — сразу, чужой — по славе
 * и милости, незнакомец — с подарком или никак. Ждать в сенях приходится тем
 * дольше, чем выше сидит хозяин.
 */
function seekAudience(state: GameState, lordId: string, gift: number): CommandResult {
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (!lordHere(state, state.locationId) || lordHere(state)?.id !== lordId) {
    return fail('unavailableHere', 'Этот лорд сидит не здесь.')
  }
  if (!Number.isInteger(gift) || gift < 0) return fail('invalid', 'Сколько именно?')
  if (state.character.money < gift) return fail('noMoney', 'Такого подарка у тебя нет.')
  const reception = receptionFor(state, lord, gift)
  const draft = open(state)
  if (gift > 0) addMoney(draft, -gift)
  advance(draft, hours(Math.max(1, reception.waitHours)))
  if (!reception.admits) {
    // Подарок, за который не пустили, не возвращают: его уже взяли у ворот.
    notice(draft, `${lord.title} ${lord.name}: «${reception.says}»`)
    if (reception.gift > 0) {
      notice(draft, `Говорят, с даром в ${reception.gift} тебя бы и выслушали.`)
    }
    return close(draft)
  }
  const gained = 4 + Math.round(gift / 25)
  draft.reputation = withLordRep(draft.reputation, lordId, Math.min(20, gained))
  notice(draft, `${lord.title} ${lord.name} принял тебя: «${reception.says}»`)
  return close(draft)
}

/**
 * Дела двора (этап 52, З4).
 *
 * Услуга за услугу, донос, покровительство. Каждое что-то даёт и чем-то
 * платит: донос слышат обе стороны, покровительство стоит денег и связывает.
 */
function courtIntrigue(
  state: GameState,
  lordId: string,
  kind: IntrigueKind,
  targetId?: string,
): CommandResult {
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lordHere(state)?.id !== lordId) return fail('unavailableHere', 'Этот лорд сидит не здесь.')
  const def = intriguesFor(state, lord).find((one) => one.id === kind)
  if (!def) return fail('requirements', 'До такого разговора ты у него ещё не дорос.')
  if (state.character.money < def.cost) return fail('noMoney', `Нужно ${def.cost}.`)

  const draft = open(state)
  if (def.cost > 0) addMoney(draft, -def.cost)
  advance(draft, def.minutes)

  if (kind === 'service') {
    // Услуга — это взятое поручение двора: его дают, а не выдумывают.
    const offers = offersAt(state)
    const errand = offers[0]
    if (!errand) return fail('unavailableHere', 'Сейчас у двора нет дела для тебя.')
    if (state.quests.some((one) => one.id === errand.id)) {
      return fail('invalid', 'Это дело у тебя уже есть.')
    }
    draft.quests = [...draft.quests, { ...errand, reward: Math.round(errand.reward * 1.3) }]
    draft.reputation = withLordRep(draft.reputation, lordId, 5)
    notice(draft, `${lord.title} ${lord.name} принял твою услугу: ${describeQuest(state, errand)}.`)
    return close(draft)
  }

  if (kind === 'denounce') {
    const target = targetId ? lordById(state.politics, targetId) : null
    if (!target) return fail('invalid', 'На кого доносить?')
    if (!denounceTargets(state, lord).some((one) => one.id === target.id)) {
      return fail('invalid', 'Про этого человека лорду слушать неинтересно.')
    }
    draft.reputation = withLordRep(draft.reputation, lordId, 10)
    draft.reputation = withLordRep(draft.reputation, target.id, -25)
    // Донос — грех, и церковь это считает (этап 51).
    draft.piety = Math.max(-100, Math.min(100, draft.piety - 5))
    notice(
      draft,
      `Ты рассказал ${lord.title === '' ? '' : `${lord.title} `}${lord.name} о ${target.name}. Тот узнает, от кого.`,
    )
    return close(draft)
  }

  // Покровительство: он говорит за тебя, ты отвечаешь за него.
  draft.reputation = withLordRep(draft.reputation, lordId, 15)
  draft.renown += 1
  notice(draft, `${lord.title} ${lord.name} взял тебя под руку. Теперь ты его человек при дворе.`)
  return close(draft)
}

/**
 * Турнир при дворе (этап 52, З5).
 *
 * Слава и раны: взнос, бой на копьях и кошель победителю. Судит не кубик, а
 * то, чем ты дерёшься и на чём сидишь.
 */
function tourney(state: GameState, lordId: string): CommandResult {
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lordHere(state)?.id !== lordId) return fail('unavailableHere', 'Этот лорд сидит не здесь.')
  // На турнир зовут тех, кого уже принимали: с улицы на ристалище не выходят.
  if (favourOf(state, lordId) < TOURNEY_FAVOUR) {
    return fail('shunned', 'На турнир зовут тех, кого принимают. Тебя пока нет.')
  }
  if (state.character.money < TOURNEY_FEE) return fail('noMoney', `Взнос ${TOURNEY_FEE}.`)
  const blocked = checkFatigue(state.character, 30)
  if (blocked) return blocked

  const draft = open(state)
  addMoney(draft, -TOURNEY_FEE)
  advance(draft, hours(6))
  addFatigue(draft, 30)
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const gear = gearBonus(state.character)
  const skill =
    skillLevel(state.character, 'riding') * 0.5 + skillLevel(state.character, 'heavyWeapons') * 0.5
  const chance = Math.min(0.85, 0.15 + skill * 0.012 + gear.attack * 0.01)
  practice(draft, 'riding', 30)
  practice(draft, 'heavyWeapons', 25)
  if (roll < chance) {
    addMoney(draft, TOURNEY_PURSE)
    draft.renown += 2
    draft.reputation = withLordRep(draft.reputation, lordId, 12)
    notice(draft, `Турнир у ${lord.name}: кошель твой — ${TOURNEY_PURSE}. О тебе говорят.`)
    return close(draft)
  }
  // Проигравший падает: турнирное копьё тупое, но земля твёрдая.
  if (roll > 0.85) {
    // Турнирное копьё тупое, но земля твёрдая: пара суток в постели.
    if (!draft.character.wound) {
      draft.character = { ...draft.character, wound: { daysLeft: 3, severity: 0.25 } }
      notice(draft, 'Сбит с седла: рёбра целы, но дышать больно.')
    }
  }
  draft.reputation = withLordRep(draft.reputation, lordId, 3)
  notice(draft, `Турнир у ${lord.name}: тебя выбили из седла. Взнос остался у распорядителя.`)
  return close(draft)
}

/**
 * Суд лорда (этап 52, З6).
 *
 * Пожаловаться на то, что тебя обидели на его земле: шайка, пошлина, чужой
 * произвол. Решает он по нраву и по тому, в какой ты милости.
 */
function petition(state: GameState, lordId: string): CommandResult {
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lordHere(state)?.id !== lordId) return fail('unavailableHere', 'Этот лорд сидит не здесь.')
  // Жалобу слушают у того, кто тебя знает: незнакомца отправят к сенешалю.
  const favour = favourOf(state, lordId)
  if (favour <= 0) return fail('shunned', 'Твою жалобу здесь не станут слушать: тебя не знают.')

  const draft = open(state)
  advance(draft, hours(2))
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const verdict = judgeOf(lord, favour, roll)
  if (verdict === 'granted') {
    const paid = 60 + Math.round(favour * 2)
    addMoney(draft, paid)
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 5)
    notice(draft, `${lord.title} ${lord.name} рассудил в твою пользу: ${paid} в возмещение.`)
    return close(draft)
  }
  if (verdict === 'fined') {
    const fine = Math.min(state.character.money, 50)
    addMoney(draft, -fine)
    draft.reputation = withLordRep(draft.reputation, lordId, -5)
    notice(draft, `${lord.title} ${lord.name} счёл жалобу вздорной и взял с тебя ${fine}.`)
    return close(draft)
  }
  notice(draft, `${lord.title} ${lord.name} выслушал и не сделал ничего. Так тоже судят.`)
  return close(draft)
}

/**
 * Обряд (этап 51, Х1).
 *
 * В храме есть кто-то и есть что сделать: молебен, исповедь, отпевание,
 * благословение владыки. Каждый обряд стоит времени, жертвы на храм и даёт
 * благочестие; исповедь снимает вину, отпевание поднимает дух отряда.
 */
function rite(state: GameState, riteId: string): CommandResult {
  const def = RITES_BY_ID[riteId]
  if (!def) return fail('unknownAction', 'Такого обряда нет.')
  const priest = priestAt(state.world, state.settlements, state.locationId)
  if (!priest) return fail('unavailableHere', 'Здесь некому служить: храма нет.')
  // Под запретом обрядов не служат (этап 59, О4) — в этом весь его смысл.
  const ban = interdictedAt(state, state.locationId, dayOf(state.time))
  if (ban) {
    return fail(
      'shunned',
      `${priest.name}: «На месте запрет ${orderById(ban.orderId)?.name ?? 'братства'}. Ни обрядов, ни треб».`,
    )
  }
  if (def.needsBishop && priest.cloth !== 'bishop') {
    return fail('unavailableHere', `${priest.name} такого не служит: тут нужен владыка.`)
  }
  const piety = pietyOf(state)
  const welcome = templeAccepts(priest, piety, def, fameOf(state, 'church'))
  if (!welcome.accepts) return fail('shunned', `${priest.name}: «${welcome.says}»`)
  const offering = offeringFor(priest, def)
  if (state.character.money < offering) {
    return fail('noMoney', `На храм просят ${offering}, а у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -offering)
  advance(draft, def.minutes)
  const grace = graceFor(priest, def)
  draft.piety = Math.max(-100, Math.min(100, draft.piety + grace))
  notice(draft, `${priest.name}: «${welcome.says}» ${def.label}: на храм ${offering}.`)
  // Чем отзывается обряд, сказано в нём самом (этап 73, Б6): исповедь снимает
  // не только вину, отпевание поднимает дух, помазание — имя. Двенадцать
  // обрядов — двенадцать строк в содержимом, а не двенадцать ветвей здесь.
  const gives = def.gives
  if (gives?.place) {
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, gives.place)
  }
  if (gives?.morale) {
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + gives.morale) }
  }
  if (gives?.renown) draft.renown += gives.renown
  practice(draft, 'concentration', 10)
  return close(draft)
}

/** Вклад в обитель или храм: деньги за благочестие, без обряда и без слов. */
function donate(state: GameState, amount: number): CommandResult {
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  const priest = priestAt(state.world, state.settlements, state.locationId)
  if (!priest) return fail('unavailableHere', 'Здесь некому жертвовать.')
  if (state.character.money < amount) {
    return fail('noMoney', `У тебя нет столько: ${amount}.`)
  }
  const draft = open(state)
  addMoney(draft, -amount)
  advance(draft, 20)
  // Благочестие покупается плохо: сотня монет — это шесть-семь очков, не больше.
  const grace = Math.min(15, Math.round(Math.sqrt(amount) * 0.7))
  draft.piety = Math.max(-100, Math.min(100, draft.piety + grace))
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, 2)
  notice(draft, `Вклад на храм: ${amount}. ${priest.name} записал тебя в поминание.`)
  return close(draft)
}

/**
 * Праздник (этап 51, Х2).
 *
 * В праздник не работают — и это уже было. Теперь в праздник есть что делать:
 * идти в шествии, сесть за общий стол, выйти на кулачный бой. Каждое даёт
 * своё, и каждое чем-то рискует.
 */
function joinFeast(state: GameState, doingId: string): CommandResult {
  const doing = FEAST_DOINGS.find((one) => one.id === doingId)
  if (!doing) return fail('unknownAction', 'Такого на празднике не делают.')
  const day = dayOf(state.time)
  const name = feastHere(state.world, state.locationId, day)
  if (!name) return fail('unavailableHere', 'Нынче не праздник.')
  const doings = feastDoingsAt(state.world, state.locationId, day)
  if (!doings.some((one) => one.id === doingId)) {
    return fail('unavailableHere', `На этом празднике такого нет: ${name}.`)
  }
  if (state.character.money < doing.cost) {
    return fail('noMoney', `Нужно ${doing.cost}.`)
  }

  const draft = open(state)
  addMoney(draft, -doing.cost)
  advance(draft, doing.minutes)
  if (doing.id === 'procession') {
    draft.piety = Math.max(-100, Math.min(100, draft.piety + 6))
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 5)
    notice(draft, `${name}: ты шёл в шествии, и тебя видели рядом со святыней.`)
    return close(draft)
  }
  if (doing.id === 'feastTable') {
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 8)
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 6) }
    addFatigue(draft, 10)
    notice(draft, `${name}: за общим столом тебя запомнили — и твоих людей тоже.`)
    return close(draft)
  }
  // Кулачный бой: слава и синяки. Побеждает сила и ловкость, а не железо.
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const strength = state.character.attributes.strength + state.character.attributes.agility
  const won = roll < Math.min(0.85, 0.25 + strength * 0.04)
  addFatigue(draft, 25)
  practice(draft, 'athletics', 25)
  if (won) {
    draft.renown += 1
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 10)
    addMoney(draft, 20)
    notice(draft, `${name}: стенка на стенку — и ты устоял. Посад это запомнит.`)
  } else {
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 2)
    notice(draft, `${name}: тебя уронили на глазах у всего посада. Бывает.`)
  }
  return close(draft)
}

/**
 * Паломничество (этап 51, Х5).
 *
 * Святое место в глуши — цель пути. Даёт много благочестия, но раз в
 * несколько месяцев: ходить к одному роднику каждую неделю — не паломничество,
 * а прогулка.
 */
function pilgrimage(state: GameState): CommandResult {
  if (!isHolySite(state.world, state.locationId)) {
    return fail('unavailableHere', 'Это место не свято: тут не молятся, тут ходят.')
  }
  const day = dayOf(state.time)
  if (!canPilgrimage(state, day)) {
    const left = PILGRIM_DAYS - (day - (state.pilgrimDay ?? 0))
    return fail('closed', `Ты был у святого места недавно. Придёшь через ${left} суток.`)
  }
  const draft = open(state)
  advance(draft, hours(3))
  draft.piety = Math.max(-100, Math.min(100, draft.piety + PILGRIM_PIETY))
  draft.pilgrimDay = day
  practice(draft, 'concentration', 30)
  const here = state.world.locations[state.locationId]?.name ?? 'святое место'
  notice(draft, `Ты дошёл до ${here} и стоял, пока не стемнело. Это помнят на небе и в людях.`)
  return close(draft)
}

function haggleWith(state: GameState, merchantId: string, push: HagglePush): CommandResult {
  const settlement = state.settlements[state.locationId]
  const merchant = settlement
    ? merchantById(state.world, state.settlements, state.locationId, merchantId, state)
    : null
  if (!merchant || !settlement) return fail('unavailableHere', 'Здесь такого купца нет.')
  const day = dayOf(state.time)
  const dealing = dealingWith(state, merchantId)
  if (dealing.haggledDay === day) {
    return fail('closed', `${merchant.name} уже наторговался с тобой на сегодня.`)
  }
  const draft = open(state)
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const result = haggle(merchant, tradeSkillAt(state), dealing.standing, push, roll)
  advance(draft, HAGGLE_MINUTES)
  practice(draft, 'trade', result.outcome === 'cut' ? 12 : 5)
  rememberDeal(draft, merchantId, {
    standing: result.standing,
    haggledDay: day,
    cut: result.cut,
  })
  notice(draft, `${merchant.name}: «${result.says}»`)
  return close(draft)
}

/** С какой милости лорда зовут на турнир. */
const TOURNEY_FAVOUR = 10

/** Сколько времени уходит на торг. */
const HAGGLE_MINUTES = 20

/** Купить у человека, а не у места (этап 49). */
function buyFrom(
  state: GameState,
  merchantId: string,
  good: GoodId,
  amount: number,
): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  const merchant = merchantById(state.world, state.settlements, state.locationId, merchantId, state)
  if (!merchant) return fail('unavailableHere', 'Здесь такого купца нет.')
  if (!merchant.goods.includes(good)) {
    return fail('noGoods', `${merchant.name} этим не торгует: он в ${rowWhere(merchant.rowId)}.`)
  }
  const dealing = dealingWith(state, merchantId)
  if (dealing.standing <= REFUSED) {
    return fail('shunned', `${merchant.name} с тобой больше не торгует.`)
  }
  const cut = dealing.haggledDay === dayOf(state.time) ? (dealing.cut ?? 0) : 0
  const tradeSkill = tradeSkillAt(state)
  const welcome = priceFactor(placeRep(state.reputation, state.locationId))

  let market = settlement
  let total = 0
  for (let i = 0; i < amount; i += 1) {
    if (market.stock[good] <= 1) {
      return fail('noGoods', `Столько у него нет: ${GOODS[good].label.toLowerCase()} в обрез.`)
    }
    total += merchantBuyPrice(
      state.world,
      market,
      merchant,
      good,
      tradeSkill,
      dealing.standing,
      cut,
    )
    market = withStock(market, good, -1)
  }
  total = Math.round(total * welcome)
  if (state.character.money < total) {
    return fail('noMoney', `Не хватает денег: нужно ${total}, есть ${state.character.money}.`)
  }
  const weight = GOODS[good].weight * amount
  const capacity = partyCapacity(state.character, state.party) + horseCarry(state.character)
  if (carriedWeight(state.character) + weight > capacity) {
    return fail('overloaded', 'Столько не унести — ни на себе, ни на людях.')
  }

  const draft = open(state)
  notice(draft, `У ${merchant.name}: ${GOODS[good].label.toLowerCase()}, ${amount} — за ${total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, -total)
  addGoods(draft, good, amount)
  draft.settlements = { ...draft.settlements, [state.locationId]: market }
  practice(draft, 'trade', Math.min(30, total * 0.12))
  rememberDeal(draft, merchantId, { standing: dealStanding(total), deals: 1 })
  return close(draft)
}

/** И продать ему же. */
function sellTo(state: GameState, merchantId: string, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  const merchant = merchantById(state.world, state.settlements, state.locationId, merchantId, state)
  if (!merchant) return fail('unavailableHere', 'Здесь такого купца нет.')
  if (!merchant.goods.includes(good)) {
    return fail('noGoods', `${merchant.name} этим не торгует: он в ${rowWhere(merchant.rowId)}.`)
  }
  if (carried(state.character, good) < amount) {
    return fail('noGoods', `У тебя нет столько: ${GOODS[good].label.toLowerCase()}.`)
  }
  const dealing = dealingWith(state, merchantId)
  if (dealing.standing <= REFUSED) {
    return fail('shunned', `${merchant.name} с тобой больше не торгует.`)
  }
  const cut = dealing.haggledDay === dayOf(state.time) ? (dealing.cut ?? 0) : 0
  const tradeSkill = tradeSkillAt(state)

  let market = settlement
  let total = 0
  for (let i = 0; i < amount; i += 1) {
    total += merchantSellPrice(
      state.world,
      market,
      merchant,
      good,
      tradeSkill,
      dealing.standing,
      cut,
    )
    market = withStock(market, good, 1)
  }

  const draft = open(state)
  notice(draft, `${merchant.name} берёт: ${GOODS[good].label.toLowerCase()}, ${amount} — ${total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, total)
  addGoods(draft, good, -amount)
  draft.settlements = { ...draft.settlements, [state.locationId]: market }
  practice(draft, 'trade', Math.min(30, total * 0.12))
  rememberDeal(draft, merchantId, { standing: dealStanding(total), deals: 1 })
  return close(draft)
}

/**
 * Сколько торговля прибавляет к расположению: крупная сделка помнится, мелкая
 * — нет. Потолок нарочно низкий: своим становятся за годы, а не за один обоз.
 */
function dealStanding(total: number): number {
  return Math.min(3, Math.max(1, Math.round(total / 400)))
}

/**
 * Чем церковь считает поступки (этап 51, Х4).
 *
 * Разорение города — тяжкий грех, набег — грех, брошенное слово — тоже.
 * Накормить голодного и пощадить пленных — то, за что и прощают.
 */
const PIETY_DEEDS: Readonly<Partial<Record<DeedId, number>>> = {
  sack: -18,
  raid: -8,
  abandonQuest: -5,
  starve: -6,
  feedHungry: 7,
  sparePrisoners: 6,
}

/** Ниже этого купец не подаёт руки. */
const REFUSED = -60

function rowWhere(rowId: string): string {
  const row = ROWS_BY_ID[rowId]
  return row ? row.label.toLowerCase() : 'своём ряду'
}

/** Запомнить встречу: память купца — единственное, что уходит от рынка в сейв. */
function rememberDeal(
  draft: Draft,
  merchantId: string,
  change: {
    standing?: number
    deals?: number
    haggledDay?: number
    cut?: number
  },
): void {
  const before = draft.dealings[merchantId] ?? NO_DEALING
  const next: Dealing = {
    standing: Math.max(-100, Math.min(100, before.standing + (change.standing ?? 0))),
    deals: before.deals + (change.deals ?? 0),
    ...(change.haggledDay !== undefined
      ? { haggledDay: change.haggledDay }
      : before.haggledDay !== undefined
        ? { haggledDay: before.haggledDay }
        : {}),
    ...(change.cut !== undefined
      ? { cut: change.cut }
      : before.cut !== undefined
        ? { cut: before.cut }
        : {}),
  }
  draft.dealings = { ...draft.dealings, [merchantId]: next }
}

/**
 * Взял задаток и не привёз.
 *
 * Обманутый купец помнит крепче, чем облагодетельствованный, — и не он один:
 * весь ряд стоит рядом и слышит. Поэтому память портится не у него одного, а у
 * всех купцов этого места, хоть и слабее (этап 49, Р4).
 */
function failedOrder(draft: Draft, merchantId: string): void {
  rememberDeal(draft, merchantId, { standing: -35 })
  const locationId = merchantId.split(':')[1] ?? ''
  for (const other of merchantsAt(draft.world, draft.settlements, locationId, draft)) {
    if (other.id === merchantId) continue
    rememberDeal(draft, other.id, { standing: -12 })
  }
  notice(draft, 'Задаток взят, товар не привезён. Весь ряд это запомнил.')
}

/**
 * Взять заказ купца (этап 49, Р3).
 *
 * Задаток вперёд — и потому подвести его дороже, чем не взяться: он помнит и
 * говорит другим.
 */
function takeOrder(state: GameState, merchantId: string): CommandResult {
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  const merchant = merchantById(state.world, state.settlements, state.locationId, merchantId, state)
  if (!merchant) return fail('unavailableHere', 'Здесь такого купца нет.')
  const day = dayOf(state.time)
  const order = orderFrom(state.world, settlement, merchant, day)
  if (!order) return fail('unavailableHere', `${merchant.name} нынче ни в чём не нуждается.`)
  const questId = `order:${merchant.id}`
  if (state.quests.some((quest) => quest.id === questId)) {
    return fail('invalid', 'Этот заказ у тебя уже есть.')
  }
  const dealing = dealingWith(state, merchantId)
  if (dealing.standing <= REFUSED) {
    return fail('shunned', `${merchant.name} тебе ничего не доверит.`)
  }

  const draft = open(state)
  advance(draft, 20)
  addMoney(draft, order.advance)
  draft.quests = [
    ...draft.quests,
    {
      id: questId,
      type: 'merchantOrder',
      issuerLocationId: state.locationId,
      targetLocationId: state.locationId,
      amount: order.amount,
      reward: order.reward,
      deadlineDay: day + order.days,
      progress: 0,
      good: order.good,
      merchantId: merchant.id,
    },
  ]
  notice(
    draft,
    `${merchant.name}: «${order.says}» — ${GOODS[order.good].label.toLowerCase()}, ${order.amount} мер, задаток ${order.advance}.`,
  )
  return close(draft)
}

/**
 * Расспросить о ценах (этап 49, Р6).
 *
 * Купец знает, почём его товар там, куда он его возит. Рассказывает не всякому:
 * чужому — общими словами, своему — с числами. Это та же записная книжка цен,
 * только заполненная устами, а не ногами.
 */
function askPrices(state: GameState, merchantId: string): CommandResult {
  const merchant = merchantById(state.world, state.settlements, state.locationId, merchantId, state)
  if (!merchant) return fail('unavailableHere', 'Здесь такого купца нет.')
  const dealing = dealingWith(state, merchantId)
  if (dealing.standing < 0) {
    return fail('shunned', `${merchant.name} о делах с тобой не говорит.`)
  }
  const tales = talesOf(state.world, state.settlements, merchant)
  if (tales.length === 0) return fail('unavailableHere', 'Ему и рассказать-то не о чем.')

  const draft = open(state)
  advance(draft, hours(1))
  const day = dayOf(draft.time)
  let log = draft.priceLog
  for (const tale of tales) {
    const known = log[tale.locationId] ?? {}
    const samples = [...(known[tale.good] ?? []), { day, price: tale.price }]
    log = { ...log, [tale.locationId]: { ...known, [tale.good]: samples } }
  }
  draft.priceLog = log
  const places = new Set(tales.map((tale) => tale.locationId))
  const names = [...places]
    .map((id) => state.world.locations[id]?.name ?? '')
    .filter(Boolean)
    .join(', ')
  rememberDeal(draft, merchantId, { standing: 1 })
  notice(draft, `${merchant.name} рассказал, почём нынче в: ${names}.`)
  return close(draft)
}

function buy(state: GameState, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')

  const tradeSkill = tradeSkillAt(state)
  // Своим уступают, чужих обдирают. Мнение короны о тебе читается здесь же
  // (этап 92, Па6): где тебя держат за врага, тебе всё дороже.
  const welcome =
    priceFactor(placeRep(state.reputation, state.locationId)) *
    opinionPrice(state, state.world, state.locationId, dayOf(state.time))
  const quote = quoteBuy(state.world, settlement, good, amount, tradeSkill)
  if (quote.amount < amount) {
    return fail('noGoods', `Столько тут не купить: ${GOODS[good].label.toLowerCase()} в обрез.`)
  }
  const total = Math.round(quote.total * welcome)
  if (state.character.money < total) {
    return fail('noMoney', `Не хватает денег: нужно ${total}, есть ${state.character.money}.`)
  }
  const weight = GOODS[good].weight * amount
  // Поклажу несут все: отряд, конь и своя спина.
  const capacity = partyCapacity(state.character, state.party) + horseCarry(state.character)
  if (carriedWeight(state.character) + weight > capacity) {
    return fail('overloaded', 'Столько не унести — ни на себе, ни на людях.')
  }

  const draft = open(state)
  notice(draft, `Куплено: ${GOODS[good].label.toLowerCase()}, ${amount} — за ${total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, -total)
  addGoods(draft, good, amount)
  draft.settlements = { ...draft.settlements, [state.locationId]: quote.settlement }
  practice(draft, 'trade', Math.min(30, quote.total * 0.12))
  return close(draft)
}

function sell(state: GameState, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  if (carried(state.character, good) < amount) {
    return fail('noGoods', `У тебя нет столько: ${GOODS[good].label.toLowerCase()}.`)
  }

  const tradeSkill = tradeSkillAt(state)
  const quote = quoteSell(state.world, settlement, good, amount, tradeSkill)
  // За твой товар здесь дают тем меньше, чем хуже о тебе думают (этап 92, Па6).
  const welcome = 2 - opinionPrice(state, state.world, state.locationId, dayOf(state.time))

  const total = Math.max(1, Math.round(quote.total * welcome))

  const draft = open(state)
  notice(draft, `Продано: ${GOODS[good].label.toLowerCase()}, ${amount} — за ${total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, total)
  addGoods(draft, good, -amount)
  draft.settlements = { ...draft.settlements, [state.locationId]: quote.settlement }
  practice(draft, 'trade', Math.min(30, total * 0.12))
  return close(draft)
}

function checkTradeRequest(good: GoodId, amount: number): CommandResult | null {
  if (!GOODS[good]) return fail('unknownAction', 'Такого товара нет.')
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  return null
}

function work(state: GameState, jobId: string, content: Content): CommandResult {
  const job = content.jobs[jobId]
  if (!job) return fail('unknownAction', 'Такой работы здесь нет.')
  const blocked =
    checkWelcome(state) ??
    checkFeast(state, 'не работают') ??
    checkPlace(state, job.where, 'Здесь такой работы нет.') ??
    checkWindow(state.time, job.window, 'На эту работу нанимают') ??
    checkRequirements(state.character, job.requires) ??
    checkFatigue(state.character, job.fatigue)
  if (blocked) return blocked

  // У работы есть хозяин (этап 50): он берёт или гонит, платит по-своему и
  // по-своему учит. Но только там, где есть кому нанимать: в глуши работают
  // сами на себя, и каменоломне всё равно, кто ты.
  const shifts = shiftsOf(state, jobId)
  const rank = rankOfShifts(shifts)
  // На сев, жатву и подёнщину берут всех (этап 67, Я1): у такой работы хозяина
  // нет — есть срок, и он не ждёт.
  const hired = state.settlements[state.locationId] !== undefined && job.openHands !== true
  const master = hired ? masterOf(state.locationId, job) : null
  if (master) {
    const welcome = placeRep(state.reputation, state.locationId)
    const hiring = masterHires(master, experienceOf(state), welcome)
    if (!hiring.hires) {
      return fail('requirements', `${master.name} (${craftMasterLabel(master)}): «${hiring.says}»`)
    }
  }
  // И цех: выше подмастерья чужого к делу не поставят (этап 50, М6).
  const cech = cechAt(state.world, state.settlements, state.locationId)
  if (!cechLets(cech, state.cech ?? null, job, rank, state.locationId)) {
    return fail(
      'requirements',
      `${cech?.label ?? 'Цех'} не пускает нецеховых к работе мастера. Вступай или иди подмастерьем.`,
    )
  }

  const draft = open(state)
  const efficiency = fatigueFactor(state.character.fatigue)
  const pay = Math.max(
    1,
    Math.round(
      job.pay *
        rank.pay *
        (master ? masterPay(master) : 1) *
        cechPay(cech, state.cech ?? null, job, state.locationId),
    ),
  )
  notice(draft, `Смена окончена: ${job.label.toLowerCase()} — ${rank.label}, ${pay}.`)
  advance(draft, job.durationMinutes)
  addMoney(draft, pay)
  addFatigue(draft, job.fatigue)
  const teaching = rank.practice * (master ? masterTeaches(master) : 1)
  for (const [skill, rawXp] of Object.entries(job.practice)) {
    practice(draft, skill as SkillId, (rawXp ?? 0) * efficiency * teaching)
  }
  // Смена зачтена: из числа смен и растёт ступень.
  draft.craft = { ...draft.craft, [jobId]: shifts + 1 }
  const grown = rankOfShifts(shifts + 1)
  if (grown.id !== rank.id) {
    notice(
      draft,
      master
        ? `${master.name}: «${masterPraises(master)}» Теперь ты ${grown.label}.`
        : `Руки помнят: теперь ты ${grown.label}.`,
    )
  }
  return close(draft)
}

function craftMasterLabel(master: ReturnType<typeof masterOf>): string {
  return CRAFT_MASTERS[master.temper].label
}

/**
 * Вступить в цех (этап 50, М6).
 *
 * Цех местный: он есть в ремесленном городе и кончается на его околице. Быть
 * можно в одном — как и в ордене.
 */
function joinCech(state: GameState): CommandResult {
  const cech = cechAt(state.world, state.settlements, state.locationId)
  if (!cech) return fail('unavailableHere', 'Цеха здесь нет: ремесло тут домашнее.')
  if (state.cech) {
    return state.cech.locationId === state.locationId
      ? fail('invalid', 'Ты уже в этом цехе.')
      : fail('invalid', 'Ты состоишь в цехе другого города. В двух не бывают.')
  }
  if (state.character.money < CECH_DUES) {
    return fail('noMoney', `Вступный взнос — ${CECH_DUES}.`)
  }
  const day = dayOf(state.time)
  const draft = open(state)
  addMoney(draft, -CECH_DUES)
  advance(draft, hours(2))
  draft.cech = {
    locationId: state.locationId,
    cechId: cech.id,
    since: day,
    paidUntil: day + CECH_DUES_DAYS,
  }
  notice(draft, `${cech.label} принял тебя. Взнос — ${CECH_DUES} раз в месяц.`)
  return close(draft)
}

function leaveCech(state: GameState): CommandResult {
  if (!state.cech) return fail('invalid', 'Ты ни в каком цехе не состоишь.')
  const draft = open(state)
  notice(draft, 'Ты вышел из цеха. Книгу закрыли без слов.')
  draft.cech = null
  return close(draft)
}

/**
 * Взять ученика (этап 50, М3).
 *
 * Мастерская без людей — это вложенные деньги; с учениками это дело. Каждый
 * прибавляет к обороту треть и портит работу примерно раз в месяц. Брать
 * может тот, кто сам мастер: подёнщику учить нечему.
 */
const APPRENTICE_FEE = 120
const APPRENTICE_LIMIT = 3

function takeApprentice(state: GameState): CommandResult {
  const workshop = state.enterprises.find(
    (one) => one.kind === 'workshop' && one.locationId === state.locationId,
  )
  if (!workshop) return fail('unavailableHere', 'Здесь у тебя нет мастерской.')
  const experience = experienceOf(state)
  const rank = rankOfShifts(experience)
  if (rank.id !== 'master') {
    return fail('requirements', `Учить может мастер, а ты ${rank.label}. Смен всего ${experience}.`)
  }
  const apprentices = workshop.apprentices ?? 0
  if (apprentices >= APPRENTICE_LIMIT) {
    return fail('noRoom', 'Больше трёх учеников у верстака не поставишь.')
  }
  if (state.character.money < APPRENTICE_FEE) {
    return fail('noMoney', `Ученика надо одеть и кормить: ${APPRENTICE_FEE}.`)
  }
  const draft = open(state)
  addMoney(draft, -APPRENTICE_FEE)
  advance(draft, hours(3))
  draft.enterprises = draft.enterprises.map((one) =>
    one.id === workshop.id ? { ...one, apprentices: apprentices + 1 } : one,
  )
  notice(draft, `Взят ученик: теперь их ${apprentices + 1}. Оборот прибавится, брака тоже.`)
  return close(draft)
}

/** Взносы цеха: не платишь — вычёркивают. Считается сутками, как и в ордене. */
function payCech(draft: Draft): void {
  const member = draft.cech
  if (!member) return
  const today = dayOf(draft.time)
  if (today < member.paidUntil) return
  if (draft.character.money >= CECH_DUES) {
    addMoney(draft, -CECH_DUES)
    draft.cech = { ...member, paidUntil: today + CECH_DUES_DAYS }
    return
  }
  notice(draft, 'Взнос в цех не уплачен: тебя вычеркнули из книги.')
  draft.cech = null
}

function study(state: GameState, courseId: string, content: Content): CommandResult {
  const course = content.courses[courseId]
  if (!course) return fail('unknownAction', 'Такого наставника здесь нет.')
  const blocked =
    checkWelcome(state) ??
    checkFeast(state, 'не учат') ??
    checkPlace(state, course.where, 'Такому здесь учить некому.') ??
    checkWindow(state.time, course.window, 'Занятия идут') ??
    checkRequirements(state.character, course.requires) ??
    checkMoney(state.character, course.cost) ??
    checkFatigue(state.character, course.fatigue)
  if (blocked) return blocked
  if (skillLevel(state.character, course.skill) >= course.teacherCap) {
    return fail(
      'maxed',
      `Этот наставник больше ничему не научит: его предел — ${SKILLS[course.skill].label} ${course.teacherCap}.`,
    )
  }

  const draft = open(state)
  const efficiency = fatigueFactor(state.character.fatigue)
  notice(draft, `Занятие: ${course.label.toLowerCase()}.`)
  advance(draft, course.durationMinutes)
  addMoney(draft, -course.cost)
  addFatigue(draft, course.fatigue)
  practice(draft, course.skill, course.xp * efficiency, 'teacher')
  return close(draft)
}

function takeExam(state: GameState, examId: string, content: Content): CommandResult {
  const exam = content.exams[examId]
  if (!exam) return fail('unknownAction', 'Такого испытания здесь не проводят.')
  const rank = MAGIC_RANKS[exam.rank]
  const character = state.character

  if (rankTier(character.magicRank) >= rank.tier) {
    return fail('rankNotEligible', `Ранг «${rank.label}» уже получен.`)
  }
  if (nextRank(character.magicRank) !== exam.rank) {
    return fail('rankNotEligible', 'Ступени лестницы не перепрыгивают — сначала предыдущий ранг.')
  }
  const magic = skillLevel(character, 'magic')
  if (magic < rank.requiredSkill) {
    return fail(
      'rankNotEligible',
      `Для испытания нужен навык «Магия» не ниже ${rank.requiredSkill} (сейчас ${magic}).`,
    )
  }
  // Испытание принимает школа, а не «столица» (этап 40): нужна та, чей глава
  // сам не ниже, и чтобы он был дома. И принимает его человек — со своей
  // памятью о тебе и своим нравом.
  const school = schoolAt(state.world, state.locationId)
  if (!school) return fail('unavailableHere', 'Здесь нет школы: некому принимать испытание.')
  if (rankTier(exam.rank) > rankTier(school.topRank)) {
    return fail(
      'unavailableHere',
      `Здесь выше «${MAGIC_RANKS[school.topRank].label}» не присваивают: некому.`,
    )
  }
  if (!canGrantHere(state, school, exam.rank)) {
    return fail('unavailableHere', `${school.master.name} в отъезде: старшие испытания ждут.`)
  }
  const stance = masterStance(state, school)
  if (stance === 'refuses') {
    return fail('shunned', `${school.master.name} тебя не примет: слишком много провалов.`)
  }
  // Самоучка платит вдвое: тот, кто учился сам, для школы чужак (DESIGN.md, п.4).
  const selfTaught = isSelfTaught(state)
  const fee = exam.cost * (selfTaught ? SELF_TAUGHT_FEE : 1)
  const blocked =
    checkPlace(state, exam.where, 'Здесь некому принимать испытание.') ??
    checkWindow(state.time, exam.window, 'Испытания проводят') ??
    checkRequirements(character, exam.requires) ??
    checkMoney(character, fee) ??
    checkFatigue(character, exam.fatigue)
  if (blocked) return blocked

  const draft = open(state)
  notice(draft, `${exam.label}: принимает ${school.master.name}, ${school.name}.`)
  advance(draft, exam.durationMinutes)
  addMoney(draft, -fee)
  addFatigue(draft, exam.fatigue)

  // Расположение главы двигает шанс: тёплому прощают, холодный спрашивает
  // строже. Самоучку спрашивают строже всегда.
  const attitude = masterAttitude(state, school.master)
  const bias = attitude / 400 - (selfTaught ? 0.1 : 0)
  const [passed, rng] = rollChance(
    draft.rng,
    Math.max(
      0.05,
      Math.min(0.98, examChance(magic, rank.requiredSkill, exam.comfortableMargin) + bias),
    ),
  )
  draft.rng = rng
  if (passed) {
    patch(draft, { magicRank: exam.rank })
    draft.events.push({ type: 'rankGranted', rank: exam.rank })
    // Школа помнит своих: с этого дня ты для неё не чужак.
    draft.reputation = withLordRep(draft.reputation, school.master.id, 10)
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 3)
    // Испытание с судьбой (этап 55, Н2): чем выше ступень, тем громче о ней
    // говорят, а посвящение в архоны — событие мира, а не запись в листе.
    const fame = Math.max(1, rankTier(exam.rank) - 2)
    draft.renown += fame
    if (exam.rank === 'archon') {
      notice(draft, 'Архон посвящён. Такое случается раз в поколение, и об этом узнают все короны.')
      draft.renown += 5
    } else if (fame > 1) {
      notice(draft, `${MAGIC_RANKS[exam.rank].label}: о таком говорят и за стенами школы.`)
    }
  } else {
    draft.events.push({ type: 'examFailed', rank: exam.rank })
    // Провал тоже чему-то учит — но дешевле было бы прийти подготовленным. И
    // его помнят: строгий — дольше всех.
    practice(draft, 'magic', 20)
    const grudge =
      school.master.temper === 'strict' ? -12 : school.master.temper === 'kind' ? -4 : -8
    draft.reputation = withLordRep(draft.reputation, school.master.id, grudge)
  }
  return close(draft)
}

/**
 * Шанс сдать: впритык к порогу — чуть лучше монетки, с запасом — почти наверняка.
 * Полной гарантии нет никогда: ранг дают люди.
 */
export function examChance(
  magicSkill: number,
  required: number,
  comfortableMargin: number,
): number {
  const ratio = Math.min(1, Math.max(0, (magicSkill - required) / comfortableMargin))
  return 0.4 + 0.55 * ratio
}

function rest(state: GameState, restHours: number): CommandResult {
  if (!Number.isFinite(restHours) || restHours <= 0 || restHours > MAX_REST_HOURS) {
    return fail('invalid', `Ждать можно от одного до ${MAX_REST_HOURS} часов.`)
  }
  const draft = open(state)
  notice(draft, `Ожидание: ${restHours} ч.`)
  advance(draft, hours(restHours))
  addFatigue(draft, -REST_RECOVERY_PER_HOUR * restHours)
  // Сюда же позже подключится прерывание на событие: пришёл наниматель,
  // начался экзамен, что-то случилось в городе (п.11.1).
  return close(draft)
}

function sleep(state: GameState): CommandResult {
  const wakeUp = nextTimeOfDay(state.time, 6)
  const slept = wakeUp - state.time
  const draft = open(state)
  // Дома спится лучше (этап 56): своя постель, своя дверь и никто не будит.
  const comfort = homeComfort(state)
  notice(draft, comfort > 0 ? 'Сон в своём доме до утра.' : 'Сон до утра.')
  advance(draft, slept)
  addFatigue(draft, (-SLEEP_RECOVERY_PER_HOUR * (1 + comfort) * slept) / MINUTES_PER_HOUR)
  // И раны дома заживают скорее: под крышей, на своей еде.
  const wound = draft.character.wound
  if (comfort > 0 && wound && wound.daysLeft > 1) {
    draft.character = { ...draft.character, wound: { ...wound, daysLeft: wound.daysLeft - 1 } }
  }
  return close(draft)
}

function spendSkillPoint(state: GameState, skillId: SkillId): CommandResult {
  if (!SKILLS[skillId]) return fail('unknownAction', 'Нет такого навыка.')
  if (state.character.unspentSkillPoints <= 0)
    return fail('noPoints', 'Нет свободных очков навыков.')
  const current = state.character.skills[skillId]
  if (current.level >= PROGRESSION.skillMax) return fail('maxed', 'Навык уже на пределе шкалы.')

  const draft = open(state)
  patch(draft, {
    unspentSkillPoints: state.character.unspentSkillPoints - 1,
    skills: { ...state.character.skills, [skillId]: { level: current.level + 1, xp: 0 } },
  })
  draft.events.push({ type: 'skillUp', skill: skillId, level: current.level + 1 })
  return close(draft)
}

function spendAttributePoint(state: GameState, attributeId: AttributeId): CommandResult {
  if (!ATTRIBUTE_LABELS[attributeId]) return fail('unknownAction', 'Нет такого атрибута.')
  if (state.character.unspentAttributePoints <= 0) {
    return fail('noPoints', 'Нет свободных очков атрибутов.')
  }
  const current = state.character.attributes[attributeId]
  if (current >= ATTRIBUTE_MAX) return fail('maxed', 'Атрибут уже на пределе.')

  const draft = open(state)
  patch(draft, {
    unspentAttributePoints: state.character.unspentAttributePoints - 1,
    attributes: { ...state.character.attributes, [attributeId]: current + 1 },
  })
  notice(draft, `${ATTRIBUTE_LABELS[attributeId]}: ${current + 1}.`)
  return close(draft)
}

// --- проверки --------------------------------------------------------------

/**
 * Дело можно начать только в своё окно. У большинства оно дневное, но есть
 * ночная работа — поэтому проверка не «сейчас ночь», а «сейчас не их часы».
 */
/**
 * Дело должно водиться в этом месте. Это и есть смысл дороги: за наставником,
 * за испытанием и за хорошей платой приходится идти туда, где они есть.
 */
function checkPlace(
  state: GameState,
  where: Availability | undefined,
  message: string,
): CommandResult | null {
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  // Живое население и нынешнее время года: работа бывает не только там, но и
  // тогда (этап 67, Я1).
  const population = state.settlements[state.locationId]?.population ?? here.population
  return isAvailableAt(where, here, population, seasonOf(dayOf(state.time)))
    ? null
    : fail('unavailableHere', message)
}

function checkWindow(
  time: GameTime,
  window: TimeWindow | undefined,
  what: string,
): CommandResult | null {
  const actual = window ?? DAY_WINDOW
  return isWithinWindow(time, actual) ? null : fail('closed', `${what} ${formatWindow(actual)}.`)
}

function checkMoney(character: Character, cost: number): CommandResult | null {
  return character.money < cost
    ? fail('noMoney', `Не хватает денег: нужно ${cost}, есть ${character.money}.`)
    : null
}

function checkFatigue(character: Character, cost: number): CommandResult | null {
  return character.fatigue + cost > FATIGUE_MAX
    ? fail('exhausted', 'Сил больше нет — сначала отдохнуть или выспаться.')
    : null
}

function checkRequirements(character: Character, requires?: Requirements): CommandResult | null {
  if (!requires) return null
  for (const [skill, needed] of Object.entries(requires.skills ?? {})) {
    const have = skillLevel(character, skill as SkillId)
    if (have < (needed ?? 0)) {
      return fail(
        'requirements',
        `Нужен навык «${SKILLS[skill as SkillId].label}» не ниже ${needed} (сейчас ${have}).`,
      )
    }
  }
  for (const tag of requires.tags ?? []) {
    if (!character.tags.includes(tag)) {
      return fail('requirements', 'Тебя сюда не возьмут: не та биография.')
    }
  }
  return null
}

function fail(code: FailureCode, message: string): CommandResult {
  return { ok: false, code, message }
}

// --- черновик изменений ----------------------------------------------------

/**
 * Изменения копятся в изменяемом черновике и один раз превращаются в новое
 * состояние. Снаружи движок остаётся чистой функцией: вход — состояние и
 * команда, выход — новое состояние и события.
 */
interface Draft {
  time: GameTime
  rng: Rng
  character: Character
  locationId: string
  journey: Journey | null
  settlements: Readonly<Record<string, Settlement>>
  party: Party
  ship: Ship | null
  cleansed: { readonly locationId: string; readonly untilDay: number } | null
  guild: Membership | null
  courtDay: number
  quarter: QuarterId | null
  knowledge: Knowledge | undefined
  dealings: Readonly<Record<string, Dealing>>
  craft: Readonly<Record<string, number>>
  cech: CechMembership | null
  piety: number
  pilgrimDay: number | undefined
  talked: Readonly<Record<string, number>>
  fallen: readonly { id: string; name: string; day: number; locationId: string }[]
  books: Readonly<Record<string, { read: boolean; days: number }>>
  home: Home | null
  upbringing: Readonly<Record<string, number>>
  student: { id: string; name: string; since: number; learned: number } | null
  battle: Battle | null
  politics: Politics
  /** Мир пополняется: места основывают, и скелет перестал быть вечным. */
  world: World
  plagues: readonly Plague[]
  priceLog: PriceLog
  chains: readonly ChainProgress[]
  doneChains: readonly string[]
  battlesWon: number
  searchedSites: readonly string[]
  bands: readonly Band[]
  companions: readonly Companion[]
  enterprises: readonly Enterprise[]
  service: string | null
  siege: Siege | null
  captives: readonly Captive[]
  orderSway: OrderSway
  law: Law
  pleas: Readonly<Record<string, { askId: string; askedDay: number }>>
  works: Readonly<Record<string, readonly BuildingId[]>>
  visits: Readonly<Record<string, number>>
  wilds: Readonly<Record<string, WildMemory>>
  potions: Readonly<Record<string, number>>
  ailment: { kind: Ailment; since: number } | null
  maims: readonly string[]
  lordDeeds: Readonly<Record<string, readonly LordDeedId[]>>
  oaths: Readonly<Record<string, Oath>>
  offices: Offices
  charters: Charters
  debts: readonly Debt[]
  queue: readonly QueuedWork[]
  crowned: Crowning | null
  claims: readonly Claim[]
  embassies: readonly Embassy[]
  treaties: readonly Treaty[]
  marriages: readonly RoyalMarriage[]
  spies: readonly Spy[]
  rumours: readonly { against: string; untilDay: number }[]
  congress: Congress | null
  congresses: readonly CongressRecord[]
  campaign: Campaign | null
  dispatches: readonly Dispatch[]
  garrisons: Readonly<Record<string, GarrisonOrder>>
  companies: readonly Company[]
  commission: Commission | null
  navy: readonly Warship[]
  blockades: readonly Blockade[]
  letter: Letter | null
  talks: Talks | null
  peaces: readonly PeaceRecord[]
  grievances: readonly Grievance[]
  overtures: readonly Overture[]
  pledges: readonly Pledge[]
  heirLaw: LawId
  pacts: readonly Pact[]
  churchAnger: number
  censure: Censure | null
  words: readonly Word[]
  audits: Readonly<Record<string, number>>
  gossip: readonly Talk[]
  looks: readonly Look[]
  trust: Readonly<Record<string, { readonly said: number; readonly lied: number }>>
  favours: Readonly<Record<string, number>>
  ruleLog: { readonly heard: number; readonly handed: number; readonly missed: number }
  settled: Readonly<Record<string, number>>
  houseBest: {
    readonly places: number
    readonly titleTier: number
    readonly shames: number
    readonly day: number
  }
  raised: number
  recognitions: Readonly<Record<string, number>>
  union: { readonly sinceDay: number } | null
  crownDebts: Readonly<Record<string, { readonly owed: number; readonly sinceDay: number }>>
  anointed: { readonly sinceDay: number } | null
  deeds: Readonly<Record<string, number>>
  dreadLog: Readonly<Record<string, { readonly score: number; readonly sinceDay: number }>>
  league: {
    readonly against: string
    readonly members: readonly string[]
    readonly sinceDay: number
  } | null
  leagueBought: Readonly<Record<string, number>>
  leagueLog: {
    readonly formed: number
    readonly bought: number
    readonly against: readonly string[]
  }
  guarantees: readonly {
    readonly by: string
    readonly of: string
    readonly sinceDay: number
    readonly brokenDay?: number
    readonly calledDay?: number
    readonly against?: string
  }[]
  hands: readonly { readonly patron: string; readonly ward: string; readonly sinceDay: number }[]
  given: Readonly<Record<string, number>>
  recalls: readonly { readonly by: string; readonly of: string; readonly day: number }[]
  quiet: { readonly sinceDay: number } | null
  wrongCalls: readonly {
    readonly against: string
    readonly day: number
    readonly shown?: number
  }[]
  crownWays: Readonly<
    Record<string, { readonly way: string; readonly sinceDay: number; readonly places: number }>
  >
  raceLog: {
    readonly steps: number
    readonly done: readonly string[]
    readonly shares?: Readonly<Record<string, number>>
  }
  theirEnd: { readonly who: string; readonly sinceDay: number; readonly served?: number } | null
  balanceLog: { readonly betrayals: number; readonly wars: number }
  reigns: Readonly<Record<string, number>>
  curves: Readonly<Record<string, readonly number[]>>
  taken: readonly {
    readonly id: string
    readonly name: string
    readonly by: string
    readonly since: number
    readonly ransom: number
  }[]
  ransomLog: { readonly taken: number; readonly freed: number; readonly paid: number }
  fallenLog: readonly { readonly name: string; readonly day: number; readonly places: number }[]
  legends: readonly {
    readonly name: string
    readonly fromDay: number
    readonly toDay: number
    readonly ending: string
    readonly says: string
  }[]
  exile: { readonly at: string; readonly sinceDay: number } | null
  annals: {
    readonly added: number
    readonly lastDay: number
    readonly remembered?: { readonly good: number; readonly bad: number }
  }
  era: {
    readonly id: string
    readonly sinceDay: number
    readonly untilDay: number
    readonly answer?: string
  } | null
  eraLog: readonly {
    readonly id: string
    readonly from: number
    readonly to: number
    readonly answer?: string
  }[]
  heirLog: { readonly kept: number; readonly changed: number }
  usedDay: Readonly<Record<string, number>>
  pathLog: {
    readonly byDoing: number
    readonly byTeacher: number
    readonly byBook: number
    readonly byTrial: number
    readonly byService: number
  }
  trials: Readonly<Record<string, number>>
  deceitLog: { readonly made: number; readonly worked: number; readonly caught: number }
  beliefs: Readonly<Record<string, { readonly value: number; readonly day: number }>>
  biasLog: { readonly held: number; readonly woke: number; readonly warsByError: number }
  guesses: Readonly<
    Record<string, { readonly aim: PlayerAim; readonly sinceDay: number; readonly right: boolean }>
  >
  tellSeen: Readonly<Record<string, number>>
  guessLog: {
    readonly made: number
    readonly right: number
    readonly wrong: number
    readonly confused: number
  }
  residents: readonly Resident[]
  residentLog: { readonly seated: number; readonly words: number; readonly lost: number }
  proofs: readonly Proof[]
  proofLog: {
    readonly got: number
    readonly shown: number
    readonly forged: number
    readonly caught: number
  }
  hushed: Readonly<Record<string, number>>
  secretLog: {
    readonly made: number
    readonly leaked: number
    readonly hushed: number
    readonly caught: number
  }
  learned: Readonly<Record<string, number>>
  showing: Readonly<Record<string, 'plain' | 'strong' | 'poor'>>
  envoyLog: {
    readonly sent: number
    readonly brought: number
    readonly offSum: number
    readonly guests: number
  }
  siegeLog: {
    readonly byKnowing: number
    readonly byWalls: number
    readonly bluffs: number
    readonly defectors: number
  }
  ruses: readonly Ruse[]
  ruseLog: { readonly made: number; readonly worked: number; readonly seen: number }
  fieldOrders: readonly FieldOrder[]
  intents: Readonly<Record<string, IntentId>>
  orderLog: {
    readonly sent: number
    readonly onTime: number
    readonly stale: number
    readonly ownWay: number
  }
  roles: Readonly<Record<string, HostRole>>
  scoutLog: { readonly learned: number; readonly spent: number }
  behests: readonly Behest[]
  behestLog: {
    readonly sent: number
    readonly full: number
    readonly twisted: number
    readonly none: number
  }
  factions: Readonly<Record<string, number>>
  spellcraft: Spellcraft
  weather: readonly Weather[]
  artifacts: readonly Artifact[]
  interdicts: readonly Interdict[]
  brotherhood: Brotherhood | null
  renown: number
  fame: Fame
  shames: readonly Shame[]
  goal: string | null
  milestones: readonly string[]
  house: readonly Generation[]
  marks: Marks
  reputation: Reputation
  realm: { name: string; sinceDay?: number } | null
  quests: readonly Quest[]
  over: boolean
  readonly base: GameState
  readonly events: GameEvent[]
}

function open(state: GameState): Draft {
  return {
    time: state.time,
    rng: state.rng,
    character: state.character,
    locationId: state.locationId,
    journey: state.journey,
    settlements: state.settlements,
    party: state.party,
    ship: state.ship,
    cleansed: state.cleansed ?? null,
    guild: state.guild,
    courtDay: state.courtDay ?? 0,
    quarter: state.quarter ?? null,
    knowledge: state.knowledge,
    dealings: state.dealings ?? {},
    craft: state.craft ?? {},
    cech: state.cech ?? null,
    piety: state.piety ?? 0,
    pilgrimDay: state.pilgrimDay,
    talked: state.talked ?? {},
    fallen: state.fallen ?? [],
    books: state.books ?? {},
    home: state.home ?? null,
    upbringing: state.upbringing ?? {},
    student: state.student ?? null,
    battle: state.battle,
    politics: state.politics,
    world: state.world,
    plagues: state.plagues,
    priceLog: state.priceLog,
    chains: state.chains,
    doneChains: state.doneChains,
    battlesWon: state.battlesWon,
    searchedSites: state.searchedSites,
    bands: state.bands,
    companions: state.companions,
    enterprises: state.enterprises,
    service: state.service,
    siege: state.siege,
    captives: state.captives ?? [],
    orderSway: state.orderSway ?? startSway(),
    law: lawOf(state),
    pleas: state.pleas ?? {},
    works: state.works ?? {},
    visits: state.visits ?? {},
    wilds: state.wilds ?? {},
    potions: state.potions ?? {},
    ailment: state.ailment ?? null,
    maims: state.maims ?? [],
    lordDeeds: state.lordDeeds ?? {},
    oaths: state.oaths ?? {},
    offices: state.offices ?? {},
    charters: state.charters ?? {},
    debts: state.debts ?? [],
    queue: state.queue ?? [],
    crowned: state.crowned ?? null,
    claims: state.claims ?? [],
    embassies: state.embassies ?? [],
    treaties: state.treaties ?? [],
    marriages: state.marriages ?? [],
    spies: state.spies ?? [],
    rumours: state.rumours ?? [],
    congress: state.congress ?? null,
    congresses: state.congresses ?? [],
    campaign: state.campaign ?? null,
    dispatches: state.dispatches ?? [],
    garrisons: state.garrisons ?? {},
    companies: state.companies ?? [],
    commission: state.commission ?? null,
    navy: state.navy ?? [],
    blockades: state.blockades ?? [],
    letter: state.letter ?? null,
    talks: state.talks ?? null,
    peaces: state.peaces ?? [],
    grievances: state.grievances ?? [],
    overtures: state.overtures ?? [],
    pledges: state.pledges ?? [],
    heirLaw: state.heirLaw ?? 'eldest',
    pacts: state.pacts ?? [],
    churchAnger: state.churchAnger ?? 0,
    censure: state.censure ?? null,
    words: state.words ?? [],
    audits: state.audits ?? {},
    gossip: state.gossip ?? [],
    looks: state.looks ?? [],
    trust: state.trust ?? {},
    favours: state.favours ?? {},
    ruleLog: state.ruleLog ?? { heard: 0, handed: 0, missed: 0 },
    settled: state.settled ?? {},
    houseBest: state.houseBest ?? { places: 0, titleTier: 0, shames: 0, day: 0 },
    raised: state.raised ?? 0,
    recognitions: state.recognitions ?? {},
    union: state.union ?? null,
    crownDebts: state.crownDebts ?? {},
    anointed: state.anointed ?? null,
    deeds: state.deeds ?? {},
    dreadLog: state.dreadLog ?? {},
    league: state.league ?? null,
    leagueBought: state.leagueBought ?? {},
    leagueLog: state.leagueLog ?? { formed: 0, bought: 0, against: [] },
    guarantees: state.guarantees ?? [],
    hands: state.hands ?? [],
    given: state.given ?? {},
    recalls: state.recalls ?? [],
    quiet: state.quiet ?? null,
    wrongCalls: state.wrongCalls ?? [],
    crownWays: state.crownWays ?? {},
    raceLog: state.raceLog ?? { steps: 0, done: [], shares: {} },
    theirEnd: state.theirEnd ?? null,
    balanceLog: state.balanceLog ?? { betrayals: 0, wars: 0 },
    reigns: state.reigns ?? {},
    curves: state.curves ?? {},
    taken: state.taken ?? [],
    ransomLog: state.ransomLog ?? { taken: 0, freed: 0, paid: 0 },
    fallenLog: state.fallenLog ?? [],
    legends: state.legends ?? [],
    exile: state.exile ?? null,
    annals: state.annals ?? { added: 0, lastDay: 0 },
    era: state.era ?? null,
    eraLog: state.eraLog ?? [],
    heirLog: state.heirLog ?? { kept: 0, changed: 0 },
    usedDay: state.usedDay ?? {},
    pathLog: state.pathLog ?? { byDoing: 0, byTeacher: 0, byBook: 0, byTrial: 0, byService: 0 },
    trials: state.trials ?? {},
    deceitLog: state.deceitLog ?? { made: 0, worked: 0, caught: 0 },
    beliefs: state.beliefs ?? {},
    biasLog: state.biasLog ?? { held: 0, woke: 0, warsByError: 0 },
    guesses: state.guesses ?? {},
    tellSeen: state.tellSeen ?? {},
    guessLog: state.guessLog ?? { made: 0, right: 0, wrong: 0, confused: 0 },
    residents: state.residents ?? [],
    residentLog: state.residentLog ?? { seated: 0, words: 0, lost: 0 },
    proofs: state.proofs ?? [],
    proofLog: state.proofLog ?? { got: 0, shown: 0, forged: 0, caught: 0 },
    hushed: state.hushed ?? {},
    secretLog: state.secretLog ?? { made: 0, leaked: 0, hushed: 0, caught: 0 },
    learned: state.learned ?? {},
    showing: state.showing ?? {},
    envoyLog: state.envoyLog ?? { sent: 0, brought: 0, offSum: 0, guests: 0 },
    siegeLog: state.siegeLog ?? { byKnowing: 0, byWalls: 0, bluffs: 0, defectors: 0 },
    ruses: state.ruses ?? [],
    ruseLog: state.ruseLog ?? { made: 0, worked: 0, seen: 0 },
    fieldOrders: state.fieldOrders ?? [],
    intents: state.intents ?? {},
    orderLog: state.orderLog ?? { sent: 0, onTime: 0, stale: 0, ownWay: 0 },
    roles: state.roles ?? {},
    scoutLog: state.scoutLog ?? { learned: 0, spent: 0 },
    behests: state.behests ?? [],
    behestLog: state.behestLog ?? { sent: 0, full: 0, twisted: 0, none: 0 },
    factions: state.factions ?? {},
    spellcraft: state.spellcraft ?? {},
    weather: state.weather ?? [],
    artifacts: state.artifacts ?? [],
    interdicts: state.interdicts ?? [],
    brotherhood: state.brotherhood ?? null,
    renown: state.renown,
    fame: state.fame ?? {},
    shames: state.shames ?? [],
    goal: state.goal ?? null,
    milestones: state.milestones ?? [],
    house: state.house ?? [],
    marks: state.marks ?? {},
    reputation: state.reputation,
    realm: state.realm,
    quests: state.quests,
    over: state.over,
    base: state,
    events: [],
  }
}

/**
 * Где архимаг держит мор (этап 60, А1).
 *
 * Если тот, кто отводит мор, стоит именно здесь, смерть идёт вполовину — как
 * при лекаре. Это и есть разница между «занят» и «занят чем-то».
 */
function wardingArchmage(politics: Politics, locationId: string): string | null {
  for (const mage of Object.values(politics.archmages)) {
    if (mage.deed === 'plague' && mage.locationId === locationId) return locationId
  }
  return null
}

/**
 * Год, который поправили (этап 60, А1 и А3).
 *
 * Ветер архимага ложится на всю его корону, позванный дождь — на провинцию, где
 * его звали. И то и другое считается на жатве и прибавляется к тому, что
 * выросло само.
 */
function blessedHarvest(draft: Draft): void {
  const world = draft.base.world
  const bonuses = new Map<string, number>()
  for (const mage of Object.values(draft.politics.archmages)) {
    if (mage.deed !== 'wind') continue
    for (const [id, settlement] of Object.entries(draft.settlements)) {
      if (kingdomOf(world, id)?.id !== mage.kingdomId) continue
      void settlement
      bonuses.set(id, (bonuses.get(id) ?? 0) + WIND_HARVEST)
    }
  }
  const today = dayOf(draft.time)
  for (const called of draft.weather) {
    if (called.kind !== 'rain' || called.untilDay < today) continue
    const province = world.locations[called.locationId]?.provinceId
    if (!province) continue
    for (const id of world.provinces[province]?.locationIds ?? []) {
      bonuses.set(id, (bonuses.get(id) ?? 0) + RAIN_HARVEST)
    }
  }
  if (bonuses.size === 0) return
  const next = { ...draft.settlements }
  for (const [id, bonus] of bonuses) {
    const settlement = next[id]
    if (!settlement) continue
    next[id] = { ...settlement, harvest: Math.round((settlement.harvest + bonus) * 100) / 100 }
  }
  draft.settlements = next
  const mine = bonuses.get(draft.locationId)
  if (mine !== undefined) {
    notice(draft, 'Год на этих полях вышел лучше, чем шёл. Об этом будут помнить.', 'world')
  }
}

function close(draft: Draft): CommandResult {
  // Вехи замечаются после всякого дела (этап 70, Ц2): не счётчик, а взгляд на
  // то, что в мире уже есть.
  markMilestones(draft)
  // Мир живёт вместе с игровым временем: сколько суток прошло, столько поселения
  // и досчитывают. Никаких фоновых таймеров — только детерминированный догон.
  const daysPassed = dayOf(draft.time) - dayOf(draft.base.time)
  if (daysPassed > 0) {
    // Сутки мира знают, какое нынче время года: зимой земля не родит, осенью
    // жнут (этап 37).
    const life = tickDays(
      draft.base.world,
      draft.settlements,
      daysPassed,
      LIFE,
      dayOf(draft.base.time),
    )
    draft.settlements = life.settlements
    draft.events.push(...worldNews(draft.base, draft.locationId, life.events))

    const politics = tickPolitics(
      draft.base.world,
      draft.politics,
      draft.settlements,
      dayOf(draft.time),
      draft.rng,
      // Своим архимагом игрок бывает только сам (этап 43).
      rankTier(draft.character.magicRank) >= MAGIC_RANKS.archmage.tier ? 'free' : 'busy',
      // Война объявляется расчётом, а не кубиком (этап 143, Рв0).
      (a, b) => warPressure(draft.base, draft.world, a, b, dayOf(draft.time)),
      // И кончается тоже расчётом (этап 163, Вс1): сколько зим она идёт, взята
      // ли цель, можно ли её ещё взять и давят ли со стороны.
      (war, when) => warReckon(draft.base, draft.world, war, when),
    )
    draft.rng = politics.rng
    draft.politics = politics.politics
    draft.settlements = politics.settlements
    draft.events.push(...warNews(draft.base, draft.locationId, politics.events))
    // Наследник знает тебя по рассказам (этап 66, Л3): милость к нему
    // начинается с половины отцовой, и дурное из неё помнится вдвое.
    for (const event of politics.events) {
      if (event.type !== 'lordDied') continue
      const regard = heirRegard(draft.base, event.lordId)
      if (regard !== 0) draft.reputation = withLordRep(draft.reputation, event.heirId, regard)
      // Дела отца сыну не в счёт: память о них уходит вместе с ним.
      if (draft.lordDeeds[event.lordId]) {
        const rest = { ...draft.lordDeeds }
        delete rest[event.lordId]
        draft.lordDeeds = rest
      }
    }

    // Дружины ходят по тем же суткам. Дней может пройти много — считаем каждый:
    // войско, прошедшее полстраны за один такт, — это опять телепорт.
    for (let i = 0; i < daysPassed; i += 1) {
      const march = tickBands(
        draft.base.world,
        draft.politics,
        draft.settlements,
        draft.bands,
        draft.rng,
        dayOf(draft.time),
        draft.garrisons,
        fightShares(draft.roles),
      )
      draft.bands = march.bands
      draft.settlements = march.settlements
      draft.politics = march.politics
      draft.rng = march.rng
      draft.events.push(...bandNews(draft.base, draft.locationId, march.events))
      // Что сделали твои части, ты узнаёшь не сразу (этап 84, Ка5): весть идёт
      // столько, сколько идёт гонец. Тем же считается и счёт кампании (Ка6).
      ownDispatches(draft, march.events)
    }

    // Позванная погода держится считанные сутки и уходит сама (этап 60, А3).
    const today = dayOf(draft.time)
    if (draft.weather.some((one) => one.untilDay < today)) {
      draft.weather = draft.weather.filter((one) => one.untilDay >= today)
    }

    // Ордена живут свою жизнь (этап 59, О3): растут на своих землях и сходятся
    // там, где стоят враждующие. Свара братьев людям дорога.
    for (let i = 0; i < daysPassed; i += 1) {
      const chapter = tickOrders(draft.base.world, draft.settlements, draft.orderSway, draft.rng)
      draft.orderSway = chapter.sway
      draft.settlements = chapter.settlements
      draft.rng = chapter.rng
      for (const clash of chapter.clashes) {
        if (clash.locationId !== draft.locationId) continue
        const a = orderById(clash.a)?.name ?? 'одни'
        const b = orderById(clash.b)?.name ?? 'другие'
        notice(draft, `${a} и ${b} сошлись прямо на улице. Людям это дорого.`, 'world')
      }
    }

    // Мор идёт своими сутками: он не ждёт, пока игрок что-то сделает.
    for (let i = 0; i < daysPassed; i += 1) {
      // Лекарь-спутник рядом — мор уносит на треть меньше там, где ты стоишь.
      const healer =
        bestSkill(draft.companions, 'healing').level >= 4 ||
        (draft.cleansed !== null &&
          draft.cleansed.untilDay >= dayOf(draft.time) &&
          draft.cleansed.locationId === draft.locationId)
          ? draft.locationId
          : // Архимаг, отводящий мор, держит смерть там, где стоит (этап 60, А1):
            // «занят» теперь значит чем-то и для тех, кто его никогда не видел.
            (wardingArchmage(draft.politics, draft.locationId) ?? null)
      const sick = tickPlague(draft.base.world, draft.settlements, draft.plagues, draft.rng, healer)
      draft.plagues = sick.plagues
      draft.settlements = sick.settlements
      draft.rng = sick.rng
      draft.events.push(...plagueNews(draft.base, draft.locationId, sick.events))
    }

    // Расселение считается раз в год: основание деревни — не суточное дело.
    const yearBefore = Math.floor(dayOf(draft.base.time) / DAYS_PER_YEAR)
    const yearNow = Math.floor(dayOf(draft.time) / DAYS_PER_YEAR)
    for (let year = yearBefore; year < yearNow; year += 1) {
      const settled = tickSettling(draft.world, draft.settlements, dayOf(draft.time), draft.rng)
      draft.world = settled.world
      draft.settlements = settled.settlements
      draft.rng = settled.rng
      draft.events.push(...settleNews(draft.world, draft.locationId, settled.events))
    }

    // Каким вышел год на земле — решается не на Новый год, а на жатве: в первый
    // день осени всё, что выросло, становится числом (этап 37). Недород —
    // единственное, что доводит до голода мир, в котором еды с запасом.
    if (crossedDayOfYear(dayOf(draft.base.time), dayOf(draft.time), HARVEST_DAY)) {
      const harvest = rollHarvest(draft.world, draft.settlements, draft.rng)
      draft.settlements = harvest.settlements
      draft.rng = harvest.rng
      draft.events.push(...harvestNews(draft.world, draft.locationId, harvest.events))
      // Позванная погода и ветер архимага правят год там, где их звали (этап
      // 60, А1 и А3). Считается на жатве, вместе со всем прочим.
      blessedHarvest(draft)
    }

    // Обозы купцов (этап 72, Ч3): товар в мире возят люди, и цены сходятся
    // оттого, что купец повёз, а не оттого, что так написано в таблице.
    const carts = tickTrade(
      draft.base.world,
      draft.settlements,
      dayOf(draft.base.time),
      dayOf(draft.time),
    )
    draft.settlements = carts.settlements
    for (const move of carts.moves) {
      if (move.fromId !== draft.locationId && move.toId !== draft.locationId) continue
      const where = draft.base.world.locations[move.toId]?.name ?? 'соседний торг'
      notice(
        draft,
        move.fromId === draft.locationId
          ? `Обоз ${move.name} ушёл в ${where}: ${move.load} мер.`
          : `Обоз ${move.name} пришёл с товаром: ${move.load} мер.`,
        'trade',
      )
    }

    // Замыслы орденов держатся пять лет (этап 72, Ч4): смена — событие мира, и
    // о нём слышно там, где у ордена дом.
    const era = aimEra(dayOf(draft.time))
    if (era !== aimEra(dayOf(draft.base.time))) {
      for (const order of ordersAt(draft.base.world, draft.locationId)) {
        const aim = orderAim(draft.base.world, order, dayOf(draft.time))
        notice(draft, `${order.name}: ${orderAimLabel(aim.want)}. ${aim.why}`, 'world')
      }
    }

    // Договоры корон: отношение, союзы, дань — и общий страх перед тем, кто
    // забрал слишком много.
    const talks = tickDiplomacy(
      draft.base.world,
      draft.politics,
      dayOf(draft.time),
      draft.rng,
      draft.settlements,
    )
    draft.politics = talks.politics
    draft.rng = talks.rng

    // Дела кормят каждый день, и каждый день их можно потерять.
    for (let i = 0; i < daysPassed; i += 1) {
      const trade = tickEnterprises(
        draft.base.world,
        draft.settlements,
        draft.enterprises,
        (enterprise) => {
          const manager = draft.companions.find((one) => one.id === enterprise.managerId)
          return manager?.skills.trade ?? 0
        },
        draft.rng,
        dayOf(draft.time),
      )
      draft.enterprises = trade.enterprises
      draft.rng = trade.rng
      if (trade.income !== 0) addMoney(draft, trade.income)
      for (const event of trade.events) {
        if (event.type === 'caravanRobbed') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'дорогой'
          notice(draft, `Обоз разграблен под ${where}.`, 'trade')
        }
        if (event.type === 'shipRaided') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'в море'
          notice(draft, `Твоё судно обобрали на подходе к ${where}: убыток ${event.lost}.`, 'trade')
        }
        if (event.type === 'shipSunk') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'в море'
          notice(draft, `Твоё судно не дошло до ${where}. Ни дела, ни корабля.`, 'trade')
        }
        if (event.type === 'workshopSpoiled') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'в мастерской'
          notice(draft, `Ученик запорол работу в ${where}: убыток ${event.lost}.`, 'trade')
        }
      }
    }

    // Войско ест каждый день, а донесения идут своим ходом (этап 84, Ка3 и Ка5).
    tickCampaign(draft, daysPassed)
    // То, на что не хватило внимания, решается без тебя (этап 107).
    tickDoorway(draft, daysPassed)
    // Приказы идут дорогой, исполняются чужими руками и возвращаются отчётом (этап 108).
    tickBehests(draft, daysPassed)
    // Дозорные глаза доносят, где видели чужие войска (этап 109).
    tickSightings(draft, daysPassed)
    // Дозоры и завесы едят серебро и людей каждый день (этап 110).
    tickEyes(draft, daysPassed)
    // Приказы доезжают до частей — и застают другую войну (этап 111).
    tickFieldOrders(draft, daysPassed)
    // Обманы живут, срабатывают и раскусываются (этап 112).
    tickRuses(draft, daysPassed)
    // Из осаждённого города по ночам кто-нибудь да перелезет (этап 113).
    tickDefectors(draft, daysPassed)
    // Чужие послы приезжают смотреть и уезжают с тем, что увидели (этап 114).
    tickGuests(draft, daysPassed)
    // Постоянные послы пишут, дорожают и попадаются (этап 117).
    tickResidents(draft, daysPassed)
    // Признали все или уже не все: срок объединения идёт или начинается заново (этап 131).
    tickUnion(draft, daysPassed)
    // Дом сверяется с лучшим своим днём: потеря — это то, что было и ушло (этап 132).
    tickHouse(draft, daysPassed)
    // Долги корон растут и отдаются, а высокий ранг берёт своё (этап 133).
    tickLevers(draft, daysPassed)
    // Церковь смотрит, свой ты ей государь или ещё нет (этап 134).
    tickAnoint(draft, daysPassed)
    // Молва разносит чужое продвижение, а короны считают, кто им опасен (этап 135).
    tickDread(draft, daysPassed)
    // И сходятся против того, кто ближе всех к концу (этап 136).
    tickLeague(draft, daysPassed)
    // За слабых ручаются, и на зов приходят или не приходят (этап 137).
    tickWard(draft, daysPassed)
    // А признание отзывают, когда отношения упали ниже дна (этап 138).
    tickAcclaim(draft, daysPassed)
    // Двор считает твоё продвижение по-своему, а чужая ошибка вскрывается (этап 139).
    tickPrimacy(draft, daysPassed)
    // А короны идут каждая своим путём — и меняют его, проиграв (этап 140).
    tickTheirWay(draft, daysPassed)
    // И гонка между ними идёт: шаги, спешка у конца и откат (этап 141).
    tickRace(draft, daysPassed)
    // А кто-нибудь может и дойти — без тебя (этап 142).
    tickTheirEnd(draft, daysPassed)
    // Равновесие рвёт союзы с тем, кто вырвался вперёд (этап 143).
    tickBalance(draft, daysPassed)
    // А государи сменяются, и путь либо переходит, либо переменяется (этап 144).
    tickHeirs(draft, daysPassed)
    // Раз в год мир берёт замер: из замеров складываются долгие кривые (этап 145).
    tickCurves(draft, daysPassed)
    // И эпохи приходят и уходят, меняя правила для всех (этап 146).
    tickEra(draft, daysPassed)
    // В плену бегут, а оставленный в плену помнит это (этап 150).
    tickRansom(draft, daysPassed)
    // И держава может кончиться совсем — а игрок нет (этап 151).
    tickFallen(draft, daysPassed)
    // Служба учит тому, чем служишь (этап 124, Пу6).
    tickService(draft, daysPassed)
    // А брошенное ржавеет (этап 125, Ц4).
    tickRust(draft, daysPassed)
    // Короны читают твои ходы и делают выводы (этап 119).
    tickGuesses(draft, daysPassed)
    // Они упорствуют в заблуждениях и прозревают (этап 120).
    tickBeliefs(draft, daysPassed)
    // И они обманывают нарочно (этап 121).
    tickDeceit(draft, daysPassed)
    // Двор просит, стареет и уходит (этап 104).
    tickCourtiers(draft, daysPassed)
    // Посланные смотреть возвращаются (этап 102).
    tickLooks(draft, daysPassed)
    // Молва ходит по местам и стихает сама (этап 101).
    tickGossip(draft, daysPassed)
    // Свои места отчитываются раз в месяц, и отчёт идёт своей дорогой (этап 100).
    tickReports(draft, daysPassed)
    // Чужие послы приезжают сами и уезжают, не дождавшись (этап 91).
    tickOvertures(draft, daysPassed)
    // Обиды зреют в поводы, а нарушенные миры уходят в летопись (этап 88).
    tickPeace(draft, daysPassed)
    // Флот ест содержание, суда сходят со стапеля, запертые гавани беднеют
    // (этап 87, Ф1 и Ф4).
    tickNavy(draft, daysPassed)
    // Роты служат, требуют жалованья и уходят к тому, кто платит больше
    // (этап 86, Н2 и Н3); без нанимателя они кормятся разбоем (Н5).
    tickCompanies(draft, daysPassed)
    // Съезд собирается в назначенный день (этап 83, Е4).
    holdCongress(draft)
    // Соглядатаев берут за руку, а слухи стихают (этап 82, С4 и С6).
    tickSpies(draft, daysPassed)
    // Колена корон сменяются сами (этап 81, Р3): у соседей новый государь.
    tickSuccession(draft, daysPassed)
    // Договоры кончаются сами, а тайное становится явным (этап 80, Г2 и Г5).
    tickTreaties(draft, daysPassed)
    // Посольства возвращаются с ответом (этап 79, П1).
    returnEmbassies(draft)
    // Казна державы (этап 77): долги растут сами, очередь строек идёт по мере
    // денег, а пустая казна видна в мире.
    tickTreasury(draft, daysPassed)
    // Закон державы ложится на людей (этап 76, З5) и подводит итог раз в год (З6).
    realmLife(draft, daysPassed)
    // Свои люди возвращаются из поездок (этап 75, Д5): с серебром, с людьми,
    // с чужим словом или с тем, что на дорогах стало тише.
    returnOfficers(draft)
    // Церковь ведёт свой счёт и отвечает по нему (этап 96).
    tickChurch(draft, daysPassed)
    // Города считают свой хлеб и свои пошлины (этап 95).
    tickCities(draft, daysPassed)
    // Твоя знать говорит между собой, и разговоры зреют (этап 94).
    tickRevolt(draft, daysPassed)
    // Верность своих лордов ходит сама (этап 74, В4): подать, суд, война, позор
    // и соседи — всё, что вассал видит у себя во дворе.
    tickVassals(draft, daysPassed)
    payUpkeep(draft, daysPassed)
    expireQuests(draft)
    growOlder(draft, daysPassed)
    healAndFree(draft, daysPassed)
  }

  advanceChains(draft)

  // Записная книжка купца: цены там, где стоишь, и там, где стоит караван.
  const today = dayOf(draft.time)
  draft.priceLog = recordPrices(
    draft.priceLog,
    draft.base.world,
    draft.settlements[draft.locationId],
    today,
  )
  for (const enterprise of draft.enterprises) {
    if (enterprise.kind !== 'caravan' || enterprise.travel) continue
    draft.priceLog = recordPrices(
      draft.priceLog,
      draft.base.world,
      draft.settlements[enterprise.locationId],
      today,
    )
  }

  const state: GameState = {
    ...draft.base,
    world: draft.world,
    plagues: draft.plagues,
    priceLog: draft.priceLog,
    chains: draft.chains,
    doneChains: draft.doneChains,
    battlesWon: draft.battlesWon,
    searchedSites: draft.searchedSites,
    time: draft.time,
    rng: draft.rng,
    character: draft.character,
    locationId: draft.locationId,
    journey: draft.journey,
    settlements: draft.settlements,
    party: draft.party,
    ship: draft.ship,
    cleansed: draft.cleansed,
    guild: draft.guild,
    courtDay: draft.courtDay,
    quarter: draft.quarter,
    ...(draft.knowledge ? { knowledge: draft.knowledge } : {}),
    dealings: draft.dealings,
    craft: draft.craft,
    cech: draft.cech,
    piety: draft.piety,
    talked: draft.talked,
    fallen: draft.fallen,
    books: draft.books,
    home: draft.home,
    upbringing: draft.upbringing,
    student: draft.student,
    ...(draft.pilgrimDay !== undefined ? { pilgrimDay: draft.pilgrimDay } : {}),
    battle: draft.battle,
    politics: draft.politics,
    bands: draft.bands,
    companions: draft.companions,
    enterprises: draft.enterprises,
    service: draft.service,
    siege: draft.siege,
    captives: draft.captives,
    orderSway: draft.orderSway,
    law: draft.law,
    pleas: draft.pleas,
    works: draft.works,
    visits: draft.visits,
    wilds: draft.wilds,
    potions: draft.potions,
    ailment: draft.ailment,
    maims: draft.maims,
    lordDeeds: draft.lordDeeds,
    oaths: draft.oaths,
    offices: draft.offices,
    charters: draft.charters,
    debts: draft.debts,
    queue: draft.queue,
    crowned: draft.crowned,
    claims: draft.claims,
    embassies: draft.embassies,
    treaties: draft.treaties,
    marriages: draft.marriages,
    spies: draft.spies,
    rumours: draft.rumours,
    congress: draft.congress,
    congresses: draft.congresses,
    campaign: draft.campaign,
    dispatches: draft.dispatches,
    garrisons: draft.garrisons,
    companies: draft.companies,
    commission: draft.commission,
    navy: draft.navy,
    blockades: draft.blockades,
    letter: draft.letter,
    talks: draft.talks,
    peaces: draft.peaces,
    grievances: draft.grievances,
    overtures: draft.overtures,
    pledges: draft.pledges,
    heirLaw: draft.heirLaw,
    pacts: draft.pacts,
    churchAnger: draft.churchAnger,
    censure: draft.censure,
    words: draft.words,
    audits: draft.audits,
    gossip: draft.gossip,
    looks: draft.looks,
    trust: draft.trust,
    favours: draft.favours,
    ruleLog: draft.ruleLog,
    settled: draft.settled,
    houseBest: draft.houseBest,
    raised: draft.raised,
    recognitions: draft.recognitions,
    union: draft.union,
    crownDebts: draft.crownDebts,
    anointed: draft.anointed,
    deeds: draft.deeds,
    dreadLog: draft.dreadLog,
    league: draft.league,
    leagueBought: draft.leagueBought,
    leagueLog: draft.leagueLog,
    guarantees: draft.guarantees,
    hands: draft.hands,
    given: draft.given,
    recalls: draft.recalls,
    quiet: draft.quiet,
    wrongCalls: draft.wrongCalls,
    crownWays: draft.crownWays,
    raceLog: draft.raceLog,
    theirEnd: draft.theirEnd,
    balanceLog: draft.balanceLog,
    reigns: draft.reigns,
    curves: draft.curves,
    taken: draft.taken,
    ransomLog: draft.ransomLog,
    fallenLog: draft.fallenLog,
    legends: draft.legends,
    exile: draft.exile,
    annals: draft.annals,
    era: draft.era,
    eraLog: draft.eraLog,
    heirLog: draft.heirLog,
    usedDay: draft.usedDay,
    pathLog: draft.pathLog,
    trials: draft.trials,
    deceitLog: draft.deceitLog,
    beliefs: draft.beliefs,
    biasLog: draft.biasLog,
    guesses: draft.guesses,
    tellSeen: draft.tellSeen,
    guessLog: draft.guessLog,
    residents: draft.residents,
    residentLog: draft.residentLog,
    proofs: draft.proofs,
    proofLog: draft.proofLog,
    hushed: draft.hushed,
    secretLog: draft.secretLog,
    learned: draft.learned,
    showing: draft.showing,
    envoyLog: draft.envoyLog,
    siegeLog: draft.siegeLog,
    ruses: draft.ruses,
    ruseLog: draft.ruseLog,
    fieldOrders: draft.fieldOrders,
    intents: draft.intents,
    orderLog: draft.orderLog,
    roles: draft.roles,
    scoutLog: draft.scoutLog,
    behests: draft.behests,
    behestLog: draft.behestLog,
    factions: draft.factions,
    spellcraft: draft.spellcraft,
    weather: draft.weather,
    artifacts: draft.artifacts,
    interdicts: draft.interdicts,
    brotherhood: draft.brotherhood,
    renown: draft.renown,
    fame: draft.fame,
    shames: draft.shames,
    goal: draft.goal,
    milestones: draft.milestones,
    house: draft.house,
    marks: draft.marks,
    reputation: draft.reputation,
    realm: draft.realm,
    quests: draft.quests,
    over: draft.over,
    log: appendLog(draft.base.log, draft.time, draft.events),
  }
  return { ok: true, state, events: draft.events }
}

/**
 * Новости мира попадают в журнал, только если случились по соседству.
 * Игроку незачем знать о голоде на другом конце света: он бы о нём и не услышал.
 */
function worldNews(
  state: GameState,
  locationId: string,
  events: readonly LifeEvent[],
): readonly GameEvent[] {
  if (events.length === 0) return []
  const here = regionOf(state.world, locationId)
  const news: GameEvent[] = []
  for (const event of events) {
    if (!here || regionOf(state.world, event.locationId)?.id !== here.id) continue
    const name = state.world.locations[event.locationId]?.name ?? 'где-то рядом'
    news.push({
      type: 'notice',
      text:
        event.type === 'famine'
          ? `Голод в ${name}: умерло ${event.deaths}.`
          : `${name} опустел — жители разошлись.`,
    })
  }
  return news
}

/** Война и разорение — новости того же порядка, что голод: слышно по соседству. */
/**
 * Что из походов лордов доходит до игрока.
 *
 * Мир большой, и вываливать в журнал каждый шаг каждой дружины — значит
 * похоронить в нём всё остальное. Слышно то, что случилось в своей области,
 * и то, что меняет карту: взятые места и конец мятежа.
 */
function bandNews(
  state: GameState,
  locationId: string,
  events: readonly BandEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const here = regionOf(state.world, locationId)?.id
  const near = (id: string) => regionOf(state.world, id)?.id === here
  const placeName = (id: string) => state.world.locations[id]?.name ?? 'соседнее селение'
  const lordName = (id: string) => {
    const lord = lordById(state.politics, id)
    return lord ? `${lord.title} ${lord.name}` : 'неизвестный владетель'
  }

  for (const event of events) {
    if (event.type === 'bandRaid') {
      if (!near(event.locationId)) continue
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${placeName(event.locationId)} разорено: уведено и убито ${event.lost}.`,
      })
    } else if (event.type === 'bandSiege') {
      if (!near(event.locationId)) continue
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${placeName(event.locationId)} обложено войском.`,
      })
    } else if (event.type === 'bandTook') {
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${placeName(event.locationId)} взято: место перешло к ${lordName(
          state.bands.find((band) => band.id === event.bandId)?.lordId ?? '',
        )}.`,
      })
    } else if (event.type === 'bandClash') {
      if (!near(event.locationId)) continue
      news.push({
        type: 'notice',
        kind: 'war',
        text: `Под ${placeName(event.locationId)} сошлись дружины: ${lordName(
          event.winner,
        )} одолел, полегло ${event.fallen}.`,
      })
    } else if (event.type === 'lordSubmits') {
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${lordName(event.lordId)} разбит и снова присягнул короне.`,
      })
    } else if (event.type === 'lordFell') {
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${lordName(event.lordId)} пал, и род его пресёкся.`,
      })
    }
  }
  return news
}

function warNews(
  state: GameState,
  locationId: string,
  events: readonly WarEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const hereKingdom = kingdomOf(state.world, locationId)?.id
  const kingdomName = (id: string) =>
    state.world.kingdoms[id]?.name ?? lordById(state.politics, id)?.name ?? 'неизвестные'

  for (const event of events) {
    if (event.type === 'rebellion') {
      const lord = lordById(state.politics, event.lordId)
      news.push({
        type: 'notice',
        kind: 'war',
        text: lord
          ? `${lord.title} ${lord.name} поднял мятеж против короны.`
          : 'Один из вассалов поднял мятеж.',
      })
      continue
    }

    if (event.type === 'archmage') {
      // О своём архимаге слышно, о чужом — нет.
      if (event.kingdomId !== hereKingdom) continue
      const words = {
        free: 'архимаг короны снова при дворе',
        busy: 'архимаг короны занят своими делами',
        refused: 'архимаг короны отказался служить',
      }
      news.push({ type: 'notice', kind: 'war', text: `Говорят, ${words[event.state]}.` })
      continue
    }

    // Архимаг взялся за дело (этап 60, А1): «занят» теперь значит чем-то.
    if (event.type === 'archmageDeed') {
      const deed = ARCHMAGE_DEED_LABELS[event.deed]
      news.push({
        type: 'notice',
        kind: 'war',
        text: `Архимаг короны ${kingdomName(event.kingdomId)}: ${deed.label}. ${deed.about}`,
      })
      continue
    }

    // Лорд умер (этап 64, Ж6): земля перешла наследнику, и он уже другой человек.
    if (event.type === 'lordDied') {
      const heir = lordById(state.politics, event.heirId)
      news.push({
        type: 'notice',
        kind: 'people',
        text: heir
          ? `${event.name} умер. Землю принял ${heir.title} ${heir.name}.`
          : `${event.name} умер, и его земля осталась без хозяина.`,
      })
      continue
    }

    if (event.type === 'tribute') {
      const { from, to, perDay } = event.tribute
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${kingdomName(from)} платит дань короне ${kingdomName(to)}: ${perDay} в день.`,
      })
      continue
    }

    const involved = event.war.a === hereKingdom || event.war.b === hereKingdom
    const names = `${kingdomName(event.war.a)} и ${kingdomName(event.war.b)}`
    news.push({
      type: 'notice',
      kind: 'war',
      text:
        event.type === 'warDeclared'
          ? involved
            ? `Война: ${names}. Причина — ${event.war.reason}.`
            : `Говорят, ${names} схватились: ${event.war.reason}.`
          : `Мир между ${names}.`,
    })
  }
  return news
}

/**
 * Содержание отряда: жалованье и еда каждые сутки.
 *
 * Это и есть главный ограничитель войска: нанять дешевле, чем водить. Голодный
 * и неоплаченный отряд теряет дух и расходится сам — без всяких запретов.
 */
/**
 * Верность вассалов за прошедшие сутки (этап 74, В4).
 *
 * Не бросок и не «отношение к сюзерену»: понятные вещи, которые вассал видит у
 * себя, — твоя подать, оставлен ли ему суд, зовут ли его на твою войну, что о
 * тебе говорят и с кем ему тесно. Считается раз в такт и на всех сразу.
 */
/**
 * Свои люди возвращаются (этап 75, Д5).
 *
 * Поручение кончается само, в тот день, на который уезжали, и приносит то, ради
 * чего посылали: серебро недоимок, поднятых людей, чужое слово или тишину на
 * дорогах. Пока он в дороге, его должность пуста — это и есть цена.
 */
/**
 * Закон державы в людях и год державы (этап 76, З5 и З6).
 *
 * Память мест ходит от того, как ты берёшь и что ты им дал: тяжёлая подать
 * помнится, вольность помнится дольше. Раз в год — итог: сколько принесло,
 * сколько съело и кто этим недоволен.
 */
/**
 * Казна державы за сутки (этап 77, К4, К5 и К6).
 *
 * Долг растёт сам и не ждёт, пока о нём вспомнят; очередь строек идёт по мере
 * денег — казна платит понемногу, и стройка стоит, пока платить нечем; пустая
 * казна расходит гарнизоны и портит память тех мест, где им не платят.
 */
/**
 * Договоры за прошедшие сутки (этап 80, Г2 и Г5).
 *
 * Срок выходит сам, без напоминаний: бумага перестаёт держать, и об этом
 * узнаёшь в тот день, когда это случилось. Тайная статья живёт, пока о ней
 * знают двое, — и чем дольше она живёт, тем больше людей успело узнать.
 */
/**
 * Смена колена на чужих коронах (этап 81, Р3).
 *
 * Государь правит свой век и уступает место наследнику; у наследника свой нрав,
 * и половину отцовых обид он не наследует. Бездетный дом — событие для всех
 * соседей: на такой трон найдётся кому заявить право.
 */
/**
 * Соглядатаи за прошедшие сутки (этап 82, С4 и С6).
 *
 * Свои люди едят жалованье и однажды попадаются: чем дольше человек сидит, тем
 * вернее его возьмут. Взятого не спасают — за него отвечает тот, кто его послал:
 * отношение, имя, а иногда и война.
 */
/**
 * Съезд собирается (этап 83, Е4 и Е5).
 *
 * Голоса считаются в день съезда: из замыслов корон, из отношений и из того, что
 * уплачено. Решение связывает и тех, кто был против, — потому оно и дороже
 * договора: нарушить его значит пойти против всех сразу.
 */
/**
 * Кампания за прошедшие сутки (этап 84, Ка3, Ка5 и Ка6).
 *
 * Войско ест: своя земля кормит из амбаров, чужая — только если с неё берут, и
 * округа это помнит. Голодное войско теряет дух и людей. Донесения приходят с
 * запозданием — столько, сколько идёт весть от того места до тебя.
 */
/**
 * Донесения от своих частей (этап 84, Ка5 и Ка6).
 *
 * Взятое место, разорённая округа, проигранная стычка — всё это случилось там,
 * где стоит часть, а узнаёшь ты об этом тогда, когда доедет гонец. Заодно здесь
 * же ведётся счёт кампании: что взято и сколько своих потеряно.
 */
function ownDispatches(draft: Draft, events: readonly BandEvent[]): void {
  const mine = new Set(draft.bands.filter((one) => one.lordId === PLAYER).map((one) => one.id))
  if (mine.size === 0) return
  const day = dayOf(draft.time)
  const waiting = [...dispatchesOf(draft)]
  const campaign = campaignOf(draft)
  let taken = campaign?.taken ?? 0
  let lost = campaign?.lost ?? 0
  const name = (id: string) => draft.base.world.locations[id]?.name ?? 'место'

  for (const event of events) {
    if (event.type === 'bandTook' && mine.has(event.bandId)) {
      taken += 1
      waiting.push({
        day: day + dispatchDelay(draft.base.world, event.locationId, draft.locationId),
        text: `Донесение: ${name(event.locationId)} взято твоими людьми.`,
      })
      continue
    }
    if (event.type === 'bandRaid' && mine.has(event.bandId)) {
      waiting.push({
        day: day + dispatchDelay(draft.base.world, event.locationId, draft.locationId),
        text: `Донесение: округа ${name(event.locationId)} разорена, уведено ${event.lost}.`,
      })
      continue
    }
    if (event.type === 'bandClash') {
      const won = mine.has(event.winner) || event.winner === PLAYER
      const beaten = event.loser === PLAYER
      if (!won && !beaten) continue
      if (beaten) lost += event.fallen
      waiting.push({
        day: day + dispatchDelay(draft.base.world, event.locationId, draft.locationId),
        text: won
          ? `Донесение: твои побили чужих у ${name(event.locationId)}; полегло ${event.fallen}.`
          : `Донесение: твоя часть разбита у ${name(event.locationId)}; потеряно ${event.fallen}.`,
      })
    }
  }
  if (waiting.length !== dispatchesOf(draft).length) draft.dispatches = waiting
  if (campaign && (taken !== campaign.taken || lost !== campaign.lost)) {
    draft.campaign = { ...campaign, taken, lost }
  }
}

function tickCampaign(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)

  // 1. Донесения, которым срок дойти.
  const waiting = dispatchesOf(draft)
  if (waiting.length > 0) {
    const arrived = waiting.filter((one) => one.day <= day)
    if (arrived.length > 0) {
      draft.dispatches = waiting.filter((one) => one.day > day)
      for (const one of arrived) notice(draft, one.text, 'war')
    }
  }

  // 2. Итог кампании: война кончилась — кончилась и она. Считается прежде
  // снабжения: кампания кончается и у того, у кого войска на карте нет.
  const done = campaignOf(draft)
  if (done && !atWar(draft.politics, PLAYER, done.against)) {
    const report = campaignReport(draft.base, done, day)
    draft.campaign = null
    notice(draft, `Кампания кончена. ${report.says}`, 'war')
  }

  const hosts = hostsOf(draft)
  if (hosts.length === 0) return

  // 3. Снабжение.
  let places = draft.settlements
  const fedBands: Band[] = []
  for (const host of hosts) {
    const supply = supplyOf(draft.base, draft.base.world, host, day)
    const eats = supply.needs * days
    if (supply.kind === 'depot' && supply.fromId) {
      const depot = places[supply.fromId]
      if (depot) {
        places = {
          ...places,
          [supply.fromId]: {
            ...depot,
            stock: { ...depot.stock, grain: Math.max(0, depot.stock.grain - eats) },
          },
        }
      }
      fedBands.push(host)
      continue
    }
    if (supply.kind === 'forage' && supply.fromId) {
      const here = places[supply.fromId]
      if (here) {
        places = {
          ...places,
          [supply.fromId]: {
            ...here,
            stock: { ...here.stock, grain: Math.max(0, here.stock.grain - eats) },
            banditry: Math.min(1, here.banditry + SUPPLY.forageBanditry * days),
          },
        }
        draft.reputation = withPlaceRep(draft.reputation, supply.fromId, SUPPLY.forageMood * days)
      }
      fedBands.push(host)
      continue
    }
    // Берег кормится с моря (этап 87, Ф3): пока гавань за тобой и флот на
    // плаву, десанту везут. Отрезали — и он голодает, как всякое войско.
    const sea = seaSupplied(draft.base, draft.base.world, host, day)
    if (sea.fed) {
      fedBands.push(host)
      continue
    }
    // Нечего есть: дух и люди.
    const size = bandSize(host)
    const lost = Math.max(1, Math.round(size * SUPPLY.hungryLoss * days))
    const units: Record<string, number> = { ...host.units }
    let left = lost
    for (const troop of Object.keys(units) as TroopId[]) {
      const had = units[troop] ?? 0
      const takes = Math.min(had, left)
      units[troop] = had - takes
      left -= takes
      if (left <= 0) break
    }
    fedBands.push({
      ...host,
      units,
      morale: Math.max(0, host.morale - SUPPLY.hungryMorale * days),
    })
    notice(draft, `Войску нечего есть: ${lost - left} человек ушло, дух падает.`, 'war')
  }
  draft.settlements = places
  if (fedBands.length > 0) {
    const byId = new Map(fedBands.map((one) => [one.id, one]))
    draft.bands = draft.bands.map((one) => byId.get(one.id) ?? one)
  }
  // Части без людей на карте не стоят.
  draft.bands = draft.bands.filter((one) => one.lordId !== PLAYER || bandSize(one) > 0)
}

function holdCongress(draft: Draft): void {
  const congress = draft.congress
  if (!congress) return
  const day = dayOf(draft.time)
  if (congress.meetDay > day) return
  const count = tally(draft.base, draft.base.world, congress, day)
  const def = questionDef(congress.question)
  draft.congress = null
  draft.congresses = [
    ...congressesOf(draft),
    {
      day,
      question: congress.question,
      passed: count.passed,
      guests: congress.guests.length,
      ...(congress.about ? { about: congress.about } : {}),
    },
  ]
  if (!count.passed) {
    notice(
      draft,
      `Съезд разошёлся ни с чем: за ${def.label} ${count.yes} голосов из ${count.needs}.`,
      'world',
    )
    return
  }
  notice(
    draft,
    `Съезд решил: ${def.label} — ${count.yes} голосов против ${count.no}. ${def.does}.`,
    'world',
  )
  draft.renown += 3
  const day0 = day

  if (congress.question === 'peace') {
    // Общий мир: кончаются все войны, какие идут между приехавшими.
    const kept = draft.politics.wars.filter(
      (war) => !(congress.guests.includes(war.a) || congress.guests.includes(war.b)),
    )
    const ended = draft.politics.wars.length - kept.length
    draft.politics = { ...draft.politics, wars: kept }
    if (ended > 0)
      notice(draft, `Кончено войн: ${ended}. Начавший снова начнёт против всех.`, 'war')
    return
  }
  if (congress.question === 'commonFoe' && congress.about) {
    // Союз против сильного: приехавшие встают вместе, и ты с ними.
    const foe = congress.about
    draft.politics = {
      ...draft.politics,
      alliances: [
        ...draft.politics.alliances,
        ...congress.guests
          .filter((id) => id !== foe)
          .map((id) => ({ a: PLAYER, b: id, since: day0, byMarriage: false })),
      ],
    }
    for (const id of congress.guests) {
      if (id === foe) continue
      draft.politics = withRelation(draft.politics, id, foe, -20)
    }
    notice(
      draft,
      `Против ${kingdomName(draft.base, foe)} сошлись ${congress.guests.length - 1} корон и ты.`,
      'war',
    )
    return
  }
  if (congress.question === 'partition' && congress.about) {
    // Раздел выморочной земли: право появляется у приехавших, у тебя — прежде всех.
    const empty = congress.about
    const capital = draft.base.world.kingdoms[empty]?.capitalId
    const provinceId = capital ? draft.base.world.locations[capital]?.provinceId : undefined
    if (provinceId) {
      draft.claims = [
        ...claimsOf(draft),
        { provinceId, against: empty, kind: 'inherit', sinceDay: day0 },
      ]
      notice(
        draft,
        `Земля ${kingdomName(draft.base, empty)} расписана заранее: твоё право признано при свидетелях.`,
        'world',
      )
    }
    return
  }
  if (congress.question === 'roads') {
    // Торговое согласие со всеми, кто приехал.
    draft.treaties = [
      ...treatiesOf(draft),
      ...congress.guests.map((id) => ({
        id: `treaty:съезд:${id}:${day0}`,
        a: PLAYER,
        b: id,
        kind: 'trade' as const,
        sinceDay: day0,
        untilDay: day0 + treatyDef('trade').days,
      })),
    ]
    notice(draft, `Торговое согласие с ${congress.guests.length} коронами.`, 'trade')
    return
  }
  // Спор о вере: уступившие теплеют к тебе, прочие холодеют ко всем.
  for (const id of congress.guests) {
    const vote = voteOf(draft.base, draft.base.world, id, congress.question, congress.about, day)
    draft.politics = withRelation(draft.politics, PLAYER, id, vote > 0 ? 12 : -10)
  }
}

function tickSpies(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const wages = spyWages(draft) * days
  if (wages > 0) addMoney(draft, -Math.round(wages))

  // Слух ходит и стихает сам.
  const rumours = (draft.rumours ?? []).filter((one) => one.untilDay > day)
  if (rumours.length !== (draft.rumours ?? []).length) draft.rumours = rumours

  const mine = spiesOf(draft)
  if (mine.length === 0) return
  // Один бросок на всех: по броску на человека — это лишняя случайность там,
  // где событие и так редкое.
  let none = 1
  // Ловкость рук прячет соглядатая (этап 122, А2).
  const hides = hidesSpy(draft.character)
  for (const spy of mine) none *= (1 - catchChance(spy, day, hides)) ** days
  const [caught, afterRoll] = rollChance(draft.rng, 1 - none)
  draft.rng = afterRoll
  if (!caught) return
  const [pick, afterPick] = nextInt(draft.rng, 0, mine.length - 1)
  draft.rng = afterPick
  const spy = mine[pick] ?? mine[0]
  if (!spy) return
  draft.spies = (draft.spies ?? []).map((one) =>
    one.id === spy.id ? { ...one, caught: true } : one,
  )
  draft.politics = withRelation(draft.politics, PLAYER, spy.kingdomId, CAUGHT.relation)
  shameOn(draft, 'broke')
  notice(
    draft,
    `Твоего человека взяли в ${kingdomName(draft.base, spy.kingdomId)}. Об этом будут помнить.`,
    'world',
  )
  const [war, afterWar] = rollChance(draft.rng, CAUGHT.war)
  draft.rng = afterWar
  if (war && !atWar(draft.politics, PLAYER, spy.kingdomId)) {
    draft.politics = {
      ...draft.politics,
      wars: [
        ...draft.politics.wars,
        {
          a: spy.kingdomId,
          b: PLAYER,
          since: day,
          reason: 'соглядатай, взятый при дворе',
        },
      ],
    }
    notice(draft, `${kingdomName(draft.base, spy.kingdomId)} объявил тебе войну за это.`, 'war')
  }
}

function tickSuccession(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const before = day - days
  for (const kingdomId of Object.keys(draft.base.world.kingdoms)) {
    const now = royalHouse(draft.base.world, kingdomId, day)
    const was = royalHouse(draft.base.world, kingdomId, before)
    if (now.reign === was.reign) continue
    // Новый государь наследует половину отцовых обид — не больше.
    const relation = relationOf(draft.politics, PLAYER, kingdomId)
    draft.politics = withRelation(draft.politics, PLAYER, kingdomId, -Math.round(relation / 2))
    notice(
      draft,
      `${kingdomName(draft.base, kingdomId)}: ${was.title} ${was.name} умер, на престоле ${now.name}. ${now.says}`,
      'world',
    )
    if (now.heir === null) {
      notice(
        draft,
        `У ${kingdomName(draft.base, kingdomId)} нет наследника: соседи уже считают, чьё право сильнее.`,
        'world',
      )
    }
  }
}

function tickTreaties(draft: Draft, days: number): void {
  const treaties = treatiesOf(draft)
  if (treaties.length === 0 || days <= 0) return
  const day = dayOf(draft.time)
  const before = day - days

  for (const treaty of treaties) {
    if (treaty.brokenBy !== undefined) continue
    if (treaty.untilDay !== 0 && treaty.untilDay > before && treaty.untilDay <= day) {
      const other = treaty.a === PLAYER ? treaty.b : treaty.a
      notice(
        draft,
        `Срок вышел: ${treatyDef(treaty.kind).label} с ${kingdomName(draft.base, other)} больше не держит.`,
        'world',
      )
      // Союз и дань кончаются вместе с бумагой.
      if (treaty.kind === 'tribute') {
        draft.politics = {
          ...draft.politics,
          tributes: draft.politics.tributes.filter(
            (one) => !(one.from === other && one.to === PLAYER),
          ),
        }
      }
    }
  }

  // Тайное становится явным: один бросок на все тайны разом. Считается раз в
  // пять суток за все пять: людей в комнате пересчитывать каждый день дорого.
  const secrets = treaties.filter(
    (one) => one.secret !== undefined && one.secret.known !== true && one.brokenBy === undefined,
  )
  if (secrets.length === 0) return
  if (day % SECRET_BEAT !== 0) return
  // Чужие глаза при твоём дворе ускоряют утечку (этап 82, С5): чем больше
  // корон следит за тобой, тем короче жизнь твоей тайны. А держат тайну люди,
  // названные по именам, — и у каждого своя доля (этап 115, Тн2).
  const eyes = leakFactor(watchers(draft.base, draft.base.world, day).length)
  let none = 1
  for (const treaty of secrets) {
    none *= (1 - leakNow(draft.base, treaty, day).chance * eyes) ** (days * SECRET_BEAT)
  }
  const [leaked, afterRoll] = rollChance(draft.rng, 1 - none)
  draft.rng = afterRoll
  if (!leaked) return
  const [pick, afterPick] = nextInt(draft.rng, 0, secrets.length - 1)
  draft.rng = afterPick
  const treaty = secrets[pick] ?? secrets[0]
  if (!treaty?.secret) return
  const def = secretDef(treaty.secret.id)
  draft.treaties = treatiesOf(draft).map((one) =>
    one.id === treaty.id && one.secret ? { ...one, secret: { ...one.secret, known: true } } : one,
  )
  const other = treaty.a === PLAYER ? treaty.b : treaty.a
  // Тот, против кого это было, узнаёт первым — и не прощает.
  const against = treaty.secret.against ?? null
  if (against) {
    draft.politics = withRelation(draft.politics, PLAYER, against, def.angers)
  }
  for (const kingdomId of Object.keys(draft.base.world.kingdoms)) {
    if (kingdomId === other || kingdomId === against) continue
    draft.politics = withRelation(draft.politics, PLAYER, kingdomId, Math.round(def.angers / 4))
  }
  // Раскрытая тайна бьёт по слову сильнее нарушенной явной грамоты (Тн3).
  const cost = exposeCost(treaty)
  const who = leakNow(draft.base, treaty, day).who
  draft.secretLog = { ...draft.secretLog, leaked: draft.secretLog.leaked + 1 }
  notice(
    draft,
    `Тайное стало явным: ${def.label} в грамоте с ${kingdomName(draft.base, other)}. ${def.about} ${SECRET_WORDS.leaked}${who ? ` (${who.name})` : ''} ${cost.says}`,
    'world',
  )
  // Двойную игру раскрывают отдельно, и она стоит доверия обеих сторон (Тн4).
  const double = caughtDouble(draft.base, draft.base.world, day)
  if (!double.caught || !double.against) return
  draft.secretLog = { ...draft.secretLog, caught: draft.secretLog.caught + 1 }
  for (const side of doubleGames(draft.base, day)[0]?.with ?? []) {
    draft.politics = withRelation(
      draft.politics,
      PLAYER,
      side,
      Math.round((def.angers / 2) * SECRET.doubleAngers),
    )
  }
  notice(draft, double.says, 'world')
}

/** Какой договор выходит из такого посольства. Не у всякого — бумага. */
function treatyKindOf(errand: EmbassyErrand): TreatyKind | null {
  if (errand === 'alliance') return 'alliance'
  if (errand === 'marriage') return 'alliance'
  if (errand === 'tribute' || errand === 'threat') return 'tribute'
  if (errand === 'passage') return 'passage'
  if (errand === 'mediation') return 'peace'
  return null
}

/**
 * Объявить цель кампании (этап 84, Ка1).
 *
 * У войны должна быть цель, и она должна быть видна: без неё войско ходит по
 * карте, а война не кончается ничем. По умолчанию цель выводится из повода
 * (этап 65), но выбрать можно и другую.
 */
function setCampaign(state: GameState, against: string, aim?: CampaignAim): CommandResult {
  if (!atWar(state.politics, PLAYER, against)) {
    return fail('requirements', 'С этой короной ты не воюешь.')
  }
  const day = dayOf(state.time)
  const chosen = aim ?? aimFor(state, against)
  const draft = open(state)
  draft.campaign = {
    against,
    aim: chosen,
    sinceDay: day,
    taken: 0,
    lost: 0,
  }
  advance(draft, hours(2))
  notice(
    draft,
    `Кампания против ${kingdomName(state, against)}: ${aimDef(chosen).label}. ${aimDef(chosen).about}`,
    'war',
  )
  return close(draft)
}

/**
 * Отделить часть войска (этап 84, Ка5).
 *
 * Ты водишь не отряд, а войско: люди из своего отряда становятся частью, которая
 * стоит на карте сама и слушает приказы. Дальше она живёт тем же тактом, что и
 * чужие дружины (этап 29).
 */
function formHost(state: GameState, troop: TroopId, count: number): CommandResult {
  if (!state.realm) return fail('requirements', 'Войско водит держава.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')
  const have = state.party.units[troop] ?? 0
  if (have < count) return fail('requirements', `Столько людей у тебя нет: ${have}.`)
  const day = dayOf(state.time)

  const draft = open(state)
  draft.party = {
    ...draft.party,
    units: { ...draft.party.units, [troop]: have - count },
  }
  const id = `band:${PLAYER}:${day}:${hostsOf(draft).length + 1}`
  draft.bands = [
    ...draft.bands,
    {
      id,
      lordId: PLAYER,
      kingdomId: PLAYER,
      units: { [troop]: count },
      morale: draft.party.morale,
      locationId: state.locationId,
      travel: null,
      goal: { type: 'muster' },
      siegeDays: 0,
    },
  ]
  advance(draft, hours(4))
  notice(
    draft,
    `Отделена часть: ${count} ${TROOPS[troop].label.toLowerCase()}. Ждёт приказа.`,
    'war',
  )
  return close(draft)
}

/**
 * Приказать части (этап 84, Ка5).
 *
 * Приказ — это цель на карте, а не движение: часть сама пойдёт туда дорогами и
 * своим шагом, и донесение о том, что вышло, придёт не в тот же день.
 */
function orderHost(
  state: GameState,
  hostId: string,
  order: HostOrder,
  targetId?: string,
): CommandResult {
  const host = hostById(state, hostId)
  if (!host) return fail('invalid', 'Такой части у тебя нет.')
  const target = targetId ?? host.locationId
  if (order !== 'hold' && order !== 'home' && !state.settlements[target]) {
    return fail('invalid', 'Такого места нет.')
  }
  const draft = open(state)
  const day = dayOf(state.time)
  const where = state.world.locations[target]?.name ?? 'место'
  const link = linkTo(state, state.world, host.locationId, state.locationId)
  draft.orderLog = { ...draft.orderLog, sent: draft.orderLog.sent + 1 }
  advance(draft, hours(2))
  // Часть в поле — приказ едет к ней, и по дороге война не стоит (этап 111, По1).
  if (link.days > 0) {
    draft.fieldOrders = [
      ...draft.fieldOrders,
      {
        id: `order:${hostId}:${day}`,
        hostId,
        order,
        targetId: target,
        sentDay: day,
        arrivesDay: day + link.days,
        wasAt: host.locationId,
        wasFoes: foesNear(state, host.locationId),
      },
    ]
    notice(
      draft,
      `${DISPATCH_WORDS.sent} ${orderDef(order).label}${order === 'advance' || order === 'siege' ? ` — ${where}` : ''}. ${link.says} Дойдёт на ${day + link.days}-й день.`,
      'war',
    )
    return close(draft)
  }
  const goal =
    order === 'advance'
      ? ({ type: 'raid', targetId: target } as const)
      : order === 'siege'
        ? ({ type: 'siege', targetId: target } as const)
        : order === 'forage'
          ? ({ type: 'defend', targetId: host.locationId } as const)
          : order === 'home'
            ? ({ type: 'home', targetId: mineNearest(draft, host.locationId) } as const)
            : ({ type: 'muster' } as const)
  draft.bands = draft.bands.map((one) => (one.id === hostId ? { ...one, goal } : one))
  draft.orderLog = { ...draft.orderLog, onTime: draft.orderLog.onTime + 1 }
  notice(
    draft,
    `Приказ части: ${orderDef(order).label}${order === 'advance' || order === 'siege' ? ` — ${where}` : ''}.`,
    'war',
  )
  return close(draft)
}

/** Куда отводить: к ближайшему своему месту. */
function mineNearest(draft: Draft, from: string): string {
  const mine = holdingsOf(draft.settlements, PLAYER)
  if (mine.length === 0) return from
  const near = neighbourSettlements(draft.base.world, from, 8)
  const found = near.find((one) => mine.some((place) => place.locationId === one.id))
  return found?.id ?? mine[0]?.locationId ?? from
}

/** Свести часть обратно в отряд: это можно там, где ты сам. */
function recallHost(state: GameState, hostId: string): CommandResult {
  const host = hostById(state, hostId)
  if (!host) return fail('invalid', 'Такой части у тебя нет.')
  if (host.locationId !== state.locationId || host.travel !== null) {
    return fail('unavailableHere', 'Свести можно ту часть, которая стоит там, где ты.')
  }
  const draft = open(state)
  let units = draft.party.units
  for (const [troop, count] of Object.entries(host.units)) {
    if (!count) continue
    units = { ...units, [troop]: (units[troop as TroopId] ?? 0) + count }
  }
  draft.party = { ...draft.party, units }
  draft.bands = draft.bands.filter((one) => one.id !== hostId)
  advance(draft, hours(3))
  notice(draft, 'Часть сведена в отряд.', 'war')
  return close(draft)
}

/**
 * Строить осадную машину (этап 85, О2).
 *
 * Подкоп был единственной работой под стенами: шесть суток — и кладка села.
 * Машины дают выбор другой цены: таран дешёв и бьёт по воротам, башня дорога,
 * но укрывает идущих, порок сбивает стрелков с башен. Срок считается по рукам
 * и по инженерии того, кто ведёт работы.
 */
function buildEngine(state: GameState, engine: EngineId): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  if (siege.works)
    return fail('invalid', `Под стенами уже строят: ${engineDef(siege.works.id).label}.`)
  const fort = fortOf(state, state.world, siege.locationId)
  if (!fort) return fail('invalid', 'Осаждать нечего.')
  const built = enginesOf(siege)
  if (!enginesLeft(built, fort).includes(engine)) {
    return fail('invalid', 'Такую машину здесь не поставить.')
  }
  const def = engineDef(engine)
  const men = partySize(state.party)
  if (men < def.men)
    return fail('requirements', `На ${def.label} нужно ${def.men} рук, у тебя ${men}.`)
  const price = enginePrice(engine)
  if (state.character.money < price) {
    return fail('noMoney', `На железо и канаты нужно ${price}, у тебя ${state.character.money}.`)
  }
  const craft = state.character.skills.engineering.level
  const days = engineDays(engine, men, craft)

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hours(6))
  draft.siege = { ...siege, works: { id: engine, daysLeft: days } }
  notice(draft, `${def.label}: работы начаты, сроку ${days} сут.`, 'war')
  return close(draft)
}

/**
 * Предложить условия (этап 85, О3).
 *
 * Осада — это торг, а не отсчёт: под стенами считают не храбрость, а воду,
 * хлеб и то, идёт ли выручка. Свободный выход принимают охотнее всего, выкуп
 * оставляет место прежнему хозяину и приносит серебро, милости просят только
 * когда терять уже нечего.
 */
function siegeTerms(state: GameState, term: TermId): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const fort = fortOf(state, state.world, siege.locationId)
  const here = state.world.locations[siege.locationId]
  if (!fort || !here) return fail('invalid', 'Осаждать нечего.')
  const offer = offersFor(state, state.world, fort, siege.days, siege.breached === true).find(
    (one) => one.term === term,
  )
  if (!offer) return fail('invalid', 'Таких условий не предлагают.')

  const draft = open(state)
  advance(draft, hours(4))
  const [taken, afterRoll] = rollChance(draft.rng, offer.chance)
  draft.rng = afterRoll
  if (!taken) {
    notice(
      draft,
      `С башни отвечают отказом: ${offer.label} — не те условия. (${Math.round(offer.chance * 100)} из ста)`,
      'war',
    )
    return close(draft)
  }
  if (term === 'ransom') {
    const paid = Math.abs(offer.silver)
    addMoney(draft, paid)
    draft.siege = null
    notice(draft, `${here.name} откупился: ${paid} серебром, и осада снята.`, 'war')
    return close(draft)
  }
  seizePlace(draft, siege.locationId, 'terms')
  // Отпущенный гарнизон — это живые враги, зато целое место и слава милостивого.
  draft.renown += term === 'free' ? 1 : 2
  notice(draft, `${here.name} сдан: ${offer.label}.`, 'war')
  return close(draft)
}

/**
 * Запас в свою крепость (этап 85, О5).
 *
 * Крепость держится не стенами, а хлебом: запас на год — это год, который у
 * тебя есть, чтобы собрать выручку. Покупается заранее: под стенами уже поздно.
 */
function stockFort(state: GameState, locationId: string, days: number): CommandResult {
  const settlement = state.settlements[locationId]
  const here = state.world.locations[locationId]
  if (!settlement || !here) return fail('invalid', 'Такого места нет.')
  if (!isOwnedByPlayer(settlement)) return fail('invalid', 'Запас кладут в свою крепость.')
  if (!Number.isInteger(days) || days <= 0 || days > 365) {
    return fail('invalid', 'Припасти можно от суток до года.')
  }
  const grain = Math.ceil(mouthsOf(settlement) * SIEGE.perMan * days)
  const price = grain * SIEGE.storeSilver
  if (state.character.money < price) {
    return fail('noMoney', `Хлеб на ${days} сут. стоит ${price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hours(6))
  draft.settlements = {
    ...draft.settlements,
    [locationId]: {
      ...settlement,
      stock: { ...settlement.stock, grain: settlement.stock.grain + grain },
    },
  }
  const fort = fortOf(draft.base, draft.base.world, locationId)
  notice(
    draft,
    `${here.name}: в амбары свезли ${grain} мер. Крепость выстоит ${fort ? holdOut(fort) : days} сут.`,
    'world',
  )
  return close(draft)
}

/**
 * Приказ гарнизону (этап 85, О5).
 *
 * Приказ даётся заранее и действует, когда тебя там нет: держать стены, ходить
 * на вылазки или открыть ворота, не кладя людей. Своё войско ведут приказы, и
 * своя крепость — тоже.
 */
function garrisonOrder(state: GameState, locationId: string, order: GarrisonOrder): CommandResult {
  const settlement = state.settlements[locationId]
  const here = state.world.locations[locationId]
  if (!settlement || !here) return fail('invalid', 'Такого места нет.')
  if (!isOwnedByPlayer(settlement)) return fail('invalid', 'Приказы отдают своему гарнизону.')

  const draft = open(state)
  advance(draft, hours(1))
  draft.garrisons = { ...draft.garrisons, [locationId]: order }
  notice(
    draft,
    `${here.name}: гарнизону велено ${order === 'hold' ? 'держать стены' : order === 'sally' ? 'ходить на вылазки' : 'открыть ворота, если обложат'}.`,
    'world',
  )
  return close(draft)
}

/**
 * Нанять вольную роту (этап 86, Н1 и Н2).
 *
 * Рота — не отряд, который слушается: у неё есть имя, нрав и цена. Платят
 * задаток вперёд, дальше капает жалованье; кончились деньги — кончилась и
 * служба, и кончится она не молча (Н3).
 */
function hireCompany(state: GameState, companyId: string, days: number): CommandResult {
  const company = companyById(state, companyId)
  if (!company) return fail('invalid', 'Такой роты нет.')
  if (company.hiredBy === PLAYER) return fail('invalid', 'Эта рота и так твоя.')
  if (!Number.isInteger(days) || days < COMPANY.shortest || days > COMPANY.longest) {
    return fail('invalid', `Нанимают от ${COMPANY.shortest} до ${COMPANY.longest} суток.`)
  }
  if (company.locationId !== state.locationId) {
    return fail('unavailableHere', `${companyDef(companyId).name} стоит не здесь.`)
  }
  const def = companyDef(companyId)
  // Роты берут с непризнанного вперёд и больше (этап 138, Пр4), а с первого
  // ещё больше (этап 139, Це1): кто ближе к концу, тот и платит.
  const dearer = strangerCost(state, state.world, dayOf(state.time))
  const first = firstPays(state, state.world, dayOf(state.time))
  const upfront = Math.round(upfrontFor(company) * dearer.times * first.times)
  if (state.character.money < upfront) {
    return fail('noMoney', `Задаток ${upfront}, у тебя ${state.character.money}.`)
  }
  // Занятую роту перекупают: капитан слушает того, кто кладёт больше.
  if (company.hiredBy && company.hiredBy !== PLAYER) {
    const paying = wageOf(company)
    if (upfront < paying * COMPANY.outbid) {
      return fail(
        'requirements',
        `${def.name} в службе: перебить цену — ${Math.round(paying * COMPANY.outbid)} задатком.`,
      )
    }
  }

  const draft = open(state)
  const day = dayOf(draft.time)
  addMoney(draft, -upfront)
  advance(draft, hours(4))
  draft.companies = companiesOf(draft).map((one) =>
    one.id === companyId
      ? {
          ...one,
          hiredBy: PLAYER,
          untilDay: day + days,
          owed: 0,
          unpaidDays: 0,
        }
      : one,
  )
  // Нанятая рота встаёт на карту как своя часть (этап 84, Ка5): ею и
  // распоряжаются приказами, а не уговорами.
  draft.bands = [
    ...draft.bands.filter((one) => one.id !== `company:${companyId}`),
    {
      id: `company:${companyId}`,
      lordId: PLAYER,
      kingdomId: PLAYER,
      units: companyUnits(company),
      morale: 75,
      locationId: state.locationId,
      travel: null,
      goal: { type: 'defend', targetId: state.locationId },
      siegeDays: 0,
    },
  ]
  notice(
    draft,
    `${def.name} (${TEMPER_DEFS[def.temper].label}, ${company.men} человек) в службе до ${day + days} дня. Задаток ${upfront}, жалованья ${wageOf(company)} в сутки.`,
    'war',
  )
  return close(draft)
}

/** Заплатить роте то, что задолжал (Н3). */
function payCompany(state: GameState, companyId: string): CommandResult {
  const company = companyById(state, companyId)
  if (!company) return fail('invalid', 'Такой роты нет.')
  if (company.hiredBy !== PLAYER) return fail('invalid', 'Эта рота служит не тебе.')
  if (company.owed <= 0) return fail('invalid', 'Этой роте ты ничего не должен.')
  if (state.character.money < company.owed) {
    return fail('noMoney', `Долгу ${company.owed}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -company.owed)
  advance(draft, hours(1))
  draft.companies = companiesOf(draft).map((one) =>
    one.id === companyId ? { ...one, owed: 0, unpaidDays: 0 } : one,
  )
  notice(
    draft,
    `${companyDef(companyId).name}: долг ${company.owed} отдан, капитан доволен.`,
    'war',
  )
  return close(draft)
}

/** Распустить роту: честно и с концами. */
function dismissCompany(state: GameState, companyId: string): CommandResult {
  const company = companyById(state, companyId)
  if (!company) return fail('invalid', 'Такой роты нет.')
  if (company.hiredBy !== PLAYER) return fail('invalid', 'Эта рота служит не тебе.')
  if (company.owed > 0) {
    return fail('requirements', `Сперва отдай долг: ${company.owed}.`)
  }

  const draft = open(state)
  advance(draft, hours(2))
  draft.companies = companiesOf(draft).map((one) =>
    one.id === companyId ? { ...one, hiredBy: null, untilDay: 0 } : one,
  )
  draft.bands = draft.bands.filter((one) => one.id !== `company:${companyId}`)
  notice(draft, `${companyDef(companyId).name} распущена: срок кончен, слово сдержано.`, 'war')
  return close(draft)
}

/**
 * Наняться самому (этап 86, Н4).
 *
 * Своя рота — это ты: корона платит за твоих людей столько же, сколько за
 * чужих, и считает так же — по числу, по славе и по тому, насколько ей сейчас
 * нужна война.
 */
function takeCommission(state: GameState, kingdomId: string, days: number): CommandResult {
  if (state.commission) return fail('invalid', 'Ты уже в чужой службе.')
  if (!Number.isInteger(days) || days < COMPANY.shortest || days > COMPANY.longest) {
    return fail('invalid', `Нанимаются от ${COMPANY.shortest} до ${COMPANY.longest} суток.`)
  }
  const men = partySize(state.party)
  if (men < 10)
    return fail('requirements', 'Ротой называется не десяток: нужно хотя бы десять человек.')
  const offer = hiringCrowns(state, state.world, men).find((one) => one.kingdomId === kingdomId)
  if (!offer) return fail('requirements', 'Этой короне сейчас не нужны наёмники.')

  const draft = open(state)
  const day = dayOf(draft.time)
  advance(draft, hours(6))
  draft.commission = {
    kingdomId,
    sinceDay: day,
    untilDay: day + days,
    wage: offer.wage,
    paid: 0,
    share: COMPANY.share,
  }
  notice(
    draft,
    `Ты в службе у ${kingdomName(draft.base, kingdomId)} до ${day + days} дня: ${offer.wage} в сутки за ${men} человек. Воевать против ${kingdomName(draft.base, offer.against)}.`,
    'war',
  )
  return close(draft)
}

/** Уйти со службы. До срока — с уроном имени. */
function leaveCommission(state: GameState): CommandResult {
  const commission = state.commission
  if (!commission) return fail('invalid', 'Ты никому не служишь.')

  const draft = open(state)
  const day = dayOf(draft.time)
  const early = day < commission.untilDay
  draft.commission = null
  advance(draft, hours(3))
  if (early) {
    draft.renown = Math.max(0, draft.renown - 2)
    notice(
      draft,
      'Ты ушёл со службы раньше срока. Такое помнят: наёмник, бросивший войну, дорожает только для дураков.',
      'war',
    )
  } else {
    draft.renown += 2
    notice(
      draft,
      `Срок дослужен честно: ${kingdomName(draft.base, commission.kingdomId)} заплатил сполна.`,
      'war',
    )
  }
  return close(draft)
}

/**
 * Сутки рот (этап 86).
 *
 * Здесь рота живёт: служит и ест жалованье, уходит к тому, кто платит больше,
 * тает без денег и поворачивает оружие, если терпение кончилось. Без
 * нанимателя она кормится разбоем, и округа это чувствует.
 */
function tickCompanies(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const rows: Company[] = []
  for (const company of companiesOf(draft)) {
    let next = company
    if (next.hiredBy === PLAYER) {
      const wage = wageOf(next) * days
      if (draft.character.money >= wage) {
        addMoney(draft, -Math.round(wage))
        next = { ...next, unpaidDays: 0 }
      } else {
        next = { ...next, owed: next.owed + Math.round(wage), unpaidDays: next.unpaidDays + days }
      }
      // Терпение кончилось: одни уходят, другие поворачивают оружие.
      if (patienceLeft(next) <= 0) {
        const [betrays, afterRoll] = rollChance(draft.rng, treacheryChance(next))
        draft.rng = afterRoll
        const def = companyDef(next.id)
        if (betrays) {
          // Повернувшая рота берёт своё сама: из лагеря уходит всё, что в нём
          // было ценного, а округа получает ещё одну шайку при оружии.
          const took = Math.min(draft.character.money, next.owed)
          addMoney(draft, -took)
          const place = draft.settlements[draft.locationId]
          if (place) {
            draft.settlements = {
              ...draft.settlements,
              [draft.locationId]: {
                ...place,
                banditry: Math.min(1, place.banditry + 0.15),
              },
            }
          }
          notice(
            draft,
            `${def.name} повернула оружие: ${COMPANY_WORDS.turned} Из казны взято ${took}.`,
            'war',
          )
        } else {
          notice(draft, `${def.name} ушла: ${COMPANY_WORDS.gone}`, 'war')
        }
        draft.bands = draft.bands.filter((one) => one.id !== `company:${next.id}`)
        next = {
          ...next,
          hiredBy: null,
          untilDay: 0,
          owed: 0,
          unpaidDays: 0,
          locationId: draft.locationId,
        }
      } else if (next.untilDay > 0 && day >= next.untilDay && next.owed <= 0) {
        notice(draft, `${companyDef(next.id).name}: срок вышел, рота свободна.`, 'war')
        draft.bands = draft.bands.filter((one) => one.id !== `company:${next.id}`)
        next = { ...next, hiredBy: null, untilDay: 0 }
      }
    }
    // Короны нанимают те же роты и теми же деньгами (Н2). Считается по их
    // войнам и землям, без броска: одна и та же война даёт один и тот же найм.
    if (!next.hiredBy && day % COMPANY_BEAT === 0) {
      const best = hireBids(draft.base, draft.base.world, next)[0]
      if (best && best.bid > wageOf(next)) {
        next = { ...next, hiredBy: best.kingdomId, untilDay: day + 120, owed: 0, unpaidDays: 0 }
      }
    } else if (next.hiredBy === PLAYER && next.unpaidDays > 0 && day % COMPANY_BEAT === 0) {
      // Кто платит больше — к тому и уходят: должнику роту не удержать.
      const rival = rivalsFor(draft.base, draft.base.world, next, wageOf(next))[0]
      if (rival) {
        notice(
          draft,
          `${companyDef(next.id).name} ушла к ${kingdomName(draft.base, rival.kingdomId)}: там платят ${rival.bid} в сутки, а ты должен ${next.owed}.`,
          'war',
        )
        draft.bands = draft.bands.filter((one) => one.id !== `company:${next.id}`)
        next = { ...next, hiredBy: rival.kingdomId, untilDay: day + 120, owed: 0, unpaidDays: 0 }
      }
    }

    // Вольная рота кормится с округи: там, где она стоит, это помнят (Н5).
    if (!next.hiredBy && next.locationId) {
      const harm = idleHarm(next)
      draft.reputation = withPlaceRep(draft.reputation, next.locationId, harm.mood * days)
      const place = draft.settlements[next.locationId]
      if (place) {
        draft.settlements = {
          ...draft.settlements,
          [next.locationId]: {
            ...place,
            banditry: Math.min(1, place.banditry + harm.banditry * days),
          },
        }
      }
    }
    rows.push(next)
  }
  draft.companies = rows
  tickCommission(draft, days)
}

/** Своя служба: корона платит по суткам, срок кончается сам (Н4). */
function tickCommission(draft: Draft, days: number): void {
  const commission = draft.commission
  if (!commission) return
  const day = dayOf(draft.time)
  const paid = Math.round(commission.wage * days)
  addMoney(draft, paid)
  draft.commission = { ...commission, paid: commission.paid + paid }
  if (day >= commission.untilDay) {
    notice(
      draft,
      `Служба кончена: ${kingdomName(draft.base, commission.kingdomId)} заплатил ${commission.paid + paid} за весь срок.`,
      'war',
    )
    draft.renown += 2
    draft.commission = null
  }
}

/**
 * Заложить боевое судно (этап 87, Ф1).
 *
 * Флот строят в гавани и строят долго: ушкуй — двадцать пять суток, насад —
 * восемьдесят. Пока судно на стапеле, оно есть в списке, но не воюет: у войны
 * на воде длинное начало.
 */
function buildWarship(state: GameState, kind: WarshipKind): CommandResult {
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isHarbour(state.world, state.locationId)) {
    return fail('unavailableHere', NAVY_WORDS.noHarbour)
  }
  const settlement = state.settlements[state.locationId]
  if (!settlement || !isOwnedByPlayer(settlement)) {
    return fail('requirements', 'Верфь закладывают в своей гавани.')
  }
  const def = WARSHIP_DEFS[kind]
  if (state.character.money < def.price) {
    return fail('noMoney', `${def.label} стоит ${def.price}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  const day = dayOf(draft.time)
  addMoney(draft, -def.price)
  advance(draft, hours(8))
  const [index, afterName] = nextInt(draft.rng, 0, SHIP_NAMES.length - 1)
  draft.rng = afterName
  const name = SHIP_NAMES[index] ?? 'Чайка'
  draft.navy = [
    ...navyOf(draft),
    {
      id: `ship:${day}:${draft.navy.length}`,
      kind,
      name,
      condition: 1,
      crew: def.crew,
      portId: state.locationId,
      readyDay: day + def.days,
    },
  ]
  notice(
    draft,
    `${def.label} «${name}» заложен в ${here.name}: ${def.price} серебром, на воду через ${def.days} сут.`,
    'world',
  )
  return close(draft)
}

/**
 * Высадить людей на чужой берег (этап 87, Ф3).
 *
 * Десант — это часть на карте (этап 84, Ка5), поставленная там, куда по суше
 * не дойти. Цена высадки платится сразу: на урезе воды строй ломается, а если
 * берег защищают — ломается вдвое.
 */
function landTroops(state: GameState, locationId: string, men: number): CommandResult {
  const day = dayOf(state.time)
  const ships = afloat(state, day)
  if (ships.length === 0) return fail('requirements', NAVY_WORDS.noFleet)
  if (!Number.isInteger(men) || men <= 0) return fail('invalid', 'Сколько людей высаживать?')
  if (men > partySize(state.party)) return fail('requirements', 'Столько людей у тебя нет.')
  if (men > fleetCarries(ships)) {
    return fail('requirements', `Флот поднимет ${fleetCarries(ships)} человек, не больше.`)
  }
  const shore = landingSites(state.world, state.locationId)
  if (!shore.includes(locationId)) {
    return fail('unavailableHere', 'Туда морем отсюда не дойти.')
  }
  const target = state.world.locations[locationId]
  const settlement = state.settlements[locationId]
  if (!target) return fail('invalid', 'Такого берега нет.')

  const draft = open(state)
  const defended = settlement ? garrisonSize(settlement) > 0 && !isOwnedByPlayer(settlement) : false
  const lost = landingLoss(men, defended)
  const troop = worstTroop(draft.party)
  const landedMen = Math.max(1, men - lost)
  draft.party = withUnits(draft.party, troop, -men)
  draft.bands = [
    ...draft.bands,
    {
      id: `landing:${day}:${locationId}`,
      lordId: PLAYER,
      kingdomId: PLAYER,
      units: { [troop]: landedMen },
      morale: 65,
      locationId,
      travel: null,
      goal: { type: 'defend', targetId: locationId },
      siegeDays: 0,
    },
  ]
  advance(draft, hours(12))
  notice(
    draft,
    `Высадка в ${target.name}: на берегу ${landedMen} из ${men}${defended ? ', берег защищали' : ''}.`,
    'war',
  )
  return close(draft)
}

/**
 * Сойтись на воде (этап 87, Ф2).
 *
 * Чужой флот выводится из гаваней короны и её войн: хранить его незачем, а
 * встретить можно у любой его гавани. Считается сила, ветер и ход: ходкое
 * судно уходит от тяжёлого, тяжёлое ломает лёгкое. Бросок один — на то,
 * насколько дело вышло за рамки расчёта.
 */
function seaSortie(state: GameState, locationId: string): CommandResult {
  const day = dayOf(state.time)
  const ours = afloat(state, day)
  if (ours.length === 0) return fail('requirements', NAVY_WORDS.noFleet)
  if (!isHarbour(state.world, locationId)) return fail('invalid', 'Это не гавань.')
  const near = landingSites(state.world, state.locationId)
  if (!near.includes(locationId) && locationId !== state.locationId) {
    return fail('unavailableHere', 'Туда отсюда не дойти под парусом.')
  }
  const settlement = state.settlements[locationId]
  const here = state.world.locations[locationId]
  if (!settlement || !here) return fail('invalid', 'Такого места нет.')
  const side = sideOfPlace(state, settlement)
  if (!side || !atWar(state.politics, PLAYER, side)) {
    return fail('requirements', 'С этой короной ты не воюешь.')
  }
  const theirs = crownFleet(state, state.world, side, day).filter(
    (one) => one.portId === locationId,
  )
  if (theirs.length === 0) return fail('requirements', 'У этой гавани чужих судов нет.')

  const draft = open(state)
  const wind = windAt(day, locationId)
  const [roll, afterRoll] = nextFloat(draft.rng)
  draft.rng = afterRoll
  const fight = seaFight(ours, theirs, wind, roll)
  advance(draft, hours(10))
  // Свои потери — настоящие: суда уходят из списка.
  if (fight.lostShips > 0) {
    const sunk = new Set(
      [...ours]
        .sort((a, b) => shipForce(a) - shipForce(b))
        .slice(0, fight.lostShips)
        .map((one) => one.id),
    )
    draft.navy = navyOf(draft).filter((one) => !sunk.has(one.id))
  }
  // Уцелевшим достаётся: море треплет и победителя.
  draft.navy = navyOf(draft).map((one) =>
    one.readyDay <= day ? { ...one, condition: Math.max(0.2, one.condition - 0.1) } : one,
  )
  if (fight.end === 'boarded') {
    const prize = prizeAt(draft.base, locationId)
    addMoney(draft, prize)
    notice(draft, `${here.name}: ${fight.says} С палуб взято ${prize}.`, 'war')
  } else {
    notice(draft, `${here.name}: ${fight.says}`, 'war')
  }
  if (fight.end === 'sunk' || fight.end === 'boarded') draft.renown += 2
  return close(draft)
}

/**
 * Запереть чужую гавань (этап 87, Ф4).
 *
 * Блокада — война без боя: в гавань не входит подвоз, город беднеет и помнит
 * это, а его хозяин теряет пошлину каждые сутки.
 */
function blockadePort(state: GameState, locationId: string): CommandResult {
  const day = dayOf(state.time)
  const ships = afloat(state, day)
  if (ships.length === 0) return fail('requirements', NAVY_WORDS.noFleet)
  if (!isHarbour(state.world, locationId)) return fail('invalid', 'Это не гавань.')
  const settlement = state.settlements[locationId]
  const here = state.world.locations[locationId]
  if (!settlement || !here) return fail('invalid', 'Такого места нет.')
  if (isOwnedByPlayer(settlement)) return fail('invalid', 'Свою гавань не запирают.')
  // Блокада — дело войны: своей или той короны, которой служишь.
  const side = sideOfPlace(state, settlement)
  const war = hostileTo(state, settlement) || (side !== null && atWar(state.politics, PLAYER, side))
  if (!war) {
    return fail('requirements', 'Запирать чужую гавань без войны — это разбой, а не блокада.')
  }
  if (blockadesOf(state).some((one) => one.locationId === locationId)) {
    return fail('invalid', 'Эта гавань уже заперта.')
  }

  const draft = open(state)
  advance(draft, hours(8))
  draft.blockades = [...blockadesOf(draft), { locationId, sinceDay: day, ships: ships.length }]
  notice(draft, `${here.name} заперт: ${ships.length} судов держат запор.`, 'war')
  return close(draft)
}

/** Снять блокаду. */
function liftBlockade(state: GameState, locationId: string): CommandResult {
  if (!blockadesOf(state).some((one) => one.locationId === locationId)) {
    return fail('invalid', 'Эта гавань не заперта тобой.')
  }
  const draft = open(state)
  advance(draft, hours(4))
  draft.blockades = blockadesOf(draft).filter((one) => one.locationId !== locationId)
  notice(draft, `${draft.base.world.locations[locationId]?.name}: запор снят.`, 'war')
  return close(draft)
}

/**
 * Охота на чужую торговлю (этап 87, Ф5).
 *
 * С грамотой это служба, без грамоты — разбой. Добыча одна и та же; разное
 * только то, кем тебя после этого считают и насколько портятся отношения.
 */
function huntTrade(state: GameState, locationId: string): CommandResult {
  const day = dayOf(state.time)
  const ships = afloat(state, day)
  if (ships.length === 0) return fail('requirements', NAVY_WORDS.noFleet)
  if (!isHarbour(state.world, locationId)) return fail('invalid', 'Торговлю стерегут у гаваней.')
  const near = landingSites(state.world, state.locationId)
  if (!near.includes(locationId) && locationId !== state.locationId) {
    return fail('unavailableHere', 'Эта гавань слишком далеко.')
  }
  const settlement = state.settlements[locationId]
  const here = state.world.locations[locationId]
  if (!settlement || !here) return fail('invalid', 'Такого места нет.')
  if (isOwnedByPlayer(settlement)) return fail('invalid', 'Свою торговлю не грабят.')
  const side = sideOfPlace(state, settlement)
  const letter = state.letter ?? null
  const lawful = letter !== null && letter.untilDay >= day && letter.against === side

  const draft = open(state)
  const prize = prizeAt(state, locationId)
  addMoney(draft, prize)
  advance(draft, hours(10))
  // Хозяин помнит и то, и другое: грамота не делает добычу законной в его глазах.
  if (side) {
    draft.politics = withRelation(
      draft.politics,
      PLAYER,
      side,
      lawful ? NAVY.letterRelations : NAVY.piracyRelations,
    )
  }
  draft.reputation = withPlaceRep(draft.reputation, locationId, -6)
  if (!lawful) draft.renown = Math.max(0, draft.renown - 1)
  notice(
    draft,
    `${here.name}: взято с купцов ${prize}. ${lawful ? 'Грамота при тебе: это служба.' : 'Грамоты нет: это разбой, и так это и запомнят.'}`,
    'war',
  )
  return close(draft)
}

/** Просить у короны корсарскую грамоту (Ф5). */
function askLetter(state: GameState, against: string): CommandResult {
  const mine = state.service ?? state.realm?.name ?? null
  const from = state.service
  if (!from) return fail('requirements', 'Грамоту даёт корона, которой служишь.')
  if (!atWar(state.politics, from, against)) {
    return fail('requirements', 'Грамоту дают против тех, с кем корона воюет.')
  }
  if (!mine) return fail('requirements', 'Грамоту дают тому, кто за кого-то держится.')

  const draft = open(state)
  const day = dayOf(draft.time)
  advance(draft, hours(6))
  draft.letter = { fromKingdom: from, against, untilDay: day + NAVY.letterDays }
  notice(
    draft,
    `${kingdomName(draft.base, from)} даёт грамоту против ${kingdomName(draft.base, against)} на ${NAVY.letterDays} сут.: чужая торговля теперь твоя добыча.`,
    'world',
  )
  return close(draft)
}

/** Чья это земля: корона места или корона его хозяина. */
function sideOfPlace(state: GameState, settlement: Settlement): string | null {
  const owner = settlement.owner
  if (!owner) return null
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  return state.politics.lords.find((lord) => lord.id === owner)?.kingdomId ?? null
}

/**
 * Сутки флота (этап 87).
 *
 * Суда сходят со стапеля, съедают содержание и держат запоры: блокада душит
 * подвоз, портит память запертого места и каждые сутки отнимает у его хозяина
 * пошлину.
 */
function tickNavy(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const ships = afloat(draft, day)
  if (ships.length > 0) {
    const upkeep = fleetUpkeep(ships) * days
    addMoney(draft, -Math.round(upkeep))
  }
  const launched = navyOf(draft).filter((one) => one.readyDay > day - days && one.readyDay <= day)
  for (const ship of launched) {
    notice(draft, `${warshipDef(ship.kind).label} «${ship.name}» сошёл на воду.`, 'world')
  }
  // Чужой запор считается не каждые сутки, а раз в пятидневку — и сразу за
  // все её дни: чужой флот выводится дорого (бюджет: сутки ≤ 6 мс).
  if (day % NAVY_BEAT === 0) shutOwnHarbours(draft, days + NAVY_BEAT - 1)
  if (blockadesOf(draft).length === 0) return
  // Держать запор нечем — запор снимается сам.
  if (ships.length === 0) {
    draft.blockades = []
    notice(draft, 'Запоры сняты: держать их больше нечем.', 'war')
    return
  }
  let places = draft.settlements
  for (const shut of blockadesOf(draft)) {
    const bite = blockadeBite(draft.base, shut.locationId)
    const place = places[shut.locationId]
    if (!place) continue
    places = {
      ...places,
      [shut.locationId]: {
        ...place,
        stock: {
          ...place.stock,
          grain: Math.max(0, place.stock.grain * (1 - bite.trade * 0.25 * days)),
        },
      },
    }
    // Память места считается целыми: запертая гавань замечает запор каждые
    // сутки, даже если она мала.
    draft.reputation = withPlaceRep(
      draft.reputation,
      shut.locationId,
      Math.min(-days, Math.round(bite.mood * days)),
    )
  }
  draft.settlements = places
}

/**
 * Чужой запор на своей гавани (этап 87, Ф4).
 *
 * Блокада — не только твоё оружие. Корона, с которой ты воюешь, держит свой
 * флот у своих гаваней (выводится, а не хранится), и если он сильнее твоего, а
 * твоя гавань ему по пути — в неё тоже никто не входит. Цена та же: подвоз,
 * память места и пошлина, которой ты не получишь.
 */
function shutOwnHarbours(draft: Draft, days: number): void {
  const day = dayOf(draft.time)
  const mine = holdingsOf(draft.settlements, PLAYER).filter((one) =>
    isHarbour(draft.base.world, one.locationId),
  )
  if (mine.length === 0) return
  const ours = fleetForce(afloat(draft, day))
  let places = draft.settlements
  let shut = 0
  for (const port of mine) {
    const foes = new Set<string>()
    for (const war of draft.politics.wars) {
      if (war.a === PLAYER) foes.add(war.b)
      if (war.b === PLAYER) foes.add(war.a)
    }
    if (foes.size === 0) return
    const reach = new Set(landingSites(draft.base.world, port.locationId))
    let force = 0
    for (const foe of foes) {
      for (const ship of crownFleet(draft.base, draft.base.world, foe, day)) {
        if (reach.has(ship.portId) || ship.portId === port.locationId) force += shipForce(ship)
      }
    }
    if (force <= ours) continue
    shut += 1
    const bite = blockadeBite(draft.base, port.locationId)
    addMoney(draft, -bite.toll * days)
    const place = places[port.locationId]
    if (place) {
      places = {
        ...places,
        [port.locationId]: {
          ...place,
          stock: {
            ...place.stock,
            grain: Math.max(0, place.stock.grain * (1 - bite.trade * 0.25 * days)),
          },
        },
      }
    }
    draft.reputation = withPlaceRep(
      draft.reputation,
      port.locationId,
      Math.min(-days, Math.round(bite.mood * days)),
    )
  }
  draft.settlements = places
  if (shut > 0 && day % 10 === 0) {
    notice(draft, `Чужие суда держат твои гавани: заперто ${shut}. Пошлина не идёт.`, 'war')
  }
}

/**
 * Разобрать дело самому (этап 107, Дн1 и Дн2).
 *
 * Внимание — главный ресурс власти: дел у дверей больше, чем ты успеешь взять.
 * Разобранное тобой решается лучше всего и стоит усталости; взятое сверх сил
 * стоит вдвое.
 */
function hearMatter(state: GameState, matterId: string): CommandResult {
  const day = dayOf(state.time)
  const plan = dayOfRule(state, state.world, day)
  const matter = plan.waiting.find((one) => one.id === matterId)
  if (!matter) return fail('invalid', 'Такого дела у дверей нет.')
  if ((state.settled?.[matterId] ?? 0) >= day) {
    return fail('invalid', 'Это дело сегодня уже разбирали.')
  }
  const taken = Object.values(state.settled ?? {}).filter((one) => one === day).length
  if (taken >= plan.canTake) {
    return fail('requirements', `На сегодня довольно: больше ${plan.canTake} дел не берут.`)
  }

  const draft = open(state)
  advance(draft, hours(4))
  addFatigue(draft, matterFatigue(state))
  draft.settled = { ...(draft.settled ?? {}), [matterId]: day }
  draft.ruleLog = { ...draft.ruleLog, heard: draft.ruleLog.heard + 1 }
  // Разобранное тобой идёт в зачёт тому, о ком оно: место, вассал, свой человек.
  if (matter.kind === 'plea') {
    draft.reputation = withPlaceRep(draft.reputation, matter.about, 6)
  }
  if (matter.kind === 'vassal') shiftVassals(draft, 5, matter.about)
  if (matter.kind === 'courtier') {
    draft.favours = {
      ...(draft.favours ?? {}),
      [matter.about]: (draft.favours?.[matter.about] ?? 0) + 1,
    }
  }
  notice(draft, `${matter.says} ${AUDIENCE_WORDS.heard}`, 'people')
  return close(draft)
}

/**
 * Передать дело своему (этап 107, Дн4).
 *
 * Дешевле временем, дороже точностью: решит он — и решит по-своему, тем лучше,
 * чем он лучше. Твоего часа это не стоит, но и твоим решением не будет.
 */
function handMatter(state: GameState, matterId: string): CommandResult {
  const day = dayOf(state.time)
  const plan = dayOfRule(state, state.world, day)
  const matter = plan.waiting.find((one) => one.id === matterId)
  if (!matter) return fail('invalid', 'Такого дела у дверей нет.')
  const who = whoTakes(state, matter, day)
  if (!who) return fail('requirements', 'Передавать некому: двор пуст.')

  const draft = open(state)
  advance(draft, hours(1))
  draft.settled = { ...(draft.settled ?? {}), [matterId]: day }
  draft.ruleLog = { ...draft.ruleLog, handed: draft.ruleLog.handed + 1 }
  const worth = delegatedWorth(who, state.character.attributes.charisma)
  if (matter.kind === 'plea') {
    draft.reputation = withPlaceRep(draft.reputation, matter.about, Math.round(6 * worth))
  }
  if (matter.kind === 'vassal') shiftVassals(draft, Math.round(5 * worth), matter.about)
  notice(
    draft,
    `${matter.says} ${AUDIENCE_WORDS.handed} Взял ${who.name} (${who.temper}, умение ${who.worth}): выйдет на ${Math.round(worth * 100)} из ста от твоего.`,
    'people',
  )
  return close(draft)
}

/**
 * Чужой обман (этап 121, Об1–Об5).
 *
 * Обман короны — та же весть, что правда, только с выгодной ей поправкой. Её
 * можно раскусить своими людьми там и расхождением вестей; пойманный теряет
 * доверие в общем слое (этап 103), а не в особом счётчике.
 */
function tickDeceit(draft: Draft, days: number): void {
  if (days <= 0 || !draft.realm) return
  const day = dayOf(draft.time)
  if (day % DECEIT.beat !== 0) return
  for (const side of Object.keys(draft.base.world.kingdoms)) {
    const interested =
      atWar(draft.politics, PLAYER, side) ||
      Math.abs(relationOf(draft.politics, PLAYER, side)) >= 15
    if (!interested) continue
    const lie = deceitOf(draft.base, draft.world, side, day)
    if (!lie.kind) continue
    draft.deceitLog = { ...draft.deceitLog, made: draft.deceitLog.made + 1 }
    const unmasked = seeThrough(draft.base, draft.world, side, day)
    const teller = `посол ${kingdomName(draft.base, side)}`
    if (unmasked.seen) {
      draft.deceitLog = { ...draft.deceitLog, caught: draft.deceitLog.caught + 1 }
      // Пойманный теряет слово: с этого дня его вести шире на всё (этап 103).
      const row = draft.trust[teller] ?? { said: 0, lied: 0 }
      draft.trust = { ...draft.trust, [teller]: { said: row.said + 1, lied: row.lied + 1 } }
      notice(
        draft,
        `${kingdomName(draft.base, side)}: ${DECEIT_DEFS[lie.kind].label}. ${unmasked.says} ${DECEIT_WORDS.punished}`,
        'world',
      )
      continue
    }
    draft.deceitLog = { ...draft.deceitLog, worked: draft.deceitLog.worked + 1 }
    if (lie.kind === 'promise') {
      const row = draft.trust[teller] ?? { said: 0, lied: 0 }
      draft.trust = { ...draft.trust, [teller]: { said: row.said + 1, lied: row.lied } }
      notice(
        draft,
        `${kingdomName(draft.base, side)}: ${lie.says} ${DECEIT_DEFS.promise.about}`,
        'world',
      )
      continue
    }
    // Ложная сила и ложная слабость ложатся вестью в твоё знание.
    draft.words = withSightings(draft.words, [
      deceitWord(draft.base, draft.world, side, lie.kind, day),
    ])
    const row = draft.trust[teller] ?? { said: 0, lied: 0 }
    draft.trust = { ...draft.trust, [teller]: { said: row.said + 1, lied: row.lied } }
  }
}

/**
 * Заблуждение и прозрение (этап 120, Уп1, Уп3 и Уп4).
 *
 * Корона видит то, что ждёт увидеть: предубеждение выводится из нрава. Раз
 * поверив, она держится своего, пока новое не разойдётся с прежним громче, чем
 * она упряма; когда разойдётся — это событие, и партия её меняется.
 */
function tickBeliefs(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % BIAS.beat !== 0) return
  if (!draft.realm) return
  const sides = Object.keys(draft.base.world.kingdoms)
  // Сила считается один раз на всех: она об одном и том же — о тебе.
  const about = PLAYER
  const truth = strengthOf(draft.base, draft.world, about, day).score
  if (truth <= 0) return
  for (const watcher of sides) {
    // Свежее мнение: предубеждение поверх того, что ему принесли.
    const fresh = shadedBy(watcher, truth)
    const held = beliefOf(draft.base, watcher, about)
    if (!held) {
      draft.beliefs = { ...draft.beliefs, [`${watcher}:${about}`]: { value: fresh, day } }
      continue
    }
    const loud = loudEnough(watcher, held.value, fresh)
    if (!loud.loud) {
      draft.biasLog = { ...draft.biasLog, held: draft.biasLog.held + 1 }
      continue
    }
    draft.beliefs = { ...draft.beliefs, [`${watcher}:${about}`]: { value: fresh, day } }
    draft.biasLog = { ...draft.biasLog, woke: draft.biasLog.woke + 1 }
    // Цена упорства (Уп5): если он пошёл войной, недооценив тебя, век это
    // запоминает — прозрение приходит, когда война уже начата.
    const wentToWar = draft.politics.wars.some(
      (war) =>
        (war.a === watcher || war.b === watcher) &&
        (war.a === PLAYER || war.b === PLAYER) &&
        day - war.since <= BIAS.beat * 2,
    )
    if (wentToWar && held.value < truth * 0.7) {
      draft.biasLog = { ...draft.biasLog, warsByError: draft.biasLog.warsByError + 1 }
      notice(
        draft,
        `${kingdomName(draft.base, watcher)}: ${BIAS_WORDS.cost} Он считал, что у тебя ${held.value}, а их ${truth}.`,
        'world',
      )
    }
    if (!canSeePicture(draft.base, watcher).can) continue
    notice(
      draft,
      `${kingdomName(draft.base, watcher)}: ${BIAS_WORDS.woke} Было ${held.value}, стало ${fresh} (разошлось на ${Math.round(loud.delta * 100)} из ста при упорстве ${Math.round(loud.needs * 100)}).`,
      'world',
    )
  }
}

/**
 * Короны делают выводы (этап 119, Вы1–Вы5).
 *
 * Раз в две недели каждая корона, которой ты вообще интересен, смотрит на твои
 * приметы и называет твой замысел. Вывод хранится: по нему она готовится
 * заранее, а повторяющиеся приметы она замечает быстрее случайных.
 */
function tickGuesses(draft: Draft, days: number): void {
  if (days <= 0 || !draft.realm) return
  const day = dayOf(draft.time)
  if (day % GUESS.beat !== 0) return
  for (const side of Object.keys(draft.base.world.kingdoms)) {
    const interested =
      atWar(draft.politics, PLAYER, side) ||
      Math.abs(relationOf(draft.politics, PLAYER, side)) >= 15
    if (!interested) continue
    const guessed = guessAim(draft.base, draft.world, side, day)
    const tells = tellsOf(draft.base, draft.world, side, day).filter((one) => one.kind !== 'noise')
    // Он учится на повторяющемся: те же приметы в следующий раз видны быстрее.
    if (tells.length > 0) {
      draft.tellSeen = {
        ...draft.tellSeen,
        [side]: Math.min(6, (draft.tellSeen[side] ?? 0) + 1),
      }
    } else {
      draft.tellSeen = { ...draft.tellSeen, [side]: Math.max(0, (draft.tellSeen[side] ?? 0) - 1) }
    }
    const had = draft.guesses[side]
    if (had?.aim === guessed.aim) continue
    draft.guesses = {
      ...draft.guesses,
      [side]: { aim: guessed.aim, sinceDay: day, right: guessed.right },
    }
    draft.guessLog = {
      ...draft.guessLog,
      made: draft.guessLog.made + 1,
      right: draft.guessLog.right + (guessed.right ? 1 : 0),
      wrong: draft.guessLog.wrong + (guessed.right ? 0 : 1),
      confused: draft.guessLog.confused + (guessed.aim === 'none' ? 1 : 0),
    }
    // Он готовится заранее (Вы3): гарнизоны по границе усиливают, хлеб свозят
    // за стены. Это настоящая подготовка, а не надпись: брать станет дороже.
    if (guessed.aim === 'takeLand' && guessed.confidence >= GUESS.acts) {
      const theirs = Object.values(draft.settlements).filter((one) => {
        if (!one.owner) return false
        if (one.owner === `crown:${side}`) return true
        return draft.politics.lords.some((lord) => lord.id === one.owner && lord.kingdomId === side)
      })
      let places = draft.settlements
      for (const place of theirs.slice(0, 6)) {
        const now = garrisonSize(place)
        const want = Math.round(now * GUESS.readyGarrison)
        const add = Math.max(0, Math.min(want - now, garrisonLimit(draft.world, place) - now))
        if (add <= 0) continue
        places = {
          ...places,
          [place.locationId]: {
            ...place,
            garrison: { ...place.garrison, militia: (place.garrison.militia ?? 0) + add },
          },
        }
      }
      draft.settlements = places
    }
    // О выводе узнаёшь, если у тебя есть там глаза: иначе он просто есть.
    if (!canSeePicture(draft.base, side).can) continue
    notice(
      draft,
      `${kingdomName(draft.base, side)}: ${guessed.says} ${PLAYER_AIM_DEFS[guessed.aim].prepares}`,
      'world',
    )
  }
}

/**
 * Ржавчина (этап 125, Ц4).
 *
 * Навык, которым не занимаются годами, оседает — не до нуля и не быстро.
 * Считается раз в сезон: чаще незачем, а реже игрок не заметит связи.
 */
function tickRust(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % GROWTH.rustBeat !== 0) return
  let skills = draft.character.skills
  let lost = 0
  let which = ''
  for (const [id, progress] of Object.entries(skills)) {
    const used = draft.usedDay[id] ?? 0
    if (used === 0 || progress.level <= 0) continue
    const rusted = rustOf(progress.level, used, day)
    if (rusted.lost <= 0) continue
    skills = { ...skills, [id]: { ...progress, level: rusted.level, xp: 0 } }
    draft.usedDay = { ...draft.usedDay, [id]: day }
    lost += rusted.lost
    which = SKILLS[id as SkillId].label
  }
  if (lost === 0) return
  patch(draft, { skills })
  notice(draft, `${GROWTH_WORDS.rust} ${which} и другие: потеряно ${lost} уровней.`, 'people')
}

/**
 * Служба учит сама (этап 124, Пу6).
 *
 * Рост за чужой счёт: пока ты кому-то служишь, навыки этой службы растут без
 * серебра и без школы. Платишь ты не деньгами, а свободой: служащий не сам
 * себе голова.
 */
function tickService(draft: Draft, days: number): void {
  if (days <= 0) return
  // Считается раз в декаду за всю декаду: перебирать навыки каждый день дорого,
  // а на росте это не сказывается.
  const day = dayOf(draft.time)
  if (day % SERVICE_BEAT !== 0) return
  const kinds: string[] = []
  if (draft.service) kinds.push('mercenary')
  if (draft.realm) kinds.push('steward')
  if ((draft.embassies ?? []).length > 0 || draft.residents.length > 0) kinds.push('envoy')
  if ((draft.spies ?? []).length > 0) kinds.push('spy')
  if (draft.politics.lords.some((one) => one.kingdomId === PLAYER)) kinds.push('vassal')
  if (kinds.length === 0) return
  for (const kind of kinds) {
    for (const skill of serviceTeaches(kind)) {
      practice(draft, skill, PATH_DEFS.service.xp * days * 0.1 * SERVICE_BEAT, 'service')
    }
  }
}

/**
 * Переучиться (этап 126, Сл4).
 *
 * Сменить путь можно — и это стоит лет и денег, а не кнопки: половина уровня
 * теряется на переходе, и ещё столько же времени уходит на то, чтобы новое
 * дело стало своим.
 */
function retrain(state: GameState, from: SkillId, to: SkillId): CommandResult {
  if (from === to) return fail('invalid', 'Переучиваться с дела на то же дело незачем.')
  const cost = retrainCost(state.character, from, to)
  if (!cost.can) return fail('requirements', cost.says)
  if (state.character.money < cost.silver) {
    return fail('noMoney', `На это нужно ${cost.silver} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(24 * cost.days))
  addMoney(draft, -cost.silver)
  const had = draft.character.skills[from].level
  const moved = Math.round(had * MOULD.retrainLoses)
  patch(draft, {
    skills: {
      ...draft.character.skills,
      [from]: { level: had - moved, xp: 0 },
    },
  })
  practice(draft, to, moved * 40, 'doing')
  const was = mouldOf(state.character)
  const now = mouldOf(draft.character)
  notice(draft, cost.says, 'people')
  if (was.id !== now.id) {
    notice(draft, `${now.says} ${seenAs(now.id)}`, 'people')
  }
  return close(draft)
}

/**
 * Растить наследника (этап 132, Дм3).
 *
 * Наследнику и так достаётся треть отцовского умения (0.6). Воспитание
 * прибавляет к этой трети — и платится теми же часами, из которых состоит день
 * государя: учить сына значит не принимать просителей.
 */
function raiseHeir(state: GameState): CommandResult {
  const day = dayOf(state.time)
  const heir = heirOf(state.character.family, day)
  if (!heir) return fail('requirements', 'Растить некого: наследника нет.')
  if (raisedShare(state) >= LINEAGE.raiseMax) {
    return fail('invalid', 'Больше ты ему не передашь: сын не станет отцом.')
  }

  const draft = open(state)
  advance(draft, hours(LINEAGE.raiseHours))
  addFatigue(draft, 6)
  draft.raised = Math.min(LINEAGE.raiseMax, draft.raised + LINEAGE.raiseGain)
  const gets = heirGets({ ...draft.base, raised: draft.raised })
  notice(draft, `${heir.name}: ${gets.says}`, 'people')
  return close(draft)
}

/**
 * Дом и его лучший день (этап 132, Дм1 и Дм2).
 *
 * Лучшее запоминается, потери считаются против него. Ничего больше не хранится:
 * колена берутся из летописи, родство — из браков, слово — из договоров.
 */
function tickHouse(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % LINEAGE.beat !== 0) return
  const now = houseNow(draft.base, draft.world, day)
  const best = draft.houseBest
  // Лучшее только растёт: дом помнят по лучшему его дню.
  if (now.places > best.places || now.titleTier > best.titleTier) {
    draft.houseBest = {
      places: Math.max(best.places, now.places),
      titleTier: Math.max(best.titleTier, now.titleTier),
      shames: Math.min(best.shames, now.shames),
      day,
    }
    return
  }
  const losses = lossesOf(draft.base, draft.world, day)
  if (losses.length === 0) return
  // Потеря названа один раз в сезон, а не каждый такт.
  if (day % (LINEAGE.beat * 4) !== 0) return
  notice(
    draft,
    `${LINEAGE_WORDS.lost} ${losses.map((one) => LOSS_DEFS[one.loss].label).join(', ')}. ${losses[0]?.says ?? ''}`,
    'people',
  )
}

/**
 * Дар за признание (этап 131, Кр2, дверь серебра).
 *
 * Четвёртая дверь: признать выгоднее, чем не признавать. Стоит она по чужой
 * земле и дорожает к концу пути — последние трое берут больше первых пяти.
 */
function giftRecognition(state: GameState, to: string): CommandResult {
  if (!state.world.kingdoms[to]) return fail('invalid', 'Такой короны нет.')
  if (!state.realm) return fail('requirements', 'Признавать пока нечего: державы нет.')
  const day = dayOf(state.time)
  if (atWar(state.politics, PLAYER, to)) {
    return fail('requirements', 'Воюющему дары не посылают: сперва мир.')
  }
  if ((state.recognitions?.[to] ?? 0) > 0) {
    return fail('invalid', 'Эта корона тебя уже признала.')
  }
  const door = doorsTo(state, state.world, PLAYER, to, day).find((one) => one.door === 'coin')
  if (!door) return fail('invalid', 'Этой двери нет.')
  if (state.character.money < door.cost) {
    return fail('noMoney', `За признание просят ${door.cost} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(8))
  addMoney(draft, -door.cost)
  draft.recognitions = { ...draft.recognitions, [to]: day }
  draft.politics = withRelation(draft.politics, PLAYER, to, 12)
  notice(
    draft,
    `${kingdomName(draft.base, to)} признаёт тебя: ${door.cost} серебра. ${DOOR_DEFS.coin.after}`,
    'world',
  )
  return close(draft)
}

/**
 * Заём короне (этап 133, Тс2).
 *
 * Серебро делает то, что делает войско: должник не идёт на заимодавца, и
 * говорит с ним иначе. Берут по нужде — воюющему нужнее, — и больше, чем корона
 * сможет отдать, не дают: заимодавец тоже считает.
 */
function lendToCrown(state: GameState, to: string): CommandResult {
  if (!state.world.kingdoms[to]) return fail('invalid', 'Такой короны нет.')
  const day = dayOf(state.time)
  if (atWar(state.politics, PLAYER, to)) {
    return fail('requirements', 'Тому, с кем воюешь, в долг не дают.')
  }
  if (boundBy(state, state.world, 'usury', day)) {
    return fail('requirements', BIND_DEFS.usury.says)
  }
  const want = loanWanted(state, state.world, to, day)
  if (!want.can) return fail('requirements', want.says)
  if (state.character.money < want.wants) {
    return fail('noMoney', `На заём нужно ${want.wants} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(6))
  addMoney(draft, -want.wants)
  draft.crownDebts = { ...draft.crownDebts, [to]: { owed: want.wants, sinceDay: day } }
  draft.politics = withRelation(draft.politics, PLAYER, to, LEVER.loanWarms)
  notice(
    draft,
    `${kingdomName(draft.base, to)} берёт у тебя ${want.wants}. ${LEVER_DEFS.loan.after}`,
    'world',
  )
  return close(draft)
}

/**
 * Откуп от войны (этап 133, Тс2).
 *
 * Второе, что делает серебро вместо войска: война кончается сегодня, а не через
 * год. Платится дороже дани и тем дороже, чем лучше идут их дела, — и платится
 * не только серебром: откупившийся не выглядит победителем.
 */
function buyPeaceWith(state: GameState, against: string): CommandResult {
  if (!state.world.kingdoms[against]) return fail('invalid', 'Такой короны нет.')
  const day = dayOf(state.time)
  const price = buyPeaceCost(state, state.world, against, day)
  if (price.cost <= 0) return fail('requirements', price.says)
  if (!price.can) return fail('noMoney', `За мир просят ${price.cost} серебра.`)

  const draft = open(state)
  advance(draft, hours(10))
  addMoney(draft, -price.cost)
  draft.politics = {
    ...draft.politics,
    wars: draft.politics.wars.filter((one) => !sameSides(one, PLAYER, against)),
  }
  draft.politics = withRelation(draft.politics, PLAYER, against, 15)
  // Слава воинов от купленного мира не растёт, а убывает: деньгами воюют не все.
  draft.fame = {
    ...draft.fame,
    warriors: Math.max(-100, fameOf(draft, 'warriors') - 6),
  }
  notice(
    draft,
    `${kingdomName(draft.base, against)}: война куплена за ${price.cost}. ${LEVER_WORDS.bought}`,
    'war',
  )
  return close(draft)
}

/**
 * Долги и цена силы (этап 133, Тс2 и Тс4).
 *
 * Долг растёт процентом, пока корона воюет, и убывает, когда она в мире: долги
 * переживают государей. Цена силы берётся с той же ступени, с какой с тобой
 * начинают считаться, — церковь злится, свои отдаляются.
 */
function tickLevers(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % MIGHT.beat !== 0) return
  const debts: Record<string, { readonly owed: number; readonly sinceDay: number }> = {}
  for (const debt of crownDebtsOf(draft.base)) {
    const after = debtAfterBeat(debt.owed, warsOf(draft.politics, debt.kingdomId).length > 0)
    if (after.back > 0) addMoney(draft, after.back)
    if (after.owed >= LEVER.leastLoan / 10) {
      debts[debt.kingdomId] = { owed: after.owed, sinceDay: debt.sinceDay }
    } else {
      notice(
        draft,
        `${kingdomName(draft.base, debt.kingdomId)} отдаёт последнее: долг закрыт.`,
        'world',
      )
    }
  }
  draft.crownDebts = debts
  const cost = mightCost(draft.base, day)
  if (cost.churchAnger === 0) return
  draft.churchAnger = Math.max(0, (draft.churchAnger ?? 0) + cost.churchAnger)
  shiftVassals(draft, cost.apart, null)
}

/**
 * Дело веры (этап 134, Вр2).
 *
 * Четыре двери к признанию церкви: дар, собор, поход по призыву и кара
 * еретиков. Каждая прибавляет благочестия и сбивает её счёт, и у каждой своя
 * цена перед прочими коронами: собор они считают твоим судом над ними, а поход
 * — войной, в которую ты пошёл не за себя.
 */
function churchDeed(state: GameState, deed: HolyDeedId): CommandResult {
  const day = dayOf(state.time)
  const def = HOLY_DEED_DEFS[deed]
  // Собор и поход по призыву — дела громкие: тихому они закрыты (этап 139, Це4).
  if (goingQuiet(state) && (deed === 'synod' || deed === 'crusade')) {
    return fail('requirements', `${PRIMACY_WORDS.quiet} ${def.label} — дело громкое.`)
  }
  const cost = deedCost(state, deed, day)
  if (cost.waitDays > 0) return fail('requirements', cost.says)
  if (state.character.money < cost.money) {
    return fail('noMoney', `${def.label}: нужно ${cost.money} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(def.hours))
  addMoney(draft, -cost.money)
  draft.piety = (draft.piety ?? 0) + def.piety
  draft.churchAnger = Math.max(0, (draft.churchAnger ?? 0) + def.anger)
  draft.deeds = { ...draft.deeds, [deed]: day }
  if (def.others < 0) {
    for (const id of Object.keys(draft.base.world.kingdoms)) {
      draft.politics = withRelation(draft.politics, PLAYER, id, def.others)
    }
  }
  notice(
    draft,
    `${def.label}: ${cost.money} серебра. Благочестия ${draft.piety}, счёт церкви ${draft.churchAnger}. ${def.after}`,
    'world',
  )
  return close(draft)
}

/**
 * Помазание и то, что из него следует (этап 134, Вр1 и Вр5).
 *
 * Церковь называет своим государем не за обряд, а за пройденный путь, и
 * перестаёт называть, когда путь перестал быть пройденным. Пока называет, мир
 * вокруг холодеет, а своя земля шатается изнутри.
 */
function tickAnoint(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % FAITH.beat !== 0) return
  // Благочестие само уходит: вера держится делами, а не памятью о них.
  if (day % 360 === 0) {
    draft.piety = (draft.piety ?? 0) + FAITH.fade
  }
  const now = anointedOf(draft.base, draft.world, day)
  if (!now.is) {
    if (draft.anointed) {
      draft.anointed = null
      notice(draft, FAITH_WORDS.lost, 'world')
    }
    return
  }
  if (!draft.anointed) {
    draft.anointed = { sinceDay: day }
    notice(draft, `${FAITH_WORDS.anointed} ${FAITH_WORDS.bound}`, 'world')
    return
  }
  const world = faithWorld(draft.base, draft.world, day)
  for (const id of Object.keys(draft.base.world.kingdoms)) {
    draft.politics = withRelation(draft.politics, PLAYER, id, world.fear)
  }
  shiftVassals(draft, world.unrest, null)
  if (day % (FAITH.beat * 18) === 0) notice(draft, world.says, 'world')
}

/**
 * Чужое продвижение расходится вестями, а страх считается по вестям (этап 135).
 *
 * Два такта в одном: раз в месяц молва разносит, кто как далеко зашёл, — до
 * соседей вернее, до дальних с прибавкой; раз в двадцать суток короны
 * пересчитывают, кто им опасен. Пути считаются по разу на сторону, а не по разу
 * на пару: иначе такт не уложится в бюджет.
 */
function tickDread(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const crowns = Object.keys(draft.base.world.kingdoms)
  if (day % DREAD.wordBeat === 0) {
    // Первым разносят про того, кто ближе всех к концу, и про тебя.
    const first = firstOf(draft.base, draft.world, day)
    const about = first.who === PLAYER ? [PLAYER] : [PLAYER, first.who]
    const said: Word[] = []
    for (const of of about) {
      const truth = wayTruth(draft.base, draft.world, of, day)
      if (truth === 0) continue
      const loud = rumouredWay(draft.base, draft.world, of, day)
      // Слушает и игрок: о чужом продвижении он узнаёт тем же слоем, что они о
      // его, — своими людьми вблизи и молвой издалека.
      for (const who of [...crowns, PLAYER]) {
        if (who === of) continue
        // Сосед слышит от своих и почти без прибавки; дальний — с торга.
        const near = dreadOf(draft.base, draft.world, who, of, day).parts.some(
          (one) => one.fear === 'near',
        )
        // Тихий не показывает (этап 139, Це3): до дальних о нём не доходит
        // вовсе, а соседи и так видят его землю.
        if (!near && of === PLAYER && goingQuiet(draft.base)) continue
        said.push({
          id: `word:way:${of}:${who}:${day}`,
          to: who,
          kind: 'way',
          about: of,
          value: near ? truth : loud,
          source: near ? 'envoy' : 'rumour',
          from: null,
          day,
        })
      }
    }
    for (const word of said) draft.words = bring(draft.words, word)
  }
  if (day % DREAD.beat !== 0) return
  const log: Record<string, { readonly score: number; readonly sinceDay: number }> = {}
  for (const who of crowns) {
    const seen = dreadSeen(draft.base, draft.world, who, PLAYER, day)
    if (!seen.dread.scared) continue
    const was = draft.dreadLog[who]
    log[who] = { score: seen.dread.score, sinceDay: was?.sinceDay ?? day }
    if (!was) {
      notice(draft, `${seen.says} ${DREAD_WORDS.counted}`, 'world')
    }
  }
  draft.dreadLog = log
}

/**
 * Мир складывается против первого (этап 136, Ко1 и Ко4).
 *
 * Причина, которой не было: сходятся не против сильного, а против того, кто
 * вот-вот дойдёт, — и видят это вестями (этап 135), а не правдой. Сложившаяся
 * коалиция держится сроком: испуг прошёл, а война идёт.
 */
function tickLeague(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % LEAGUE.beat !== 0) return
  const standing = draft.league
  if (standing) {
    if (day - standing.sinceDay < LEAGUE.holds) return
    const still = leagueAgainst(draft.base, draft.world, day)
    if (still.against === standing.against && still.members.length >= LEAGUE.least) return
    draft.league = null
    notice(
      draft,
      `Коалиция против ${kingdomName(draft.base, standing.against)} разошлась: держать её стало нечем.`,
      'world',
    )
    return
  }
  const now = leagueAgainst(draft.base, draft.world, day)
  if (!now.against || now.members.length < LEAGUE.least) return
  draft.league = { against: now.against, members: now.members, sinceDay: day }
  draft.leagueLog = {
    ...draft.leagueLog,
    formed: draft.leagueLog.formed + 1,
    against: [...draft.leagueLog.against, now.against],
  }
  declareLeagueWars(draft, now.against, now.members, day)
  notice(draft, now.says, 'war')
}

/** Каждый участник объявляет свою войну: согласованной она не будет (Ко4). */
function declareLeagueWars(
  draft: Draft,
  against: string,
  members: readonly string[],
  day: number,
): void {
  for (const who of members) {
    if (atWar(draft.politics, who, against)) continue
    draft.politics = {
      ...draft.politics,
      wars: [
        ...draft.politics.wars,
        { a: who, b: against, since: day, reason: LEAGUE_WORDS.why, casus: { kind: 'ambition' } },
      ],
    }
    draft.politics = withRelation(draft.politics, who, against, LEAGUE.chills)
  }
}

/**
 * Разобрать коалицию по одному (этап 136, Ко3).
 *
 * У всякого свой ключ, и он берётся из того, зачем он вошёл: холодному нужен
 * выкуп, воюющему — уступка, дальнему — тайная статья, тёплому — родство.
 */
function breakLeague(state: GameState, member: string): CommandResult {
  const day = dayOf(state.time)
  const league = leagueNow(state, state.world, day)
  if (!league.against) return fail('requirements', 'Разбирать нечего: коалиции нет.')
  if (!league.members.includes(member)) {
    return fail('invalid', 'Эта корона в коалиции не состоит.')
  }
  const key = keyTo(state, state.world, member, day)
  if (key.cost > 0 && state.character.money < key.cost) {
    return fail('noMoney', `${KEY_DEFS[key.key].label}: нужно ${key.cost} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(12))
  if (key.cost > 0) addMoney(draft, -key.cost)
  if (key.key === 'yield') {
    // Уступка: отданная дань и есть уступка — её не просят назад.
    draft.politics = {
      ...draft.politics,
      tributes: draft.politics.tributes.filter(
        (one) => !(one.from === member && one.to === PLAYER),
      ),
    }
    draft.politics = withRelation(draft.politics, PLAYER, member, LEAGUE.yieldWarms)
  }
  if (key.key === 'kin') {
    draft.marriages = [
      ...(draft.marriages ?? []),
      {
        kingdomId: member,
        who: 'child',
        name: kingdomName(draft.base, member),
        sinceDay: day,
        dowry: 0,
      },
    ]
  }
  if (key.key === 'secret') {
    draft.hushed = { ...draft.hushed, [`league:${member}`]: day + SECRET.hushDays }
    draft.politics = withRelation(draft.politics, PLAYER, member, 10)
  }
  draft.leagueBought = { ...draft.leagueBought, [member]: day }
  draft.leagueLog = { ...draft.leagueLog, bought: draft.leagueLog.bought + 1 }
  // Вышедший выходит и из войны: он входил в неё коалицией.
  if (league.against === PLAYER) {
    draft.politics = {
      ...draft.politics,
      wars: draft.politics.wars.filter((one) => !sameSides(one, PLAYER, member)),
    }
  }
  draft.league = draft.league
    ? { ...draft.league, members: draft.league.members.filter((one) => one !== member) }
    : null
  notice(
    draft,
    `${kingdomName(draft.base, member)} выходит: ${KEY_DEFS[key.key].label}${key.cost > 0 ? ` (${key.cost})` : ''}. ${KEY_DEFS[key.key].after}`,
    'world',
  )
  return close(draft)
}

/**
 * Собрать мир против того, кто ближе тебя (этап 136, Ко5).
 *
 * Быть участником, а не целью, — тоже ход: коалиция складывается против
 * первого, и первым можно назначить другого, если мир и так его боится.
 */
function callLeague(state: GameState, against: string): CommandResult {
  if (!state.world.kingdoms[against]) return fail('invalid', 'Такой короны нет.')
  const day = dayOf(state.time)
  const call = whoToCall(state, state.world, day)
  if (call.against !== against) return fail('requirements', call.says)
  if (call.members.length < LEAGUE.least) {
    return fail('requirements', `Пойдут только ${call.members.length}, нужно ${LEAGUE.least}.`)
  }
  if (state.character.money < LEAGUE.callCost) {
    return fail('noMoney', `На послов и дары нужно ${LEAGUE.callCost} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(LEAGUE.callHours))
  addMoney(draft, -LEAGUE.callCost)
  draft.league = { against, members: call.members, sinceDay: day }
  draft.leagueLog = {
    ...draft.leagueLog,
    formed: draft.leagueLog.formed + 1,
    against: [...draft.leagueLog.against, against],
  }
  declareLeagueWars(draft, against, call.members, day)
  draft.politics = withRelation(draft.politics, PLAYER, against, LEAGUE.chills)
  // Собрать можно и не против того (этап 139, Це5): сейчас это незаметно, а
  // через полгода вскроется — и спросят с тебя.
  const rightly = rightlyFirst(draft.base, draft.world, against, day)
  if (!rightly.right) {
    draft.wrongCalls = [...draft.wrongCalls, { against, day }]
  }
  notice(draft, `${LEAGUE_WORDS.called} ${call.says}`, 'war')
  return close(draft)
}

/**
 * Поручиться за слабого (этап 137, Га1).
 *
 * Слабый не обещает взамен ничего, кроме того, что он слабый. Сильный получает
 * слово, которое видят все, — и связанные этим словом руки.
 */
function giveGuarantee(state: GameState, of: string): CommandResult {
  if (!state.world.kingdoms[of]) return fail('invalid', 'Такой короны нет.')
  const day = dayOf(state.time)
  const can = canGuarantee(state, state.world, PLAYER, of, day)
  if (!can.can) return fail('requirements', can.says)

  const draft = open(state)
  advance(draft, hours(8))
  draft.guarantees = [...draft.guarantees, { by: PLAYER, of, sinceDay: day }]
  draft.politics = withRelation(draft.politics, PLAYER, of, 20)
  draft.renown += 2
  notice(draft, `${WARD_WORDS.given} ${kingdomName(draft.base, of)}. ${WARD_WORDS.bound}`, 'world')
  return close(draft)
}

/**
 * Взять под руку (этап 137, Га2).
 *
 * Не дань и не вассалитет, а третье: земля остаётся его, войско остаётся его, а
 * отвечаешь за него ты. Взамен под рукой не признают за себя — признание идёт
 * руке, и потому рука ближе к концу своего пути (этап 131).
 */
function takeUnderHand(state: GameState, of: string): CommandResult {
  if (!state.world.kingdoms[of]) return fail('invalid', 'Такой короны нет.')
  const day = dayOf(state.time)
  if (handOver(state, of)) return fail('invalid', 'Эта корона уже под рукой.')
  const wants = wantsHand(state, state.world, of, day)
  if (wants.patron !== PLAYER) return fail('requirements', wants.says)

  const draft = open(state)
  advance(draft, hours(16))
  draft.hands = [...draft.hands, { patron: PLAYER, ward: of, sinceDay: day }]
  if (!guarantorOf(draft.base, of)) {
    draft.guarantees = [...draft.guarantees, { by: PLAYER, of, sinceDay: day }]
  }
  // Признание идёт руке: под рукой корона не признаёт за себя.
  draft.recognitions = { ...draft.recognitions, [of]: day }
  draft.politics = withRelation(draft.politics, PLAYER, of, 25)
  notice(
    draft,
    `${kingdomName(draft.base, of)}: ${WARD_WORDS.hand} ${BOND_DEFS.hand.after}`,
    'world',
  )
  return close(draft)
}

/**
 * Самому пойти под руку (этап 137, Га2 и Га5).
 *
 * Слабому это тоже ход: пока ты под рукой, на тебя не ходят — но и ты не
 * ходишь ни на кого, и твоё признание считается не за тебя.
 */
function seekHand(state: GameState, patron: string): CommandResult {
  if (!state.world.kingdoms[patron]) return fail('invalid', 'Такой короны нет.')
  const day = dayOf(state.time)
  if (handOver(state, PLAYER)) return fail('invalid', 'Ты уже под чьей-то рукой.')
  const wants = wantsHand(state, state.world, PLAYER, day)
  if (wants.patron !== patron) return fail('requirements', wants.says)

  const draft = open(state)
  advance(draft, hours(24))
  draft.hands = [...draft.hands, { patron, ward: PLAYER, sinceDay: day }]
  draft.guarantees = [...draft.guarantees, { by: patron, of: PLAYER, sinceDay: day }]
  draft.politics = withRelation(draft.politics, PLAYER, patron, 30)
  notice(
    draft,
    `Ты под рукой ${kingdomName(draft.base, patron)}: на тебя не ходят, и ты не ходишь. ${BOND_DEFS.hand.after}`,
    'world',
  )
  return close(draft)
}

/**
 * Зов и слово (этап 137, Га4 и Га5).
 *
 * За того, за кого поручился, взялись — значит, зовут тебя. Не пришёл в срок —
 * потерял слово, и потерял дороже, чем нарушив грамоту: бумагу рвут многие, не
 * приходят на зов немногие. Короны делают то же самое между собой.
 */
function tickWard(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % WARD.beat !== 0) return
  // Сперва зовут: за того, за кого ты поручился, взялись.
  for (const call of calledOn(draft.base, draft.world, PLAYER, day)) {
    const row = draft.guarantees.find(
      (one) => one.by === PLAYER && one.of === call.of && one.brokenDay === undefined,
    )
    if (!row || row.calledDay !== undefined) continue
    draft.guarantees = draft.guarantees.map((one) =>
      one === row ? { ...one, calledDay: day, against: call.against } : one,
    )
    notice(draft, call.says, 'war')
  }
  // А потом смотрят, пришёл ли. Кончилась ли та война сама — дела не меняет:
  // звали тебя, а не войну.
  for (const row of draft.guarantees) {
    if (row.by !== PLAYER || row.brokenDay !== undefined) continue
    if (row.calledDay === undefined || row.against === undefined) continue
    if (atWar(draft.politics, PLAYER, row.against)) {
      draft.guarantees = draft.guarantees.map((one) =>
        one === row ? { by: one.by, of: one.of, sinceDay: one.sinceDay } : one,
      )
      draft.renown += 3
      notice(draft, `${WARD_WORDS.kept} ${kingdomName(draft.base, row.of)}.`, 'war')
      continue
    }
    if (day - row.calledDay < WARD.comeDays) continue
    // Срок вышел, а тебя нет: слово потеряно.
    const cost = breakingWord()
    draft.guarantees = draft.guarantees.map((one) =>
      one === row ? { ...one, brokenDay: day } : one,
    )
    for (const id of Object.keys(draft.base.world.kingdoms)) {
      draft.politics = withRelation(draft.politics, PLAYER, id, cost.world)
    }
    shameOn(draft, 'broke')
    notice(draft, `${cost.says} Речь о ${kingdomName(draft.base, row.of)}.`, 'world')
  }
  // Короны берут слабых под руку и ручаются друг за друга (Га5).
  if (day % (WARD.beat * 4) !== 0) return
  for (const ward of Object.keys(draft.base.world.kingdoms)) {
    if (handOver(draft.base, ward)) continue
    const wants = wantsHand(draft.base, draft.world, ward, day)
    if (!wants.patron || wants.patron === PLAYER) continue
    draft.hands = [...draft.hands, { patron: wants.patron, ward, sinceDay: day }]
    if (!guarantorOf(draft.base, ward)) {
      draft.guarantees = [...draft.guarantees, { by: wants.patron, of: ward, sinceDay: day }]
    }
    notice(
      draft,
      `${kingdomName(draft.base, ward)} идёт под руку ${kingdomName(draft.base, wants.patron)}. ${WARD_WORDS.theirs}`,
      'world',
    )
    return
  }
}

/**
 * Признать чужую корону (этап 138, Пр5).
 *
 * Не любезность и не пустое слово: признание считается в его пути так же, как
 * чужое считается в твоём. Оттого признавать соседа, который и так впереди, —
 * ход дорогой: ближе к концу станет не ты.
 */
function recogniseCrown(state: GameState, of: string): CommandResult {
  if (!state.world.kingdoms[of]) return fail('invalid', 'Такой короны нет.')
  if (hasGiven(state, of)) return fail('invalid', 'Ты его уже признал.')
  const day = dayOf(state.time)
  if (atWar(state.politics, PLAYER, of)) {
    return fail('requirements', 'Того, с кем воюешь, не признают: сперва мир.')
  }
  const cost = givingCost(state, state.world, of, day)

  const draft = open(state)
  advance(draft, hours(6))
  draft.given = { ...draft.given, [of]: day }
  draft.politics = withRelation(draft.politics, PLAYER, of, 15)
  notice(draft, cost.says, 'world')
  return close(draft)
}

/**
 * Отозвать признание (этап 138, Пр3).
 *
 * Отозванное признание — повод к войне, и мир понимает это именно так: не
 * ссора, а заявленное право. Оттого и стоит оно дороже ссоры.
 */
function recallRecognition(state: GameState, of: string): CommandResult {
  if (!state.world.kingdoms[of]) return fail('invalid', 'Такой короны нет.')
  if (!hasGiven(state, of)) return fail('invalid', 'Ты его и не признавал.')
  const day = dayOf(state.time)

  const draft = open(state)
  advance(draft, hours(4))
  const given = { ...draft.given }
  delete given[of]
  draft.given = given
  draft.recalls = [...draft.recalls, { by: PLAYER, of, day }]
  draft.politics = withRelation(draft.politics, PLAYER, of, ACCLAIM.recallChills)
  notice(
    draft,
    `Ты отозвал признание у ${kingdomName(draft.base, of)}. ${ACCLAIM_WORDS.recalled}`,
    'world',
  )
  return close(draft)
}

/**
 * Чужое признание тоже отзывают (этап 138, Пр3).
 *
 * Та корона, с которой отношения упали ниже дна, забирает своё слово назад — и
 * это её повод к войне, а не просто холод.
 */
function tickAcclaim(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % ACCLAIM.beat !== 0) return
  for (const id of wouldRecall(draft.base, draft.world, PLAYER, day)) {
    const rest = { ...draft.recognitions }
    delete rest[id]
    draft.recognitions = rest
    draft.recalls = [...draft.recalls, { by: id, of: PLAYER, day }]
    notice(
      draft,
      `${kingdomName(draft.base, id)} отзывает своё признание. ${ACCLAIM_WORDS.recalled}`,
      'world',
    )
    return
  }
}

/**
 * Идти тихо (этап 139, Це3).
 *
 * Не коронуясь, не объявляя, не показывая: мир узнаёт о тебе меньше и позже, а
 * часть шагов пути при этом закрыта. Это не хитрость, а выбор темпа.
 */
function goQuiet(state: GameState): CommandResult {
  if (goingQuiet(state)) return fail('invalid', 'Ты и так идёшь тихо.')
  const day = dayOf(state.time)
  const draft = open(state)
  advance(draft, hours(2))
  draft.quiet = { sinceDay: day }
  notice(draft, `${PRIMACY_WORDS.quiet} ${PRIMACY_WORDS.slower}`, 'world')
  return close(draft)
}

/** И обратно: громко — короче и дороже (этап 139, Це4). */
function goLoud(state: GameState): CommandResult {
  if (!goingQuiet(state)) return fail('invalid', 'Ты и так идёшь громко.')
  const draft = open(state)
  advance(draft, hours(2))
  draft.quiet = null
  notice(draft, PRIMACY_WORDS.loud, 'world')
  return close(draft)
}

/**
 * Двор считает твой путь, а чужая ошибка вскрывается (этап 139, Це2 и Це5).
 *
 * Одним вассалам твоё продвижение слава, другим страх, и это не настроение, а
 * нрав: гордый и мрачный идут за тем, кто идёт к концу, расчётливый и набожный
 * от него отодвигаются.
 */
function tickPrimacy(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % PRIMACY.beat !== 0) return
  // Двор считает не продвижение вообще, а первенство: пока ты не первый в мире,
  // твой путь для вассалов — не слава и не страх, а просто дела государя.
  const pays = firstPays(draft.base, draft.world, day)
  if (firstOf(draft.base, draft.world, day).who === PLAYER) {
    const split = courtSplit(draft.base, draft.world, day)
    for (const lord of draft.politics.lords) {
      if (lord.kingdomId !== PLAYER) continue
      const glory = (TEMPER_LOOK[lordTemper(lord)] ?? 'fear') === 'glory'
      shiftVassals(draft, glory ? PRIMACY.courtMoves : -PRIMACY.courtMoves, lord.id)
    }
    if (day % (PRIMACY.beat * 6) === 0 && split.glory + split.fear > 0) {
      notice(draft, split.says, 'people')
    }
  }
  for (const call of draft.wrongCalls) {
    if (call.shown !== undefined || day - call.day < PRIMACY.showsUp) continue
    draft.wrongCalls = draft.wrongCalls.map((one) => (one === call ? { ...one, shown: day } : one))
    for (const id of Object.keys(draft.base.world.kingdoms)) {
      if (id === call.against) continue
      draft.politics = withRelation(draft.politics, PLAYER, id, PRIMACY.wrongCost)
    }
    draft.renown = Math.max(0, draft.renown + PRIMACY.wrongRenown)
    notice(
      draft,
      `${PRIMACY_WORDS.wrong} Речь о коалиции против ${kingdomName(draft.base, call.against)}.`,
      'world',
    )
    return
  }
}

/**
 * Короны идут своим путём (этап 140, Кп1 и Кп3).
 *
 * Путь выводится из короны, а здесь только помнится земля, по убыли которой
 * считается поражение, и записывается смена: тем, чем не вышло, второй раз не
 * идут, и это событие, а не тихая правка.
 */
function tickTheirWay(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % THEIRWAY.beat !== 0) return
  const ways: Record<string, { way: string; sinceDay: number; places: number }> = {
    ...draft.crownWays,
  }
  for (const id of Object.keys(draft.base.world.kingdoms)) {
    const now = crownWay(draft.base, draft.world, id, day)
    // Земля берётся прямо, а не через весь путь: считать пути восьми корон
    // каждый такт дорого, и делает это один такт гонки (этап 141).
    const places = crownPlaces(draft.base, id)
    const was = ways[id]
    if (!was) {
      ways[id] = { way: now, sinceDay: day, places }
      continue
    }
    const change = wouldChange(draft.base, draft.world, id, day)
    if (change.changes) {
      ways[id] = { way: change.to, sinceDay: day, places }
      notice(draft, change.says, 'world')
      continue
    }
    // Земля помнится по лучшему: путь меняют от потери, а не от прироста.
    ways[id] = { ...was, places: Math.max(was.places, places) }
  }
  draft.crownWays = ways
  // Раз в год мир напоминает, кто куда идёт, — но только о том, о ком ты слышал.
  if (day % (THEIRWAY.beat * 12) !== 0) return
  const first = firstOf(draft.base, draft.world, day)
  if (first.who !== PLAYER) {
    notice(draft, theirWaySays(draft.base, draft.world, first.who, day), 'world')
  }
}

/**
 * Гонка (этап 141, Гн1, Гн3 и Гн6).
 *
 * Шаг вперёд — событие: доля пути растёт, и мир это замечает. Близко к концу
 * идущий рискует, и риск виден там, где он и должен быть виден, — в верности
 * своих и в холоде чужих.
 */
function tickRace(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % RACE.beat !== 0) return
  const shares: Record<string, number> = { ...(draft.raceLog.shares ?? {}) }
  const done = [...draft.raceLog.done]
  let steps = draft.raceLog.steps
  for (const id of Object.keys(draft.base.world.kingdoms)) {
    const way = theirWay(draft.base, draft.world, id, day)
    const was = shares[id] ?? way.share
    if (way.share - was >= RACE.step) {
      steps += 1
      notice(
        draft,
        `${RACE_WORDS.step} ${kingdomName(draft.base, id)}: ${Math.round(was * 100)} → ${Math.round(way.share * 100)} из ста.`,
        'world',
      )
    }
    if (way.finished && !done.includes(id)) done.push(id)
    shares[id] = way.share
    // Рискующий платит за спешку своими и чужими (Гн3).
    const risks = risking(draft.base, draft.world, id, day)
    if (!risks.risks) continue
    draft.politics = {
      ...draft.politics,
      lords: draft.politics.lords.map((lord) =>
        lord.kingdomId === id
          ? { ...lord, loyalty: Math.max(0, lord.loyalty + RACE.risksLoyalty) }
          : lord,
      ),
    }
    for (const other of Object.keys(draft.base.world.kingdoms)) {
      if (other === id) continue
      draft.politics = withRelation(draft.politics, id, other, RACE.risksWord)
    }
  }
  draft.raceLog = { steps, done, shares }
}

/**
 * Кто-нибудь доходит до конца (этап 142, Дх1, Дх2 и Дх4).
 *
 * Дошедший не кончает игру: он делает мир другим. В этом мире спорят не за
 * землю, а за место при нём, — и это видно в том, как холодеют все ко всем.
 */
function tickTheirEnd(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % THEIREND.beat !== 0) return
  if (!draft.theirEnd) {
    for (const id of Object.keys(draft.base.world.kingdoms)) {
      // Доли путей считает такт гонки (этап 141), здесь они только читаются.
      if ((draft.raceLog.shares?.[id] ?? 0) < 1) continue
      draft.theirEnd = { who: id, sinceDay: day }
      notice(
        draft,
        `${THEIREND_WORDS.done} ${kingdomName(draft.base, id)}. ${THEIREND_WORDS.after}`,
        'world',
      )
      return
    }
    // Пока никто не дошёл, мир предупреждает о том, кто близко (Дх2).
    const near = endNear(draft.base, draft.world, day)
    if (near.who && day % (THEIREND.beat * 9) === 0) notice(draft, near.says, 'world')
    return
  }
  // Мир под одной короной: все холодеют друг к другу, кроме неё.
  const winner = draft.theirEnd.who
  if ((draft.theirEnd.served ?? 0) > 0) return
  for (const id of Object.keys(draft.base.world.kingdoms)) {
    if (id === winner) continue
    draft.politics = withRelation(draft.politics, PLAYER, id, THEIREND.chills)
  }
}

/**
 * Служить победителю (этап 142, Дх5).
 *
 * Отдельный конец: принять исход и стать первым человеком того, кто дошёл.
 * Войны кончаются, земля остаётся, но путь твой кончен — дальше ты при нём.
 */
function serveWinner(state: GameState): CommandResult {
  const day = dayOf(state.time)
  const end = theirEnd(state, state.world, day)
  if (!end.who) return fail('requirements', 'Мир ещё ничей: служить некому.')
  if (end.served) return fail('invalid', 'Ты уже его первый человек.')

  const draft = open(state)
  advance(draft, hours(THEIREND.serveHours))
  draft.theirEnd = draft.theirEnd ? { ...draft.theirEnd, served: day } : null
  draft.politics = {
    ...draft.politics,
    wars: draft.politics.wars.filter((one) => !sameSides(one, PLAYER, end.who as string)),
  }
  draft.politics = withRelation(draft.politics, PLAYER, end.who as string, 40)
  draft.hands = [...draft.hands, { patron: end.who as string, ward: PLAYER, sinceDay: day }]
  notice(draft, `${THEIREND_WORDS.serve} ${kingdomName(draft.base, end.who as string)}.`, 'world')
  return close(draft)
}

/**
 * Равновесие рвёт союзы (этап 143, Рв1 и Рв3).
 *
 * Союз держался отношением; теперь он держится ещё и тем, что союзник не
 * вырвался вперёд. Вырвался — его бросают, и причина называется: не ссора, а
 * расчёт.
 */
function tickBalance(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % BALANCE.beat !== 0) return
  const rows = betrayers(draft.base, draft.world, day)
  if (rows.length === 0) return
  const first = rows[0]
  if (!first) return
  draft.politics = {
    ...draft.politics,
    alliances: draft.politics.alliances.filter(
      (one) =>
        !((one.a === first.by && one.b === first.of) || (one.b === first.by && one.a === first.of)),
    ),
  }
  draft.balanceLog = {
    ...draft.balanceLog,
    betrayals: draft.balanceLog.betrayals + 1,
  }
  notice(draft, first.says, 'world')
}

/**
 * Государи сменяются (этап 144, Нс1, Нс3 и Нс6).
 *
 * Колено выводится из дня (`reignOf`), нрав нового — из короны и колена. Путь
 * при этом либо переходит по наследству, либо переменяется, и то и другое —
 * событие. Смерть ведущего гонку мир замечает отдельно: равновесие считается
 * заново.
 */
function tickHeirs(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % HEIRS.beat !== 0) return
  const reigns: Record<string, number> = { ...draft.reigns }
  let kept = draft.heirLog.kept
  let changed = draft.heirLog.changed
  const leader = firstOf(draft.base, draft.world, day).who
  for (const id of Object.keys(draft.base.world.kingdoms)) {
    const now = reignOf(id, day)
    if (reigns[id] === undefined) {
      reigns[id] = now
      continue
    }
    if (!reignChanged(draft.base, id, day)) continue
    reigns[id] = now
    const was = crownWay(draft.base, draft.world, id, day)
    const next = heirWay(draft.base, draft.world, id, day)
    if (next === was) {
      kept += 1
      notice(draft, `${HEIRS_WORDS.kept} ${kingdomName(draft.base, id)}: ${was}.`, 'world')
    } else {
      changed += 1
      draft.crownWays = {
        ...draft.crownWays,
        [id]: { way: next, sinceDay: day, places: crownPlaces(draft.base, id) },
      }
      notice(
        draft,
        `${HEIRS_WORDS.changed} ${kingdomName(draft.base, id)}: ${was} → ${next}.`,
        'world',
      )
    }
    if (id === leader) {
      // Гибель ведущего переворачивает равновесие: страх к нему падает вдвое.
      const log: Record<string, { score: number; sinceDay: number }> = {}
      for (const [who, row] of Object.entries(draft.dreadLog)) {
        log[who] = { ...row, score: Math.round(row.score * HEIRS.deathCalms) }
      }
      draft.dreadLog = log
      notice(draft, `${HEIRS_WORDS.died} ${kingdomName(draft.base, id)}.`, 'world')
    }
  }
  draft.reigns = reigns
  draft.heirLog = { kept, changed }
  // Смута — тот же откат, что война (Нс4): о ней говорят раз в год.
  if (day % (HEIRS.beat * 12) !== 0) return
  const sick = Object.keys(draft.base.world.kingdoms).find(
    (id) => troubled(draft.base, draft.world, id, day).troubled,
  )
  if (sick) notice(draft, troubled(draft.base, draft.world, sick, day).says, 'world')
}

/**
 * Замер кривой (этап 145, Дл1 и Дл5).
 *
 * Раз в год у каждой державы берётся одно число — земля. Больше ничего не
 * хранится: направление, длительность и причины считаются из этих замеров.
 */
function tickCurves(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % CURVE.beat !== 0) return
  const curves: Record<string, readonly number[]> = { ...draft.curves }
  const sides: string[] = [PLAYER, ...Object.keys(draft.base.world.kingdoms)]
  for (const who of sides) {
    const now =
      who === PLAYER ? holdingsOf(draft.settlements, PLAYER).length : crownPlaces(draft.base, who)
    curves[who] = [...(curves[who] ?? []), now].slice(-CURVE.keep)
  }
  draft.curves = curves
  // Заодно пересчитывается память мира о тебе (этап 147): летопись за век —
  // тысячи строк, и счёт по ней берётся раз в год, а не каждым тактом.
  const memory = memoryOf(draft.base, day)
  draft.annals = {
    ...draft.annals,
    remembered: { good: memory.good, bad: memory.bad },
  }
  // Раз в пять лет мир говорит о самом заметном процессе.
  if (day % (CURVE.beat * 5) !== 0) return
  const worst = Object.keys(draft.base.world.kingdoms)
    .map((id) => ({ id, curve: curveOf(draft.base, draft.world, id, day) }))
    .find((one) => one.curve.trend !== 'still')
  if (worst) notice(draft, curveSays(draft.base, draft.world, worst.id, day), 'world')
}

/**
 * Эпохи приходят и уходят (этап 146, Эп1, Эп3 и Эп4).
 *
 * Какая эпоха и когда — выводится из зерна мира и дня, а не бросается кубиком:
 * одна и та же игра даёт одну и ту же историю. Пока эпоха идёт, её правило
 * применяется ко всем.
 */
function tickEra(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % ERA.beat !== 0) return
  const row = draft.era
  if (row) {
    if (day >= row.untilDay) {
      draft.eraLog = [
        ...draft.eraLog,
        {
          id: row.id,
          from: row.sinceDay,
          to: day,
          ...(row.answer ? { answer: row.answer } : {}),
        },
      ]
      draft.era = null
      notice(
        draft,
        `${ERA_WORDS.ended} ${ERA_DEFS[row.id as EraId].label}: ${ERA_DEFS[row.id as EraId].after}`,
        'world',
      )
      return
    }
    // Правило эпохи: то, чем она меняет мир, применяется тактом.
    const tweak = eraTweaks(draft.base, draft.world, day)
    if (tweak.churchAnger !== 0) {
      draft.churchAnger = Math.max(0, (draft.churchAnger ?? 0) + tweak.churchAnger)
    }
    if (tweak.loyalty !== 0) shiftVassals(draft, tweak.loyalty, null)
    if (tweak.people !== 0) {
      const places: Record<string, (typeof draft.settlements)[string]> = { ...draft.settlements }
      for (const [id, one] of Object.entries(places)) {
        if (one.population <= 0) continue
        places[id] = { ...one, population: Math.round(one.population * (1 + tweak.people)) }
      }
      draft.settlements = places
    }
    return
  }
  // Эпохи нет: смотрим, не пора ли, и показываем приметы.
  const window = Math.floor(day / (ERA.apartYears * 365))
  for (const one of [window - 1, window]) {
    if (one < 0) continue
    const next = eraFor(draft.world, one)
    if (day < next.day || day - next.day > ERA.beat) continue
    if (draft.eraLog.some((past) => past.from === next.day)) continue
    draft.era = {
      id: next.id,
      sinceDay: next.day,
      untilDay: next.day + ERA_DEFS[next.id].years * 365,
    }
    notice(
      draft,
      `${ERA_WORDS.began} ${ERA_DEFS[next.id].label}. ${ERA_DEFS[next.id].rule}`,
      'world',
    )
    return
  }
  const signs = eraSigns(draft.base, draft.world, day)
  if (signs.id && day % (ERA.beat * 4) === 0) notice(draft, signs.says, 'world')
}

/**
 * Встретить эпоху (этап 146, Эп5).
 *
 * Не кнопка: у каждого ответа своя цена, и платится она тем же, чем платятся
 * прочие решения державы, — серебром, верностью своих и счётом церкви.
 */
function meetEra(state: GameState, answer: string): CommandResult {
  const day = dayOf(state.time)
  const now = eraNow(state, state.world, day)
  if (!now.id) return fail('requirements', 'Эпохи сейчас нет: встречать нечего.')
  if (state.era?.answer) return fail('invalid', 'Эта эпоха уже встречена.')
  const def = ERA_DEFS[now.id]
  const chosen = def.answers.find((one) => one.id === answer)
  if (!chosen) return fail('invalid', 'Такого ответа у этой эпохи нет.')

  const draft = open(state)
  advance(draft, hours(12))
  draft.era = draft.era ? { ...draft.era, answer } : null
  // Цена ответа: первый платит казной, второй — своими, третий — ничем и потом.
  const index = def.answers.indexOf(chosen)
  if (index === 0) addMoney(draft, -Math.min(draft.character.money, 4000))
  if (index === 1) shiftVassals(draft, -4, null)
  if (index === 2) draft.renown = Math.max(0, draft.renown - 2)
  notice(draft, `${ERA_WORDS.answer} ${def.label}: ${chosen.says}`, 'world')
  return close(draft)
}

/**
 * Своя летопись (этап 147, Лт5).
 *
 * Приписать можно, но немного: летопись стоит серебра и правды. Сверх
 * настоящих дел мир не поверит — и потолок считается от них же.
 */
function writeAnnals(state: GameState): CommandResult {
  const day = dayOf(state.time)
  const cost = writeCost(state, day)
  if (cost.can <= 0) return fail('requirements', cost.says)
  if (state.character.money < cost.cost) {
    return fail('noMoney', `Глава летописи стоит ${cost.cost} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(10))
  addMoney(draft, -cost.cost)
  draft.annals = { added: draft.annals.added + 1, lastDay: day }
  const now = memoryOf(draft.base, day)
  notice(
    draft,
    `${ANNALS_WORDS.own} Глава написана: доброго о тебе ${now.good}, худого ${now.bad}.`,
    'people',
  )
  return close(draft)
}

/**
 * Выкупить своего (этап 150, Пл4).
 *
 * Оставленный в плену помнит это: за каждый год его верность падает. Выкуп —
 * не кнопка «вернуть», а торг с тем, кто его держит.
 */
function ransomOwn(state: GameState, id: string): CommandResult {
  const day = dayOf(state.time)
  const row = yoursTaken(state).find((one) => one.id === id)
  if (!row) return fail('invalid', 'Такого в плену нет.')
  const price = ownRansom(state, state.world, id, day)
  if (state.character.money < price.cost) {
    return fail('noMoney', `За него просят ${price.cost}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  advance(draft, hours(8))
  addMoney(draft, -price.cost)
  draft.taken = draft.taken.filter((one) => one.id !== id)
  draft.ransomLog = {
    ...draft.ransomLog,
    freed: draft.ransomLog.freed + 1,
    paid: draft.ransomLog.paid + price.cost,
  }
  // Выкупленный помнит, кто за ним пришёл.
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((lord) =>
      lord.id === id ? { ...lord, loyalty: Math.min(100, lord.loyalty + 12) } : lord,
    ),
  }
  notice(
    draft,
    `${row.name} выкуплен у ${kingdomName(draft.base, row.by)} за ${price.cost}.`,
    'people',
  )
  return close(draft)
}

/**
 * Торг за чужого пленника (этап 150, Пл2).
 *
 * Цена не вычисляется: она торгуется. Ниже своего дна пленителя не уговоришь,
 * а выше дна — дело твоё.
 */
function haggleRansom(state: GameState, captiveId: string, offer: number): CommandResult {
  const day = dayOf(state.time)
  const captive = (state.captives ?? []).find((one) => one.id === captiveId)
  if (!captive) return fail('invalid', 'Такого пленника у тебя нет.')
  if (!Number.isFinite(offer) || offer <= 0) return fail('invalid', 'Цена должна быть числом.')
  const price = ransomHaggle(state, state.world, captive, captive.kingdomId ?? PLAYER, day)
  if (offer < price.least) {
    return fail('requirements', `${price.says} Твоё «${offer}» ниже дна.`)
  }

  const draft = open(state)
  advance(draft, hours(4))
  addMoney(draft, offer)
  draft.captives = (draft.captives ?? []).filter((one) => one.id !== captiveId)
  draft.ransomLog = {
    ...draft.ransomLog,
    freed: draft.ransomLog.freed + 1,
    paid: draft.ransomLog.paid + offer,
  }
  if (captive.kingdomId) {
    draft.politics = withRelation(draft.politics, PLAYER, captive.kingdomId, 8)
  }
  notice(draft, `${captive.name} отпущен за ${offer}. ${RANSOM_WORDS.haggle}`, 'people')
  return close(draft)
}

/**
 * Плен идёт своим чередом (этап 150, Пл4 и Пл5).
 *
 * Из плена бегут, а оставленный там помнит: верность забытого вассала падает
 * год за годом, и двор это видит.
 */
function tickRansom(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % RANSOM.beat !== 0) return
  for (const row of draft.taken) {
    const [runs, afterRun] = rollChance(draft.rng, RANSOM.escape)
    draft.rng = afterRun
    if (runs) {
      draft.taken = draft.taken.filter((one) => one.id !== row.id)
      notice(draft, `${row.name} бежал из плена. ${RANSOM_WORDS.escaped}`, 'people')
      continue
    }
    if ((day - row.since) % 365 !== 0) continue
    draft.politics = {
      ...draft.politics,
      lords: draft.politics.lords.map((lord) =>
        lord.id === row.id
          ? { ...lord, loyalty: Math.max(0, lord.loyalty + RANSOM.forgotten) }
          : lord,
      ),
    }
  }
}

/**
 * Держава кончается (этап 151, По1, По4 и По5).
 *
 * Последнее место взято — державы нет. Игра при этом не кончается: остаются
 * имя, дом, слово, спутники и знание, и это названо прямо.
 */
function tickFallen(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % FALLEN.beat !== 0) return
  if (!realmLost(draft.base)) return
  const name = draft.realm?.name ?? 'держава'
  draft.fallenLog = [...draft.fallenLog, { name, day, places: 0 }]
  draft.realm = null
  draft.crowned = null
  // Бывшие вассалы холодеют, мир — меньше: с безземельным не считаются, но и
  // не воюют.
  shiftVassals(draft, FALLEN.vassalsChill, null)
  for (const id of Object.keys(draft.base.world.kingdoms)) {
    draft.politics = withRelation(draft.politics, PLAYER, id, FALLEN.worldChill)
  }
  const remains = whatRemains(draft.base, draft.world, day)
  notice(draft, `${FALLEN_WORDS.lost} ${remains.says}`, 'world')
}

/**
 * Пойти в изгнание (этап 151, По3).
 *
 * У изгнанника есть место при чужом дворе и нет власти. Принимают не всякого:
 * нужен двор, которому ты не холоден.
 */
function goIntoExile(state: GameState, at: string): CommandResult {
  if (!state.world.kingdoms[at]) return fail('invalid', 'Такой короны нет.')
  const day = dayOf(state.time)
  if (state.exile) return fail('invalid', 'Ты и так при чужом дворе.')
  const where = exileAt(state, state.world, day)
  if (where.at !== at) return fail('requirements', where.says)

  const draft = open(state)
  advance(draft, hours(24))
  draft.exile = { at, sinceDay: day }
  draft.politics = withRelation(draft.politics, PLAYER, at, 10)
  notice(draft, `${FALLEN_WORDS.exile} Ты при дворе ${kingdomName(draft.base, at)}.`, 'world')
  return close(draft)
}

/**
 * Вернуть своё (этап 152, Об1, Об2 и Об4).
 *
 * Дорога открыта настолько, насколько её условия есть в мире. Возвращённая
 * держава держится хуже: мир помнит, что однажды её уже не стало.
 */
function claimBack(state: GameState, road: RoadId): CommandResult {
  const day = dayOf(state.time)
  if (holdingsOf(state.settlements, PLAYER).length > 0) {
    return fail('requirements', 'Возвращать нечего: земля при тебе.')
  }
  const claim = oldClaim(state, state.world, day)
  if (!claim.has) return fail('requirements', claim.says)
  const way = roadsBack(state, state.world, day).find((one) => one.road === road)
  if (!way?.open) return fail('requirements', way?.says ?? 'Такой дороги нет.')
  if (road === 'hire' && state.character.money < COMEBACK.hireSilver) {
    return fail('noMoney', `На роту нужно ${COMEBACK.hireSilver}.`)
  }
  // Возвращаются туда, где стоят: место под ногами и есть начало.
  const seat = state.settlements[state.locationId]
  if (!seat || seat.population <= 0) {
    return fail('unavailableHere', 'Здесь возвращать нечего: стань там, где есть люди.')
  }

  const draft = open(state)
  advance(draft, hours(24 * 7))
  if (road === 'hire') addMoney(draft, -COMEBACK.hireSilver)
  draft.settlements = {
    ...draft.settlements,
    [seat.locationId]: { ...seat, owner: PLAYER },
  }
  draft.realm = { name: claim.name, sinceDay: day }
  const worse = secondTime(draft.base, draft.world, day)
  // Признание не возвращается вместе с землёй: его берут заново.
  draft.recognitions = {}
  shiftVassals(draft, -Math.round(worse.unrest / 3), null)
  notice(
    draft,
    `${claim.name} возвращена дорогой «${ROAD_DEFS[road].label}». ${worse.says} ${COMEBACK_WORDS.worse}`,
    'world',
  )
  return close(draft)
}

/**
 * Оборона своего (этап 153, Рс0).
 *
 * Старый долг: осаждать чужое было можно, оборонять своё — нет. Три хода, и
 * каждый чем-то платится: держаться — запасом, выйти — людьми, откупиться —
 * казной.
 */
function holdWalls(state: GameState, move: HoldId): CommandResult {
  const day = dayOf(state.time)
  const siege = siegeOnMe(state, state.world, day)
  if (!siege.locationId) return fail('requirements', siege.says)

  const draft = open(state)
  if (move === 'pay') {
    const cost = siege.men * RISK.payPerMan
    if (draft.character.money < cost) return fail('noMoney', `Осаждающие просят ${cost}.`)
    advance(draft, hours(6))
    addMoney(draft, -cost)
    // Купленные уходят: не мир, а перемирие под этими стенами.
    draft.bands = draft.bands.filter(
      (one) => !(one.locationId === siege.locationId && one.lordId !== PLAYER),
    )
    notice(draft, `${HOLD_DEFS.pay.says} Заплачено ${cost}.`, 'war')
    return close(draft)
  }
  if (move === 'hold') {
    advance(draft, hours(24))
    // Сидение стоит припаса: за сутки съедается хлеб из закромов.
    const place = draft.settlements[siege.locationId]
    if (place) {
      draft.settlements = {
        ...draft.settlements,
        [siege.locationId]: {
          ...place,
          stock: {
            ...place.stock,
            grain: Math.max(0, place.stock.grain - Math.round(place.population * 0.02)),
          },
        },
      }
    }
    notice(draft, `${HOLD_DEFS.hold.says} Под стенами ${siege.men}.`, 'war')
    return close(draft)
  }
  // Вылазка: за стенами свои сильнее, но выходят они из-за стен.
  advance(draft, hours(8))
  const mine = Math.round(partySize(draft.party) * RISK.wallsWorth)
  const [roll, afterRoll] = nextFloat(draft.rng)
  draft.rng = afterRoll
  const wins = mine * (0.6 + roll * 0.8) > siege.men
  if (wins) {
    draft.bands = draft.bands.filter(
      (one) => !(one.locationId === siege.locationId && one.lordId !== PLAYER),
    )
    draft.renown += 4
    notice(draft, `Вылазка удалась: осаду сняли. Твоих ${mine} против ${siege.men}.`, 'war')
    return close(draft)
  }
  hurtParty(draft, RISK.sallyLoss)
  notice(
    draft,
    `Вылазка не удалась: твоих ${mine} против ${siege.men}, отряд потерял треть.`,
    'war',
  )
  return close(draft)
}

/**
 * Прийти в чужой бой (этап 153, Рс0б).
 *
 * Долг с этапа 7: чужая битва была зрелищем. Теперь в неё можно войти — на
 * любой стороне, и другая сторона это запомнит войной.
 */
function joinFight(state: GameState, side: string): CommandResult {
  const day = dayOf(state.time)
  const fight = otherFight(state, state.world, day)
  if (!fight.sides.includes(side)) return fail('requirements', fight.says)
  const against = fight.sides.find((one) => one !== side)
  if (!against) return fail('requirements', fight.says)

  const draft = open(state)
  advance(draft, hours(12))
  draft.politics = withRelation(draft.politics, PLAYER, side, 25)
  draft.politics = withRelation(draft.politics, PLAYER, against, -40)
  if (!atWar(draft.politics, PLAYER, against)) {
    draft.politics = {
      ...draft.politics,
      wars: [
        ...draft.politics.wars,
        { a: PLAYER, b: against, since: day, reason: 'пришёл в чужой бой' },
      ],
    }
  }
  hurtParty(draft, 0.1)
  draft.renown += 2
  notice(
    draft,
    `Ты вошёл в бой на стороне ${kingdomName(draft.base, side)} против ${kingdomName(draft.base, against)}. ${RISK_WORDS.other}`,
    'war',
  )
  return close(draft)
}

/** Потери отряда: доля людей из каждого рода. */
function hurtParty(draft: Draft, share: number): void {
  const units: Record<string, number> = {}
  for (const [id, count] of Object.entries(draft.party.units)) {
    units[id] = Math.max(0, Math.round((count ?? 0) * (1 - share)))
  }
  draft.party = {
    ...draft.party,
    units: units as typeof draft.party.units,
    morale: Math.max(10, draft.party.morale - 10),
  }
}

/**
 * Срок объединения (этап 131, Кр1 и Кр4).
 *
 * Объединение — не день, а срок: пока признают все, он идёт; отвалился
 * кто-нибудь — начинается заново. И пока он идёт, держава под одной рукой
 * недовольнее обычной: чужих войн нет, свои есть.
 */
function tickUnion(draft: Draft, days: number): void {
  if (days <= 0 || !draft.realm) return
  const day = dayOf(draft.time)
  if (day % WAY.beat !== 0) return
  const { no } = recognisedBySides(draft.base, draft.world, PLAYER, day)
  if (no.length > 0) {
    if (draft.union) {
      notice(draft, `${UNION_WORDS.lost} Не признают ${no.length}.`, 'world')
      draft.union = null
    }
    return
  }
  if (!draft.union) {
    draft.union = { sinceDay: day }
    notice(draft, `Тебя признали все. ${UNION_WORDS.hold}`, 'world')
    return
  }
  // Мир под одной рукой: недовольство идёт изнутри (Кр5).
  const world = unionWorld(draft.base, draft.world, day)
  if (day % (WAY.beat * 9) === 0) {
    shiftVassals(draft, -Math.round(world.unrest / 4), null)
    notice(draft, world.says, 'world')
  }
  const union = unionOf(draft.base, draft.world, PLAYER, day)
  if (union.finished && day % (WAY.beat * 9) === 0) {
    notice(draft, union.says, 'world')
  }
}

/**
 * Выйти на испытание (этап 124, Пу1).
 *
 * Пятый путь: разом и много, если выдержишь. Считается не броском вслепую, а
 * запасом умения над порогом, и запас этот назван заранее.
 */
function takeTrial(state: GameState, trialId: string): CommandResult {
  const trial = trialById(trialId)
  if (!trial) return fail('invalid', 'Такого испытания не бывает.')
  const day = dayOf(state.time)
  const odds = trialOdds(state, trial)
  if (!odds.can) return fail('requirements', odds.says)
  if (state.character.money < trial.cost) {
    return fail('noMoney', `На это нужно ${trial.cost} серебра.`)
  }
  const last = state.trials?.[trialId] ?? 0
  if (last > 0 && day - last < 180) {
    return fail('invalid', 'Такое бывает не каждый месяц: жди следующего раза.')
  }

  const draft = open(state)
  advance(draft, hours(24 * trial.days))
  if (trial.cost > 0) addMoney(draft, -trial.cost)
  addFatigue(draft, 12 * trial.days)
  draft.trials = { ...draft.trials, [trialId]: day }
  const [held, afterRoll] = rollChance(draft.rng, odds.chance)
  draft.rng = afterRoll
  if (!held) {
    practice(draft, trial.skill, Math.round(trial.xp * 0.2))
    draft.pathLog = {
      ...draft.pathLog,
      byTrial: draft.pathLog.byTrial + Math.round(trial.xp * 0.2),
    }
    notice(draft, `${trial.label}: не вышло — ${trial.fails}.`, 'people')
    return close(draft)
  }
  practice(draft, trial.skill, trial.xp, 'trial')
  draft.renown += 2
  notice(draft, `${trial.label}: выдержал. ${trial.about} Слава +2.`, 'people')
  return close(draft)
}

/**
 * Сдержит ли он слово (этап 121, Об1 и Об4).
 *
 * Считается выгодой, а не честностью. И заодно видно, не показывает ли он тебе
 * силу, которой нет, — если есть кому посмотреть.
 */
function weighPledge(state: GameState, of: string): CommandResult {
  if (!state.world.kingdoms[of]) return fail('invalid', 'Такой короны нет.')
  const day = dayOf(state.time)
  const pledge = (state.pledges ?? []).find((one) => one.kingdomId === of && one.kept === null)
  const draft = open(state)
  advance(draft, hours(2))
  if (pledge) {
    const weighed = willBreak(state, state.world, pledge, day)
    notice(draft, `${kingdomName(draft.base, of)}: ${weighed.says}`, 'world')
  } else {
    notice(draft, `${kingdomName(draft.base, of)} тебе ничего не обещал.`, 'world')
  }
  const lie = deceitOf(state, state.world, of, day)
  if (lie.kind) {
    const unmasked = seeThrough(state, state.world, of, day)
    notice(
      draft,
      unmasked.seen
        ? `${DECEIT_DEFS[lie.kind].label}: ${unmasked.says} Ему нужно, чтобы ${DECEIT_DEFS[lie.kind].wants}.`
        : unmasked.says,
      'world',
    )
  }
  return close(draft)
}

/**
 * Чем он о тебе ошибается (этап 120, Уп2 и Уп6).
 *
 * Ошибка называется словами, а не числом на экране: «он думает, что у тебя
 * вдвое меньше людей». Заодно видно, чего он считает своё войско.
 */
function weighError(state: GameState, of: string): CommandResult {
  if (!state.world.kingdoms[of]) return fail('invalid', 'Такой короны нет.')
  const can = canSeePicture(state, of)
  if (!can.can) return fail('requirements', can.why)
  const day = dayOf(state.time)
  const believed =
    beliefOf(state, of, PLAYER)?.value ?? seenStrength(state, state.world, of, PLAYER, day).score
  const truth = strengthOf(state, state.world, PLAYER, day).score
  const own = ownStrengthAs(state, state.world, of, day)
  const kind = biasOf(of)

  const draft = open(state)
  advance(draft, hours(3))
  notice(
    draft,
    `${BIAS_WORDS.expects} ${kingdomName(draft.base, of)} — ${biasDef(kind).label}: ${biasDef(kind).about}`,
    'world',
  )
  notice(draft, errorSays(of, draft.world, PLAYER, believed, truth), 'world')
  notice(draft, own.says, 'world')
  return close(draft)
}

/**
 * Узнать, из чего исходит чужая корона (этап 118, К5).
 *
 * Её картина не спрятана в коде: её можно подслушать — если у тебя есть там
 * свой человек. Тогда видно не только чего она хочет, но и почему.
 */
function askPicture(state: GameState, of: string): CommandResult {
  if (!state.world.kingdoms[of]) return fail('invalid', 'Такой короны нет.')
  const can = canSeePicture(state, of)
  if (!can.can) return fail('requirements', can.why)
  if (state.character.money < PICTURE.askCost) {
    return fail('noMoney', `На это нужно ${PICTURE.askCost} серебра.`)
  }
  const day = dayOf(state.time)
  const rows = crownPicture(state, state.world, of, day, (about) => {
    const seen = seenStrength(state, state.world, of, about, day)
    return { score: seen.score, error: seen.error }
  })

  const draft = open(state)
  advance(draft, hours(4))
  addMoney(draft, -PICTURE.askCost)
  notice(
    draft,
    `${PICTURE_WORDS.asked} (${can.why}) ${pictureSays(rows, of, draft.world)}`,
    'world',
  )
  const mine = rows.find((one) => one.about === PLAYER)
  if (mine) {
    notice(
      draft,
      `О тебе: ${mine.value} при правде ${mine.truth} — ${mine.from === 'words' ? 'со слов' : 'догадка'}.`,
      'world',
    )
  }
  return close(draft)
}

/**
 * Посадить постоянного посла (этап 117, Рп1).
 *
 * Выездное посольство привозит картину раз в месяцы; постоянный человек пишет
 * каждые десять суток и вдвое вернее. Платишь за это каждый день — и риском.
 */
function seatResident(state: GameState, at: string): CommandResult {
  if (!state.world.kingdoms[at]) return fail('invalid', 'Такой короны нет.')
  if (!state.realm) return fail('requirements', 'Послов держит держава.')
  if (residentAt(state, at)) return fail('invalid', 'Твой человек там уже сидит.')
  if (state.character.money < RESIDENT.setUp) {
    return fail('noMoney', `На это нужно ${RESIDENT.setUp} серебра.`)
  }
  const day = dayOf(state.time)
  const who = envoyChoices(state, day)[0]
  if (!who) return fail('requirements', 'Сажать некого: нужен свой человек.')

  const draft = open(state)
  advance(draft, hours(6))
  addMoney(draft, -RESIDENT.setUp)
  const resident: Resident = {
    id: `resident:${at}:${day}`,
    at,
    name: who.name,
    sinceDay: day,
    skill: who.skill,
  }
  draft.residents = [...draft.residents, resident]
  draft.residentLog = { ...draft.residentLog, seated: draft.residentLog.seated + 1 }
  notice(
    draft,
    `${RESIDENT_WORDS.seated} ${who.name} при ${kingdomName(draft.base, at)}: ${RESIDENT.perDay} серебра в сутки, вести каждые ${RESIDENT.beat} суток.`,
    'world',
  )
  return close(draft)
}

/** Отозвать своего человека: дешевле, чем ждать, пока его вышлют или купят. */
function recallResident(state: GameState, at: string): CommandResult {
  const resident = residentAt(state, at)
  if (!resident) return fail('invalid', 'Там у тебя никого нет.')
  const draft = open(state)
  advance(draft, hours(2))
  draft.residents = draft.residents.filter((one) => one.at !== at)
  notice(draft, `${resident.name} отозван из ${kingdomName(draft.base, at)}.`, 'world')
  return close(draft)
}

/**
 * Постоянные послы живут своей жизнью (этап 117, Рп2–Рп5).
 *
 * Пишут по своему сроку, прирастают к месту, попадаются — и чужие резиденты у
 * тебя тем же тактом пишут своим то, что ты им показал.
 */
function tickResidents(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const cost = residentCost(draft.base) * days
  if (cost > 0) addMoney(draft, -Math.round(cost))

  if (day % RESIDENT.beat === 0) {
    for (const resident of draft.residents) {
      const brought = residentWords(draft.base, draft.world, resident, day)
      draft.words = withSightings(draft.words, brought)
      draft.residentLog = {
        ...draft.residentLog,
        words: draft.residentLog.words + brought.length,
      }
      const native = nativeShare(resident, day)
      if (native >= 0.4 && day % (RESIDENT.beat * 6) === 0) {
        notice(
          draft,
          `${resident.name}: ${RESIDENT_WORDS.native} (${Math.round(native * 100)} из ста)`,
          'world',
        )
      }
    }
    // Чужие резиденты пишут своим то, что ты им показал (Рп5).
    for (const theirs of theirResidents(draft.base, draft.world, day)) {
      const learn = theyLearn(draft.base, draft.world, theirs, day)
      draft.words = withSightings(draft.words, [
        {
          id: `theirs:${theirs.from}:${day}`,
          to: theirs.from,
          kind: 'strength',
          about: PLAYER,
          value: learn.sees,
          source: 'own',
          from: theirs.name,
          day,
        },
      ])
    }
  }

  if (day % RESIDENT.riskBeat !== 0) return
  for (const resident of draft.residents) {
    const risk = riskNow(draft.base, draft.world, resident, day)
    if (risk.risk === 'none') continue
    if (risk.risk === 'bought') {
      draft.residents = draft.residents.map((one) =>
        one.id === resident.id ? { ...one, bought: true } : one,
      )
      notice(draft, `${resident.name}: ${risk.says}`, 'world')
      continue
    }
    draft.residents = draft.residents.filter((one) => one.id !== resident.id)
    draft.residentLog = { ...draft.residentLog, lost: draft.residentLog.lost + 1 }
    if (risk.risk === 'caught') {
      draft.politics = withRelation(draft.politics, PLAYER, resident.at, -18)
    }
    notice(draft, `${resident.name}: ${risk.says} ${RESIDENT_WORDS.gone}`, 'world')
  }
}

/**
 * Добыть доказательство (этап 116, Чд1 и Чд2).
 *
 * Знать мало: мир верит не тому, кто прав, а тому, у кого бумага. Что именно
 * можно добыть, зависит от того, что у тебя есть, — свой человек при их дворе,
 * дружественная третья корона или только писец и немного совести.
 */
function getProof(
  state: GameState,
  kind: ProofKind,
  a: string,
  b: string,
  against: string,
): CommandResult {
  const day = dayOf(state.time)
  const can = proofsAvailable(state, state.world, a, b, day).find((one) => one.kind === kind)
  if (!can) return fail('invalid', 'Такого доказательства не бывает.')
  if (!can.can) return fail('requirements', can.why)
  const def = PROOF_DEFS[kind]
  // Ловкость рук достаёт бумагу дешевле (этап 122, А2).
  const price = Math.round(def.cost * stealsCheaper(state.character))
  if (state.character.money < price) {
    return fail('noMoney', `На это нужно ${price} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(10))
  addMoney(draft, -price)
  const proof: Proof = {
    id: `proof:${kind}:${a}:${b}:${day}`,
    kind,
    about: `${a}:${b}`,
    against,
    gotDay: day,
  }
  draft.proofs = [...draft.proofs, proof]
  draft.proofLog = {
    ...draft.proofLog,
    got: draft.proofLog.got + 1,
    forged: draft.proofLog.forged + (kind === 'forged' ? 1 : 0),
  }
  notice(
    draft,
    `${kind === 'forged' ? PROOF_WORDS.forged : PROOF_WORDS.got} ${def.label}: ${def.about} Вес ${def.weight}.`,
    'world',
  )
  return close(draft)
}

/**
 * Предъявить миру (этап 116, Чд3 и Чд4).
 *
 * Третьи поворачиваются ровно на вес бумаги. Подделку могут сличить — и тогда
 * врун ты, а гнев приходит от всех, кто поверил.
 */
function showProof(state: GameState, proofId: string): CommandResult {
  const proof = (state.proofs ?? []).find((one) => one.id === proofId)
  if (!proof) return fail('invalid', 'Такой бумаги у тебя нет.')
  if (proof.shown) return fail('invalid', 'Это ты уже предъявлял.')
  const day = dayOf(state.time)
  const [a, b] = proof.about.split(':')

  const draft = open(state)
  advance(draft, hours(6))
  const caught = forgerySeen(state, state.world, proof, day)
  if (caught.seen) {
    draft.proofs = draft.proofs.map((one) =>
      one.id === proofId ? { ...one, shown: true, exposed: true } : one,
    )
    draft.proofLog = {
      ...draft.proofLog,
      shown: draft.proofLog.shown + 1,
      caught: draft.proofLog.caught + 1,
    }
    for (const side of Object.keys(draft.base.world.kingdoms)) {
      draft.politics = withRelation(draft.politics, PLAYER, side, PROOF.forgeryCost / 2)
    }
    notice(draft, caught.says, 'world')
    return close(draft)
  }
  const worth = showWorth(proof, day)
  draft.proofs = draft.proofs.map((one) => (one.id === proofId ? { ...one, shown: true } : one))
  draft.proofLog = { ...draft.proofLog, shown: draft.proofLog.shown + 1 }
  // Третьи поворачиваются к тебе, а те, о ком бумага, — от тебя.
  for (const side of Object.keys(draft.base.world.kingdoms)) {
    if (side === a || side === b) {
      draft.politics = withRelation(draft.politics, PLAYER, side, -worth.turn)
      continue
    }
    draft.politics = withRelation(draft.politics, PLAYER, side, worth.turn)
  }
  notice(draft, `${worth.says} Третьи повернулись на ${worth.turn}.`, 'world')
  return close(draft)
}

/**
 * Обвинить без бумаги (этап 116, Чд2).
 *
 * Можно и так — и мир пожмёт плечами: слово против слова весит шестую часть
 * доказательства. Это и есть та разница, ради которой бумагу добывают.
 */
function accuse(state: GameState, a: string, b: string): CommandResult {
  const day = dayOf(state.time)
  const worth = showWorth(null, day)
  const draft = open(state)
  advance(draft, hours(3))
  for (const side of Object.keys(draft.base.world.kingdoms)) {
    if (side === a || side === b) continue
    draft.politics = withRelation(draft.politics, PLAYER, side, worth.turn)
  }
  notice(draft, `${worth.says} Третьи повернулись на ${worth.turn}.`, 'world')
  return close(draft)
}

/**
 * Купить молчание (этап 115, Тн1).
 *
 * Тайну держат люди, и каждому из них можно заплатить. Плата не отменяет
 * утечку — она её замедляет вчетверо и кончается через полгода.
 */
function hushSecret(state: GameState, treatyId: string): CommandResult {
  const treaty = treatiesOf(state).find((one) => one.id === treatyId)
  if (!treaty) return fail('invalid', 'Такой грамоты нет.')
  if (!treaty.secret || treaty.secret.known) {
    return fail('invalid', 'В этой грамоте нечего скрывать.')
  }
  const day = dayOf(state.time)
  const price = hushCost(state, treaty, day)
  if (state.character.money < price) {
    return fail('noMoney', `За молчание просят ${price} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(4))
  addMoney(draft, -price)
  draft.hushed = { ...draft.hushed, [treatyId]: day + SECRET.hushDays }
  draft.secretLog = { ...draft.secretLog, hushed: draft.secretLog.hushed + 1 }
  const keepers = keepersOf(state, treaty, day)
  notice(
    draft,
    `${SECRET_WORDS.hushed} ${price} серебра на ${keepers.length} человек: ${keepers.map((one) => one.name).join(', ')}. Держится до ${day + SECRET.hushDays}-го дня.`,
    'world',
  )
  return close(draft)
}

/**
 * Выведать чужой сговор (этап 115, Тн5).
 *
 * Короны договариваются и между собой — не вслух и против кого-то третьего.
 * Узнать об этом можно; знать и доказать — разное (этап 116).
 */
function prySecret(state: GameState, a: string, b: string): CommandResult {
  if (state.character.money < SECRET.pryCost) {
    return fail('noMoney', `На это нужно ${SECRET.pryCost} серебра.`)
  }
  const day = dayOf(state.time)
  const pacts = theirSecrets(state, state.world, day)
  const found = pacts.find((one) => (one.a === a && one.b === b) || (one.a === b && one.b === a))

  const draft = open(state)
  advance(draft, hours(8))
  addMoney(draft, -SECRET.pryCost)
  if (!found) {
    notice(draft, 'Серебро ушло, а сговора между ними нет — или он спрятан лучше.', 'world')
    return close(draft)
  }
  draft.learned = { ...draft.learned, [`${found.a}:${found.b}`]: day }
  notice(draft, `${SECRET_WORDS.pried} ${found.says}`, 'world')
  return close(draft)
}

/**
 * Показать гостю то, что решил (этап 114, Пс4 и Пс5).
 *
 * Чужой посол приезжает смотреть, а не только говорить. Что он увезёт, решаешь
 * ты — но приметливый видит показное, и тогда он увозит правду и своё мнение о
 * тебе заодно.
 */
function showGuest(state: GameState, show: ShowKind): CommandResult {
  const day = dayOf(state.time)
  const guest = guestNow(state, state.world, day)
  if (!guest || day >= guest.untilDay) return fail('invalid', 'Гостей у тебя сейчас нет.')
  const def = SHOW_DEFS[show]
  if (state.character.money < def.cost) {
    return fail('noMoney', `На это нужно ${def.cost} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(6))
  if (def.cost > 0) addMoney(draft, -def.cost)
  draft.showing = { ...draft.showing, [guest.from]: show }
  const seen = showTo(state, state.world, guest, show, day)
  notice(draft, seen.says, 'world')
  return close(draft)
}

/**
 * Чужие послы приезжают и уезжают (этап 114, Пс4).
 *
 * Уезжая, гость кладёт весть о тебе в знание своей короны — то самое, из
 * которого она потом считает, стоит ли с тобой воевать.
 */
function tickGuests(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const guest = guestNow(draft.base, draft.world, day)
  if (!guest) return
  if (day === guest.sinceDay) {
    draft.envoyLog = { ...draft.envoyLog, guests: draft.envoyLog.guests + 1 }
    notice(draft, guest.says, 'world')
    return
  }
  if (day !== guest.untilDay) return
  const show = draft.showing[guest.from] ?? 'plain'
  const seen = showTo(draft.base, draft.world, guest, show, day)
  draft.words = withSightings(draft.words, [
    {
      id: `guest:${guest.from}:${day}`,
      to: guest.from,
      kind: 'strength',
      about: PLAYER,
      value: seen.sees,
      source: 'envoy',
      from: guest.name,
      day,
    },
  ])
  const shown = { ...draft.showing }
  delete shown[guest.from]
  draft.showing = shown
  notice(draft, `${ENVOY_WORDS.saw} ${seen.says}`, 'world')
}

/**
 * Кто приходит из-за стен сам (этап 113, Ос4).
 *
 * Голодный перелезет и без твоего серебра. И подосланный тоже — только его
 * выпустят нарочно, и он будет очень убедителен.
 */
function tickDefectors(draft: Draft, days: number): void {
  if (days <= 0 || !draft.siege) return
  const day = dayOf(draft.time)
  const who = defectorAt(draft.base, draft.siege, day, false)
  if (!who) return
  draft.siegeLog = { ...draft.siegeLog, defectors: draft.siegeLog.defectors + 1 }
  draft.words = withSightings(draft.words, [
    {
      id: `defect:${draft.siege.locationId}:${day}`,
      to: PLAYER,
      kind: 'stores',
      about: draft.siege.locationId,
      value: who.saysStores,
      source: who.truthful ? 'own' : 'rumour',
      from: who.name,
      day,
    },
  ])
  notice(draft, who.says, 'war')
}

/**
 * Оглядеть осаду (этап 113, Ос1 и Ос2).
 *
 * Под стенами не бывает точных чисел — ни у тебя, ни у них. Здесь видно, что
 * ты о них знаешь, насколько это догадка и знают ли они сами о своей выручке.
 */
function weighSiege(state: GameState): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const day = dayOf(state.time)
  const stores = storesGuess(state, state.world, siege, day)
  const guard = garrisonGuess(state, state.world, siege, day)
  const relief = reliefKnown(state, state.world, siege.locationId, day)

  const draft = open(state)
  advance(draft, hours(2))
  notice(draft, stores.says, 'war')
  notice(
    draft,
    `За стенами, по-твоему, ${guard.value} человек (вилка ${Math.round(guard.spread * 100)} из ста). ${relief.says}`,
    'war',
  )
  return close(draft)
}

/**
 * Требовать сдачи с блефом (этап 113, Ос3).
 *
 * Торг идёт по догадкам с обеих сторон, и оттого блефовать может каждая.
 * Блеф стоит ровно того, насколько чужая догадка о тебе шире правды; раскрытый
 * блеф стоит доверия под этими стенами.
 */
function bluffParley(state: GameState): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const settlement = state.settlements[siege.locationId]
  if (!settlement) return fail('invalid', 'Осаждать нечего.')
  const day = dayOf(state.time)
  const bluff = bluffWorth(state, state.world, siege, day)

  const draft = open(state)
  advance(draft, hours(3))
  draft.siegeLog = { ...draft.siegeLog, bluffs: draft.siegeLog.bluffs + 1 }
  const base = surrenderChance(settlement, siege)
  const chance = bluff.holds ? Math.min(0.95, base + bluff.gain) : Math.max(0, base - 0.15)
  const [yields, afterRoll] = rollChance(draft.rng, chance)
  draft.rng = afterRoll
  notice(
    draft,
    `${bluff.says} Сдача: ${Math.round(base * 100)} → ${Math.round(chance * 100)} из ста.`,
    'war',
  )
  if (!yields) return close(draft)
  seizePlace(draft, siege.locationId, 'terms')
  draft.siegeLog = { ...draft.siegeLog, byKnowing: draft.siegeLog.byKnowing + 1 }
  draft.renown += 1
  return close(draft)
}

/**
 * Купить человека из-за стен (этап 113, Ос4).
 *
 * Он принесёт числа. Правда ли это — зависит от того, кто его выпустил: голодный
 * врать не станет, подосланный скажет, что хлеба вдоволь, и будет убедителен.
 */
function buyDefector(state: GameState): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  if (state.character.money < BLIND.buyDefector) {
    return fail('noMoney', `Такому нужно ${BLIND.buyDefector} серебра.`)
  }
  const day = dayOf(state.time)
  const who = defectorAt(state, siege, day, true)
  if (!who) return fail('invalid', 'Из города никто не идёт.')

  const draft = open(state)
  advance(draft, hours(4))
  addMoney(draft, -BLIND.buyDefector)
  draft.siegeLog = { ...draft.siegeLog, defectors: draft.siegeLog.defectors + 1 }
  // Его слова ложатся вестью: дальше с ними работает общий слой знания.
  draft.words = withSightings(draft.words, [
    {
      id: `defect:${siege.locationId}:${day}`,
      to: PLAYER,
      kind: 'stores',
      about: siege.locationId,
      value: who.saysStores,
      source: who.truthful ? 'own' : 'rumour',
      from: who.name,
      day,
    },
  ])
  notice(draft, who.says, 'war')
  if (!who.truthful) notice(draft, BLIND_WORDS.lied, 'war')
  return close(draft)
}

/**
 * Поднять знамёна (этап 113, Ос5).
 *
 * Войска нет — есть холм, шесты и крашеное полотно. Осаждающий снимет осаду,
 * если побоится оказаться между войском и стенами; а побоится он тем меньше,
 * чем больше у него своих глаз кругом.
 */
function raiseBanners(state: GameState, locationId: string): CommandResult {
  const place = state.settlements[locationId]
  if (!place) return fail('invalid', 'Такого места нет.')
  const day = dayOf(state.time)
  const besiegers = besiegedOf(state, locationId)
  if (besiegers.length === 0) return fail('requirements', 'Это место никто не осаждает.')
  if (state.character.money < RUSE_DEFS.camp.cost) {
    return fail('noMoney', `На это нужно ${RUSE_DEFS.camp.cost} серебра.`)
  }

  const draft = open(state)
  advance(draft, hours(8))
  addMoney(draft, -RUSE_DEFS.camp.cost)
  draft.ruseLog = { ...draft.ruseLog, made: draft.ruseLog.made + 1 }
  let lifted = 0
  for (const side of besiegers) {
    const seen = bannersLift(draft.base, draft.world, locationId, side, day)
    notice(draft, seen.says, 'war')
    if (!seen.lifts) continue
    lifted += 1
    draft.bands = draft.bands.map((band) =>
      band.goal.type === 'siege' &&
      band.goal.targetId === locationId &&
      (band.kingdomId ?? band.lordId) === side
        ? { ...band, goal: { type: 'home', targetId: band.locationId }, siegeDays: 0 }
        : band,
    )
  }
  if (lifted > 0) {
    draft.ruseLog = { ...draft.ruseLog, worked: draft.ruseLog.worked + lifted }
    draft.siegeLog = { ...draft.siegeLog, byKnowing: draft.siegeLog.byKnowing + lifted }
  }
  return close(draft)
}

/**
 * Завести обман (этап 112, О1–О4).
 *
 * Ложь — такой же ход, как приказ: со своей ценой, своим сроком и своим
 * разоблачением. Она не прибавляет силы; она кладёт весть в чужое знание тем
 * же слоем, каким туда попадает правда.
 */
function makeRuse(
  state: GameState,
  kind: RuseKind,
  locationId: string,
  hostId: string | null,
): CommandResult {
  if (!state.world.locations[locationId]) return fail('invalid', 'Такого места нет.')
  const def = RUSE_DEFS[kind]
  if (state.character.money < def.cost) {
    return fail('noMoney', `На это нужно ${def.cost} серебра.`)
  }
  const day = dayOf(state.time)
  if ((state.ruses ?? []).some((one) => one.locationId === locationId && one.kind === kind)) {
    return fail('invalid', 'Такой обман там уже заведён.')
  }
  const host = hostId ? hostById(state, hostId) : null
  if (kind === 'ambush' && !host) return fail('requirements', 'Засаде нужна часть.')
  if (kind === 'ambush' && host && host.locationId !== locationId) {
    return fail('requirements', 'Часть должна стоять там, где ставишь засаду.')
  }
  if (def.men > 0 && partySize(state.party) + (host ? bandSize(host) : 0) < def.men) {
    return fail('requirements', `На это нужно ${def.men} человек.`)
  }

  const draft = open(state)
  advance(draft, hours(6))
  if (def.cost > 0) addMoney(draft, -def.cost)
  const men = host ? bandSize(host) : Math.max(def.men, partySize(draft.party))
  const ruse = ruseFrom(kind, PLAYER, locationId, men, day, host?.id ?? null)
  draft.ruses = [...draft.ruses, ruse]
  draft.ruseLog = { ...draft.ruseLog, made: draft.ruseLog.made + 1 }
  const where = draft.world.locations[locationId]?.name ?? locationId
  notice(
    draft,
    `${def.label} — ${where}. ${def.about} ${RUSE_WORDS.made} Держится до ${ruse.untilDay}-го дня.`,
    'war',
  )
  return close(draft)
}

/** Снять обман: костры гасят, часть уходит. */
function dropRuse(state: GameState, ruseId: string): CommandResult {
  const ruse = (state.ruses ?? []).find((one) => one.id === ruseId)
  if (!ruse) return fail('invalid', 'Такого обмана нет.')
  const draft = open(state)
  advance(draft, hours(2))
  draft.ruses = draft.ruses.filter((one) => one.id !== ruseId)
  notice(draft, `${RUSE_DEFS[ruse.kind].label}: снято.`, 'war')
  return close(draft)
}

/**
 * Обманы живут своим ходом (этап 112, О2, О4, О5 и О6).
 *
 * Чужие глаза смотрят на твой обман тем же кодом, каким смотрят на правду;
 * демонстрация поворачивает тех, кто ей поверил; засада бьёт того, кто в неё
 * вошёл; а чужая сторона врёт тебе так же — и её ложь ложится в твои вести.
 */
function tickRuses(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const live: Ruse[] = []
  for (const ruse of draft.ruses) {
    if (day >= ruse.untilDay) {
      notice(draft, `${RUSE_DEFS[ruse.kind].label}: ${RUSE_WORDS.gone}`, 'war')
      continue
    }
    // Засада: тот, кто вошёл, узнаёт об этом последним.
    const caught = walkedInto(draft.base, ruse)
    if (caught.length > 0) {
      draft.bands = draft.bands.map((band) =>
        caught.some((one) => one.id === band.id)
          ? { ...band, morale: Math.max(0, band.morale - RUSE.ambushMorale) }
          : band,
      )
      draft.ruseLog = { ...draft.ruseLog, worked: draft.ruseLog.worked + 1 }
      notice(
        draft,
        `${RUSE_WORDS.sprung} ${caught.length} отряд(ов) потеряли по ${RUSE.ambushMorale} духа.`,
        'war',
      )
      continue
    }
    // Демонстрация: те, кто поверил, поворачивают на показанное.
    if (ruse.kind === 'demo' && day % RUSE.beat === 0) {
      const pulled = pulledBy(draft.base, draft.world, ruse, day)
      if (pulled.length > 0) {
        draft.bands = draft.bands.map((band) =>
          pulled.some((one) => one.id === band.id)
            ? { ...band, goal: { type: 'defend', targetId: ruse.locationId } }
            : band,
        )
        draft.ruseLog = { ...draft.ruseLog, worked: draft.ruseLog.worked + 1 }
        notice(draft, `${RUSE_WORDS.pulled} Повернуло ${pulled.length} отряд(ов).`, 'war')
      }
    }
    // Раскусили ли: смотрит то же, чем смотрят на правду.
    if (day % RUSE.beat === 0) {
      for (const side of foesOf(draft.base)) {
        const looked = seesThrough(draft.base, draft.world, side, ruse, day)
        if (!looked.seen) continue
        draft.ruseLog = { ...draft.ruseLog, seen: draft.ruseLog.seen + 1 }
        notice(draft, `${RUSE_DEFS[ruse.kind].label}: ${looked.says}`, 'war')
        break
      }
    }
    live.push(ruse)
  }
  draft.ruses = live

  // Чужие обманы ложатся в твои вести — и их так же можно раскусить (О5).
  if (day % RUSE.beat !== 0) return
  for (const theirs of theirRuses(draft.base, draft.world, day)) {
    const looked = seesThrough(draft.base, draft.world, PLAYER, theirs, day)
    if (looked.seen) {
      notice(draft, `${RUSE_WORDS.theirs} ${RUSE_DEFS[theirs.kind].label}: ${looked.says}`, 'war')
      continue
    }
    draft.words = withSightings(draft.words, [ruseWord(theirs, PLAYER, day)])
  }
}

/** Те короны, с кем ты воюешь: им и смотреть на твой обман. */
function foesOf(state: GameState): readonly string[] {
  const sides = new Set<string>()
  for (const war of state.politics.wars) {
    if (war.a === PLAYER) sides.add(war.b)
    if (war.b === PLAYER) sides.add(war.a)
  }
  return [...sides]
}

/**
 * Дать части замысел (этап 111, По3).
 *
 * Замысел не стареет в дороге: «держи этот край» верно и через неделю, а «иди
 * в Липовку» — уже нет. Оттого полководец с замыслом делает по-своему то, чего
 * ты хочешь, а без замысла — то, чего хочет он.
 */
function setIntent(state: GameState, hostId: string, intent: IntentId | null): CommandResult {
  const host = hostById(state, hostId)
  if (!host) return fail('invalid', 'Такой части у тебя нет.')
  const draft = open(state)
  advance(draft, hours(1))
  const intents = { ...draft.intents }
  if (intent === null) {
    delete intents[hostId]
    draft.intents = intents
    notice(draft, `${captainOf(host).name}: замысел снят, ждёт приказа.`, 'war')
    return close(draft)
  }
  intents[hostId] = intent
  draft.intents = intents
  const def = INTENT_DEFS[intent]
  notice(draft, `${captainOf(host).name} понял: «${def.label}». ${def.about}`, 'war')
  return close(draft)
}

/**
 * Спросить часть, как у неё дела (этап 111, По4).
 *
 * Донесение приходит его словами и с его поправкой: горячий прибавляет,
 * осторожный убавляет, дорога портит и то, и другое. Поправки ты не видишь.
 */
function askHost(state: GameState, hostId: string): CommandResult {
  const host = hostById(state, hostId)
  if (!host) return fail('invalid', 'Такой части у тебя нет.')
  const day = dayOf(state.time)
  const link = linkTo(state, state.world, host.locationId, state.locationId)
  const report = fieldReport(state, state.world, host, day)
  const captain = captainOf(host)

  const draft = open(state)
  advance(draft, hours(2))
  // Донесение ложится вестью: дальше оно стареет по общему правилу этапа 99.
  draft.words = withSightings(draft.words, [
    {
      id: `field:${hostId}:${day}`,
      to: PLAYER,
      kind: 'host',
      about: hostId,
      value: host.locationId,
      source: 'own',
      from: captain.name,
      day: day + link.days,
    },
  ])
  notice(draft, `${report.says} ${link.says}`, 'war')
  return close(draft)
}

/**
 * Приказы доезжают (этап 111, По1, По2 и По6).
 *
 * Гонец едет, война двигается. Если к его приезду обстановка та же — делают
 * велённое. Если разошлась — решает тот, кто получил: по своему нраву, а если
 * ты дал замысел, то под замысел.
 */
function tickFieldOrders(draft: Draft, days: number): void {
  if (days <= 0 || draft.fieldOrders.length === 0) return
  const day = dayOf(draft.time)
  const left: FieldOrder[] = []
  for (const order of draft.fieldOrders) {
    if (day < order.arrivesDay) {
      left.push(order)
      continue
    }
    const host = draft.bands.find((one) => one.id === order.hostId)
    if (!host) continue
    const captain = captainOf(host)
    const acted = actsOn(draft.base, order, captain, draft.intents[order.hostId] ?? null, day)
    const goal =
      acted.order === 'advance'
        ? ({ type: 'raid', targetId: acted.targetId } as const)
        : acted.order === 'siege'
          ? ({ type: 'siege', targetId: acted.targetId } as const)
          : acted.order === 'home'
            ? ({ type: 'home', targetId: mineNearest(draft, host.locationId) } as const)
            : ({ type: 'defend', targetId: host.locationId } as const)
    draft.bands = draft.bands.map((one) => (one.id === host.id ? { ...one, goal } : one))
    draft.orderLog = {
      ...draft.orderLog,
      onTime: draft.orderLog.onTime + (acted.obeyed ? 1 : 0),
      stale: draft.orderLog.stale + (acted.obeyed ? 0 : 1),
      ownWay: draft.orderLog.ownWay + (acted.obeyed ? 0 : 1),
    }
    notice(draft, acted.says, 'war')
  }
  draft.fieldOrders = left
}

/** Во сколько раз каждая часть хуже в бою из-за того, чем она занята. */
function fightShares(roles: Readonly<Record<string, HostRole>>): Readonly<Record<string, number>> {
  const shares: Record<string, number> = {}
  for (const [id, role] of Object.entries(roles)) shares[id] = ROLE_DEFS[role].fights
  return shares
}

/**
 * Послать часть смотреть или поставить завесой (этап 110, Дз1 и Дз2).
 *
 * Это выбор, а не улучшение: часть, посланная смотреть, видит на полкрая
 * вперёд и вполовину хуже дерётся; заслон закрывает своих от чужих дозоров и
 * стоит дороже всех. И то, и другое — люди, которых нет в строю.
 */
function setRole(state: GameState, hostId: string, role: HostRole | null): CommandResult {
  const host = hostById(state, hostId)
  if (!host) return fail('invalid', 'Такой части у тебя нет.')
  const draft = open(state)
  advance(draft, hours(2))
  const roles = { ...draft.roles }
  if (role === null) {
    delete roles[hostId]
    draft.roles = roles
    notice(draft, SCOUT_WORDS.back, 'war')
    return close(draft)
  }
  roles[hostId] = role
  draft.roles = roles
  const def = ROLE_DEFS[role]
  notice(
    draft,
    `${role === 'scout' ? SCOUT_WORDS.scouting : SCOUT_WORDS.screening} ${def.about} В бою — ${Math.round(def.fights * 100)} из ста; в сутки ${Math.round(bandSize(host) * def.perManDay)} серебра.`,
    'war',
  )
  return close(draft)
}

/**
 * Спросить местных (этап 110, Дз4).
 *
 * Продолжение этапа 61: округа, которая помнит тебя добром, рассказывает сама
 * и далеко. Холодная говорит, что ничего не видела, — и серебро тут не помогает.
 */
function askLocalsHere(state: GameState): CommandResult {
  const settlement = state.settlements[state.locationId]
  if (!settlement || settlement.population <= 0) {
    return fail('unavailableHere', 'Спрашивать здесь некого.')
  }
  if (state.character.money < SCOUT.askCost) {
    return fail('noMoney', `На угощение нужно ${SCOUT.askCost} серебра.`)
  }
  const day = dayOf(state.time)
  const heard = askLocals(state, state.world, state.locationId, day)

  const draft = open(state)
  advance(draft, hours(3))
  addMoney(draft, -SCOUT.askCost)
  draft.scoutLog = {
    learned: draft.scoutLog.learned + heard.told.length,
    spent: draft.scoutLog.spent + SCOUT.askCost,
  }
  if (heard.told.length > 0) draft.words = withSightings(draft.words, heard.told)
  notice(draft, heard.says, 'world')
  return close(draft)
}

/**
 * Разведка боем (этап 110, Дз3).
 *
 * Самый точный способ узнать чужую силу — ударить по ней и отойти. Число, за
 * которое заплачено людьми и духом, не врёт: это увидено своими глазами.
 */
function probeBand(state: GameState, bandId: string): CommandResult {
  const band = state.bands.find((one) => one.id === bandId)
  if (!band) return fail('invalid', 'Этого войска здесь нет.')
  if (band.locationId !== state.locationId || band.travel) {
    return fail('unavailableHere', 'Это войско не здесь.')
  }
  const men = partySize(state.party)
  if (men < 4) return fail('requirements', 'Для пробы нужен хоть какой-то отряд.')

  const day = dayOf(state.time)
  const cost = probeCost(state.party, Math.round(men * sparesMen(state.character)))
  const draft = open(state)
  advance(draft, hours(6))
  // Платишь людьми и духом — из строя вынимают тех, кто попроще.
  let left = cost.men
  const units = { ...draft.party.units }
  for (const troop of Object.keys(units) as TroopId[]) {
    if (left <= 0) break
    const have = units[troop] ?? 0
    const take = Math.min(have, left)
    units[troop] = have - take
    left -= take
  }
  draft.party = {
    ...draft.party,
    units,
    morale: Math.max(0, draft.party.morale - cost.morale),
  }
  addFatigue(draft, 10)
  draft.words = withSightings(draft.words, [probeWord(band, day)])
  draft.scoutLog = { ...draft.scoutLog, learned: draft.scoutLog.learned + 1 }
  const lord = lordById(draft.politics, band.lordId)
  notice(
    draft,
    `${SCOUT_WORDS.probed} ${lord ? `${lord.title} ${lord.name}` : 'Королевская рать'}: ${bandSize(band)} человек. Потеряно ${cost.men}, дух −${cost.morale}.`,
    'war',
  )
  return close(draft)
}

/**
 * Глаза едят каждый день (этап 110, Дз5).
 *
 * Корм, лошади и подковы — счёт идёт в сутки, а не разом, оттого дозоров не
 * держат много. Дозор в поле ещё и тает: кони бьются, люди отстают.
 */
function tickEyes(draft: Draft, days: number): void {
  if (days <= 0) return
  const cost = eyesCost(draft.base) * days
  if (cost <= 0) return
  addMoney(draft, -Math.round(cost))
  draft.scoutLog = { ...draft.scoutLog, spent: draft.scoutLog.spent + Math.round(cost) }
  // Дозор тает в поле — не от боя, а от дороги. Считается раз в неделю: по
  // полчеловека в сутки не считают.
  const week = dayOf(draft.time) % SCOUT.wearBeat === 0
  draft.bands = draft.bands.map((band) => {
    if (!week) return band
    const role = roleOf(draft.base, band.id)
    const wear = wearOf(band, role) * SCOUT.wearBeat
    if (wear < 1) return band
    let left = Math.round(wear)
    const units = { ...band.units }
    for (const troop of Object.keys(units) as TroopId[]) {
      if (left <= 0) break
      const have = units[troop] ?? 0
      const take = Math.min(have, left)
      units[troop] = have - take
      left -= take
    }
    return { ...band, units }
  })
  if (scoutsOf(draft.base).length > 0 && dayOf(draft.time) % 30 === 0) {
    notice(draft, `${SCOUT_WORDS.costly} За месяц глаза съели ${Math.round(cost * 30)}.`, 'war')
  }
}

/**
 * Донесения о чужих войсках (этап 109, Т1, Т3 и Т5).
 *
 * Своё место видит на переход вокруг, своя часть в поле — на два, местные
 * говорят там, где тебя любят. Увиденное ложится вестью и дальше стареет по
 * общему правилу этапа 99: знание о войне хранится тем же слоем, что и всё
 * остальное знание.
 */
function tickSightings(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % FOG.beat !== 0) return
  const seen = sightingsNow(draft.base, draft.world, PLAYER, day)
  if (seen.length === 0) return
  draft.words = withSightings(draft.words, seen)
  draft.scoutLog = { ...draft.scoutLog, learned: draft.scoutLog.learned + seen.length }
}

/**
 * Послать приказ (этап 108, Пр1).
 *
 * Между твоим словом и делом на земле есть дорога и есть человек. Приказ
 * уходит сегодня, доходит через столько суток, сколько переходов до места, и
 * возвращается отчётом ещё столько же. Пока он в дороге, ты не знаешь о нём
 * ничего — только день, на который его ждут.
 */
function sendBehest(state: GameState, kind: BehestKind, locationId: string): CommandResult {
  const settlement = state.settlements[locationId]
  if (!settlement) return fail('invalid', 'Такого места нет.')
  if (settlement.owner !== PLAYER) return fail('requirements', 'Велеть можно только в своём месте.')
  const day = dayOf(state.time)
  const already = (state.behests ?? []).find(
    (one) => one.locationId === locationId && one.kind === kind,
  )
  if (already) return fail('invalid', 'Такой приказ туда уже послан.')

  const draft = open(state)
  advance(draft, hours(1))
  const plan = behestPlan(
    draft.world,
    state.locationId,
    locationId,
    kind,
    day,
    ordersRideFaster(state.character),
  )
  const hand = handFor(state, kind, day)
  const behest: Behest = { ...plan, byOffice: hand?.office ?? null }
  draft.behests = [...draft.behests, behest]
  draft.behestLog = { ...draft.behestLog, sent: draft.behestLog.sent + 1 }
  const where = draft.world.locations[locationId]?.name ?? locationId
  const by = hand
    ? `Повезут ${hand.name}у (${COURT_TEMPER_DEFS[hand.temper].label}).`
    : 'Поручить некому: повезёт гонец.'
  notice(
    draft,
    `${BEHEST_WORDS.sent} ${BEHEST_DEFS[kind].label} в ${where}: дойдёт на ${behest.arrivesDay}-й день, отчёт ждать к ${behest.backDay}-му. ${by}`,
    'people',
  )
  return close(draft)
}

/**
 * Отозвать приказ (этап 108, Пр5).
 *
 * Пока гонец в дороге, слово можно вернуть. Как только приказ на месте,
 * поздно: дело уже идёт чужими руками.
 */
function recallBehest(state: GameState, behestId: string): CommandResult {
  const behest = (state.behests ?? []).find((one) => one.id === behestId)
  if (!behest) return fail('invalid', 'Такого приказа нет.')
  const day = dayOf(state.time)
  if (!recallable(behest, day)) return fail('requirements', BEHEST_WORDS.late)

  const draft = open(state)
  advance(draft, hours(1))
  draft.behests = draft.behests.filter((one) => one.id !== behestId)
  notice(draft, `${BEHEST_DEFS[behest.kind].label}: ${BEHEST_WORDS.recalled}`, 'people')
  return close(draft)
}

/** Что вышло на земле: приказ исполняют чужие руки, и доля решает всё. */
function doBehest(draft: Draft, behest: Behest, share: number): string {
  const settlement = draft.settlements[behest.locationId]
  if (!settlement) return 'Места уже нет: приказ пропал.'
  const where = draft.world.locations[behest.locationId]?.name ?? behest.locationId
  if (behest.kind === 'collect') {
    const take = Math.round(dailyTax(settlement, foodSecurity(settlement)) * 120 * share)
    patch(draft, { money: draft.character.money + take })
    // Взятое вперёд берут не из воздуха: округа беднеет людьми и злеет.
    draft.settlements = {
      ...draft.settlements,
      [behest.locationId]: {
        ...settlement,
        recruits: Math.round(settlement.recruits * 0.8),
        banditry: Math.min(1, settlement.banditry + 0.05 * share),
      },
    }
    draft.reputation = withPlaceRep(draft.reputation, behest.locationId, -8)
    return `${where}: взято ${take} серебра вперёд, и это там запомнили.`
  }
  if (behest.kind === 'muster') {
    const men = Math.max(0, Math.round(settlement.recruits * 0.3 * share))
    draft.settlements = {
      ...draft.settlements,
      [behest.locationId]: {
        ...settlement,
        recruits: Math.max(0, settlement.recruits - men),
        garrison: {
          ...settlement.garrison,
          militia: (settlement.garrison.militia ?? 0) + men,
        },
      },
    }
    return `${where}: под ружьё поставлено ${men} человек.`
  }
  if (behest.kind === 'build') {
    if (settlement.building) return `${where}: там и так строят, приказ лёг сверху.`
    const kind = String(draft.world.locations[behest.locationId]?.archetype ?? 'village')
    const want = BUILDING_IDS.find(
      (id) =>
        !settlement.buildings.includes(id) &&
        ((BUILDINGS[id].where as readonly string[] | undefined)?.includes(kind) ?? true),
    )
    if (!want || freeSlots(draft.world, settlement) <= 0) return `${where}: строить негде.`
    const days = Math.round(BUILDINGS[want].days / Math.max(0.4, share))
    draft.settlements = {
      ...draft.settlements,
      [behest.locationId]: { ...settlement, building: { id: want, daysLeft: days } },
    }
    return `${where}: заложено — ${BUILDINGS[want].label.toLowerCase()}, работы на ${days} суток.`
  }
  if (behest.kind === 'relieve') {
    const gain = Math.round(12 * share)
    draft.reputation = withPlaceRep(draft.reputation, behest.locationId, gain)
    return `${where}: недоимку простили, память места выросла на ${gain}.`
  }
  const was = settlement.banditry
  draft.settlements = {
    ...draft.settlements,
    [behest.locationId]: {
      ...settlement,
      banditry: Math.max(0, was - 0.3 * share),
    },
  }
  draft.reputation = withPlaceRep(draft.reputation, behest.locationId, -4)
  return `${where}: разбой ${was.toFixed(2)} → ${Math.max(0, was - 0.3 * share).toFixed(2)}, и там это запомнили.`
}

/**
 * Приказы в дороге (этап 108, Пр2, Пр3, Пр4 и Пр6).
 *
 * Дело делается в свой день, а знаешь ты о нём только когда вернётся отчёт.
 * Что выйдет — решает нрав того, чьими руками: ревностный сделает больше
 * велённого, дошлый оставит себе, усталый сделает вполовину, гордый — по-своему.
 */
function tickBehests(draft: Draft, days: number): void {
  if (days <= 0 || draft.behests.length === 0) return
  const day = dayOf(draft.time)
  const kept: Behest[] = []
  for (const behest of draft.behests) {
    // Дело сделано в свой день, но узнаёшь ты о нём, когда дойдёт отчёт.
    if (day < behest.backDay) {
      kept.push(behest)
      continue
    }
    const hand = handFor(draft.base, behest.kind, behest.doneDay)
    const out = outcomeOf(hand)
    // Командование — это умение добиваться исполнения (этап 123, Н1).
    const share = out.share * obeysBetter(draft.character)
    const what = doBehest(draft, behest, share)
    draft.behestLog = {
      ...draft.behestLog,
      full: draft.behestLog.full + (out.outcome === 'full' ? 1 : 0),
      twisted: draft.behestLog.twisted + (out.outcome === 'own' || out.outcome === 'short' ? 1 : 0),
      none: draft.behestLog.none + (out.outcome === 'none' ? 1 : 0),
    }
    notice(draft, `${out.says} ${what}`, 'people')
  }
  draft.behests = kept
}

/**
 * Сутки у дверей (этап 107, Дн3 и Дн5).
 *
 * То, на что никто не посмотрел, решается само — и не в твою пользу. А год без
 * отдыха берёт своё: руки тяжелеют, и решения выходят хуже.
 */
function tickDoorway(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % DOOR_BEAT !== 0) return
  let missed = 0
  for (const matter of doorway(draft.base, draft.base.world, day)) {
    if (!overdue(matter, day)) continue
    if ((draft.settled?.[matter.id] ?? 0) >= day - AUDIENCE.waitsDays) continue
    missed += 1
    const def = matterDef(matter.kind)
    if (matter.kind === 'plea') {
      draft.reputation = withPlaceRep(draft.reputation, matter.about, -def.cost)
    }
    if (matter.kind === 'vassal') shiftVassals(draft, -Math.round(def.cost / 2), matter.about)
    notice(draft, `${matter.label}: ${matter.ignored} ${AUDIENCE_WORDS.missed}`, 'people')
  }
  if (missed > 0) {
    draft.ruleLog = { ...draft.ruleLog, missed: draft.ruleLog.missed + missed }
  }
  // Год без отдыха: усталость, которую не сняли, оборачивается здоровьем.
  if (day % 360 === 0 && draft.character.fatigue >= AUDIENCE.tiredFrom) {
    patch(draft, {
      attributes: {
        ...draft.character.attributes,
        endurance: Math.max(1, draft.character.attributes.endurance - 1),
      },
    })
    notice(draft, AUDIENCE_WORDS.worn, 'people')
  }
}

/** Как часто считают, что осталось без ответа. */
const DOOR_BEAT = 6
/** Раз во сколько суток пересчитывается утечка тайн (этап 115). */
const SECRET_BEAT = 5

/** Раз во сколько суток служба учит своему (этап 124). */
const SERVICE_BEAT = 10

/**
 * Выслушать доносчика (этап 105, С5).
 *
 * Доносят не из любви к правде: ревностный — из усердия и почти всегда верно,
 * дошлый — чтобы убрать соперника. Слово стоит серебра, и оно может оказаться
 * ложью — тогда за ним запишется ложь, как за всяким источником (этап 103).
 */
function hearDenounce(state: GameState, pay: boolean): CommandResult {
  const day = dayOf(state.time)
  const offer = denounceOffer(state, state.world, day)
  if (!offer) return fail('invalid', 'Доносить некому и не на кого.')
  if (!pay) {
    const draft = open(state)
    advance(draft, hours(1))
    notice(draft, `${offer.says} Ты не стал слушать.`, 'people')
    return close(draft)
  }
  if (state.character.money < offer.silver) {
    return fail('noMoney', `Просят ${offer.silver}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -offer.silver)
  advance(draft, hours(4))
  const [right, afterRoll] = rollChance(draft.rng, offer.truth)
  draft.rng = afterRoll
  const skimmed = skimAt(draft.base, draft.base.world, offer.locationId, day)
  draft.words = bring(draft.words, denounceWord(offer, right ? skimmed : 0, day))
  draft.trust = remember(draft.trust, offer.from, !right)
  if (right) {
    // Принятый донос бьёт по тому, на кого донесли.
    draft.reputation = withPlaceRep(draft.reputation, offer.locationId, HIDDEN.denouncedAnger)
    notice(
      draft,
      `${offer.says} Сказанное подтвердилось: ${offer.about} кладёт себе ${skimmed} в месяц.`,
      'people',
    )
  } else {
    notice(
      draft,
      `${offer.says} Проверить нечем: похоже, ${offer.from} сводил свои счёты. Это за ним запишется.`,
      'people',
    )
  }
  return close(draft)
}

/**
 * Ответить своему (этап 104, Дв2 и Дв5).
 *
 * У каждого при дворе есть своё желание, и оно стоит того, чего стоит: серебра,
 * лена, слова при всех или места для его родни. Исполненное помнится годами —
 * и отказ тоже.
 */
function answerCourtier(state: GameState, office: OfficeId, grant: boolean): CommandResult {
  const day = dayOf(state.time)
  const courtier = courtierAt(state, office, day)
  if (!courtier) return fail('invalid', 'Эта должность пуста.')
  const def = courtWantDef(courtier.wants)

  const draft = open(state)
  advance(draft, hours(3))
  const had = draft.favours?.[courtier.id] ?? 0
  if (!grant) {
    draft.favours = { ...(draft.favours ?? {}), [courtier.id]: had - 1 }
    notice(draft, `${voiceOf(courtier, def.says)} — отказано. Такое помнят.`, 'people')
    return close(draft)
  }
  // Исполнить стоит того, что просят: серебром, землёй или словом.
  if (courtier.wants === 'coin') {
    const price = 1200
    if (draft.character.money < price) {
      return fail('noMoney', `Прибавка стоит ${price}, у тебя ${draft.character.money}.`)
    }
    addMoney(draft, -price)
  }
  if (courtier.wants === 'land') {
    const mine = [...holdingsOf(draft.settlements, PLAYER)].sort(
      (a, b) => a.population - b.population,
    )[0]
    if (!mine) return fail('requirements', 'Земли, которую можно дать, нет.')
    draft.settlements = {
      ...draft.settlements,
      [mine.locationId]: { ...mine, owner: courtier.id },
    }
  }
  if (courtier.wants === 'name') draft.renown = Math.max(0, draft.renown - 1)
  draft.favours = { ...(draft.favours ?? {}), [courtier.id]: had + 1 }
  notice(
    draft,
    `${voiceOf(courtier, def.says)} — исполнено (${def.costs}). Верность ${courtier.loyalty} → ${Math.min(100, courtier.loyalty + COURTIER.granted)}.`,
    'people',
  )
  return close(draft)
}

/**
 * Сутки двора (этап 104, Дв2 и Дв3).
 *
 * Люди двора просят, стареют и уходят: раз в полгода кто-нибудь заговаривает о
 * своём, а годы делают своё дело — место освобождается не по твоей воле.
 */
function tickCourtiers(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % COURT_BEAT !== 0) return
  for (const courtier of courtiersOf(draft.base, day)) {
    if (endsNow(courtier)) {
      const offices = { ...(draft.offices ?? {}) }
      delete offices[courtier.office]
      draft.offices = offices
      notice(draft, careerWords(courtier), 'people')
      continue
    }
    if (leavesSoon(courtier) && day % (COURT_BEAT * 12) === 0) {
      notice(draft, careerWords(courtier), 'people')
      continue
    }
    if (asksNow(courtier, day)) notice(draft, askWords(courtier), 'people')
  }
}

/** Как часто двор подаёт голос. */
const COURT_BEAT = 30

/**
 * Объехать державу (этап 102, Г1–Г3).
 *
 * Едут туда, где давно не были. Увиденное самому точно и без вилки, а места
 * помнят, что хозяин приезжал: объезд стоит суток и возвращает то, чего не
 * купишь ни за какие деньги, — правду.
 */
function rideOut(state: GameState): CommandResult {
  const day = dayOf(state.time)
  const plan = tourPlan(state, state.world, day)
  if (plan.stops.length === 0) return fail('invalid', 'Объезжать нечего.')

  const draft = open(state)
  advance(draft, hours(24 * plan.days))
  addFatigue(draft, plan.days * 3)
  const today = dayOf(draft.time)
  let words = draft.words
  for (const stop of plan.stops) {
    const place = draft.settlements[stop.locationId]
    if (!place) continue
    words = seeAt(words, stop.locationId, storeDays(place), garrisonSize(place), today)
    draft.visits = { ...draft.visits, [stop.locationId]: today }
    draft.reputation = withPlaceRep(draft.reputation, stop.locationId, SIGHT.visitMood)
  }
  draft.words = words
  notice(
    draft,
    `${SIGHT_WORDS.rode} Объехано ${plan.stops.length} мест за ${plan.days} сут.: ${plan.stops.map((one) => one.name).join(', ')}.`,
    'world',
  )
  return close(draft)
}

/**
 * Послать человека смотреть (этап 102, Г4).
 *
 * Дешевле временем, дороже точностью: вернётся не «видел сам», а «донесли
 * свои» — со своей вилкой и своим интересом.
 */
function sendLook(state: GameState, locationId: string): CommandResult {
  const place = state.settlements[locationId]
  if (!place) return fail('invalid', 'Такого места нет.')
  const day = dayOf(state.time)
  if (looksOf(state).some((one) => one.locationId === locationId)) {
    return fail('invalid', 'Туда уже послан человек.')
  }
  const cost = lookCost(state.world, state.locationId, locationId, looksQuicker(state.character))
  if (state.character.money < cost.silver) {
    return fail('noMoney', `Послать человека — ${cost.silver}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -cost.silver)
  advance(draft, hours(4))
  draft.looks = [...looksOf(draft), { locationId, sentDay: day, comesDay: day + cost.days }]
  notice(
    draft,
    `${SIGHT_WORDS.sent} ${state.world.locations[locationId]?.name}: вернётся через ${cost.days} сут., ${cost.silver} серебром.`,
    'world',
  )
  return close(draft)
}

/** Посланные возвращаются: их весть — «донесли свои» (этап 102, Г4). */
function tickLooks(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const waiting = looksOf(draft)
  if (waiting.length === 0) return
  const back = waiting.filter((one) => one.comesDay <= day)
  if (back.length === 0) return
  let words = draft.words
  for (const look of back) {
    const place = draft.settlements[look.locationId]
    if (!place) continue
    words = bring(words, {
      id: `word:look:stores:${look.locationId}`,
      to: PLAYER,
      kind: 'stores',
      about: look.locationId,
      value: storeDays(place),
      source: 'own',
      from: 'посланный',
      day,
    })
    words = bring(words, {
      id: `word:look:garrison:${look.locationId}`,
      to: PLAYER,
      kind: 'garrison',
      about: look.locationId,
      value: garrisonSize(place),
      source: 'own',
      from: 'посланный',
      day,
    })
    notice(
      draft,
      `${SIGHT_WORDS.came} ${draft.base.world.locations[look.locationId]?.name}: запас на ${storeDays(place)} сут., под ружьём ${garrisonSize(place)}.`,
      'world',
    )
  }
  draft.words = words
  draft.looks = waiting.filter((one) => one.comesDay > day)
}

/**
 * Пустить молву (этап 101, М4).
 *
 * Пущенная молва становится общей: она пойдёт по местам сама, исказится на
 * переходах и однажды вернётся к тебе не тем, чем была. Власти над ней нет ни у
 * кого — в этом и цена, и польза.
 */
function startTalk(
  state: GameState,
  kind: TalkKind,
  about: string,
  value: number | string,
): CommandResult {
  const day = dayOf(state.time)
  if (state.character.money < GOSSIP.startSilver) {
    return fail(
      'noMoney',
      `Пустить молву стоит ${GOSSIP.startSilver}, у тебя ${state.character.money}.`,
    )
  }
  if (gossipOf(state).some((one) => one.about === about && one.kind === kind && alive(one, day))) {
    return fail('invalid', 'Об этом уже говорят.')
  }

  const draft = open(state)
  addMoney(draft, -GOSSIP.startSilver)
  advance(draft, hours(6))
  practice(draft, 'persuasion', 20)
  const truth = truthOf(draft.base, draft.base.world, { kind, about }, day)
  const sooth = truth !== null && truth === value
  const talk = startGossip(
    `talk:${kind}:${about}:${day}`,
    kind,
    about,
    value,
    state.locationId,
    day,
    sooth,
  )
  draft.gossip = [...gossipOf(draft), talk]
  notice(draft, `${talkWords(talk)}. ${GOSSIP_WORDS.mine}`, 'people')
  return close(draft)
}

/**
 * Проверить услышанное (этап 101, М5).
 *
 * Молву можно свести с правдой — если есть чем: свои глаза, свои люди или
 * место, до которого можно дойти. Уличённая молва стихает, подтверждённая
 * становится вестью получше.
 */
function checkTalk(state: GameState, talkId: string): CommandResult {
  const day = dayOf(state.time)
  const talk = gossipOf(state).find((one) => one.id === talkId)
  if (!talk) return fail('invalid', 'О такой молве не слышно.')
  if (!alive(talk, day)) return fail('invalid', 'О том уже не говорят.')
  if (state.character.money < GOSSIP.checkSilver) {
    return fail('noMoney', `Проверка стоит ${GOSSIP.checkSilver}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -GOSSIP.checkSilver)
  advance(draft, hours(24 * GOSSIP.checkDays))
  practice(draft, 'scholarship', 25)
  const truth = truthOf(draft.base, draft.base.world, { kind: talk.kind, about: talk.about }, day)
  const right = truth !== null && truth === talk.value
  draft.words = bring(draft.words, checkedWord(talk, truth, PLAYER, dayOf(draft.time)))
  draft.gossip = gossipOf(draft).map((one) =>
    one.id === talkId ? { ...one, exposed: !right } : one,
  )
  // Молва — тоже источник, и у неё тоже есть имя (этап 103, Л4).
  draft.trust = remember(draft.trust, 'молва', !right)
  notice(
    draft,
    right
      ? `${GOSSIP_WORDS.checked} ${talkWords(talk)}`
      : `${GOSSIP_WORDS.exposed} На деле ${truth ?? 'ничего подобного'}.`,
    'people',
  )
  return close(draft)
}

/**
 * Сутки молвы (этап 101, М1–М3).
 *
 * Молва делает шаг раз в пятидневку: расходится по соседям, искажается и
 * стихает сама. Дойдя до места, где ты стоишь, она становится вестью с
 * источником «ходит молва» — и дальше живёт по правилам знания (этап 99).
 */
function tickGossip(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % GOSSIP.beat !== 0) return
  const rows = gossipOf(draft)
  if (rows.length === 0) return
  const moved: Talk[] = []
  let words = draft.words
  for (const talk of rows) {
    if (!alive(talk, day)) continue
    const next = stepped(talk, draft.base.world, day)
    moved.push(next)
    // Дошла до тебя — значит, ты её услышал.
    if (heardAt(next, draft.locationId, day)) {
      words = hear(words, next, PLAYER, day)
    }
  }
  draft.gossip = moved
  draft.words = words
}

/**
 * Ревизия своего места (этап 100, Д4).
 *
 * Узнать, что на самом деле даёт твоя земля, можно — но не бесплатно: серебро,
 * сутки и обида того, кого проверили. Зато после ревизии он пишет как есть, и
 * рука убирается из подати — на несколько лет, не навсегда.
 */
function orderAudit(state: GameState, locationId: string): CommandResult {
  const settlement = state.settlements[locationId]
  if (!settlement || settlement.owner !== PLAYER) return fail('invalid', 'Это не твоё место.')
  const day = dayOf(state.time)
  const audit = auditOf(state, state.world, locationId, day)
  if (!audit) return fail('invalid', 'Проверять некого.')
  if (state.character.money < audit.silver) {
    return fail('noMoney', `Ревизия стоит ${audit.silver}, у тебя ${state.character.money}.`)
  }
  const reporter = reporterAt(state, state.world, locationId, day)

  const draft = open(state)
  addMoney(draft, -audit.silver)
  advance(draft, hours(24 * audit.days))
  practice(draft, 'scholarship', 30)
  draft.audits = { ...(draft.audits ?? {}), [locationId]: day }
  // Ревизия — это проверка человека, а не места: её итог помнится за ним.
  if (reporter) draft.trust = remember(draft.trust, reporter.name, !audit.clean)
  // Проверенный помнит проверку: честный — с обидой поменьше, вор — с обидой.
  draft.reputation = withPlaceRep(
    draft.reputation,
    locationId,
    audit.clean ? REPORT.auditTrust : REPORT.auditAnger,
  )
  // Ревизия — это знание своими глазами: после неё числа точны (этап 99).
  const today = dayOf(draft.time)
  draft.words = bring(draft.words, {
    id: `word:report:${locationId}`,
    to: PLAYER,
    kind: 'garrison',
    about: locationId,
    value: garrisonSize(settlement),
    source: 'eyes',
    from: reporter?.name ?? null,
    day: today,
  })
  notice(draft, `${audit.says} Стоило ${audit.silver} и ${audit.days} сут.`, 'world')
  return close(draft)
}

/**
 * Сутки донесений (этап 100, Д1 и Д6).
 *
 * Свои места отчитываются раз в месяц, и отчёт идёт столько, сколько идёт гонец.
 * Дошедший отчёт становится вестью (этап 99) с источником «донесли свои»: дальше
 * он стареет, как всякая весть, и его можно сверить с другой.
 */
function tickReports(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % REPORT.everyDays !== 0) return
  const mine = holdingsOf(draft.settlements, PLAYER)
  if (mine.length === 0) return
  let words = draft.words
  let skimmed = 0
  for (const one of mine) {
    const report = reportFrom(draft.base, draft.base.world, one.locationId, day)
    if (!report) continue
    skimmed += skimAt(draft.base, draft.base.world, one.locationId, day)
    // Двор решает не только что сказать, но и когда (этап 105, С1): доброе
    // доходит первым, дурное отстаёт и приходит мягче.
    const seneschal = courtierAt(draft.base, 'seneschal', day)
    // Двор, где одна партия победила, придерживает дурное сильнее (этап 106, П5).
    const balance = balanceOf(draft.base, day)
    for (const line of report.lines) {
      if (line.kind !== 'grain' && line.kind !== 'people') continue
      const good = line.kind === 'grain' ? line.said >= line.truth : true
      const shade = shading(seneschal, good)
      words = bring(words, {
        id: `word:${line.kind}:${one.locationId}`,
        to: PLAYER,
        kind: line.kind === 'grain' ? 'stores' : 'garrison',
        about: one.locationId,
        value: Math.round(
          line.said * (good ? 1 : Math.max(0.2, 1 - (1 - shade.soften) * balance.hides)),
        ),
        source: 'own',
        from: report.reporter.name,
        // Отчёт пишут сегодня, а доходит он позже: возраст вести — его дорога,
        // да ещё столько, сколько его придерживали.
        day: day - report.reporter.days - Math.round(shade.days * balance.hides),
      })
    }
  }
  // Концентрация держит вести в голове дольше (этап 122, А2).
  draft.words = forgetOld(words, day, remembersDays(draft.character, KNOWN_DEFS.keepDays))
  // Чужая рука видна не по надписи, а по расхождению: раз в год об этом говорят.
  if (skimmed > 0 && day % (REPORT.everyDays * 12) === 0) {
    const purse = purseAsReported(draft.base, draft.base.world, day)
    notice(draft, purse.says, 'world')
  }
}

/**
 * Сесть за стол (этап 88, М1 и М4).
 *
 * Мир перестаёт быть броском: его начинают нарочно. За столом сразу видно, во
 * что война встала обеим сторонам и чего другая сторона просит; посредник
 * стоит денег и делает разговор легче.
 */
function openTalks(state: GameState, against: string, mediator?: MediatorKind): CommandResult {
  if (state.talks) return fail('invalid', 'Переговоры уже идут.')
  const war = state.politics.wars.find((one) => sameSides(one, PLAYER, against))
  if (!war) return fail('invalid', 'С этой короной ты не воюешь.')
  const day = dayOf(state.time)
  const offer = mediator
    ? mediatorsFor(state, state.world, against, day).find((one) => one.kind === mediator)
    : null
  if (mediator && !offer) return fail('requirements', 'Такого посредника здесь не найти.')
  if (offer && state.character.money < offer.fee) {
    return fail('noMoney', `${offer.name} берёт ${offer.fee}, у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  if (offer) addMoney(draft, -offer.fee)
  advance(draft, hours(8))
  const asks = asksOf(draft.base, draft.base.world, against, day)
  draft.talks = { against, sinceDay: day, asks, mediator: mediator ?? null, rounds: 0 }
  const ours = warToll(draft.base, draft.base.world, PLAYER, war, day)
  const theirs = warToll(draft.base, draft.base.world, against, war, day)
  notice(
    draft,
    `Стол накрыт${offer ? `, мирит ${offer.name} (берёт ${offer.fee}: ${offer.takes})` : ''}. Твой счёт войны ${ours.cost}, их — ${theirs.cost}. Просят: ${asks.map((one) => termDef(one).label).join(', ')}.`,
    'world',
  )
  return close(draft)
}

/**
 * Положить условия на стол (этап 88, М1 и М3).
 *
 * Условий бывает несколько разом, и вес у них разный: земля тяжелее дани, дань
 * тяжелее выкупа, признание вины не стоит ничего и обиднее всего. Примут или
 * нет — считается положением, а не красноречием.
 */
function tableTerms(state: GameState, terms: readonly PeaceTerm[]): CommandResult {
  const talks = talksOf(state)
  if (!talks) return fail('invalid', 'Стол не накрыт: переговоров нет.')
  if (terms.length === 0) return fail('invalid', 'Мир без условий — это не мир, а передышка.')
  const war = state.politics.wars.find((one) => sameSides(one, PLAYER, talks.against))
  if (!war) return fail('invalid', 'Война уже кончилась.')
  const day = dayOf(state.time)

  const draft = open(state)
  advance(draft, hours(6))
  practice(draft, 'persuasion', 20)
  const chance = offerWeight(draft.base, draft.base.world, talks.against, terms, day)
  const [taken, afterRoll] = rollChance(draft.rng, chance)
  draft.rng = afterRoll
  if (!taken) {
    const rounds = talks.rounds + 1
    // Терпение за столом не бесконечно: после трёх отказов послы встают.
    if (rounds >= 3) {
      draft.talks = null
      notice(draft, `${PEACE_WORDS.walked} (${Math.round(chance * 100)} из ста)`, 'world')
      return close(draft)
    }
    draft.talks = { ...talks, rounds }
    notice(
      draft,
      `Условия отклонены: ${terms.map((one) => termDef(one).label).join(', ')} — слишком дорого. (${Math.round(chance * 100)} из ста)`,
      'world',
    )
    return close(draft)
  }

  // Мир заключён: война уходит из состояния, условия ложатся в летопись.
  draft.politics = {
    ...draft.politics,
    wars: draft.politics.wars.filter((one) => !sameSides(one, PLAYER, talks.against)),
  }
  const hard = harshness(terms)
  const ours = warToll(draft.base, draft.base.world, PLAYER, war, day)
  const theirs = warToll(draft.base, draft.base.world, talks.against, war, day)
  const yielded = ours.cost <= theirs.cost ? talks.against : PLAYER
  // Разбитый признаёт (этап 131, дверь войны): уступивший мир — это и признание.
  if (yielded !== PLAYER) {
    draft.recognitions = { ...draft.recognitions, [talks.against]: dayOf(draft.time) }
  }
  const record: PeaceRecord = {
    against: talks.against,
    day,
    terms: [...terms],
    mediator: talks.mediator,
    harshness: hard,
    yielded,
  }
  draft.peaces = [...peacesOf(draft), record]
  // Условия, у которых есть вес в мире, ложатся в мир.
  if (terms.includes('tribute')) {
    draft.politics = {
      ...draft.politics,
      tributes: [
        ...draft.politics.tributes.filter(
          (one) => !(one.from === talks.against && one.to === PLAYER),
        ),
        { from: talks.against, to: PLAYER, perDay: 6, untilDay: day + 1800 },
      ],
    }
  }
  if (terms.includes('ransom')) addMoney(draft, 600)
  draft.politics = withRelation(
    draft.politics,
    PLAYER,
    talks.against,
    terms.includes('marriage') ? 12 : 4,
  )
  // Тяжёлый мир помнят: он сам становится поводом (М5).
  const grudge = grievanceFrom(record, day)
  if (grudge) {
    draft.grievances = [...grievancesOf(draft), grudge]
  }
  draft.talks = null
  notice(
    draft,
    `${PEACE_WORDS.struck} ${terms.map((one) => termDef(one).label).join(', ')}; вес условий ${hard}, обиды ${shameOf(terms)}. ${grudge ? PEACE_WORDS.forced : PEACE_WORDS.fair}${talks.mediator ? ` Мирил ${mediatorDef(talks.mediator).label}.` : ''}`,
    'world',
  )
  return close(draft)
}

/** Встать из-за стола. */
function endTalks(state: GameState): CommandResult {
  if (!state.talks) return fail('invalid', 'Переговоров нет.')
  const draft = open(state)
  advance(draft, hours(2))
  draft.talks = null
  notice(draft, 'Ты встал из-за стола: война продолжается.', 'world')
  return close(draft)
}

/**
 * Память о мире (этап 88, М5 и М6).
 *
 * Обида зреет полтора года и становится поводом: корона, которую заставили
 * подписать под ножом, объявляет войну сама — и это та же война, что и любая
 * другая, только с именем у причины. Нарушенный мир отмечается в летописи.
 */
function tickPeace(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  const ripe = grievancesOf(draft).filter((one) => grudgeRipe(one, day))
  if (ripe.length > 0) {
    let wars = draft.politics.wars
    const left = grievancesOf(draft).filter((one) => !grudgeRipe(one, day))
    for (const grudge of ripe) {
      const foe = grudge.who === PLAYER ? grudge.against : grudge.who
      const us = grudge.who === PLAYER ? PLAYER : grudge.against
      if (us !== PLAYER && foe !== PLAYER) continue
      if (atWar(draft.politics, PLAYER, foe === PLAYER ? us : foe)) continue
      const other = foe === PLAYER ? us : foe
      wars = [
        ...wars,
        {
          a: other,
          b: PLAYER,
          since: day,
          reason: 'прежний мир, подписанный под ножом',
          casus: { kind: 'feud' as const },
        },
      ]
      notice(
        draft,
        `${kingdomName(draft.base, other)} вспомнил прежний мир: война объявлена снова.`,
        'war',
      )
      // Старый мир считается нарушенным: летопись это помнит.
      draft.peaces = peacesOf(draft).map((one) =>
        one.against === other && !one.brokenDay ? { ...one, brokenDay: day } : one,
      )
    }
    draft.politics = { ...draft.politics, wars }
    draft.grievances = left
  }
  // Мир, нарушенный не обидой, а войной: отмечаем и такое.
  for (const record of peacesOf(draft)) {
    if (record.brokenDay) continue
    if (atWar(draft.politics, PLAYER, record.against)) {
      draft.peaces = peacesOf(draft).map((one) =>
        one === record ? { ...one, brokenDay: day } : one,
      )
    }
  }
}

/** Как часто считают чужие посольства, найм рот и чужие запоры. */
const OVERTURE_BEAT = 15
const COMPANY_BEAT = 10
const NAVY_BEAT = 5

/**
 * Ответить церкви (этап 96, Ц1 и Ц5).
 *
 * Уступка стоит того, чем просят: десятины, земли, части своего суда, войны или
 * имени перед знатью. Отказ стоит счёта: церковь помнит и отвечает не сразу, но
 * отвечает — словом, интердиктом, а потом и походом.
 */
function answerChurch(state: GameState, yields: boolean): CommandResult {
  const day = dayOf(state.time)
  const want = churchAsk(state, state.world, day)
  const def = wantDef(want)

  const draft = open(state)
  advance(draft, hours(6))
  if (!yields) {
    const cost = defianceCost(want)
    draft.churchAnger = Math.max(0, (draft.churchAnger ?? 0) + cost.anger)
    draft.piety = (draft.piety ?? 0) + cost.piety
    notice(draft, `«${def.says}» — ты отказал. ${cost.says}`, 'world')
    return close(draft)
  }
  // Уступка платится тем, чем просят.
  if (want === 'tithe') {
    const tithe = Math.round(churchOf(draft.base, draft.base.world, day).tithe)
    if (draft.character.money < tithe) {
      return fail('noMoney', `Десятина — ${tithe}, у тебя ${draft.character.money}.`)
    }
    addMoney(draft, -tithe)
  }
  if (want === 'land') {
    const mine = [...holdingsOf(draft.settlements, PLAYER)].sort(
      (a, b) => a.population - b.population,
    )[0]
    if (!mine) return fail('requirements', 'Земли, которую можно отдать обители, нет.')
    draft.settlements = {
      ...draft.settlements,
      [mine.locationId]: { ...mine, owner: null },
    }
  }
  if (want === 'peace') {
    draft.politics = {
      ...draft.politics,
      wars: draft.politics.wars.filter((war) => war.a !== PLAYER && war.b !== PLAYER),
    }
  }
  if (want === 'penance') draft.renown = Math.max(0, draft.renown - 2)
  draft.churchAnger = Math.max(0, (draft.churchAnger ?? 0) + CHURCH.obedience)
  draft.piety = (draft.piety ?? 0) + def.piety
  notice(
    draft,
    `«${def.says}» — ты уступил. Платишь ${def.costs}; благочестия прибавилось на ${def.piety}, счёт церкви упал на ${Math.abs(CHURCH.obedience)}.`,
    'world',
  )
  return close(draft)
}

/**
 * Сутки церкви (этап 96, Ц2 и Ц3).
 *
 * Счёт растёт от отказов и сам не падает: церковь помнит. Дойдя до черты, она
 * отвечает — словом, интердиктом на всю державу, а потом называет твоё имя, и
 * по призыву идут другие короны. Считается раз в декаду.
 */
function tickChurch(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % CHURCH_BEAT !== 0) return
  const anger = draft.churchAnger ?? 0
  const standing = draft.censure ?? null

  // Идущая кара делает своё дело каждую декаду.
  if (standing && standing.untilDay >= day) {
    if (standing.kind === 'interdict') {
      const bite = interdictBite(draft.base)
      for (const one of holdingsOf(draft.settlements, PLAYER)) {
        draft.reputation = withPlaceRep(draft.reputation, one.locationId, bite.mood)
      }
    }
    return
  }
  if (standing && standing.untilDay < day) {
    draft.censure = null
    notice(draft, 'Кара снята: храмы открыты, и люди это заметили раньше тебя.', 'world')
    return
  }

  const due = censureDue(anger)
  if (!due) return
  const want = churchAsk(draft.base, draft.base.world, day)
  if (due === 'warning') {
    notice(
      draft,
      `С амвона о тебе говорят вслух: церковь помнит отказы. Счёт ${anger}, до интердикта ${CENSURE_LINES.interdict.from - anger}.`,
      'world',
    )
    return
  }
  if (due === 'interdict') {
    draft.censure = {
      kind: 'interdict',
      sinceDay: day,
      untilDay: day + CHURCH.interdictDays,
      why: want,
    }
    notice(draft, interdictBite(draft.base).says, 'world')
    return
  }
  // Поход по призыву: церковь не воюет сама — она называет имя.
  const crusaders = crusadersAgainst(draft.base, draft.base.world, PLAYER, day)
  draft.censure = { kind: 'crusade', sinceDay: day, untilDay: day + 720, why: want }
  let wars = draft.politics.wars
  for (const kingdomId of crusaders) {
    if (atWar(draft.politics, PLAYER, kingdomId)) continue
    wars = [...wars, { a: kingdomId, b: PLAYER, since: day, reason: 'поход по призыву церкви' }]
  }
  draft.politics = { ...draft.politics, wars }
  notice(
    draft,
    `Против тебя объявлен поход: имя названо с амвона, и по призыву пошли ${crusaders.length} корон.`,
    'war',
  )
}

/** Как часто считают церковь. */
const CHURCH_BEAT = 10

/** Черты кар лежат в содержимом: числа читаются в одном месте. */
const CENSURE_LINES = CENSURE_DEFS

/**
 * Ответить городу (этап 95, На2 и На4).
 *
 * Согласие унимает тех, кто просил, и злит тех, кто не просил: две правды в
 * одном городе — это и есть та вещь, между которыми приходится выбирать. За
 * согласие платят сразу — хлебом, пошлиной, людьми или правом.
 */
function answerCity(state: GameState, locationId: string, ask: CityAsk): CommandResult {
  const settlement = state.settlements[locationId]
  if (!settlement || settlement.owner !== PLAYER) {
    return fail('invalid', 'Это не твой город.')
  }
  const city = cityOf(state, state.world, locationId)
  if (!city) return fail('invalid', 'Это не город: своей воли у него нет.')
  const offer = cityAsks(state, state.world, city).find((one) => one.ask === ask)
  if (!offer) return fail('requirements', 'Об этом город сейчас не просит.')

  const draft = open(state)
  advance(draft, hours(6))
  // Хлеб везут из своих амбаров: у согласия есть вес в зерне.
  if (ask === 'grain') {
    const need = Math.round(settlement.population * 0.05 * 30)
    const barns = holdingsOf(draft.settlements, PLAYER).filter(
      (one) => one.locationId !== locationId,
    )
    let left = need
    let places = draft.settlements
    for (const barn of barns) {
      if (left <= 0) break
      const has = places[barn.locationId]
      if (!has) continue
      const takes = Math.min(left, Math.round(has.stock.grain * 0.4))
      if (takes <= 0) continue
      places = {
        ...places,
        [barn.locationId]: {
          ...has,
          stock: { ...has.stock, grain: has.stock.grain - takes },
        },
      }
      left -= takes
    }
    const brought = need - left
    const city2 = places[locationId]
    if (city2) {
      places = {
        ...places,
        [locationId]: { ...city2, stock: { ...city2.stock, grain: city2.stock.grain + brought } },
      }
    }
    draft.settlements = places
    if (brought <= 0) return fail('requirements', 'Хлеба в своих амбарах нет: везти нечего.')
  }
  if (ask === 'toll' || ask === 'monopoly') {
    // Снятая пошлина и отданное право — это деньги, которых не будет.
    addMoney(draft, -Math.round(city.people * 0.2))
  }
  if (ask === 'guard') {
    const place = draft.settlements[locationId]
    if (place) {
      draft.settlements = {
        ...draft.settlements,
        [locationId]: { ...place, banditry: Math.max(0, place.banditry - 0.2) },
      }
    }
  }
  if (ask === 'charter') {
    return grantPactInner(draft, locationId, city, undefined)
  }
  // Кто просил — доволен; кто не просил — считает, что ты слушаешь не тех.
  const side = sideOfAsk(ask)
  draft.reputation = withPlaceRep(draft.reputation, locationId, offer.calms / 4)
  notice(
    draft,
    `${city.name}: ${offer.label}. Платишь ${offer.costs}. ${
      side === 'both'
        ? 'Довольны все.'
        : side === 'commons'
          ? `Чернь довольна, купцы — нет (${CITY.spite} против).`
          : `Купцы довольны, чернь — нет (${CITY.spite} против).`
    }`,
    'people',
  )
  return close(draft)
}

/**
 * Дать городу вольность по договору (этап 95, На5).
 *
 * С городом договариваются, как с короной: он платит разом, платит подать
 * вполовину, судит своих сам — и договор этот на срок, а не навсегда. Поручитель
 * делает его дороже для того, кто захочет его порвать.
 */
function grantPact(state: GameState, locationId: string, guarantor?: string): CommandResult {
  const settlement = state.settlements[locationId]
  if (!settlement || settlement.owner !== PLAYER) return fail('invalid', 'Это не твой город.')
  const city = cityOf(state, state.world, locationId)
  if (!city) return fail('invalid', 'Это не город: договариваться не с кем.')
  if (pactAt(state, locationId)) return fail('invalid', 'У этого города вольность уже есть.')
  const draft = open(state)
  advance(draft, hours(8))
  return grantPactInner(draft, locationId, city, guarantor)
}

function grantPactInner(
  draft: Draft,
  locationId: string,
  city: ReturnType<typeof cityOf>,
  guarantor: string | undefined,
): CommandResult {
  if (!city) return fail('invalid', 'Это не город.')
  const day = dayOf(draft.time)
  const paid = pactPrice(city)
  addMoney(draft, paid)
  draft.pacts = [
    ...pactsOf(draft),
    {
      locationId,
      sinceDay: day,
      untilDay: day + CITY.pactDays,
      paid,
      guarantor: guarantor ?? null,
    },
  ]
  draft.reputation = withPlaceRep(draft.reputation, locationId, 15)
  notice(
    draft,
    `${city.name} получил вольность по договору: ${paid} разом, подать вполовину, свой суд, срок ${Math.round(CITY.pactDays / 365)} лет${guarantor ? `, поручитель — ${guarantor}` : ''}.`,
    'world',
  )
  return close(draft)
}

/**
 * Сутки городов (этап 95, На3).
 *
 * Бунт — не случайность, а то, к чему шло: голод, дороговизна, подать и разбой
 * складываются в счёт, и счёт этот виден заранее. Считается раз в декаду.
 */
function tickCities(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % CITY_BEAT !== 0) return
  for (const city of citiesOf(draft.base, draft.base.world)) {
    const risk = riotRisk(draft.base, draft.base.world, city)
    if (!risk.nigh) {
      if (risk.risk >= CITY.riotLine * 0.7) {
        notice(draft, `${city.name}: до бунта недалеко — ${risk.why}.`, 'people')
      }
      continue
    }
    const cost = riotCost(city)
    const place = draft.settlements[city.locationId]
    if (!place) continue
    draft.settlements = {
      ...draft.settlements,
      [city.locationId]: {
        ...place,
        population: Math.max(0, place.population - cost.dead),
        banditry: Math.min(1, place.banditry + CITY.riotBanditry),
        stock: { ...place.stock, grain: Math.round(place.stock.grain * 0.7) },
      },
    }
    draft.reputation = withPlaceRep(draft.reputation, city.locationId, CITY.riotMood)
    notice(draft, cost.says, 'people')
  }
}

/** Как часто считают города. */
const CITY_BEAT = 10

/**
 * Унять заговор уступкой (этап 94, Мя4).
 *
 * Вольность, земля, голова советника или серебро: каждая уступка платится
 * своим и унимает по-своему. Дешёвая уступка унимает ненадолго — недовольство
 * никуда не девается, оно только отступает.
 */
function appeasePlot(state: GameState, concession: ConcessionId): CommandResult {
  const day = dayOf(state.time)
  const plot = plotAgainst(state, state.world, day)
  if (!plot) return fail('invalid', 'Унимать некого: твоя знать спокойна.')
  const offer = concessionsFor(state, plot).find((one) => one.id === concession)
  if (!offer) return fail('invalid', 'Такой уступки не бывает.')
  if (!offer.can) return fail('requirements', offer.why)

  const draft = open(state)
  advance(draft, hours(10))
  const price = bribePriceFor(plot)
  if (concession === 'gold') {
    if (draft.character.money < price) {
      return fail('noMoney', `Просят ${price}, у тебя ${draft.character.money}.`)
    }
    addMoney(draft, -price)
  }
  if (concession === 'liberty') {
    // Грамота на суд и подать: то же, что жалуют миром (этап 76, З2).
    draft.charters = {
      ...draft.charters,
      [plot.leaderId]: { kind: 'liberty' as const, sinceDay: day, paid: 0 },
    }
  }
  if (concession === 'land') {
    // Лен из своей руки: самое дорогое, что можно дать, и самое верное.
    const mine = [...holdingsOf(draft.settlements, PLAYER)].sort(
      (a, b) => a.population - b.population,
    )[0]
    if (!mine) return fail('requirements', 'Земли, которую можно пожаловать, нет.')
    draft.settlements = {
      ...draft.settlements,
      [mine.locationId]: { ...mine, owner: plot.leaderId },
    }
  }
  if (concession === 'head') {
    // Виноват не ты, а тот, кто советовал: советника выдают знати.
    const seats = Object.entries(draft.offices ?? {}).filter(([, one]) => one !== undefined)
    const first = seats[0]
    if (!first) return fail('requirements', 'Советников у тебя нет.')
    const offices = { ...(draft.offices ?? {}) }
    delete offices[first[0] as keyof typeof offices]
    draft.offices = offices
    // Своим это тоже видно: при дворе такое помнят.
    draft.fame = { ...draft.fame, nobles: Math.round((draft.fame.nobles ?? 0) - 4) }
  }
  // Уступка унимает: верность заговорщиков поднимается на её вес.
  for (const id of plot.members) shiftVassals(draft, offer.calms / 3, id)
  notice(
    draft,
    `${offer.label}: ${offer.costs}. ${plot.leaderName} доволен — пока. Унято на ${offer.calms} счёта недовольства.`,
    'world',
  )
  return close(draft)
}

/**
 * Унять силой (этап 94, Мя5 и Мя6).
 *
 * Мятеж можно кончить и так: зачинщик теряет землю и присягу, а ты — славу
 * среди знати и доверие остальных вассалов. Чужие дворы это тоже видят.
 */
function crushPlot(state: GameState): CommandResult {
  const day = dayOf(state.time)
  const plot = plotAgainst(state, state.world, day)
  if (!plot) return fail('invalid', 'Унимать некого: твоя знать спокойна.')
  const leader = lordById(state.politics, plot.leaderId)
  if (!leader) return fail('invalid', 'Зачинщика уже нет.')

  const draft = open(state)
  advance(draft, hours(12))
  const cost = reprisalCost(draft.base, plot)
  // Земля зачинщика отходит тебе, присяга кончается.
  let places = draft.settlements
  for (const one of Object.values(places)) {
    if (one.owner !== plot.leaderId) continue
    places = { ...places, [one.locationId]: { ...one, owner: PLAYER } }
  }
  draft.settlements = places
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.filter((one) => one.id !== plot.leaderId),
  }
  const oaths = { ...draft.oaths }
  delete oaths[plot.leaderId]
  draft.oaths = oaths
  // Остальные боятся — и верят меньше.
  shiftVassals(draft, cost.fear, null)
  draft.fame = { ...draft.fame, nobles: Math.round((draft.fame.nobles ?? 0) + cost.fame) }
  notice(draft, `${cost.says} ${lessonWords(true)}`, 'world')
  return close(draft)
}

/**
 * Сутки твоей знати (этап 94, Мя2 и Мя3).
 *
 * Недовольство считается не каждый день — раз в декаду: считать заговор чаще,
 * чем он зреет, незачем. Созревший заговор становится мятежом сам: зачинщик
 * уходит из присяги и уводит с собой тех, кто был с ним.
 */
function tickRevolt(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  if (day % REVOLT_BEAT !== 0) return
  const plot = plotAgainst(draft.base, draft.base.world, day)
  if (!plot) return
  if (plot.ripeness < REVOLT.riseLine) {
    // Пока только разговоры — но о них можно узнать заранее.
    if (plot.seen && plot.seenBy) {
      notice(draft, `${plot.seenBy} доносят: ${plot.says}`, 'world')
    }
    return
  }
  // Мятеж: зачинщик и те, кто с ним, выходят из присяги.
  const rising = new Set(plot.members)
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((lord) =>
      rising.has(lord.id) ? { ...lord, kingdomId: null, loyalty: 0 } : lord,
    ),
  }
  notice(
    draft,
    `${plot.says} Из присяги вышли ${rising.size}; выжидают ${plot.waiting.length}.`,
    'war',
  )
}

/** Как часто считают настроение своей знати. */
const REVOLT_BEAT = 10

/**
 * Поставить закон о наследстве (этап 93, Сл2).
 *
 * Выбор делается заранее и стоит сразу: раздел радует знать и рвёт державу,
 * первородство держит её целой и злит младших, единое наследство не делится
 * вовсе — и держится только сильной рукой.
 */
function setHeirLaw(state: GameState, law: LawId): CommandResult {
  if (!state.realm) return fail('requirements', 'Закон о наследстве ставит держава, а не человек.')
  if (heirLawOf(state) === law) return fail('invalid', 'Такой закон и так стоит.')
  const def = lawDef(law)

  const draft = open(state)
  advance(draft, hours(8))
  draft.heirLaw = law
  // Знать принимает закон по-своему: раздел ей по душе, неделимость — нет.
  if (def.nobles !== 0 && vassalsOf(draft.base).length > 0) shiftVassals(draft, def.nobles, null)
  const day = dayOf(draft.time)
  notice(
    draft,
    `Закон о наследстве: ${def.label}. ${def.about} ${successionView({ ...draft.base, heirLaw: law }, day)}`,
    'world',
  )
  return close(draft)
}

/**
 * Ответить чужому послу (этап 91, Ди1 и Ди2).
 *
 * Принять, отказать или торговаться. Согласие кладёт в мир то, о чём говорили,
 * и обещание, которое другая сторона может не сдержать (Ди3). Торг — это не
 * уговоры, а положение: уступают тому, кому нужнее согласие.
 */
function answerOverture(state: GameState, id: string, answer: AnswerId): CommandResult {
  const overture = overturesOf(state).find((one) => one.id === id)
  if (!overture) return fail('invalid', 'Такого посла у дверей нет.')
  const day = dayOf(state.time)
  if (overture.untilDay < day) return fail('invalid', OVERTURE_WORDS.left)
  const def = overtureDef(overture.kind)

  const draft = open(state)
  advance(draft, hours(4))
  practice(draft, 'persuasion', 15)
  const from = overture.fromKingdom

  if (answer === 'refuse') {
    draft.overtures = overturesOf(draft).filter((one) => one.id !== id)
    // Отказ грозящему стоит отношений; отказ просящему — почти ничего.
    const bite = overture.kind === 'threat' ? -10 : overture.kind === 'tribute' ? -6 : -3
    draft.politics = withRelation(draft.politics, PLAYER, from, bite)
    notice(
      draft,
      `${kingdomName(draft.base, from)}: отказано. ${overture.kind === 'threat' && !overture.backed ? OVERTURE_WORDS.hollow : ''}`.trim(),
      'world',
    )
    return close(draft)
  }

  if (answer === 'counter') {
    const chance = counterWeight(draft.base, draft.base.world, overture, day)
    const [yields, afterRoll] = rollChance(draft.rng, chance)
    draft.rng = afterRoll
    if (!yields) {
      draft.overtures = overturesOf(draft).filter((one) => one.id !== id)
      notice(
        draft,
        `${kingdomName(draft.base, from)} не уступил и уехал: вернутся не раньше чем через ${OVERTURE.returnDays} сут. (${Math.round(chance * 100)} из ста)`,
        'world',
      )
      return close(draft)
    }
    // Уступка: просят меньше и ждут дольше.
    draft.overtures = overturesOf(draft).map((one) =>
      one.id === id
        ? {
            ...one,
            silver: Math.round(one.silver * (1 - OVERTURE.counterEase)),
            untilDay: one.untilDay + 20,
            says: `${one.says} Уступили: теперь ${Math.round(one.silver * (1 - OVERTURE.counterEase))}.`,
          }
        : one,
    )
    notice(
      draft,
      `${kingdomName(draft.base, from)} уступил: просят на треть меньше. (${Math.round(chance * 100)} из ста)`,
      'world',
    )
    return close(draft)
  }

  // Согласие: то, о чём говорили, ложится в мир.
  draft.overtures = overturesOf(draft).filter((one) => one.id !== id)
  if (overture.kind === 'alliance' || overture.kind === 'marriage') {
    draft.politics = {
      ...draft.politics,
      alliances: [
        ...draft.politics.alliances.filter(
          (one) => !((one.a === PLAYER && one.b === from) || (one.a === from && one.b === PLAYER)),
        ),
        { a: PLAYER, b: from, since: day, byMarriage: overture.kind === 'marriage' },
      ],
    }
    draft.politics = withRelation(draft.politics, PLAYER, from, 15)
  }
  if (overture.kind === 'tribute' || overture.kind === 'threat') {
    draft.politics = {
      ...draft.politics,
      tributes: [
        ...draft.politics.tributes.filter((one) => !(one.from === PLAYER && one.to === from)),
        {
          from: PLAYER,
          to: from,
          perDay: Math.max(1, Math.round(overture.silver / 60)),
          untilDay: day + 1800,
        },
      ],
    }
  }
  if (overture.kind === 'passage') addMoney(draft, overture.silver)
  if (overture.kind === 'join') {
    const about = overture.aboutId
    if (about && about !== PLAYER && !atWar(draft.politics, PLAYER, about)) {
      draft.politics = {
        ...draft.politics,
        wars: [
          ...draft.politics.wars,
          { a: PLAYER, b: about, since: day, reason: `союзная война с ${from}` },
        ],
      }
    }
  }
  // Всякое согласие — это обещание с обеих сторон (Ди3 и Ди4).
  draft.pledges = [
    ...pledgesOf(draft),
    { kingdomId: from, kind: overture.kind, sinceDay: day, untilDay: day + 365, kept: null },
  ]
  notice(draft, `${kingdomName(draft.base, from)}: ${def.label} принят. ${def.gives}.`, 'world')
  return close(draft)
}

/**
 * Сутки чужой дипломатии (этап 91).
 *
 * Короны приезжают сами, ждут ответа сорок пять суток и уезжают; данное слово
 * проверяется временем — союзник, не пришедший на зов, ломает своё имя, и это
 * видно всем (Ди3 и Ди4). Против выросшего сходятся сами (Ди5).
 */
function tickOvertures(draft: Draft, days: number): void {
  if (days <= 0) return
  const day = dayOf(draft.time)
  // Посольства — дело не ежедневное: их считают раз в полмесяца. Считать
  // чужие партии каждые сутки незачем и дорого (бюджет: сутки ≤ 6 мс).
  if (day % OVERTURE_BEAT !== 0 && overturesOf(draft).length === 0) return
  // Приехавшие: одно предложение от короны за сезон, без броска.
  const standing = overturesOf(draft).filter((one) => one.untilDay >= day)
  const known = new Set(standing.map((one) => one.id))
  const arrived: Overture[] = []
  for (const one of overturesToday(draft.base, draft.base.world, day)) {
    if (known.has(one.id)) continue
    arrived.push(one)
    notice(draft, `Посол: ${one.says}`, 'world')
  }
  const left = overturesOf(draft).filter((one) => one.untilDay < day)
  for (const one of left) {
    notice(draft, `${kingdomName(draft.base, one.fromKingdom)}: ${OVERTURE_WORDS.left}`, 'world')
  }
  draft.overtures = [...standing, ...arrived]

  // Слово проверяется временем: союзник, который не воюет твоей войной,
  // обещания не сдержал.
  const rows = pledgesOf(draft)
  if (rows.length > 0) {
    draft.pledges = rows.map((pledge) => {
      if (pledge.kept !== null || pledge.untilDay > day) return pledge
      const helped =
        pledge.kind === 'alliance' || pledge.kind === 'join'
          ? draft.politics.wars.some(
              (war) =>
                (war.a === pledge.kingdomId || war.b === pledge.kingdomId) &&
                warsOf(draft.politics, PLAYER).length > 0,
            )
          : allied(draft.politics, PLAYER, pledge.kingdomId)
      if (!helped) {
        notice(
          draft,
          `${kingdomName(draft.base, pledge.kingdomId)} слова не сдержал: ${overtureDef(pledge.kind).label} остался словами.`,
          'world',
        )
      }
      return { ...pledge, kept: helped }
    })
  }

  // Против выросшего сходятся сами (Ди5): раз в год об этом говорят вслух.
  if (day % 180 === 0) {
    const coalition = coalitionAgainst(draft.base, draft.base.world, day)
    if (coalition.giant === PLAYER && coalition.members.length > 1) {
      notice(draft, `О тебе говорят в чужих столицах: ${coalition.says}`, 'world')
    }
  }
}

/**
 * Созвать съезд корон (этап 83, Е1 и Е2).
 *
 * Вопрос берётся из мира, а не из головы: кончить войны, поделить выморочную
 * землю, назвать общего врага, договориться о дорогах или о вере. Съезд стоит
 * дорого и собирается сорок суток — за это время голоса можно ещё купить.
 */
function callCongress(state: GameState, question: CongressQuestion, about?: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Съезд собирает держава, а не человек.')
  if (state.congress) return fail('invalid', 'Один съезд уже созван: дождись его.')
  const day = dayOf(state.time)
  const asked = congressQuestions(state, state.world, day).find((one) => one.question === question)
  if (!asked) return fail('requirements', 'Об этом сейчас съезд не собирают: нет повода.')
  const plan = congressPlan(state, state.world, day)
  if (plan.guests.length === 0)
    return fail('requirements', 'Ехать к тебе некому: тебя не признают.')
  if (state.character.money < plan.cost) {
    return fail('noMoney', `Стол, кров и дары обойдутся в ${plan.cost}.`)
  }

  const draft = open(state)
  addMoney(draft, -plan.cost)
  draft.congress = {
    question,
    calledDay: day,
    meetDay: day + CONGRESS_COST.days,
    guests: plan.guests,
    absent: plan.absent,
    bribes: {},
    ...((about ?? asked.about) ? { about: about ?? asked.about } : {}),
  }
  advance(draft, hours(8))
  notice(
    draft,
    `Съезд созван: ${questionDef(question).label}. Едут ${plan.guests.length}, не едут ${plan.absent.length}. Собираются через ${CONGRESS_COST.days} суток.`,
    'world',
  )
  return close(draft)
}

/**
 * Купить голос (этап 83, Е3).
 *
 * Голос того, кто и так за, стоит дешевле; голос того, кто против, — вдвое. Это
 * и есть торг: съезд решает не правда, а то, сколько у тебя серебра и терпения.
 */
function buyVote(state: GameState, kingdomId: string): CommandResult {
  const congress = state.congress
  if (!congress) return fail('invalid', 'Съезд не созван.')
  if (!congress.guests.includes(kingdomId)) return fail('invalid', 'Он и так не едет.')
  if (congress.bribes[kingdomId]) return fail('invalid', 'Этому уже уплачено.')
  const day = dayOf(state.time)
  const lean = voteOf(state, state.world, kingdomId, congress.question, congress.about, day)
  const price = votePrice(state, state.world, kingdomId, lean)
  if (state.character.money < price) return fail('noMoney', `Его голос стоит ${price}.`)

  const draft = open(state)
  addMoney(draft, -price)
  draft.congress = {
    ...congress,
    bribes: { ...congress.bribes, [kingdomId]: price },
  }
  advance(draft, hours(4))
  notice(
    draft,
    `${kingdomName(state, kingdomId)}: за голос уплачено ${price}. ${lean > 0 ? 'Он и так был за.' : 'Он был против.'}`,
    'world',
  )
  return close(draft)
}

/**
 * Завести соглядатая (этап 82, С1).
 *
 * Человек при дворе видит больше и стоит дороже; человек на торгу дешевле и
 * незаметнее. Оба со временем видят больше — и со временем их вернее берут: это
 * одна и та же причина.
 */
function plantSpy(state: GameState, kingdomId: string, seat: SpySeat): CommandResult {
  if (!state.realm) return fail('requirements', 'Своих людей держит держава.')
  if (!state.world.kingdoms[kingdomId]) return fail('unknownAction', 'Такой короны нет.')
  if (spyIn(state, kingdomId)) return fail('invalid', 'Там уже сидит твой человек.')
  const cost = spyCost(seat)
  if (state.character.money < cost) return fail('noMoney', `Такого человека надо завести: ${cost}.`)

  const draft = open(state)
  addMoney(draft, -cost)
  const day = dayOf(draft.time)
  draft.spies = [
    ...spiesOf(draft),
    { id: `spy:${kingdomId}:${day}`, kingdomId, seat, sinceDay: day },
  ]
  advance(draft, hours(6))
  notice(
    draft,
    `Свой человек ${seatDef(seat).label} ${kingdomName(state, kingdomId)}: ${cost} вперёд и ${seatDef(seat).wage} в сутки.`,
    'world',
  )
  return close(draft)
}

/** Отозвать: пока он не попался, его можно вернуть. */
function recallSpy(state: GameState, kingdomId: string): CommandResult {
  const spy = spyIn(state, kingdomId)
  if (!spy) return fail('invalid', 'Там твоих людей нет.')
  const draft = open(state)
  draft.spies = spiesOf(draft).filter((one) => one.id !== spy.id)
  advance(draft, hours(2))
  notice(draft, `Твой человек из ${kingdomName(state, kingdomId)} отозван.`, 'world')
  return close(draft)
}

/**
 * Купить чужого советника (этап 82, С3).
 *
 * Цена считается от того, чего стоит его земля, и от того, насколько он верен:
 * ропщущий продаётся вдвое дешевле верного. Купленный полгода говорит тебе то,
 * что знает, — а верность его к своей короне падает.
 */
function bribeAdvisor(state: GameState, kingdomId: string, lordId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Советников покупает держава.')
  const day = dayOf(state.time)
  const target = bribeTargets(state, state.world, kingdomId, day).find((one) => one.id === lordId)
  if (!target) return fail('invalid', 'Этого человека не купишь.')
  if (state.character.money < target.price) {
    return fail('noMoney', `Он берёт ${target.price}, а у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -target.price)
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((one) =>
      one.id === lordId ? { ...one, loyalty: Math.max(0, one.loyalty - 18) } : one,
    ),
  }
  // Купленный — это глаза при дворе, пусть и на срок: заводим его как своего.
  if (!spyIn(draft, kingdomId)) {
    draft.spies = [
      ...spiesOf(draft),
      { id: `spy:куплен:${lordId}:${day}`, kingdomId, seat: 'court', sinceDay: day },
    ]
  }
  draft.lordDeeds = withLordDeed(draft.lordDeeds, lordId, 'gifted')
  advance(draft, hours(8))
  notice(draft, `${target.name} взял ${target.price}. «${target.says}»`, 'world')
  return close(draft)
}

/**
 * Пустить слух против соседа (этап 82, С6).
 *
 * Молва (этап 68) работает и на державу: слух портит чужое имя у всех прочих
 * корон сразу. Дорого, медленно и без обратного хода: своё имя от этого тоже не
 * выигрывает.
 */
function spreadRumour(state: GameState, kingdomId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Слухи пускает держава.')
  if (!state.world.kingdoms[kingdomId]) return fail('unknownAction', 'Такой короны нет.')
  if ((state.rumours ?? []).some((one) => one.against === kingdomId)) {
    return fail('invalid', 'Этот слух уже пущен и ещё ходит.')
  }
  if (state.character.money < RUMOUR.cost) return fail('noMoney', `Нужно ${RUMOUR.cost}.`)

  const draft = open(state)
  addMoney(draft, -RUMOUR.cost)
  const day = dayOf(draft.time)
  draft.rumours = [...(draft.rumours ?? []), { against: kingdomId, untilDay: day + RUMOUR.days }]
  for (const id of Object.keys(state.world.kingdoms)) {
    if (id === kingdomId) continue
    draft.politics = withRelation(draft.politics, id, kingdomId, RUMOUR.spoils)
  }
  advance(draft, hours(6))
  notice(
    draft,
    `О ${kingdomName(state, kingdomId)} заговорили дурное. Слух пойдёт ${RUMOUR.days} суток.`,
    'world',
  )
  return close(draft)
}

/**
 * Заявить право на чужой трон (этап 81, Р4).
 *
 * Родство само по себе прав не даёт: правом оно становится там, где корона
 * осталась без наследника. Тогда женатый на её дочери говорит первым, а дальняя
 * родня — второй, и спор этот решается не грамотой.
 */
function claimThrone(state: GameState, kingdomId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Право на трон заявляет держава.')
  const day = dayOf(state.time)
  const claim = bloodClaims(state, day).find((one) => one.kingdomId === kingdomId)
  if (!claim) {
    return fail(
      'requirements',
      childless(state.world, kingdomId, day)
        ? 'Тебе не на что сослаться: с этим домом ты не в родстве.'
        : 'У этой короны есть наследник: право говорить не твоё.',
    )
  }
  const capital = state.world.kingdoms[kingdomId]?.capitalId
  const provinceId = capital ? state.world.locations[capital]?.provinceId : undefined
  if (!provinceId) return fail('invalid', 'Непонятно, о какой земле речь.')

  const draft = open(state)
  draft.claims = [
    ...claimsOf(draft),
    { provinceId, against: kingdomId, kind: 'inherit', sinceDay: day },
  ]
  draft.politics = withRelation(draft.politics, PLAYER, kingdomId, -18)
  // Прочие короны это слышат: право на трон — дело всех домов сразу.
  for (const id of Object.keys(state.world.kingdoms)) {
    if (id === kingdomId) continue
    draft.politics = withRelation(draft.politics, PLAYER, id, -4)
  }
  advance(draft, hours(6))
  notice(draft, `Право на престол ${kingdomName(state, kingdomId)} заявлено. ${claim.why}`, 'world')
  return close(draft)
}

/**
 * Порвать договор (этап 80, Г3).
 *
 * Разрыв стоит не только отношения с той стороной: слово держат или не держат,
 * и это видят все. Свидетель делает разрыв дороже — за то его и зовут.
 */
function breakTreaty(state: GameState, treatyId: string): CommandResult {
  const day = dayOf(state.time)
  const treaty = liveTreaties(state, day).find((one) => one.id === treatyId)
  if (!treaty) return fail('invalid', 'Такого договора нет или он уже не в силе.')
  const other = treaty.a === PLAYER ? treaty.b : treaty.a
  const cost = breachCost(treaty)

  const draft = open(state)
  draft.treaties = treatiesOf(draft).map((one) =>
    one.id === treatyId ? { ...one, brokenBy: PLAYER } : one,
  )
  draft.politics = withRelation(draft.politics, PLAYER, other, cost.other)
  // Помазаннику слово дороже (этап 134, Вр4): порванная грамота стоит вдвое.
  const holy = boundBy(state, state.world, 'word', day)
  const worldCost = holy ? cost.world * FAITH.wordCosts : cost.world
  for (const kingdomId of Object.keys(state.world.kingdoms)) {
    if (kingdomId === other) continue
    draft.politics = withRelation(draft.politics, PLAYER, kingdomId, worldCost)
  }
  if (holy) {
    draft.churchAnger = Math.max(0, (draft.churchAnger ?? 0) + FAITH.wordAnger)
    notice(draft, BIND_DEFS.word.says, 'world')
  }
  // Союз и дань живут не только на бумаге: порвал — значит порвал и их.
  if (treaty.kind === 'alliance') {
    draft.politics = {
      ...draft.politics,
      alliances: draft.politics.alliances.filter(
        (one) => !((one.a === PLAYER && one.b === other) || (one.b === PLAYER && one.a === other)),
      ),
    }
  }
  if (treaty.kind === 'tribute') {
    draft.politics = {
      ...draft.politics,
      tributes: draft.politics.tributes.filter((one) => !(one.from === other && one.to === PLAYER)),
    }
  }
  if (treaty.guarantor) {
    // Свидетель наказывает нарушителя: за это ему и платили.
    draft.politics = withRelation(draft.politics, PLAYER, treaty.guarantor, cost.other)
    notice(
      draft,
      `${kingdomName(state, treaty.guarantor)} был свидетелем этой грамоты и не забудет, чем ты кончил.`,
      'world',
    )
  }
  shameOn(draft, 'broke')
  advance(draft, hours(2))
  notice(
    draft,
    `${treatyDef(treaty.kind).label} с ${kingdomName(state, other)} порван. Об этом узнают все.`,
    'world',
  )
  return close(draft)
}

/**
 * Посольства возвращаются (этап 79, П1).
 *
 * Ответ считается в день возвращения, а не в день отправки: пока твой человек
 * был в дороге, чужая корона жила своей жизнью, и её замысел мог стать другим.
 * Бросок здесь один и на многое не влияет — почти всё решают вес посольства и
 * то, чего эта корона хочет сама.
 */
function returnEmbassies(draft: Draft): void {
  const day = dayOf(draft.time)
  const back = embassiesOf(draft).filter((one) => one.backDay <= day)
  if (back.length === 0) return
  draft.embassies = embassiesOf(draft).filter((one) => one.backDay > day)
  for (const embassy of back) {
    const def = embassyDef(embassy.errand)
    const envoy = envoyChoices(draft.base, day).find((one) => one.id === embassy.envoyId) ?? null
    const weight = embassyWeight(
      draft.base,
      draft.base.world,
      embassy.to,
      embassy.errand,
      envoy,
      embassy.byLetter,
      day,
    )
    const [roll, afterRoll] = nextFloat(draft.rng)
    draft.rng = afterRoll
    const yes = weight + roll * 0.25 >= 0.5
    const name = kingdomName(draft.base, embassy.to)
    // Посол привозит не только ответ: он привозит картину чужого двора — свою
    // (этап 114, Пс1 и Пс2). Письмо не привозит ничего: у письма нет глаз.
    if (!embassy.byLetter) {
      const sight = envoySight(draft.base, draft.world, embassy.to, envoy, day)
      const brought = envoyWords(sight, embassy.to, day, embassy.id)
      draft.words = withSightings(draft.words, brought)
      draft.envoyLog = {
        ...draft.envoyLog,
        sent: draft.envoyLog.sent + 1,
        brought: draft.envoyLog.brought + brought.length,
        offSum: draft.envoyLog.offSum + Math.abs(sight.off) * brought.length,
      }
      notice(
        draft,
        `${sight.says} Говорит: сила ${sight.strength}, казна около ${sight.purse}${sight.aim === 'unclear' ? '; замысла не разобрал' : `, замысел — ${sight.aim}`}.`,
        'world',
      )
    }
    if (!yes) {
      draft.politics = withRelation(draft.politics, PLAYER, embassy.to, def.chills)
      notice(
        draft,
        `${embassy.byLetter ? 'Ответ из' : `${embassy.envoyName} вернулся из`} ${name}: отказ (${def.label}). Ближе всего было на ${Math.round(weight * 100)} из ста.`,
        'world',
      )
      continue
    }
    draft.politics = withRelation(draft.politics, PLAYER, embassy.to, def.warms)
    applyEmbassy(draft, embassy, day)
    notice(
      draft,
      `${embassy.byLetter ? 'Ответ из' : `${embassy.envoyName} вернулся из`} ${name}: согласие (${def.label}).`,
      'world',
    )
  }
}

/** Что даёт удавшееся посольство: каждому делу своё. */
function applyEmbassy(draft: Draft, embassy: Embassy, day: number): void {
  const to = embassy.to
  // Согласие ложится на бумагу (этап 80): у договора есть вид, срок, свидетель
  // и то, о чём договорились не вслух.
  const kind = treatyKindOf(embassy.errand)
  if (kind) {
    const def = treatyDef(kind)
    const treaty: Treaty = {
      id: `treaty:${to}:${day}`,
      a: PLAYER,
      b: to,
      kind,
      sinceDay: day,
      untilDay: def.days === 0 ? 0 : day + def.days,
      ...(kind === 'tribute' ? { perDay: 6 } : {}),
      ...(embassy.guarantor ? { guarantor: embassy.guarantor } : {}),
      ...(embassy.secret && def.secret ? { secret: { id: embassy.secret } } : {}),
    }
    draft.treaties = [
      ...treatiesOf(draft).filter(
        (one) =>
          !(one.kind === kind && (one.a === to || one.b === to) && one.brokenBy === undefined),
      ),
      treaty,
    ]
    if (treaty.secret) {
      draft.secretLog = { ...draft.secretLog, made: draft.secretLog.made + 1 }
      const keepers = keepersOf(draft.base, treaty, day)
      notice(
        draft,
        `${SECRET_WORDS.keepers} О тайной статье знают ${keepers.length}: ${keepers.map((one) => one.name).join(', ')}. Молчание можно купить.`,
        'world',
      )
    }
    if (embassy.guarantor) {
      draft.politics = withRelation(draft.politics, PLAYER, embassy.guarantor, 6)
    }
  }
  if (embassy.errand === 'marriage') {
    // Сватовство кончается приданым (этап 81, Р2): за невесту платят, и цена
    // считается от того, чего она стоит, — по земле её короны.
    const equal = recognitionOf(draft.base, to, day).standing === 'equal'
    // За непризнанного отдают хуже и просят больше (этап 138, Пр4).
    const dowry = Math.round(
      dowryFor(draft.base, to, day, equal) *
        strangerCost(draft.base, draft.world, day).times *
        firstPays(draft.base, draft.world, day).times,
    )
    const house = royalHouse(draft.base.world, to, day)
    if (draft.character.money < dowry) {
      notice(
        draft,
        `Сватовство расстроилось: за невесту просят ${dowry}, а в казне ${draft.character.money}.`,
        'world',
      )
      return
    }
    addMoney(draft, -dowry)
    draft.marriages = [
      ...marriagesOf(draft).filter((one) => one.kingdomId !== to),
      {
        kingdomId: to,
        who: draft.character.family.spouse ? 'child' : 'self',
        name: house.heir?.name ?? house.spouse ?? house.name,
        sinceDay: day,
        dowry,
      },
    ]
    notice(draft, `Приданое ${dowry} уплачено. Дома породнились.`, 'world')
  }
  if (embassy.errand === 'alliance' || embassy.errand === 'marriage') {
    draft.politics = {
      ...draft.politics,
      alliances: [
        ...draft.politics.alliances.filter(
          (one) => !((one.a === PLAYER && one.b === to) || (one.b === PLAYER && one.a === to)),
        ),
        { a: PLAYER, b: to, since: day, byMarriage: embassy.errand === 'marriage' },
      ],
    }
    return
  }
  if (embassy.errand === 'tribute' || embassy.errand === 'threat') {
    draft.politics = {
      ...draft.politics,
      tributes: [
        ...draft.politics.tributes.filter((one) => !(one.from === to && one.to === PLAYER)),
        { from: to, to: PLAYER, perDay: 6, untilDay: day + 360 },
      ],
    }
    return
  }
  if (embassy.errand === 'mediation') {
    // Помирить чужих: война кончается, а имя остаётся за тобой.
    const war = draft.politics.wars.find((one) => one.a === to || one.b === to)
    if (war) {
      draft.politics = {
        ...draft.politics,
        wars: draft.politics.wars.filter((one) => one !== war),
      }
      draft.renown += 2
      notice(
        draft,
        `Война ${kingdomName(draft.base, war.a)} и ${kingdomName(draft.base, war.b)} кончена твоим словом.`,
        'war',
      )
    }
    return
  }
  if (embassy.errand === 'ransom') {
    // Выкуп своего: пленный возвращается к тебе, деньги уже отданы.
    const captive = draft.companions.find((one) => one.captive)
    if (captive) {
      draft.companions = draft.companions.map((one) =>
        one.id === captive.id ? { ...one, captive: false } : one,
      )
      notice(draft, `${captive.name} выкуплен и снова с тобой.`, 'people')
    }
    return
  }
  // Проход: право провести войско — пока это доброе слово и открытая дорога.
  draft.politics = withRelation(draft.politics, PLAYER, to, 4)
}

function tickTreasury(draft: Draft, days: number): void {
  const day = dayOf(draft.time)

  // 1. Долги растут, и заимодавцы помнят, когда им платили в последний раз.
  if (debtsOf(draft).length > 0) {
    draft.debts = debtsOf(draft).map((debt) => ({
      ...debt,
      owed: debt.owed * (1 + lenderDef(debt.lender).rate) ** days,
    }))
    for (const debt of debtsOf(draft)) {
      if (!lenderAngry(debt, day)) continue
      if ((day - debt.paidDay) % 30 !== 0) continue
      notice(draft, `${lenderDef(debt.lender).label}: «${lenderDef(debt.lender).angry}»`, 'money')
    }
  }

  // 2. Очередь строек державы: казна платит, сколько может, и первой — первую.
  const queue = queueOf(draft)
  if (queue.length > 0) {
    const first = queue[0]
    if (first) {
      const settlement = draft.settlements[first.locationId]
      const price = worksPrice(first.building)
      const canPay = Math.min(
        draft.character.money,
        Math.ceil(price / 20) * days,
        price - first.paid,
      )
      if (!settlement || settlement.buildings.includes(first.building)) {
        draft.queue = queue.slice(1)
      } else if (canPay > 0) {
        addMoney(draft, -canPay)
        const paid = first.paid + canPay
        if (paid >= price) {
          draft.settlements = {
            ...draft.settlements,
            [first.locationId]: {
              ...settlement,
              buildings: [...settlement.buildings, first.building],
            },
          }
          draft.queue = queue.slice(1)
          const name = draft.base.world.locations[first.locationId]?.name ?? 'место'
          notice(
            draft,
            `Стройка державы кончена: ${BUILDINGS[first.building].label.toLowerCase()} в ${name}.`,
            'world',
          )
        } else {
          draft.queue = [{ ...first, paid }, ...queue.slice(1)]
        }
      }
    }
  }

  // 3. Пустая казна (К6): гарнизону не платят — гарнизон расходится, и место
  //    это видит. Разорение державы должно быть видно в мире, а не в числе.
  const sheet = ledger(draft.base, draft.base.world, day)
  if (draft.character.money > 0 || sheet.garrison <= 0) return
  const places = { ...draft.settlements }
  let melted = 0
  for (const settlement of holdingsOf(places, PLAYER)) {
    const size = garrisonSize(settlement)
    if (size <= 0) continue
    const gone = Math.max(1, Math.round(size * EMPTY_PURSE.garrisonMelt * days))
    const garrison: Record<string, number> = { ...settlement.garrison }
    let left = gone
    for (const troop of Object.keys(garrison) as TroopId[]) {
      const had = garrison[troop] ?? 0
      const takes = Math.min(had, left)
      garrison[troop] = had - takes
      left -= takes
      if (left <= 0) break
    }
    places[settlement.locationId] = { ...settlement, garrison }
    draft.reputation = withPlaceRep(
      draft.reputation,
      settlement.locationId,
      EMPTY_PURSE.placeMood * days,
    )
    melted += gone - left
  }
  if (melted > 0) {
    draft.settlements = places
    notice(draft, `Жалованье не плачено: гарнизоны потеряли ${melted} человек.`, 'war')
  }
}

function realmLife(draft: Draft, days: number): void {
  const mine = holdingsOf(draft.settlements, PLAYER)
  if (mine.length === 0 || days <= 0) return
  const day = dayOf(draft.time)
  for (const settlement of mine) {
    const shift = realmMood(draft.base, settlement, day) * days
    if (shift === 0) continue
    draft.reputation = withPlaceRep(draft.reputation, settlement.locationId, shift)
  }
  // Год державы: итог подводится в тот же день, что и жатва.
  const year = Math.floor(day / DAYS_PER_YEAR)
  if (year === Math.floor((day - days) / DAYS_PER_YEAR)) return
  const report = realmYear(draft.base, day)
  const grumble =
    report.unhappy.length > 0 ? ` Недовольны: ${report.unhappy.slice(0, 3).join(', ')}.` : ''
  notice(
    draft,
    `Год державы: приход ${report.income}, расход ${report.spent}. ${report.says}${grumble}`,
    'world',
  )
}

function returnOfficers(draft: Draft): void {
  const day = dayOf(draft.time)
  const offices = { ...draft.offices }
  let changed = false
  for (const [officeId, seat] of Object.entries(offices) as [OfficeId, Appointment][]) {
    if (!seat.errand || seat.errand.untilDay > day) continue
    const errand = officeErrandDef(seat.errand.id)
    const officer = officerAt(draft.base, officeId)
    const skill = officer ? Math.max(0, Math.min(1, officer.skill / 8)) : 0
    offices[officeId] = { holderId: seat.holderId, kind: seat.kind, sinceDay: seat.sinceDay }
    changed = true
    if (!errand) continue
    const name = officer?.name ?? 'Твой человек'
    if (errand.id === 'arrears') {
      // Берёт он не подать заново, а то, что не довезли: недоимку за те дни,
      // что был в дороге. Где недоимок нет, привезёт малость — и на том спасибо.
      const mine = holdingsOf(draft.settlements, PLAYER)
      const owed = mine.reduce(
        (sum, one) =>
          sum +
          dailyTax(one, foodSecurity(one)) *
            (0.1 + (1 - arrearsFactor(draft.base, one.locationId, day))),
        0,
      )
      const taken = Math.round(owed * errand.days * (0.4 + skill))
      addMoney(draft, taken)
      for (const one of mine) {
        draft.reputation = withPlaceRep(draft.reputation, one.locationId, -3)
      }
      notice(draft, `${name} вернулся с недоимками: ${taken}. Места это запомнили.`, 'money')
      continue
    }
    if (errand.id === 'levy') {
      const men = Math.round(
        vassalsOf(draft.base).reduce((sum, lord) => sum + lord.strength * 0.15, 0) * (0.5 + skill),
      )
      if (men > 0) {
        draft.party = {
          ...draft.party,
          units: { ...draft.party.units, militia: (draft.party.units.militia ?? 0) + men },
        }
      }
      notice(draft, `${name} привёл ${men} человек с вассальных земель.`, 'war')
      continue
    }
    if (errand.id === 'message') {
      const neighbour = Object.keys(draft.base.world.kingdoms)[0]
      if (neighbour) {
        draft.politics = withRelation(draft.politics, PLAYER, neighbour, Math.round(6 + skill * 10))
        const kingdom = draft.base.world.kingdoms[neighbour]?.name ?? 'сосед'
        notice(draft, `${name} вернулся от ${kingdom}: слово принято.`, 'world')
      }
      continue
    }
    if (errand.id === 'bandits') {
      const mine = holdingsOf(draft.settlements, PLAYER)
      const places = { ...draft.settlements }
      for (const one of mine) {
        places[one.locationId] = {
          ...one,
          banditry: Math.max(0, one.banditry - (0.1 + skill * 0.25)),
        }
      }
      draft.settlements = places
      notice(draft, `${name} вернулся: на твоих дорогах стало тише.`, 'war')
    }
  }
  if (changed) draft.offices = offices
}

function tickVassals(draft: Draft, days: number): void {
  const vassals = vassalsOf(draft.base)
  if (vassals.length === 0 || days <= 0) return
  const day = dayOf(draft.time)
  const moved = new Map<string, number>()
  // Канцлер успокаивает, разлад при дворе слышен всем (этап 75, Д1 и Д4).
  const court = chancellorCalm(draft.base, day) + courtPressure(draft.base, day)
  for (const lord of vassals) {
    const drift =
      loyaltyDrift(draft.base, draft.base.world, lord, oathOf(draft, lord.id), day) + court
    if (drift !== 0) moved.set(lord.id, drift * days)
  }
  if (moved.size === 0) return
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((lord) => {
      const shift = moved.get(lord.id)
      if (shift === undefined) return lord
      return { ...lord, loyalty: Math.max(0, Math.min(100, lord.loyalty + shift)) }
    }),
  }
}

function payUpkeep(draft: Draft, days: number): void {
  collectHoldings(draft, days)
  paySailors(draft, days)
  // Отряд болеет от того, где он есть (этап 64, Ж5).
  sicken(draft, days)
  // Год как жизнь (этап 67): годовщины и ярмарочные воры — тоже сутки мира.
  markAnniversaries(draft)
  pickpockets(draft)
  payDues(draft)
  payCech(draft)
  advanceWishes(draft, 1)
  quarrel(draft, 1)
  tickStudent(draft, 1)
  // Новый день — новое терпение: вчерашние разговоры не в счёт (этап 53).
  draft.talked = {}
  if (partySize(draft.party) === 0) return

  let unpaid = 0
  let unfed = 0
  let deserted = 0

  for (let day = 0; day < days; day += 1) {
    if (partySize(draft.party) === 0) break
    const wages = dailyWages(draft.party)
    const paid = draft.character.money >= wages
    if (paid) addMoney(draft, -wages)
    else unpaid += 1

    const needed = dailyFood(draft.party)
    const fed = eatFromStores(draft, needed)
    if (!fed) unfed += 1

    const morale = paid && fed ? draft.party.morale + 2 : draft.party.morale - 12
    draft.party = {
      ...draft.party,
      morale: Math.min(100, Math.max(0, morale)),
      hungryDays: paid && fed ? 0 : draft.party.hungryDays + 1,
    }

    if (draft.party.morale < DESERTION_MORALE) {
      const size = partySize(draft.party)
      const leaving = Math.max(1, Math.round(size * 0.08))
      deserted += desert(draft, leaving)
    }
  }

  if (unpaid > 0) notice(draft, `Жалованье не плачено ${unpaid} сут. — люди ропщут.`)
  if (unfed > 0) notice(draft, `Отряд голодал ${unfed} сут.`)
  // Спутники видят и то, как ты держишь людей: исправная плата за неделю —
  // повод для доброго слова, голод — для худого.
  if (unfed > 0) {
    seeDeed(draft, 'starve')
    // Свои голодали при твоих деньгах — такое помнят как позор.
    if (draft.character.money > 100) shameOn(draft, 'starved')
  } else if (unpaid === 0 && days >= 7) seeDeed(draft, 'payWell')
  if (deserted > 0) notice(draft, `Ушло по-тихому: ${deserted}.`)
}

/**
 * Своя земля за сутки: подати приходят, гарнизон ест и получает жалованье.
 *
 * Разорённая и голодная земля приносит меньше, чем стоит её держать, — и это
 * правильно: владение должно быть решением, а не бесплатной прибавкой.
 */
function collectHoldings(draft: Draft, days: number): void {
  const mine = holdingsOf(draft.settlements, PLAYER)
  if (mine.length === 0 && vassalsOf(draft.base).length === 0) return

  let income = 0
  let wages = 0
  const settlements = { ...draft.settlements }
  let thieved = 0
  let thievedAt: string | null = null

  const day = dayOf(draft.time)
  const law = lawOf(draft)
  for (const settlement of mine) {
    // Подать по закону, по недоимке и по честности управляющего (этап 61).
    const base = dailyTax(settlement, foodSecurity(settlement)) * days
    // Сенешаль смотрит за управляющими (этап 75, Д1): при хорошем ворують вдвое
    // меньше, при негодном — как и прежде.
    const skim = skimOf(draft.base, settlement.locationId, day) * skimGuard(draft.base, day)
    // Грамота меняет не закон, а то, что ты берёшь с этого места (этап 76, З4).
    const collected =
      base *
      takeAt(draft.base, settlement.locationId, day) *
      arrearsFactor(draft.base, settlement.locationId, day)
    const stolen = collected * skim
    if (stolen >= 1) {
      thieved += stolen
      thievedAt = settlement.locationId
    }
    income += collected - stolen
    wages += garrisonWages(settlement) * days
    // Работникам построек тоже платят: мельница без мельника — сарай.
    wages += worksWages(settlement, brokenAt(draft, settlement.locationId)) * days

    // Гарнизон ест местный хлеб: он же его и защищает.
    const eaten = Math.min(
      settlement.stock.grain,
      garrisonSize(settlement) * TROOP_FOOD_PER_DAY * days,
    )
    if (eaten > 0) {
      settlements[settlement.locationId] = {
        ...settlement,
        stock: { ...settlement.stock, grain: settlement.stock.grain - eaten },
      }
    }
  }

  // Дорога — тоже хозяйство: застава в своей провинции берёт с проезжих, и
  // берёт по тому обычаю, который ты поставил (этап 61, В3).
  const tolls = dailyTolls(draft.base.world, settlements, PLAYER) * days * tollTake(law)

  // Вассал платит с пожалованной земли долю — ту, о которой договорились
  // (этап 74, В2): у служилого она нулевая, у податного больше трети нет.
  let tribute = 0
  for (const vassal of vassalsOf(draft.base)) {
    const oath = oathOf(draft, vassal.id)
    const share = oath ? shareOf(oath) : VASSAL_SHARE
    if (share <= 0) continue
    for (const held of holdingsOf(draft.settlements, vassal.id)) {
      tribute += dailyTax(held, foodSecurity(held)) * share * days
    }
  }
  income += tribute

  draft.settlements = settlements
  // Казначей ведёт счёт (этап 75): при нём приход больше. Двор ест жалованье
  // каждый день, занята должность делом или нет.
  income *= treasuryBonus(draft.base, day)
  wages += courtWages(draft.base) * days
  const net = Math.round(income + tolls - wages)
  if (net !== 0) addMoney(draft, net)
  if (net < 0) notice(draft, `Земля не окупает гарнизон: ушло ${Math.abs(net)}.`)
  else if (net > 0) {
    notice(draft, tolls > 0 ? `Подати и пошлины: ${net}.` : `Подати с владений: ${net}.`)
  }
  // Вор виден по казне, а не по описанию (этап 61, В1): счёт не сходится, и
  // сходиться он не начнёт, пока ты не приедешь или не сменишь человека.
  if (thieved >= 1 && thievedAt) {
    const seneschal = seneschalOf(thievedAt)
    const where = draft.base.world.locations[thievedAt]?.name ?? 'владении'
    notice(
      draft,
      `Счёт по ${where} не сходится на ${Math.round(thieved)}. ${seneschal.name} разводит руками.`,
      'money',
    )
  }
  estateLife(draft, mine, days, day, law)
}

/**
 * Сутки своей земли (этап 61).
 *
 * Закон ложится в память мест, суд правит разбой, набор восполняет рекрутов,
 * постройки ломаются, а просьбы, оставленные без ответа, превращаются в обиду.
 * Всё это — по суткам и без игрока: земля живёт, пока хозяин в отъезде.
 */
function estateLife(
  draft: Draft,
  mine: readonly Settlement[],
  days: number,
  day: number,
  law: Law,
): void {
  if (mine.length === 0) return
  const mood = lawMood(law)
  const drift = lawBanditry(law) * days
  const settlements = { ...draft.settlements }
  for (const settlement of mine) {
    const id = settlement.locationId
    // Обычай хозяина помнят: тяжёлая подать и полный набор — обида по суткам,
    // малая подать и милостивый суд — доброе слово. Медленно: закон — не
    // подарок, а погода.
    if (mood !== 0) {
      // Обычай ложится в память медленно и по одному: месяц тяжёлой подати —
      // примерно десять обид. Порогом это не сделать (за сутки набегает треть
      // обиды, и она бы всякий раз округлялась в ноль), поэтому бросок: сутки
      // дают либо одну зарубку, либо ни одной.
      const step = (mood / 30) * days
      const [felt, afterRoll] = rollChance(draft.rng, Math.min(1, Math.abs(step)))
      draft.rng = afterRoll
      if (felt) {
        draft.reputation = withPlaceRep(
          draft.reputation,
          id,
          Math.sign(step) * Math.max(1, Math.floor(Math.abs(step))),
        )
      }
    }
    const current = settlements[id]
    if (!current) continue
    let next = current
    if (drift !== 0) {
      next = { ...next, banditry: Math.max(0, Math.min(1, next.banditry + drift)) }
    }
    // Набор восполняет рекрутов быстрее или не восполняет вовсе.
    const rate = levyRate(law)
    if (rate !== 1) {
      const pool = recruitPool(next.population)
      const back = (pool - next.recruits) * 0.02 * (rate - 1) * days
      next = { ...next, recruits: Math.max(0, Math.min(pool, next.recruits + back)) }
    }
    if (next !== current) settlements[id] = next

    // Постройки встают: у каждой своя вероятность и своя починка (В4).
    for (const building of current.buildings) {
      if (isBroken(draft, id, building)) continue
      const [broke, afterRoll] = rollChance(draft.rng, workDef(building).breaks * days)
      draft.rng = afterRoll
      if (!broke) continue
      draft.works = { ...draft.works, [id]: [...brokenAt(draft, id), building] }
      // Встала — значит, её нет: мир перестаёт её считать (мельница не кормит,
      // рынок не прибавляет подати), пока её не починят. Так «постройки с
      // людьми» видны не описанием, а числом.
      const standing = settlements[id]
      if (standing) {
        settlements[id] = {
          ...standing,
          buildings: standing.buildings.filter((one) => one !== building),
        }
      }
      notice(
        draft,
        `${BUILDINGS[building].label} в ${draft.base.world.locations[id]?.name ?? 'владении'} встала. Пока не починишь — её как будто нет.`,
        'world',
      )
    }

    // Просьбы: о чём просят, с какого дня и что будет, если не ответить (В2).
    const plea = pleaOf(draft.base, current, day)
    if (!plea) continue
    const asked = draft.pleas[id]
    if (asked?.askId !== plea.def.id) {
      draft.pleas = { ...draft.pleas, [id]: { askId: plea.def.id, askedDay: day } }
      if (id === draft.locationId) {
        notice(draft, `Просят: ${plea.def.asks}`, 'people')
      }
      continue
    }
    if (day - asked.askedDay < plea.def.patience) continue
    // Терпение вышло. Отказом считается молчание — и его помнят.
    draft.reputation = withPlaceRep(draft.reputation, id, plea.def.refused)
    draft.pleas = { ...draft.pleas, [id]: { askId: plea.def.id, askedDay: day } }
    notice(
      draft,
      `${draft.base.world.locations[id]?.name ?? 'Владение'}: просили о том же и не дождались. Тут это записали.`,
      'people',
    )
  }
  draft.settlements = settlements
}

/** Просроченное дело не прощают: сгорает само и портит имя. */
function expireQuests(draft: Draft): void {
  const today = dayOf(draft.time)
  const expired = draft.quests.filter((quest) => today > quest.deadlineDay)
  if (expired.length === 0) return
  for (const quest of expired) {
    draft.reputation = withPlaceRep(draft.reputation, quest.issuerLocationId, -10)
    notice(draft, 'Срок вышел: дело не сделано.')
    if (quest.merchantId) failedOrder(draft, quest.merchantId)
  }
  draft.quests = draft.quests.filter((quest) => today <= quest.deadlineDay)
}

/** Железо снашивается в бою: каждая схватка — минус состояние. */
function wearGear(draft: Draft): void {
  const equipment = { ...draft.character.equipment }
  let changed = false
  for (const slot of SLOT_IDS) {
    const worn = equipment[slot]
    if (!worn) continue
    equipment[slot] = { ...worn, condition: Math.max(0, worn.condition - 2) }
    changed = true
  }
  if (changed) patch(draft, { equipment })
}

/** Накормить отряд из поклажи. Возвращает false, если еды не хватило. */
function eatFromStores(draft: Draft, needed: number): boolean {
  let left = needed
  for (const good of EDIBLE) {
    if (left <= 0) break
    const have = draft.character.inventory[good] ?? 0
    const taken = Math.min(have, left)
    if (taken > 0) {
      addGoods(draft, good, -taken)
      left -= taken
    }
  }
  return left <= 0
}

/** Уходят первыми те, кому меньше платят: терять им нечего. */
function desert(draft: Draft, count: number): number {
  let left = count
  let gone = 0
  const order = Object.keys(draft.party.units).sort(
    (a, b) => TROOPS[a as TroopId].wage - TROOPS[b as TroopId].wage,
  )
  for (const id of order) {
    if (left <= 0) break
    const troop = id as TroopId
    const have = troopCount(draft.party, troop)
    const taken = Math.min(have, left)
    draft.party = withUnits(draft.party, troop, -taken)
    left -= taken
    gone += taken
  }
  return gone
}

function addGoods(draft: Draft, good: GoodId, delta: number): void {
  const current = draft.character.inventory[good] ?? 0
  const next = Math.max(0, current + delta)
  const inventory = { ...draft.character.inventory }
  if (next === 0) delete inventory[good]
  else inventory[good] = next
  patch(draft, { inventory })
}

function patch(draft: Draft, changes: Partial<Character>): void {
  draft.character = { ...draft.character, ...changes }
}

/**
 * Годы.
 *
 * Возраст пересчитывается на сутках, а не выводится при каждом обращении: в
 * состоянии он нужен постоянно, и лишний счёт на телефоне ни к чему. Когда
 * приходит срок, игра не кончается — её продолжает наследник, если он есть.
 */
/**
 * Раны заживают, плен кончается, пленные спутники возвращаются.
 *
 * Лекарь-спутник рядом лечит вдвое быстрее. Плен кончается сам: спросят, что
 * есть в кошеле, и отпустят. Пленный спутник возвращается сам, понемногу — за
 * него никто не платит.
 */
function healAndFree(draft: Draft, daysPassed: number): void {
  const wound = draft.character.wound
  if (wound) {
    // Кто за тобой смотрит: спутник-лекарь, дом ордена — и лекарь того места,
    // где ты лежишь (этап 64, Ж1). Уход решает не только скорость, но и то,
    // загноится ли рана.
    const healer = healerAt(draft.base.world, draft.settlements, draft.locationId)
    const companion = bestSkill(draft.companions, 'healing').level
    const orderCare = ownOrderHere(draft.base)?.perks.healing === true
    const care = Math.max(
      companion >= 3 ? 0.5 : companion * 0.1,
      orderCare ? 0.6 : 0,
      healer ? healerDef(healer.kind).clean : 0,
      potionCount(draft, 'salve') > 0 ? 0.7 : 0,
    )
    const speed = Math.max(
      1,
      companion >= 3 || orderCare ? 2 : 1,
      healer ? healerSpeed(healer) * 0.6 : 1,
    )
    // Гноение: без ухода рана идёт своим чередом, и чаще всего дурным.
    if (!wound.festering) {
      const [gone, afterRoll] = rollChance(draft.rng, festerChance(wound, care) * daysPassed)
      draft.rng = afterRoll
      if (gone) {
        const spoiled = festered(wound)
        patch(draft, { wound: spoiled })
        notice(
          draft,
          `Рана загноилась: ${woundKindDef(woundKindOf(wound)).label}, и теперь она не заживёт сама.`,
          'war',
        )
        return
      }
    }
    const healed = healWound(draft.character.wound ?? wound, daysPassed, speed)
    patch(draft, { wound: healed })
    if (!healed) {
      // Зажило — но не всегда без следа (этап 64, Ж2).
      const [maimed, afterMaim] = rollChance(draft.rng, maimChance(wound))
      draft.rng = afterMaim
      if (maimed) {
        const scar = woundKindDef(woundKindOf(wound)).scar
        draft.maims = [...draft.maims, scar]
        notice(draft, `Рана закрылась, но след остался: ${scar}.`, 'people')
      } else {
        notice(draft, 'Рана зажила. Можно вставать.', 'people')
      }
    } else if (bedridden(wound) && !bedridden(healed)) {
      notice(draft, 'Рана затягивается: с постели уже можно подняться.', 'people')
    }
  }

  const captivity = draft.character.captivity
  if (captivity) {
    const daysLeft = captivity.daysLeft - daysPassed
    if (daysLeft <= 0) {
      const taken = Math.min(draft.character.money, captivity.ransom)
      if (taken > 0) addMoney(draft, -taken)
      patch(draft, { captivity: null })
      notice(
        draft,
        taken > 0
          ? `Отпустили: с тебя взяли ${taken} и вытолкали за ворота.`
          : 'Отпустили: держать тебя дальше никому не нужно.',
        'war',
      )
    } else {
      patch(draft, { captivity: { ...captivity, daysLeft } })
    }
  }

  // Пленные спутники: три шанса из ста в сутки выбраться.
  for (let i = 0; i < daysPassed; i += 1) {
    draft.companions = draft.companions.map((companion) => {
      if (!companion.captive) return companion
      const [back, next] = rollChance(draft.rng, 0.03)
      draft.rng = next
      if (!back) return companion
      notice(draft, `${companion.name} вернулся из плена.`, 'people')
      return { ...companion, captive: false }
    })
  }
}

function growOlder(draft: Draft, daysPassed: number): void {
  if (daysPassed <= 0) return
  const day = dayOf(draft.time)
  const age = ageOf(draft.character.bornDay, day)
  const grewUp = age > draft.character.age
  if (grewUp) {
    patch(draft, { age, attributes: agedAttributes(draft.character.attributes, age) })
    if (age === PRIME_AGE + 1) notice(draft, 'Годы берут своё: тело уже не то, что было.', 'people')

    // Дети рождаются раз в год, не чаще: мир и так считает каждый день.
    const [family, afterBirth, born] = maybeBirth(draft.character.family, day, draft.rng)
    draft.rng = afterBirth
    if (born) {
      patch(draft, { family })
      const child = family.children[family.children.length - 1]
      notice(draft, `Родился ребёнок: ${child?.name ?? 'дитя'}.`, 'people')
    }

    const [dies, afterDeath] = rollChance(draft.rng, deathChance(age))
    draft.rng = afterDeath
    if (dies) succeed(draft, day)
  }
}

/**
 * Смерть и наследник.
 *
 * Наследнику достаётся имя, земля и вассалы — но не слава, не навыки отца и не
 * его поручения. Иначе смерть ничего бы не значила: продолжение за сына было бы
 * бесплатным, а пермадэт превратился бы в смену заставки.
 */
function succeed(draft: Draft, day: number): void {
  const heir = heirOf(draft.character.family, day)
  if (!heir) {
    draft.over = true
    notice(draft, `${draft.character.name} умирает, и род пресекается.`, 'people')
    return
  }
  const before = draft.character.name
  // Что станет с державой, решает закон (этап 93): считается прежде, чем имя
  // перейдёт, — по тому миру, который оставил отец.
  const realm = draft.realm ? divideRealm(draft, day) : null
  draft.character = heirCharacter(draft.character, heir, day)
  draft.renown = Math.round(draft.renown / 4)
  draft.quests = []
  // Мир считает равновесие заново — уже относительно наследника (этап 144, Нс5).
  draft.dreadLog = {}
  draft.raceLog = { ...draft.raceLog, shares: { ...draft.raceLog.shares, [PLAYER]: 0 } }
  notice(draft, HEIRS_WORDS.yours, 'world')
  draft.party = { ...draft.party, morale: Math.max(30, draft.party.morale - 20) }
  notice(
    draft,
    `${before} умирает. Имя и земли принимает ${heir.name} — славу придётся нажить заново.${realm ? ` ${realm}` : ''}`,
  )
}

/**
 * Раздел державы (этап 93, Сл2, Сл3 и Сл5).
 *
 * Земля уходит по закону: наследнику — его доля, остальным детям — их уделы, и
 * уделы эти становятся чужой землёй, а не твоей. При малолетнем правит регент и
 * берёт своё. Если у соперника довольно прав, своя знать расходится по
 * сторонам — это смута, война внутри своего.
 */
function divideRealm(draft: Draft, day: number): string {
  const plan = partitionOf(draft.base, day)
  const heir = heirUnder(draft.base, day)
  const words: string[] = [plan.says]
  const mine = holdingsOf(draft.settlements, PLAYER)
  // Уделы младших выходят из-под твоей руки: они теперь сами по себе.
  let left = mine.length - plan.toHeir
  if (left > 0) {
    let places = draft.settlements
    for (const one of [...mine].sort((a, b) => a.population - b.population)) {
      if (left <= 0) break
      const place = places[one.locationId]
      if (!place) continue
      places = { ...places, [one.locationId]: { ...place, owner: null } }
      left -= 1
    }
    draft.settlements = places
  }
  if (heir) {
    const regency = regencyFor(draft.base, heir, day)
    if (regency) {
      words.push(regency.says)
      // Регент берёт своё с казны сразу: это видно по кошельку.
      const skim = Math.round(draft.character.money * regency.skim)
      if (skim > 0) addMoney(draft, -skim)
      if (regency.kind !== 'faithful' && vassalsOf(draft.base).length > 0) {
        shiftVassals(draft, REGENT_LOYALTY, null)
      }
    }
  }
  const strife = strifeOf(draft.base, day)
  words.push(strife.says)
  if (strife.vassals > 0) {
    // Смута: часть вассалов уходит к сопернику, остальные шатаются.
    const vassals = [...vassalsOf(draft.base)].sort((a, b) => a.loyalty - b.loyalty)
    const leaving = new Set(vassals.slice(0, strife.vassals).map((one) => one.id))
    draft.politics = {
      ...draft.politics,
      lords: draft.politics.lords.map((lord) =>
        leaving.has(lord.id) ? { ...lord, kingdomId: null, loyalty: 0 } : lord,
      ),
    }
    shiftVassals(draft, INHERIT.strifeLoyalty, null)
  }
  return words.join(' ')
}

/** Насколько нечестный регент роняет верность за время опеки. */
const REGENT_LOYALTY = -6

/** Мор слышно издалека: о нём говорят все, кого он миновал. */
function plagueNews(
  state: GameState,
  locationId: string,
  events: readonly PlagueEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const here = regionOf(state.world, locationId)?.id
  for (const event of events) {
    const place = 'locationId' in event ? event.locationId : event.to
    const name = state.world.locations[place]?.name ?? 'соседнее селение'
    const near = regionOf(state.world, place)?.id === here
    if (event.type === 'plagueBegan') {
      news.push({ type: 'notice', kind: 'plague', text: `Говорят, в месте ${name} открылся мор.` })
    } else if (event.type === 'plagueSpread' && near) {
      news.push({ type: 'notice', kind: 'plague', text: `Мор дошёл до ${name}.` })
    } else if (event.type === 'plagueEnded' && near) {
      news.push({ type: 'notice', kind: 'plague', text: `В месте ${name} мор отступил.` })
    }
  }
  return news
}

/** Новые места и выросшие: то, ради чего стоит вернуться туда, где был. */
function settleNews(
  world: World,
  locationId: string,
  events: readonly SettleEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const here = world.locations[locationId]?.provinceId
  for (const event of events) {
    const name = world.locations[event.locationId]?.name ?? 'новое место'
    const near = world.locations[event.locationId]?.provinceId === here
    if (event.type === 'founded' && near) {
      news.push({ type: 'notice', kind: 'world', text: `Поставлены новые выселки: ${name}.` })
    } else if (event.type === 'resettled' && near) {
      news.push({ type: 'notice', kind: 'world', text: `В ${name} вернулись люди.` })
    } else if (event.type === 'grew' && near) {
      news.push({
        type: 'notice',
        kind: 'world',
        text: `${name} разрослось: теперь это не деревня.`,
      })
    }
  }
  return news
}

/** Новость о годе: слышно только про свою провинцию и соседние по области. */
function harvestNews(
  world: World,
  locationId: string,
  events: readonly HarvestEvent[],
): readonly GameEvent[] {
  const here = world.locations[locationId]?.provinceId
  const region = here ? world.provinces[here]?.regionId : undefined
  const news: GameEvent[] = []
  for (const event of events) {
    const province = world.provinces[event.provinceId]
    if (!province) continue
    if (province.id !== here && province.regionId !== region) continue
    const text =
      event.harvest < 0.7
        ? `Недород: ${province.name} осталась без хлеба.`
        : `Год выдался тощий: в ${province.name} хлеба сняли меньше обычного.`
    news.push({ type: 'notice', kind: 'world', text })
  }
  return news
}

function notice(draft: Draft, text: string, kind: LogKind = 'notice'): void {
  draft.events.push({ type: 'notice', text, kind })
}

function advance(draft: Draft, minutes: number): void {
  if (minutes <= 0) return
  draft.time += minutes
  draft.events.push({ type: 'timeAdvanced', minutes })
}

function addMoney(draft: Draft, delta: number): void {
  if (delta === 0) return
  patch(draft, { money: draft.character.money + delta })
  draft.events.push({ type: 'money', delta })
}

function addFatigue(draft: Draft, delta: number): void {
  // Стойкость держит дорогу и голод: усталость набирается медленнее, а отдых
  // считается полностью (этап 122, А2).
  const held = delta > 0 ? delta * holdsOut(draft.character) : delta
  const next = Math.min(FATIGUE_MAX, Math.max(0, Math.round(draft.character.fatigue + held)))
  if (next === draft.character.fatigue) return
  const applied = next - draft.character.fatigue
  patch(draft, { fatigue: next })
  draft.events.push({ type: 'fatigue', delta: applied })
}

function practice(draft: Draft, skill: SkillId, rawXp: number, path: PathId = 'doing'): void {
  if (rawXp <= 0) return
  const attribute = attributeForSkill(draft.character, skill)
  const gain = applySkillXp(draft.character.skills[skill], rawXp, attribute)
  if (gain.appliedXp <= 0) return
  // Чем именно ты рос (этап 124, Пу1): век считает пути отдельно.
  const by =
    path === 'teacher'
      ? 'byTeacher'
      : path === 'book'
        ? 'byBook'
        : path === 'trial'
          ? 'byTrial'
          : path === 'service'
            ? 'byService'
            : 'byDoing'
  draft.pathLog = { ...draft.pathLog, [by]: draft.pathLog[by] + Math.round(gain.appliedXp) }
  // Чем занимались, то и в руках (этап 125, Ц4).
  draft.usedDay = { ...draft.usedDay, [skill]: dayOf(draft.time) }
  patch(draft, { skills: { ...draft.character.skills, [skill]: gain.progress } })
  if (gain.levelsGained === 0) return

  draft.events.push({ type: 'skillUp', skill, level: gain.progress.level })
  grantCharacterXp(draft, characterXpForSkillLevels(gain.levelsGained, gain.progress.level))
}

/** Поздние уровни навыка весят больше ранних, иначе прогресс персонажа встаёт. */
function characterXpForSkillLevels(levelsGained: number, newLevel: number): number {
  return PROGRESSION.characterXpPerSkillLevel * levelsGained * (1 + newLevel / 20)
}

function grantCharacterXp(draft: Draft, xp: number): void {
  const result = applyCharacterXp(draft.character.level, draft.character.xp, xp)
  patch(draft, {
    level: result.level,
    xp: result.xp,
    unspentSkillPoints: draft.character.unspentSkillPoints + result.skillPointsGained,
    unspentAttributePoints: draft.character.unspentAttributePoints + result.attributePointsGained,
  })
  if (result.levelsGained > 0) {
    draft.events.push({
      type: 'levelUp',
      level: result.level,
      skillPoints: result.skillPointsGained,
      attributePoints: result.attributePointsGained,
    })
  }
}
