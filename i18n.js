/* ==========================================================================
   English Base — interface locales
   --------------------------------------------------------------------------
   Selecting a locale changes three things at once: the Translation column,
   the translation under each example, and every label in the interface. The
   headword, its IPA, and the example sentence are always English.

   Adding a language means adding one object here and listing its code in
   _order — plus an alpha-<code>-wrap block in index.html if its alphabet is
   not already present. Nothing in en.js needs to change.

   `en` is the base locale: it must define every key, because the other
   locales fall back to it for anything they leave out.
   ========================================================================== */
window.I18N = {
  _order: ['en', 'ru', 'kk'],

  en: {
    _label: 'EN',

    /* document */
    title: 'English Base — Core Vocabulary',
    h1: 'English Base',
    words: 'words',
    words_one: 'word',
    words_label: 'Words',
    grouped_by_pos: 'Grouped by part of speech',
    all: 'All',

    /* search */
    search_ph: 'Search...',
    search_word: 'Word',
    search_ipa: 'IPA',
    search_ru: 'Russian',
    search_kk: 'Kazakh',

    /* stats */
    stats_familiar: 'Familiar',
    stats_learned: 'Learned',
    stats_total: 'Total',

    /* table of contents */
    toc_head: 'Contents',

    /* part-of-speech sections (headings and TOC) */
    sec_pos_noun: 'Nouns',
    sec_pos_verb: 'Verbs',
    sec_pos_adj: 'Adjectives',
    sec_pos_adv: 'Adverbs',
    sec_pos_det: 'Determiners',
    sec_pos_interj: 'Interjections',
    sec_pos_conj: 'Conjunctions',
    sec_pos_prep: 'Prepositions',
    sec_pos_pron: 'Pronouns',

    /* part-of-speech filter buttons (shorter) */
    posf_all: 'All',
    posf_pos_noun: 'Nouns',
    posf_pos_verb: 'Verbs',
    posf_pos_adj: 'Adj.',
    posf_pos_adv: 'Adv.',
    posf_pos_det: 'Det.',
    posf_pos_interj: 'Interj.',
    posf_pos_conj: 'Conj.',
    posf_pos_prep: 'Prep.',
    posf_pos_pron: 'Pron.',

    /* toolbar labels */
    lbl_speed: '▶ Speed:',
    lbl_volume: 'Volume:',
    lbl_columns: 'Columns:',
    lbl_sort: 'Sorting:',
    lbl_cefr: 'CEFR level:',
    lbl_texts: 'Texts:',
    lbl_pos: 'Part of speech:',
    lbl_alpha: 'A–Z:',
    lbl_channels: 'Channels:',

    /* toolbar buttons */
    collapse: '▼ Collapse',
    expand: '▶ Expand',
    show_all_cols: '↺ All',
    show_all_cols_title: 'Show all columns',
    show_roots: 'Show roots',
    hide_roots: 'Hide roots',
    export_csv: '⬇ Excel',
    export_csv_title: 'Export to Excel/CSV',
    export_anki: '⬇ Anki',
    snap_save: 'Save snapshot',
    snap_dd: 'Snapshots ▾',
    reset: '↺ Reset',
    palette: '🎨 Palette ▾',
    study: '📚 Study',
    study_title: 'Flashcards',
    quiz: '🧩 Quiz',
    quiz_title: 'Multiple choice quiz',
    by_section: 'By section',
    drag_row: 'Drag row',

    /* sort buttons */
    sort_default: 'Default',
    sort_word: 'Word A–Z',
    sort_root: 'Root A–Z',
    sort_affix: 'Affix A–Z',
    sort_cefr_asc: 'CEFR A1–C2 ↑',
    sort_cefr_desc: 'CEFR C2–A1 ↓',

    /* columns */
    col_num: '#',
    col_word: 'Word',
    col_trans: 'Translation',
    col_ex: 'Example',
    col_toggle_title: 'Show/hide column',

    /* table headers */
    th_word: 'Word',
    th_trans: 'Translation',
    th_ex: 'Example',

    /* group headers */
    root_prefix: '◆ Root ',
    letter_prefix: '◆ ',
    individual_words: '◆ Standalone words',

    /* learned / familiar sections */
    fam_heading: 'Familiar, not yet learned',
    learned_heading: 'Learned',

    /* font panel */
    font_word: 'Word:',
    font_ipa: 'IPA:',
    font_trans: 'Translation:',
    font_default: 'Default',

    /* audio */
    tts_play: 'Play',
    tts_example: 'Play example',

    /* study overlay */
    study_show: 'Show answer',
    study_know: 'Know',
    study_learning: 'Learning',
    study_unknown: "Don't know",
    study_known: 'Known',
    study_done: 'Session complete!',
    study_again: 'Repeat',
    no_cards: 'No cards to study!',

    /* quiz overlay */
    quiz_setup_title: 'Quiz — settings',
    quiz_levels_label: 'CEFR levels:',
    quiz_size_label: 'Number of questions:',
    quiz_hide_ipa: 'Hide IPA',
    quiz_start: 'Start',
    quiz_question: 'Question',
    quiz_score: 'Score',
    quiz_grade: 'Grade',
    quiz_right: 'Correct!',
    quiz_wrong: 'Wrong',
    quiz_next: 'Next',
    quiz_done: 'Quiz complete!',
    quiz_again: 'Again',
    ipa_show: 'IPA: show',
    ipa_hide: 'IPA: hide',

    /* snapshots */
    no_snapshots: 'No snapshots',
    snap_total: 'Total',
    snap_learned: 'Learned',
    snap_left: 'Left',
    snap_restore_q: 'Restore snapshot from',
    snap_restore_warn: 'All current changes will be replaced.',
    saved: 'Saved',
    restore: 'Restore',

    /* reset */
    reset_q: 'Reset everything and return to the original state?',
    reset_warn: 'All progress, snapshots and settings will be removed.',

    /* dialogs */
    cancel: 'Cancel',
    confirm: 'Confirm',
    confirm_title: 'Confirm this action',

    /* news */
    tv: 'TV',
    radio: 'Radio',
    watch: 'Watch',
    listen: 'Listen',
    read: 'Read',
    select_channel: 'Select channel',
    select_station: 'Select station',
    news_channel: 'Channel',
    news_articles: 'Articles',
    close: 'Close'
  },

  ru: {
    _label: 'RU',

    title: 'English Base — Базовый словарь',
    h1: 'English Base',
    words: 'слов',
    words_one: 'слово',
    words_few: 'слова',
    words_label: 'Слов',
    grouped_by_pos: 'Сгруппировано по частям речи',
    all: 'Все',

    search_ph: 'Поиск...',
    search_word: 'Слово',
    search_ipa: 'Транскрипция',
    search_ru: 'Русский',
    search_kk: 'Казахский',

    stats_familiar: 'Знакомые',
    stats_learned: 'Выучено',
    stats_total: 'Всего',

    toc_head: 'Содержание',

    sec_pos_noun: 'Существительные',
    sec_pos_verb: 'Глаголы',
    sec_pos_adj: 'Прилагательные',
    sec_pos_adv: 'Наречия',
    sec_pos_det: 'Определители',
    sec_pos_interj: 'Междометия',
    sec_pos_conj: 'Союзы',
    sec_pos_prep: 'Предлоги',
    sec_pos_pron: 'Местоимения',

    posf_all: 'Все',
    posf_pos_noun: 'Сущ.',
    posf_pos_verb: 'Глаг.',
    posf_pos_adj: 'Прил.',
    posf_pos_adv: 'Нар.',
    posf_pos_det: 'Опред.',
    posf_pos_interj: 'Междом.',
    posf_pos_conj: 'Союзы',
    posf_pos_prep: 'Предл.',
    posf_pos_pron: 'Мест.',

    lbl_speed: '▶ Скорость:',
    lbl_volume: 'Громкость:',
    lbl_columns: 'Колонки:',
    lbl_sort: 'Сортировка:',
    lbl_cefr: 'Уровень CEFR:',
    lbl_texts: 'Тексты:',
    lbl_pos: 'Часть речи:',
    lbl_alpha: 'А–Я:',
    lbl_channels: 'Каналы:',

    collapse: '▼ Свернуть',
    expand: '▶ Развернуть',
    show_all_cols: '↺ Все',
    show_all_cols_title: 'Показать все колонки',
    show_roots: 'Показать корни',
    hide_roots: 'Скрыть корни',
    export_csv: '⬇ Excel',
    export_csv_title: 'Экспорт в Excel/CSV',
    export_anki: '⬇ Anki',
    snap_save: 'Сохранить снимок',
    snap_dd: 'Снимки ▾',
    reset: '↺ Сброс',
    palette: '🎨 Палитра ▾',
    study: '📚 Учить',
    study_title: 'Режим карточек',
    quiz: '🧩 Тест',
    quiz_title: 'Тест с вариантами',
    by_section: 'По секциям',
    drag_row: 'Переместить строку',

    sort_default: 'По умолчанию',
    sort_word: 'Слово A–Z',
    sort_root: 'Корень A–Z',
    sort_affix: 'Аффикс A–Z',
    sort_cefr_asc: 'CEFR A1–C2 ↑',
    sort_cefr_desc: 'CEFR C2–A1 ↓',

    col_num: '#',
    col_word: 'Слово',
    col_trans: 'Перевод',
    col_ex: 'Пример',
    col_toggle_title: 'Скрыть/показать колонку',

    th_word: 'Слово',
    th_trans: 'Перевод',
    th_ex: 'Пример',

    root_prefix: '◆ Корень ',
    letter_prefix: '◆ ',
    individual_words: '◆ Отдельные слова',

    fam_heading: 'Знакомые, но не выученные',
    learned_heading: 'Выучено',

    font_word: 'Слово:',
    font_ipa: 'Транскрипция:',
    font_trans: 'Перевод:',
    font_default: 'По умолчанию',

    tts_play: 'Прослушать',
    tts_example: 'Прослушать пример',

    study_show: 'Показать ответ',
    study_know: 'Знаю',
    study_learning: 'Учусь',
    study_unknown: 'Не знаю',
    study_known: 'Знаю',
    study_done: 'Сессия завершена!',
    study_again: 'Повторить',
    no_cards: 'Нет карточек для изучения!',

    quiz_setup_title: 'Тест — настройки',
    quiz_levels_label: 'Уровни CEFR:',
    quiz_size_label: 'Количество вопросов:',
    quiz_hide_ipa: 'Скрыть транскрипцию',
    quiz_start: 'Начать',
    quiz_question: 'Вопрос',
    quiz_score: 'Счёт',
    quiz_grade: 'Оценка',
    quiz_right: 'Верно!',
    quiz_wrong: 'Неверно',
    quiz_next: 'Далее',
    quiz_done: 'Тест завершён!',
    quiz_again: 'Ещё раз',
    ipa_show: 'Транскрипция: показать',
    ipa_hide: 'Транскрипция: скрыть',

    no_snapshots: 'Нет снимков',
    snap_total: 'Всего',
    snap_learned: 'Выучено',
    snap_left: 'Осталось',
    snap_restore_q: 'Восстановить снимок от',
    snap_restore_warn: 'Все текущие изменения будут заменены.',
    saved: 'Сохранено',
    restore: 'Восстановить',

    reset_q: 'Сбросить всё и вернуться к исходному состоянию?',
    reset_warn: 'Весь прогресс, снимки и настройки будут удалены.',

    cancel: 'Отмена',
    confirm: 'Подтвердить',
    confirm_title: 'Подтвердите действие',

    tv: 'ТВ',
    radio: 'Радио',
    watch: 'Смотреть',
    listen: 'Слушать',
    read: 'Читать',
    select_channel: 'Выбор канала',
    select_station: 'Выбор станции',
    news_channel: 'Канал',
    news_articles: 'Статьи',
    close: 'Закрыть'
  },

  kk: {
    _label: 'KK',

    title: 'English Base — Негізгі сөздік',
    h1: 'English Base',
    words: 'сөз',
    words_label: 'Сөз',
    grouped_by_pos: 'Сөз таптары бойынша топталған',
    all: 'Барлығы',

    search_ph: 'Іздеу...',
    search_word: 'Сөз',
    search_ipa: 'Транскрипция',
    search_ru: 'Орысша',
    search_kk: 'Қазақша',

    stats_familiar: 'Таныс',
    stats_learned: 'Үйренілген',
    stats_total: 'Барлығы',

    toc_head: 'Мазмұны',

    sec_pos_noun: 'Зат есімдер',
    sec_pos_verb: 'Етістіктер',
    sec_pos_adj: 'Сын есімдер',
    sec_pos_adv: 'Үстеулер',
    sec_pos_det: 'Айқындауыштар',
    sec_pos_interj: 'Одағайлар',
    sec_pos_conj: 'Жалғаулықтар',
    sec_pos_prep: 'Предлогтар',
    sec_pos_pron: 'Есімдіктер',

    posf_all: 'Барлығы',
    posf_pos_noun: 'Зат е.',
    posf_pos_verb: 'Етіст.',
    posf_pos_adj: 'Сын е.',
    posf_pos_adv: 'Үстеу',
    posf_pos_det: 'Айқынд.',
    posf_pos_interj: 'Одағай',
    posf_pos_conj: 'Жалғ.',
    posf_pos_prep: 'Предл.',
    posf_pos_pron: 'Есімд.',

    lbl_speed: '▶ Жылдамдық:',
    lbl_volume: 'Дыбыс:',
    lbl_columns: 'Бағандар:',
    lbl_sort: 'Сұрыптау:',
    lbl_cefr: 'CEFR деңгейі:',
    lbl_texts: 'Мәтіндер:',
    lbl_pos: 'Сөз табы:',
    lbl_alpha: 'Ә–Я:',
    lbl_channels: 'Арналар:',

    collapse: '▼ Жию',
    expand: '▶ Жаю',
    show_all_cols: '↺ Барлығы',
    show_all_cols_title: 'Барлық бағандарды көрсету',
    show_roots: 'Түбірлерді көрсету',
    hide_roots: 'Түбірлерді жасыру',
    export_csv: '⬇ Excel',
    export_csv_title: 'Excel/CSV-ке шығару',
    export_anki: '⬇ Anki',
    snap_save: 'Сақталым жасау',
    snap_dd: 'Сақталымдар ▾',
    reset: '↺ Тазалау',
    palette: '🎨 Палитра ▾',
    study: '📚 Үйрену',
    study_title: 'Карточкалар режимі',
    quiz: '🧩 Тест',
    quiz_title: 'Нұсқалы тест',
    by_section: 'Бөлімдер бойынша',
    drag_row: 'Жолды жылжыту',

    sort_default: 'Әдепкі',
    sort_word: 'Сөз A–Z',
    sort_root: 'Түбір A–Z',
    sort_affix: 'Аффикс A–Z',
    sort_cefr_asc: 'CEFR A1–C2 ↑',
    sort_cefr_desc: 'CEFR C2–A1 ↓',

    col_num: '#',
    col_word: 'Сөз',
    col_trans: 'Аударма',
    col_ex: 'Мысал',
    col_toggle_title: 'Бағанды көрсету/жасыру',

    th_word: 'Сөз',
    th_trans: 'Аударма',
    th_ex: 'Мысал',

    root_prefix: '◆ Түбір ',
    letter_prefix: '◆ ',
    individual_words: '◆ Жеке сөздер',

    fam_heading: 'Таныс, бірақ үйренілмеген',
    learned_heading: 'Үйренілген',

    font_word: 'Сөз:',
    font_ipa: 'Транскрипция:',
    font_trans: 'Аударма:',
    font_default: 'Әдепкі',

    tts_play: 'Тыңдау',
    tts_example: 'Мысалды тыңдау',

    study_show: 'Жауапты көрсету',
    study_know: 'Білемін',
    study_learning: 'Үйреніп жатырмын',
    study_unknown: 'Білмеймін',
    study_known: 'Білемін',
    study_done: 'Сессия аяқталды!',
    study_again: 'Қайталау',
    no_cards: 'Үйренуге карточка жоқ!',

    quiz_setup_title: 'Тест — баптаулар',
    quiz_levels_label: 'CEFR деңгейлері:',
    quiz_size_label: 'Сұрақтар саны:',
    quiz_hide_ipa: 'Транскрипцияны жасыру',
    quiz_start: 'Бастау',
    quiz_question: 'Сұрақ',
    quiz_score: 'Ұпай',
    quiz_grade: 'Баға',
    quiz_right: 'Дұрыс!',
    quiz_wrong: 'Қате',
    quiz_next: 'Келесі',
    quiz_done: 'Тест аяқталды!',
    quiz_again: 'Тағы бір рет',
    ipa_show: 'Транскрипция: көрсету',
    ipa_hide: 'Транскрипция: жасыру',

    no_snapshots: 'Сақталым жоқ',
    snap_total: 'Барлығы',
    snap_learned: 'Үйренілген',
    snap_left: 'Қалды',
    snap_restore_q: 'Сақталымды қалпына келтіру:',
    snap_restore_warn: 'Барлық ағымдағы өзгерістер ауыстырылады.',
    saved: 'Сақталды',
    restore: 'Қалпына келтіру',

    reset_q: 'Барлығын тазалап, бастапқы күйге оралу керек пе?',
    reset_warn: 'Барлық прогресс, сақталымдар және баптаулар жойылады.',

    cancel: 'Болдырмау',
    confirm: 'Растау',
    confirm_title: 'Әрекетті растаңыз',

    tv: 'ТВ',
    radio: 'Радио',
    watch: 'Көру',
    listen: 'Тыңдау',
    read: 'Оқу',
    select_channel: 'Арнаны таңдау',
    select_station: 'Станцияны таңдау',
    news_channel: 'Арна',
    news_articles: 'Мақалалар',
    close: 'Жабу'
  }
};
