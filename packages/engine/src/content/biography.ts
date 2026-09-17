import type { Biography, BiographyStage, BiographyTemplate } from '../biography'

/**
 * Контент биографии (DESIGN.md, п.6).
 *
 * Ветвление задаётся тегами: вариант говорит, что ему нужно (`requires`,
 * `requiresAny`) и чего быть не должно (`excludes`). На каждом этапе есть хотя
 * бы один вариант без условий — иначе биография может завести в тупик, и это
 * ловит тест.
 */
const STAGES: readonly BiographyStage[] = [
  {
    id: 'origin',
    label: 'Происхождение',
    question: 'Кем ты родился?',
    options: [
      {
        id: 'lordSon',
        label: 'Сыном лорда',
        text: 'Имя, которое открывает двери, и наставники, которых не выбирают.',
        effects: {
          attributes: { charisma: 1, will: 1 },
          skills: { scholarship: 4, riding: 3, lightWeapons: 2 },
          money: 40,
          tags: ['noble_born', 'heir', 'literate'],
        },
      },
      {
        id: 'nobleBastard',
        label: 'Бастардом знатного дома',
        text: 'Кровь признают, имя — нет. Тебя учили ровно настолько, чтобы не позорил.',
        effects: {
          attributes: { charisma: 1 },
          skills: { scholarship: 3, lightWeapons: 2 },
          money: 15,
          tags: ['noble_born', 'bastard', 'literate'],
        },
      },
      {
        id: 'merchantChild',
        label: 'В торговом доме',
        text: 'Считать научился раньше, чем читать. Долги в этой семье помнят все.',
        effects: {
          attributes: { mind: 1 },
          skills: { trade: 4, scholarship: 2 },
          money: 30,
          tags: ['townborn', 'literate', 'merchant_family'],
        },
      },
      {
        id: 'craftChild',
        label: 'В семье ремесленника',
        text: 'Мастерская, запах горелого дерева и отцовская рука, ставящая твою.',
        effects: {
          attributes: { strength: 1 },
          skills: { hardLabour: 3, engineering: 2 },
          money: 12,
          tags: ['townborn', 'craft_family'],
        },
      },
      {
        id: 'villager',
        label: 'В деревне',
        text: 'Земля, скотина и зима, которую надо пережить. Про грамоту тут не слышали.',
        effects: {
          attributes: { endurance: 1 },
          skills: { survival: 3, hardLabour: 2 },
          money: 4,
          tags: ['village_born'],
        },
      },
      {
        id: 'templeFoundling',
        label: 'Подкидышем при храме',
        text: 'Тебя нашли на ступенях и записали в книгу. Читать научили раньше, чем говорить лишнее.',
        effects: {
          attributes: { will: 1 },
          skills: { scholarship: 3, healing: 2 },
          money: 6,
          tags: ['temple_raised', 'literate'],
        },
      },
      {
        id: 'tribeborn',
        label: 'В племенах полулюдей',
        text: 'Городов не видел до взрослых лет. Зато лес знаешь как двор.',
        effects: {
          attributes: { agility: 1 },
          skills: { archery: 3, survival: 2 },
          money: 5,
          tags: ['tribe_born'],
        },
      },
    ],
  },
  {
    id: 'childhood',
    label: 'Детство',
    question: 'Чем было занято твоё детство?',
    options: [
      {
        id: 'courtPage',
        label: 'Пажом при дворе',
        text: 'Ты научился слушать разговоры, которые при тебе считали безопасными.',
        requires: ['noble_born'],
        effects: {
          attributes: { charisma: 1 },
          skills: { persuasion: 3, riding: 2, lightWeapons: 1 },
          tags: ['court_page'],
        },
      },
      {
        id: 'templeSchool',
        label: 'В храмовой школе',
        text: 'Буквы, травы и розги за вопросы не по теме.',
        requiresAny: ['temple_raised', 'noble_born', 'merchant_family'],
        effects: {
          attributes: { will: 1 },
          skills: { scholarship: 4, healing: 2 },
          tags: ['devout', 'literate'],
        },
      },
      {
        id: 'stables',
        label: 'При конюшнях',
        text: 'Работа, которой не хвастаются. Лошади о твоём происхождении не спрашивали.',
        effects: {
          attributes: { endurance: 1 },
          skills: { riding: 3, hardLabour: 2 },
          tags: ['stable_work'],
        },
      },
      {
        id: 'streets',
        label: 'На улице',
        text: 'Город кормит того, кто быстрее. Быстрее ты и стал.',
        excludes: ['heir'],
        effects: {
          attributes: { agility: 1 },
          skills: { sleight: 4, persuasion: 2 },
          tags: ['street_smart'],
        },
      },
      {
        id: 'fields',
        label: 'В поле',
        text: 'Спина запомнила это раньше головы.',
        excludes: ['heir'],
        effects: {
          attributes: { endurance: 1 },
          skills: { hardLabour: 3, survival: 2 },
          tags: ['field_work'],
        },
      },
      {
        id: 'workshop',
        label: 'В мастерской',
        text: 'Инструмент в руках держать умеешь, и руки целы — уже неплохо.',
        requiresAny: ['craft_family', 'townborn', 'village_born'],
        effects: {
          attributes: { strength: 1 },
          skills: { engineering: 3, hardLabour: 2 },
          tags: ['craft_work'],
        },
      },
      {
        id: 'forest',
        label: 'В лесу с луком',
        text: 'Тихо ходить и долго ждать — первое, чему учат за стенами.',
        requiresAny: ['tribe_born', 'village_born'],
        effects: {
          attributes: { agility: 1 },
          skills: { archery: 3, survival: 3 },
          tags: ['woodsman'],
        },
      },
    ],
  },
  {
    id: 'youth',
    label: 'Юность',
    question: 'На чём прошла юность?',
    options: [
      {
        id: 'scribeHand',
        label: 'Подручным писца',
        text: 'Чужие долги, чужие тяжбы и первая мысль, что буквы — это власть.',
        requires: ['literate'],
        effects: {
          attributes: { mind: 1 },
          skills: { scholarship: 5 },
          money: 10,
          tags: ['scribe_work'],
        },
      },
      {
        id: 'levy',
        label: 'В ополчении',
        text: 'Строй, копьё и зима в поле. Половина не вернулась, ты вернулся.',
        effects: {
          attributes: { strength: 1 },
          skills: { heavyWeapons: 3, fortitude: 2 },
          tags: ['drilled'],
        },
      },
      {
        id: 'caravans',
        label: 'С караванами',
        text: 'Дороги, пошлины и умение торговаться, когда выбора нет.',
        effects: {
          attributes: { endurance: 1 },
          skills: { trade: 3, riding: 2, survival: 2 },
          money: 8,
          tags: ['traveled'],
        },
      },
      {
        id: 'schoolServant',
        label: 'Прислугой в школе магии',
        text: 'Ты носил воду и мёл коридоры — и видел то, за что на улице сожгли бы.',
        requiresAny: ['literate', 'street_smart', 'devout'],
        effects: {
          attributes: { will: 1 },
          skills: { concentration: 3, scholarship: 2 },
          tags: ['saw_magic', 'school_known'],
        },
      },
      {
        id: 'poaching',
        label: 'Браконьером',
        text: 'Чужой лес, чужая дичь и петля, которая ждала бы тебя при поимке.',
        excludes: ['noble_born'],
        effects: {
          attributes: { agility: 1 },
          skills: { archery: 4, survival: 3 },
          tags: ['outlaw'],
        },
      },
      {
        id: 'cityWatch',
        label: 'В городской страже',
        text: 'Ворота, пьяные и понимание, кому в этом городе можно всё.',
        requiresAny: ['townborn', 'drilled', 'court_page'],
        effects: {
          attributes: { endurance: 1 },
          skills: { lightWeapons: 3, persuasion: 1 },
          money: 6,
          tags: ['guard'],
        },
      },
    ],
  },
  {
    id: 'lastTrade',
    label: 'Последнее занятие',
    question: 'Чем ты жил до сегодняшнего дня?',
    options: [
      {
        id: 'stableHand',
        label: 'Чистил конюшни',
        text: 'Кормят, крыша есть, вопросов не задают. Начало не хуже прочих.',
        effects: {
          skills: { riding: 2, hardLabour: 2 },
          money: 5,
          tags: ['stable_work'],
        },
      },
      {
        id: 'copyist',
        label: 'Переписывал бумаги',
        text: 'Ровные строчки и чужие тайны, которые ты читал по обязанности.',
        requires: ['literate'],
        effects: {
          skills: { scholarship: 3 },
          money: 12,
          tags: ['scribe_work'],
        },
      },
      {
        id: 'hiredBlade',
        label: 'Ходил наёмным клинком',
        text: 'Платили за то, чтобы ты стоял рядом. Иногда приходилось делать больше.',
        requiresAny: ['drilled', 'guard', 'outlaw'],
        effects: {
          skills: { lightWeapons: 3, fortitude: 2 },
          money: 18,
          tags: ['hired_blade'],
        },
      },
      {
        id: 'herbGatherer',
        label: 'Собирал травы лекарю',
        text: 'Корзина, нож и знание, за какой травой не стоит лезть.',
        effects: {
          skills: { survival: 2, healing: 2 },
          money: 7,
          tags: ['herbalist'],
        },
      },
      {
        id: 'cutpurse',
        label: 'Промышлял по карманам',
        text: 'Денег больше, чем у работящих. И рука пока при тебе.',
        requiresAny: ['street_smart', 'outlaw'],
        effects: {
          skills: { sleight: 3 },
          money: 20,
          tags: ['outlaw', 'thief_work'],
        },
      },
      {
        id: 'schoolSweeper',
        label: 'Подметал в школе магии',
        text: 'Платят гроши, но тебя там знают в лицо — и это дороже грошей.',
        requiresAny: ['saw_magic', 'school_known'],
        effects: {
          skills: { concentration: 2, scholarship: 2 },
          money: 4,
          tags: ['school_known'],
        },
      },
    ],
  },
]

