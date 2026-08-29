# English Base

The English module of **Lingua Bridge** — a vocabulary study interface for
learners of English, with Russian and Kazakh as the translation languages.

It runs the same engine as [hsk-base](https://github.com/lemarshel/hsk-base),
adapted for English: IPA in place of pinyin, word roots in place of phonetic
components, and CEFR levels in place of HSK levels.

**There is no vocabulary in the repository yet.** The interface is complete and
every control works; `data/words-data.js` holds two empty arrays waiting for
data.

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

## Adding vocabulary

Fill in the two arrays in `data/words-data.js`; `js/render-words.js` builds the
tables from them and everything downstream reads the DOM it produces. The full
field reference is in the header comment of that file, and in
[docs/architecture.md](docs/architecture.md).

```js
window.EN_GROUPS = [
  { id:'g_spect', root:'spect', root_key:'spect', affix:'in-', affix_key:'in',
    standalone:false, pos_heading_before:'pos_noun' }
];
window.EN_WORDS = [
  { id:1, word:'inspect', ipa:'ɪnˈspekt',
    ru:'осматривать; проверять', kk:'қарау; тексеру',
    def:'to look at something closely',
    pos:'pos_verb', group:'g_spect', root:'spect', affix:'in-', cefr:'b1',
    ex:'Please inspect the goods on arrival.', ex_ipa:'pliːz ɪnˈspekt ðə ɡʊdz ɒn əˈraɪvl',
    ex_ru:'Пожалуйста, осмотрите товар при получении.',
    ex_kk:'Тауарды алған кезде тексеріңіз.', ex_def:'' }
];
```

Mark stress in the IPA with `ˈ` (primary) and `ˌ` (secondary) — the stressed
syllable is highlighted automatically.

## What the interface does

- **Search** across headword, IPA, or the active translation, off the main
  thread via `search-worker.js`
- **Filters** by CEFR level, part of speech, first letter, and study topic
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

- **No vocabulary yet** — that is the next piece of work.
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
