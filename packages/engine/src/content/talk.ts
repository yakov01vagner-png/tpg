/**
 * Разговор — данные, а не код (этап 53).
 *
 * До 0.6 говорили строками: у лорда восемь реплик по отношению, у наставника
 * четыре, у купца ни одной. Теперь говорят темами: спрашивают о том, что
 * человек знает, а он отвечает тем, что есть в мире. Здесь лежат темы и то,
 * как звучит каждый нрав; ответ собирает `talk.ts` из мира.
 */

/** О чём вообще говорят. */
export type TopicId = string

/** Кто может знать эту тему. */
export type SpeakerKind = 'merchant' | 'master' | 'priest' | 'courtier' | 'lord' | 'companion'

export interface TopicDef {
  readonly id: TopicId
  readonly label: string
  /** Как спрашивают. */
  readonly question: string
  /** Кто об этом говорит. */
  readonly kinds: readonly SpeakerKind[]
  /** Сколько это занимает времени, минут. */
  readonly minutes: number
  /** Насколько это утомляет собеседника: у всякого своё терпение. */
  readonly patience: number
}

export const TOPICS: readonly TopicDef[] = [
  // --- земля и дорога
  {
    id: 'place',
    label: 'Об этом месте',
    question: 'Что здесь за место?',
    kinds: ['merchant', 'master', 'priest', 'courtier', 'lord', 'companion'],
    minutes: 15,
    patience: 1,
  },
  {
    id: 'roads',
    label: 'О дорогах',
    question: 'Куда отсюда ходят и что на дорогах?',
    kinds: ['merchant', 'courtier', 'companion', 'master'],
    minutes: 20,
    patience: 1,
  },
  {
    id: 'danger',
    label: 'О разбое',
    question: 'Спокойно ли в округе?',
    kinds: ['merchant', 'courtier', 'lord', 'companion', 'master'],
    minutes: 15,
    patience: 1,
  },
  {
    id: 'neighbours',
    label: 'О соседях',
    question: 'Что за места вокруг?',
    kinds: ['merchant', 'priest', 'courtier', 'companion'],
    minutes: 25,
    patience: 2,
  },
  {
    id: 'far',
    label: 'О дальних землях',
    question: 'Что там, за границей?',
    kinds: ['merchant', 'priest', 'lord'],
    minutes: 30,
    patience: 2,
  },
  {
    id: 'sea',
    label: 'О море',
    question: 'Что слышно с моря?',
    kinds: ['merchant', 'master', 'companion'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'weather',
    label: 'О погоде и годе',
    question: 'Каков нынче год?',
    kinds: ['merchant', 'master', 'priest', 'companion'],
    minutes: 10,
    patience: 1,
  },
  // --- хлеб и деньги
  {
    id: 'prices',
    label: 'О ценах',
    question: 'Почём нынче товар?',
    kinds: ['merchant', 'master'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'trade',
    label: 'О торге',
    question: 'Чем тут торгуют и кому везут?',
    kinds: ['merchant', 'courtier'],
    minutes: 25,
    patience: 2,
  },
  {
    id: 'work',
    label: 'О работе',
    question: 'Где тут берут работников?',
    kinds: ['master', 'merchant', 'companion'],
    minutes: 15,
    patience: 1,
  },
  {
    id: 'craft',
    label: 'О ремесле',
    question: 'Чему у вас учат руками?',
    kinds: ['master'],
    minutes: 25,
    patience: 2,
  },
  {
    id: 'cech',
    label: 'О цехе',
    question: 'Кто держит здешнее ремесло?',
    kinds: ['master', 'merchant'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'hunger',
    label: 'О хлебе',
    question: 'Хватает ли людям хлеба?',
    kinds: ['priest', 'merchant', 'courtier', 'lord'],
    minutes: 15,
    patience: 1,
  },
  // --- люди и власть
  {
    id: 'lord',
    label: 'О здешнем лорде',
    question: 'Кто тут держит землю?',
    kinds: ['merchant', 'master', 'priest', 'courtier', 'companion'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'crown',
    label: 'О короне',
    question: 'Что слышно от престола?',
    kinds: ['courtier', 'lord', 'priest', 'merchant'],
    minutes: 25,
    patience: 2,
  },
  {
    id: 'court',
    label: 'О дворе',
    question: 'Кто при лорде в силе?',
    kinds: ['courtier', 'lord'],
    minutes: 25,
    patience: 3,
  },
  {
    id: 'war',
    label: 'О войне',
    question: 'С кем нынче воюют?',
    kinds: ['courtier', 'lord', 'merchant', 'companion'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'feud',
    label: 'О вражде',
    question: 'Кто с кем в ссоре?',
    kinds: ['courtier', 'lord', 'priest'],
    minutes: 25,
    patience: 3,
  },
  {
    id: 'rebels',
    label: 'О мятежниках',
    question: 'Правда ли, что кто-то вышел из-под руки короны?',
    kinds: ['courtier', 'lord', 'merchant'],
    minutes: 20,
    patience: 3,
  },
  {
    id: 'bands',
    label: 'О войсках',
    question: 'Чьи дружины ходят рядом?',
    kinds: ['courtier', 'lord', 'companion', 'merchant'],
    minutes: 20,
    patience: 2,
  },
  // --- вера
  {
    id: 'faith',
    label: 'О вере',
    question: 'Как у вас с верой?',
    kinds: ['priest', 'courtier'],
    minutes: 25,
    patience: 2,
  },
  {
    id: 'feast',
    label: 'О празднике',
    question: 'Когда у вас праздник?',
    kinds: ['priest', 'merchant', 'master', 'companion'],
    minutes: 15,
    patience: 1,
  },
  {
    id: 'holy',
    label: 'О святых местах',
    question: 'Куда у вас ходят молиться?',
    kinds: ['priest', 'companion'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'sin',
    label: 'О грехах',
    question: 'Чем тут грешат?',
    kinds: ['priest'],
    minutes: 30,
    patience: 3,
  },
  {
    id: 'orders',
    label: 'Об орденах',
    question: 'Чьи братья тут стоят?',
    kinds: ['priest', 'merchant', 'courtier'],
    minutes: 20,
    patience: 2,
  },
  // --- магия
  {
    id: 'magic',
    label: 'О магах',
    question: 'Что у вас говорят о магах?',
    kinds: ['priest', 'courtier', 'merchant', 'companion'],
    minutes: 25,
    patience: 2,
  },
  {
    id: 'school',
    label: 'О школе',
    question: 'Где тут учат чарам?',
    kinds: ['courtier', 'priest', 'merchant'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'archmage',
    label: 'Об архимаге',
    question: 'Где нынче архимаг короны?',
    kinds: ['courtier', 'lord'],
    minutes: 20,
    patience: 3,
  },
  // --- слухи и люди
  {
    id: 'rumour',
    label: 'О чём говорят',
    question: 'О чём нынче говорят?',
    kinds: ['merchant', 'master', 'priest', 'courtier', 'companion'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'strangers',
    label: 'О проезжих',
    question: 'Кто здесь бывал до меня?',
    kinds: ['merchant', 'master', 'priest'],
    minutes: 15,
    patience: 2,
  },
  {
    id: 'me',
    label: 'Обо мне',
    question: 'Что обо мне говорят?',
    kinds: ['merchant', 'master', 'priest', 'courtier', 'companion'],
    minutes: 15,
    patience: 2,
  },
  {
    id: 'himself',
    label: 'О нём самом',
    question: 'А сам ты кто будешь?',
    kinds: ['merchant', 'master', 'priest', 'courtier', 'lord', 'companion'],
    minutes: 25,
    patience: 2,
  },
  {
    id: 'family',
    label: 'О его семье',
    question: 'Есть ли у тебя родня?',
    kinds: ['merchant', 'master', 'priest', 'courtier', 'companion'],
    minutes: 25,
    patience: 3,
  },
  {
    id: 'past',
    label: 'О прошлом',
    question: 'Как ты дошёл до такой жизни?',
    kinds: ['master', 'priest', 'courtier', 'companion'],
    minutes: 30,
    patience: 3,
  },
  {
    id: 'wish',
    label: 'О том, чего он хочет',
    question: 'Чего тебе не хватает?',
    kinds: ['merchant', 'master', 'courtier', 'companion'],
    minutes: 25,
    patience: 3,
  },
  // --- дела
  {
    id: 'work_offer',
    label: 'О деле для меня',
    question: 'Нет ли дела для меня?',
    kinds: ['merchant', 'master', 'courtier', 'lord'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'hire',
    label: 'О наёмниках',
    question: 'Где тут нанимают людей?',
    kinds: ['courtier', 'merchant', 'companion'],
    minutes: 15,
    patience: 2,
  },
  {
    id: 'ransom',
    label: 'О выкупах',
    question: 'Кого нынче держат за выкуп?',
    kinds: ['courtier', 'lord'],
    minutes: 20,
    patience: 3,
  },
  {
    id: 'ships',
    label: 'О судах',
    question: 'Чьи суда сюда ходят?',
    kinds: ['merchant', 'master'],
    minutes: 20,
    patience: 2,
  },
  {
    id: 'plague',
    label: 'О море',
    question: 'Не слышно ли где мора?',
    kinds: ['priest', 'merchant', 'courtier'],
    minutes: 20,
    patience: 2,
  },
]

export const TOPICS_BY_ID: Readonly<Record<string, TopicDef>> = Object.fromEntries(
  TOPICS.map((topic) => [topic.id, topic]),
)

/**
 * Как звучит нрав.
 *
 * Десять голосов, к которым сводятся все нравы мира: купеческие, ремесленные,
 * церковные, господские и спутничьи. Один и тот же ответ звучит по-разному —
 * и по этому слышно, с кем говоришь.
 */
export type TalkTone =
  | 'curt'
  | 'warm'
  | 'proud'
  | 'sly'
  | 'merry'
  | 'gloomy'
  | 'pious'
  | 'greedy'
  | 'tired'
  | 'plain'

export interface ToneDef {
  readonly id: TalkTone
  readonly label: string
  /** Чем начинают ответ. */
  readonly opens: readonly string[]
  /** Чем заканчивают. */
  readonly closes: readonly string[]
  /** Чем отвечают, когда не знают. */
  readonly shrugs: readonly string[]
  /** Чем отвечают, когда надоел. */
  readonly tires: readonly string[]
  /** Насколько терпелив: сколько тем выдержит за раз. */
  readonly patience: number
  /** Насколько склонен приврать. */
  readonly lies: number
}

export const TONES: Record<TalkTone, ToneDef> = {
  curt: {
    id: 'curt',
    label: 'сухо',
    opens: ['Коротко:', 'Слушай и запоминай, повторять не буду.'],
    closes: ['Всё.', 'Больше нечего.'],
    shrugs: ['Не знаю.', 'Не моё дело.'],
    tires: ['Хватит на сегодня.', 'Иди уже.'],
    patience: 3,
    lies: 0.05,
  },
  warm: {
    id: 'warm',
    label: 'по-доброму',
    opens: ['Да тут дело такое.', 'Садись, расскажу.'],
    closes: ['Вот так и живём.', 'Ну, ты понял.'],
    shrugs: ['А вот этого не скажу, врать не буду.', 'Не ведаю, милый.'],
    tires: ['Голова уж гудит от разговоров.', 'В другой раз, ладно?'],
    patience: 6,
    lies: 0.03,
  },
  proud: {
    id: 'proud',
    label: 'свысока',
    opens: ['Раз спрашиваешь — слушай.', 'Мне это известно, конечно.'],
    closes: ['И довольно об этом.', 'Прочее тебя не касается.'],
    shrugs: ['Об этом я не осведомлён.', 'Такими вещами не интересуюсь.'],
    tires: ['У меня есть дела поважнее.', 'Ты испытываешь моё терпение.'],
    patience: 3,
    lies: 0.08,
  },
  sly: {
    id: 'sly',
    label: 'с хитрецой',
    opens: ['Ну, если по совести...', 'Говорят разное, а правда такая.'],
    closes: ['Понял намёк?', 'А дальше сам смотри.'],
    shrugs: ['Кто ж его знает.', 'Об этом надо спрашивать не меня.'],
    tires: ['Много спрашиваешь. Слишком много.', 'Дальше — за отдельную плату.'],
    patience: 4,
    lies: 0.18,
  },
  merry: {
    id: 'merry',
    label: 'весело',
    opens: ['О, про это могу!', 'Ха! Знал бы ты...'],
    closes: ['Вот такие дела, брат.', 'Смешно, а правда.'],
    shrugs: ['Понятия не имею, и слава богам.', 'Тут я пас.'],
    tires: ['Всё, язык устал.', 'Пошли лучше выпьем, чем болтать.'],
    patience: 6,
    lies: 0.12,
  },
  gloomy: {
    id: 'gloomy',
    label: 'мрачно',
    opens: ['Плохо всё.', 'Хочешь знать? Слушай.'],
    closes: ['И будет хуже.', 'Вот и весь сказ.'],
    shrugs: ['Не знаю. И знать не хочу.', 'Спроси другого.'],
    tires: ['Отстань.', 'Наговорились.'],
    patience: 2,
    lies: 0.05,
  },
  pious: {
    id: 'pious',
    label: 'смиренно',
    opens: ['С божьей помощью скажу.', 'То, что знаю, — не тайна.'],
    closes: ['На всё воля неба.', 'Помолись, и станет яснее.'],
    shrugs: ['Не дано мне это знать.', 'О том ведают выше.'],
    tires: ['Мне пора к службе.', 'Довольно слов, сын мой.'],
    patience: 5,
    lies: 0.02,
  },
  greedy: {
    id: 'greedy',
    label: 'с прищуром',
    opens: ['Это стоит того, чтобы слушать.', 'Ладно, скажу — задаром.'],
    closes: ['Услуга за тобой.', 'Запомни, кто сказал.'],
    shrugs: ['За такое не платят — и не знаю.', 'Тут я тёмен.'],
    tires: ['Время — деньги, а ты их тратишь.', 'Всё, я работаю.'],
    patience: 3,
    lies: 0.2,
  },
  tired: {
    id: 'tired',
    label: 'устало',
    opens: ['Ну... если вкратце.', 'Было дело.'],
    closes: ['Как-то так.', 'Может, и не так уже.'],
    shrugs: ['Забыл, если и знал.', 'Память не та.'],
    tires: ['Стар я для долгих бесед.', 'Дай отдохнуть.'],
    patience: 3,
    lies: 0.1,
  },
  plain: {
    id: 'plain',
    label: 'просто',
    opens: ['Скажу как есть.', 'Дело такое.'],
    closes: ['Вот и всё.', 'Так оно и есть.'],
    shrugs: ['Не скажу — не знаю.', 'Тут не ко мне.'],
    tires: ['Мне работать надо.', 'Поговорили — и будет.'],
    patience: 4,
    lies: 0.06,
  },
}

export const TONE_IDS: readonly TalkTone[] = [
  'curt',
  'warm',
  'proud',
  'sly',
  'merry',
  'gloomy',
  'pious',
  'greedy',
  'tired',
  'plain',
]

/** Насколько верно сказанное. */
export type Truth = 'known' | 'guess' | 'lie'

export const TRUTH_LABELS: Record<Truth, string> = {
  known: 'знает наверняка',
  guess: 'говорит по слухам',
  lie: 'врёт или ошибается',
}
