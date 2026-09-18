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
    id: 'homeland',
    label: 'Родина',
    question: 'Где ты вырос?',
    options: [
      {
        id: 'homeReEstiz',
        label: 'В Ре-Эстизе',
        text: 'Королевство посреди карты: дороги, подати и вечная война с соседями.',
        effects: { tags: ['home_reEstiz'] },
      },
      {
        id: 'homeDurHazad',
        label: 'Под горой, в Дур-Хазаде',
        text: 'Гном. Камень, руда и род, который помнит всё. Наверху тебя считают низким и упрямым — и не ошибаются.',
        effects: {
          attributes: { strength: 1, endurance: 1, charisma: -1 },
          skills: { hardLabour: 2, fortitude: 2 },
          tags: ['home_durHazad', 'dwarf'],
        },
      },
      {
        id: 'homeTribes',
        label: 'В степи, среди племён',
        text: 'Седло раньше, чем ноги. Кочевье, лук и старейшины, которым не возражают.',
        effects: {
          attributes: { agility: 1 },
          skills: { riding: 3, archery: 2 },
          tags: ['home_tribes', 'tribe_born'],
        },
      },
      {
        id: 'homeBoharut',
        label: 'На юге, в империи Бохарут',
        text: 'Базары, писари и подати, которые считают до последней монеты. Здесь всё продаётся — и это не жалоба.',
        effects: {
          attributes: { mind: 1 },
          skills: { trade: 2, persuasion: 1 },
          tags: ['home_boharut', 'southern'],
        },
      },
      {
        id: 'homeRobl',
        label: 'В Святом королевстве Робл',
        text: 'Колокола, обители и капюшоны. Тебя учили молиться раньше, чем считать, — и считать тоже.',
        effects: {
          attributes: { will: 1 },
          skills: { concentration: 2, scholarship: 1 },
          tags: ['home_robl', 'temple_raised'],
        },
      },
      // Три короны дальних земель (этап 44): север, юг и восточный берег.
      {
        id: 'homeHlad',
        label: 'На севере, в Хлади',
        text: 'Лес, снег и погост. Зиму здесь не пережидают — в ней живут, и она не прощает тех, кто не запасся.',
        effects: {
          attributes: { endurance: 1 },
          skills: { survival: 2, fortitude: 1 },
          tags: ['home_hlad', 'northern'],
        },
      },
      {
        id: 'homeRahim',
        label: 'На юге, в султанате Рахим',
        text: 'Белый город, караваны и колодцы, за которые убивают. Ты знаешь цену воде — и цену слову.',
        effects: {
          attributes: { charisma: 1 },
          skills: { trade: 1, persuasion: 2 },
          tags: ['home_rahim', 'southern'],
        },
      },
      {
        id: 'homeLeague',
        label: 'В вольном городе Лиги',
        text: 'Хартия вместо короны, гильдия вместо рода, пристань вместо поля. Тебя учили считать и не верить на слово.',
        effects: {
          attributes: { mind: 1 },
          skills: { trade: 2, scholarship: 1 },
          tags: ['home_league', 'townsman'],
        },
      },
    ],
  },
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
      {
        id: 'clanSmith',
        label: 'В кузне клана',
        text: 'Клеймо рода на всём, что выходит из горна, — и на тебе тоже.',
        requires: ['home_durHazad'],
        effects: {
          attributes: { strength: 1 },
          skills: { engineering: 3, hardLabour: 2 },
          money: 20,
          tags: ['craft_family', 'clan'],
        },
      },
      {
        id: 'minerFamily',
        label: 'В семье рудокопа',
        text: 'Отец ушёл в забой, когда тебе было пять, и вышел, когда стало пятнадцать. Между — лампы и тишина.',
        requires: ['home_durHazad'],
        effects: {
          attributes: { endurance: 1 },
          skills: { hardLabour: 3, fortitude: 2 },
          money: 8,
          tags: ['miner_family', 'village_born'],
        },
      },
      {
        id: 'hordeChild',
        label: 'В кочевье',
        text: 'Юрта, табун и десять братьев, из которых старшие — не родные, но свои.',
        requires: ['home_tribes'],
        effects: {
          skills: { riding: 3, survival: 2 },
          money: 10,
          tags: ['rider', 'village_born'],
        },
      },
      {
        id: 'harborUrchin',
        label: 'В портовом квартале',
        text: 'Мать шила паруса, отца не помнишь. Зато помнишь, у кого что плохо лежит.',
        requires: ['home_boharut'],
        effects: {
          attributes: { agility: 1 },
          skills: { sleight: 2, trade: 2 },
          money: 12,
          tags: ['townborn', 'street_smart'],
        },
      },
      {
        id: 'caravanFamily',
        label: 'В караванной семье',
        text: 'Вырос между верблюжьим горбом и тюком с пряностями. Города — это стоянки.',
        requires: ['home_boharut'],
        effects: {
          skills: { trade: 3, riding: 1 },
          money: 35,
          tags: ['merchant_family', 'traveled'],
        },
      },
      {
        id: 'templeWard',
        label: 'Воспитанником обители',
        text: 'Тебя нашли у ворот и вырастили у алтаря. Читать умеешь, молчать — тоже.',
        requires: ['home_robl'],
        effects: {
          attributes: { will: 1 },
          skills: { scholarship: 3, concentration: 1 },
          money: 5,
          tags: ['temple_raised', 'literate', 'devout'],
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
      {
        id: 'mineShafts',
        label: 'Лазил по штольням',
        text: 'Куда взрослый не пролезет, пролезет ребёнок. За это платят и за это хоронят.',
        requiresAny: ['miner_family', 'clan'],
        effects: {
          attributes: { endurance: 1 },
          skills: { hardLabour: 3, athletics: 1 },
          tags: ['miner_work'],
        },
      },
      {
        id: 'runeLessons',
        label: 'Учил руны у старшего',
        text: 'Род ведёт книгу, и кто-то должен уметь её читать. Выпало тебе.',
        requires: ['home_durHazad'],
        effects: {
          attributes: { mind: 1 },
          skills: { scholarship: 2, engineering: 2 },
          tags: ['literate', 'rune_taught'],
        },
      },
      {
        id: 'herdRiding',
        label: 'Гонял табун',
        text: 'Первую лошадь потерял в семь, первого волка — в девять.',
        requires: ['tribe_born'],
        effects: {
          skills: { riding: 3, archery: 1 },
          tags: ['rider'],
        },
      },
      {
        id: 'harborDocks',
        label: 'Таскал на причалах',
        text: 'Мешки тяжелее тебя. Зато весь порт знает тебя по имени.',
        requires: ['home_boharut'],
        effects: {
          attributes: { strength: 1 },
          skills: { hardLabour: 2, athletics: 2 },
          tags: ['dock_work'],
        },
      },
      {
        id: 'bazaar',
        label: 'Зазывал на базаре',
        text: 'Кто громче, тот и продал. Ты был громче.',
        requires: ['home_boharut'],
        effects: {
          attributes: { charisma: 1 },
          skills: { trade: 3, persuasion: 1 },
          tags: ['bazaar'],
        },
      },
      {
        id: 'templeChoir',
        label: 'Пел в храмовом хоре',
        text: 'Час стоять не шелохнувшись и брать ноту, когда скажут. Это тоже наука.',
        requires: ['home_robl'],
        effects: {
          skills: { concentration: 2, persuasion: 2 },
          tags: ['devout'],
        },
      },
      {
        id: 'pilgrimage',
        label: 'Ходил с паломниками',
        text: 'Год по дорогам Робла, босиком. Ноги стали как подошвы, а вера — как ноги.',
        requires: ['home_robl'],
        effects: {
          attributes: { endurance: 1 },
          skills: { survival: 2, fortitude: 2 },
          tags: ['pilgrim', 'traveled'],
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
      {
        id: 'clanGuard',
        label: 'Стоял в страже клана',
        text: 'Топор, щит и коридор, который надо держать. Больше ничего знать не надо.',
        requiresAny: ['clan', 'miner_family', 'miner_work'],
        effects: {
          attributes: { strength: 1 },
          skills: { heavyWeapons: 3, fortitude: 2 },
          tags: ['drilled', 'clan_guard'],
        },
      },
      {
        id: 'mountainHunter',
        label: 'Бил зверя в горах',
        text: 'Козёл на скале, лук в руках и три дня до дома.',
        requires: ['home_durHazad'],
        effects: {
          skills: { archery: 3, survival: 3 },
          tags: ['woodsman'],
        },
      },
      {
        id: 'raidRider',
        label: 'Ходил в набеги',
        text: 'Не спрашивай, на кого. Степь не спрашивает.',
        requires: ['rider'],
        effects: {
          skills: { riding: 3, archery: 3, lightWeapons: 1 },
          money: 25,
          tags: ['outlaw', 'raider'],
        },
      },
      {
        id: 'harborSmuggler',
        label: 'Носил, что не облагают',
        text: 'Ночь, лодка, тюк. Таможня спит, а ты — нет.',
        requiresAny: ['dock_work', 'bazaar', 'street_smart'],
        effects: {
          skills: { sleight: 3, trade: 2 },
          money: 40,
          tags: ['outlaw', 'smuggler'],
        },
      },
      {
        id: 'imperialClerk',
        label: 'Переписывал податные книги',
        text: 'Империя держится на цифрах, а цифры — на таких, как ты.',
        requires: ['home_boharut'],
        requiresAny: ['literate', 'bazaar', 'merchant_family'],
        effects: {
          attributes: { mind: 1 },
          skills: { scholarship: 3, trade: 2 },
          money: 15,
          tags: ['clerk', 'literate'],
        },
      },
      {
        id: 'noviceMonk',
        label: 'Был послушником',
        text: 'Год до пострига. Пострига не было — но год был.',
        requires: ['home_robl', 'devout'],
        effects: {
          skills: { scholarship: 3, healing: 2, concentration: 2 },
          tags: ['novice', 'literate'],
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
      {
        id: 'clanSmithy',
        label: 'Ковал в клане',
        text: 'Подмастерье с правом на клеймо. Ушёл, когда понял, что мастером станешь к шестидесяти.',
        requiresAny: ['rune_taught', 'clan_guard', 'miner_work', 'craft_family'],
        excludes: ['home_boharut', 'home_tribes'],
        effects: {
          skills: { engineering: 3, hardLabour: 2 },
          money: 20,
          tags: ['smith'],
        },
      },
      {
        id: 'horseTrader',
        label: 'Торговал лошадьми',
        text: 'Покупал в степи, продавал в городах. Разница — твоя, пока никто не догнал.',
        requires: ['rider'],
        effects: {
          skills: { trade: 3, riding: 2 },
          money: 40,
          tags: ['horse_trade'],
        },
      },
      {
        id: 'templeHealer',
        label: 'Ходил за больными при храме',
        text: 'Кто-то должен. Ты — мог.',
        requiresAny: ['novice', 'pilgrim', 'temple_raised'],
        effects: {
          skills: { healing: 3, concentration: 1 },
          money: 10,
          tags: ['healer'],
        },
      },
      {
        id: 'taxClerk',
        label: 'Считал подати',
        text: 'Не своё, но много. Империя платит писарям — мало, но каждый месяц.',
        requires: ['clerk'],
        effects: {
          skills: { scholarship: 2, trade: 2 },
          money: 45,
          tags: ['clerk'],
        },
      },
      {
        id: 'smugglerRun',
        label: 'Возил контрабанду',
        text: 'Последний рейс окупил всё. Потому и последний.',
        requires: ['smuggler'],
        effects: {
          skills: { sleight: 3 },
          money: 60,
          tags: ['outlaw'],
        },
      },
      {
        id: 'mountainGuide',
        label: 'Водил через перевалы',
        text: 'Купцы платят за дорогу, а не за разговоры. Ты и не разговаривал.',
        requires: ['woodsman', 'home_durHazad'],
        effects: {
          skills: { survival: 3, athletics: 2 },
          money: 15,
          tags: ['guide'],
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
    optionIds: ['homeReEstiz', 'templeFoundling', 'templeSchool', 'scribeHand', 'copyist'],
  },
  {
    id: 'fallenNoble',
    label: 'Сын лорда при конюшнях',
    description: 'Имя есть, денег нет, работа чёрная. Знать всё ещё считает тебя своим.',
    optionIds: ['homeReEstiz', 'lordSon', 'stables', 'levy', 'stableHand'],
  },
  {
    id: 'cutpurse',
    label: 'Городской вор',
    description: 'Быстрые руки, быстрые деньги и короткая дорога до петли.',
    optionIds: ['homeReEstiz', 'villager', 'streets', 'poaching', 'cutpurse'],
  },
  {
    id: 'blade',
    label: 'Наёмный клинок',
    description: 'Ремесленные руки, строевая юность и оружие, которое кормит.',
    optionIds: ['homeReEstiz', 'craftChild', 'workshop', 'levy', 'hiredBlade'],
  },
  {
    id: 'schoolServant',
    label: 'Прислуга школы магии',
    description: 'Торговая семья, грамота и нога в дверях академии.',
    optionIds: ['homeReEstiz', 'merchantChild', 'templeSchool', 'schoolServant', 'schoolSweeper'],
  },
  {
    id: 'hunter',
    label: 'Лесной охотник',
    description: 'Племена, лук и лес. В городе на тебя смотрят косо.',
    optionIds: ['homeTribes', 'tribeborn', 'forest', 'poaching', 'herbGatherer'],
  },
  {
    id: 'dwarfSmith',
    label: 'Гном-кузнец',
    description: 'Клеймо рода, руны и топор. Наверху на тебя смотрят сверху вниз — буквально.',
    optionIds: ['homeDurHazad', 'clanSmith', 'runeLessons', 'clanGuard', 'clanSmithy'],
  },
  {
    id: 'steppeRider',
    label: 'Степной всадник',
    description: 'Седло, лук и набеги, о которых лучше молчать. Лошадей знаешь лучше людей.',
    optionIds: ['homeTribes', 'hordeChild', 'herdRiding', 'raidRider', 'horseTrader'],
  },
  {
    id: 'southernClerk',
    label: 'Имперский писарь',
    description: 'Грамота, счёт и податные книги Бохарута. Денег больше, чем у воинов, — пока.',
    optionIds: ['homeBoharut', 'caravanFamily', 'bazaar', 'imperialClerk', 'taxClerk'],
  },
  {
    id: 'roblNovice',
    label: 'Послушник Робла',
    description: 'Капюшон, псалтирь и руки, которые умеют перевязывать. Мир видел с паперти.',
    optionIds: ['homeRobl', 'templeWard', 'templeChoir', 'noviceMonk', 'templeHealer'],
  },
]

export const BIOGRAPHY: Biography = { stages: STAGES, templates: TEMPLATES }