/** Быстрый старт: те же ответы, выбранные одним нажатием. */
const TEMPLATES: readonly BiographyTemplate[] = [
  {
    id: 'scribe',
    label: 'Храмовый грамотей',
    description: 'Читает, пишет и знает дорогу к школе магии. Денег нет.',
    optionIds: ['templeFoundling', 'templeSchool', 'scribeHand', 'copyist'],
  },
  {
    id: 'fallenNoble',
    label: 'Сын лорда при конюшнях',
    description: 'Имя есть, денег нет, работа чёрная. Знать всё ещё считает тебя своим.',
    optionIds: ['lordSon', 'stables', 'levy', 'stableHand'],
  },
  {
    id: 'cutpurse',
    label: 'Городской вор',
    description: 'Быстрые руки, быстрые деньги и короткая дорога до петли.',
    optionIds: ['villager', 'streets', 'poaching', 'cutpurse'],
  },
  {
    id: 'blade',
    label: 'Наёмный клинок',
    description: 'Ремесленные руки, строевая юность и оружие, которое кормит.',
    optionIds: ['craftChild', 'workshop', 'levy', 'hiredBlade'],
  },
  {
    id: 'schoolServant',
    label: 'Прислуга школы магии',
    description: 'Торговая семья, грамота и нога в дверях академии.',
    optionIds: ['merchantChild', 'templeSchool', 'schoolServant', 'schoolSweeper'],
  },
  {
    id: 'hunter',
    label: 'Лесной охотник',
    description: 'Племена, лук и лес. В городе на тебя смотрят косо.',
    optionIds: ['tribeborn', 'forest', 'poaching', 'herbGatherer'],
  },
]

export const BIOGRAPHY: Biography = { stages: STAGES, templates: TEMPLATES }
