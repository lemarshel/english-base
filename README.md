# English Base

The English module of **Lingua Bridge** — a vocabulary study interface for
learners of English, with Russian and Kazakh as the translation languages.

It runs the same engine as [hsk-base](https://github.com/lemarshel/hsk-base),
adapted for English: IPA in place of pinyin, word roots in place of phonetic
components, and CEFR levels in place of HSK levels.

**5,000 English headwords are loaded.** Translations, definitions, examples and
IPA are deliberately empty — every record already carries those slots, ready to
be filled in. The word list comes from a COCA-style frequency spreadsheet,
converted by `tools/build_words.py`.

## Running it

Any static file server works — the page uses a Web Worker for search, which
`file://` will not load.

```bash
python -m http.server 8123
```

Then open <http://localhost:8123>.

## Locales

The `EN` button in the toolbar cycles through the interface languages. Picking
one changes three things at once:

1. the Translation column
2. the translation under each example
3. every button and label

The headword, its IPA, and the example sentence are always English.

| Locale | Translation column | Alphabet filter |
|---|---|---|
| `en` | English definition (`def`) | A–Z over the headword |
| `ru` | Russian translation | А–Я (33 letters) |
| `kk` | Kazakh translation | Ә–Я (42 letters) |

Adding a language means adding one object to `i18n.js`, listing its code in
`_order`, adding an `alpha-<code>-wrap` block in `index.html` if its alphabet
is new, and adding one `.ex-trans` line to `en.css`. Nothing in `en.js` changes.

## The word data

`data/words-data.js` is **generated — do not hand-edit it.** Rebuild it from a
frequency spreadsheet with:

```bash
python tools/build_words.py ~/Downloads/lemmas_60k.xlsx --limit 5000
```

That writes `data/words.json` (portable JSON) and `data/words-data.js` (what the
page loads). `js/render-words.js` builds the tables from those two arrays, and
everything downstream reads the DOM it produces. The full field reference is in
[docs/architecture.md](docs/architecture.md).

Records include both learning content and their COCA filter metrics:

```js
{ id:1, word:'inspect', ipa:'', ru:'', kk:'', def:'',
  pos:'pos_verb', group:'g_verb', root:'', affix:'', cefr:'b1',
  ex:'', ex_ipa:'', ex_ru:'', ex_kk:'', ex_def:'',
  rank:2505, coca_pos:'v', per_mil:12.4, disp:0.94, range:8120,
  spok_pm:11.2, tvm_pm:15.7, fic_pm:8.1, acad_pm:19.3,
  news_pm:14.8, mag_pm:13.5, web_pm:9.7, blog_pm:10.2,
  caps_pct:0.02, all_caps_pct:0 }

// the same record once it is filled in
{ id:1, word:'inspect', ipa:'ɪnˈspekt',
  ru:'осматривать; проверять', kk:'қарау; тексеру',
  def:'to look at something closely',
  pos:'pos_verb', group:'g_spect', root:'spect', affix:'in-', cefr:'b1',
  ex:'Please inspect the goods on arrival.',
  ex_ipa:'pliːz ɪnˈspekt ðə ɡʊdz ɒn əˈraɪvl',
  ex_ru:'Пожалуйста, осмотрите товар при получении.',
  ex_kk:'Тауарды алған кезде тексеріңіз.', ex_def:'' }
```

`ru` and `kk` fill the Translation column in their locales, `def` fills it in
English, and `ex_ru` / `ex_kk` / `ex_def` sit under the example sentence — all
driven by the same locale button.

Mark stress in the IPA with `ˈ` (primary) and `ˌ` (secondary) — the stressed
syllable is highlighted automatically.

## What the interface does

- **Search** across headword, IPA, or the active translation, off the main
  thread via `search-worker.js`
- **Filters** by CEFR level, exact COCA part of speech, frequency rank, general
  distribution, conversational/academic/fiction/news/web profiles, likely
  names/acronyms, first letter, and study topic
- **Sorting** by word, root, affix, or CEFR level, ascending and descending
- **Progress tracking** with familiar/learned checkboxes, persisted locally,
  plus named snapshots you can restore
- **Flashcards and a multiple-choice quiz** built from the current selection
- **Text to speech** on words and examples, with speed and volume control
- **Live TV** from the 427 channels in `channels.js`, and an offline news
  reader (stubbed until a build pipeline exists)
- **Export** to Excel/CSV
- Three themes, fifteen accent palettes, adjustable fonts, and a responsive
  layout down to phone width

Column visibility is toggled by **right-clicking** a column button or a table
header — the same affordance as hsk-base.

## Layout

```
index.html          page shell: toolbar, overlays, empty table mount
en.css              all styling
en-head.js          theme + palette, applied before first paint
en-body.js          locale + column visibility, applied before content paint
en.js               application logic
i18n.js             interface locales
js/render-words.js  builds the word tables from the data arrays
data/words-data.js  the vocabulary (empty)
text-topics.js      the 40 study topics and their word mappings (empty)
search-worker.js    off-main-thread search
tracker.js          learner interaction logging
channels.js         TV and radio stream lists
news_data.js        offline news reader data (empty)
```

## Known gaps

- **No translations, definitions, examples, or IPA yet** — 5,000 headwords are
  in place with those fields empty. That is the next piece of work.
- **The source list is a decimated sample.** `lemmas_60k.xlsx` contains every
  tenth lemma from a 60,000-word list, so the 5,000 loaded here span frequency
  ranks 5–50,045 rather than being the 5,000 most common English words. A
  complete frequency list would give a much better beginner set.
- **CEFR levels are approximated from frequency rank**, not measured. Because of
  the sampling above the distribution skews rare: 100 A1, 150 A2, 250 B1,
  499 B2, 1,000 C1, 3,001 C2. Replace `CEFR_BANDS` in `tools/build_words.py`
  when real level data is available.
- **No root or affix grouping.** There is no morphology data yet, so each part
  of speech is a single group and the root headers are empty.
- **No radio stations.** Everything in `channels.js` is a video stream, so the
  Radio option renders disabled until entries are added to `RADIO_CHANNELS`.
- **The news reader has no data.** The overlay works and opens on an empty
  state; generating `news_data.js` needs a build pipeline that does not exist
  yet.
- **News-reader strings are English and Russian only.** Other locales fall
  back to English there; the rest of the interface is fully localized.

## Licence and support

Free to use. If it helps you, you can support the work at
[paypal.me/SultanKulbassov](https://www.paypal.me/SultanKulbassov).
