# English Base — Architecture

## Overview

Word content is separate from presentation. `data/words-data.js` holds two
arrays; `js/render-words.js` turns them into the table DOM; `en.js` then scans
that DOM and drives everything else.

```
lemmas_60k.xlsx           source frequency list
        │
        └─ tools/build_words.py
                │
                ├─ data/words.json        portable JSON
                └─ data/words-data.js     GENERATED — do not hand-edit
                     window.EN_WORDS      vocabulary records
                     window.EN_GROUPS     groups and where POS headings fall
                          │
                          └─ js/render-words.js   builds #word-tables-mount
                                  │                and the table of contents
                                  └─ en.js        scans the rendered DOM
```

Script order in `index.html` matters:

```
en-head.js          theme + palette before first paint
en-body.js          locale + column visibility before content paint
i18n.js             locale tables
channels.js         TV / radio stream lists
news_data.js        offline news reader data
data/words-data.js  vocabulary
js/render-words.js  builds the DOM
en.js               application logic (scans the DOM above)
text-topics.js      topic mapping, applied to the rendered rows
xlsx.full.min.js    deferred, only needed for export
```

The page is static: no build step, no server-side code. It needs a static file
server rather than `file://` because search runs in a Web Worker.

---

## Module scopes in en.js

`en.js` has three scopes, and the boundaries matter when adding code:

1. **File scope** (top of the file) — locale helpers (`localeCode`, `T`,
   `transSel`, `alphaAttr`, `wordsLabel`) and the CEFR model (`CEFR_LEVELS`,
   `CEFR_ORDER`, `CEFR_COLORS`, `cefrOf`). Anything both module scopes need
   lives here.
2. **Module scope 1** — DOM indexing, persistence, stress marking, CEFR badges
   and stats, text to speech, column toggles, group collapse, drag ordering.
3. **Module scope 2** — palette, locale switching, search, filters, sorting,
   virtualization, study, quiz, snapshots, export, news.

Scope 2 cannot see scope 1's locals. Where it needs them, scope 1 assigns to
`window` and scope 2 picks them up at its top (`speakEn`, `stopAllAudio`) or
uses the `window.*` form directly (`getMainRows`, `getAllTbodies`, `_allRows`).
Several bugs in the original came from ignoring this; keep new shared helpers
at file scope.

---

## words-data.js — field reference

### EN_WORDS

| Field | Values | Used by |
|---|---|---|
| `id` | integer | ordering only |
| `word` | the English headword | `data-key`; search; TTS; sort |
| `ipa` | IPA, with `ˈ` / `ˌ` stress marks | `data-ipa`; search; stress highlighting |
| `ru` | Russian translation | `data-ru`; shown in the `ru` locale; alpha filter |
| `kk` | Kazakh translation | `data-kk`; shown in the `kk` locale; alpha filter |
| `def` | English definition | `data-def`; shown in the `en` locale, with Russian fallback while empty |
| `pos` | `pos_noun` `pos_verb` `pos_adj` `pos_adv` `pos_det` `pos_interj` `pos_conj` `pos_prep` `pos_pron` | `data-section`; section headings |
| `group` | id of an `EN_GROUPS` entry | which `<tbody>` the row lands in |
| `root` | word root, e.g. `spect` | `data-root`; Root A–Z sort |
| `affix` | prefix or suffix, e.g. `in-` | `data-affix`; Affix A–Z sort |
| `cefr` | `a1` `a2` `b1` `b2` `c1` `c2` | `data-cefr`; level filter; badge; CEFR sort |
| `ex` | example sentence | example column; TTS |
| `ex_ipa` | IPA of the example | example column; stress highlighting |
| `ex_ru` | Russian translation of the example | shown in the `ru` locale |
| `ex_kk` | Kazakh translation of the example | shown in the `kk` locale |
| `ex_def` | English paraphrase of the example | shown in the `en` locale |
| `rank`, `per_mil` | overall COCA rank and occurrences per million | frequency-rank filter and profile baseline |
| `coca_pos` | exact source code: `n v j r p i a d c m u e` | `data-coca-pos`; POS filter |
| `disp`, `range` | dispersion and corpus range | General profile |
| `spok_pm`, `tvm_pm` | normalized spoken and TV/movie frequency | Conversational profile |
| `fic_pm`, `acad_pm`, `news_pm`, `mag_pm`, `web_pm`, `blog_pm` | normalized genre frequencies | genre profiles |
| `caps_pct`, `all_caps_pct` | capitalization shares | likely name/acronym heuristic |

Empty translation fields are skipped rather than rendered empty, so the CSS
`:has()` rules can hide the wrapper cleanly. First letters of example
translations are capitalised automatically.

### EN_GROUPS

| Field | Purpose |
|---|---|
| `id` | becomes the `<tbody>` id; referenced by each word's `group` |
| `root` / `root_key` | display root and its lowercase sort key |
| `affix` / `affix_key` | display affix and its lowercase sort key |
| `standalone` | `true` for the catch-all group; sets `data-standalone`, which the merge logic and locale switching key off instead of matching translated text |
| `pos_heading_before` | a POS id to emit an `<h2>` before this group, or `null` |

---

## Filter → attribute mapping

| Control | Class added to `<tr>` | Attribute read |
|---|---|---|
| POS buttons | `pos-hide` | `data-coca-pos` |
| COCA profile, rank, capitalization | `coca-hide` | `data-coca-*` metrics |
| CEFR buttons | `cefr-hide` | `data-cefr` |
| Alphabet | `alpha-hide` | `data-key` (en) / `data-ru` (ru) / `data-kk` (kk) |
| Text buttons 1–40 | `text-hide` | `data-text`, set by `text-topics.js` at runtime |
| Search | `sr-hide` | worker match on `data-key` / `data-ipa` / `data-ru` / `data-kk` / `data-def` |
| Sort: Word A–Z | DOM reorder | `data-key` |
| Sort: Root A–Z | DOM reorder | `data-root-key` |
| Sort: Affix A–Z | DOM reorder | `data-affix-key` |
| Sort: CEFR ↑ / ↓ | DOM reorder | `data-cefr` via `CEFR_ORDER` |

Column visibility uses `body.hide-{num,word,trans,ex}` targeting `[data-col]`.
It is bound to **right-click** on the column buttons and table headers.

---

## Locale → displayed content

The active locale is a class on `<body>`: `loc-ru`, `loc-kk`, or nothing for
`en`. `setLang(code)` reads `window.I18N[code]` and applies it.

| Element | `en` | `ru` | `kk` |
|---|---|---|---|
| `.trans-def` | visible | hidden | hidden |
| `.trans-ru` | hidden | visible | hidden |
| `.trans-kk` | hidden | hidden | visible |
| `.ex-trans-*` | same pattern, as blocks | | |
| Alphabet panel | `#alpha-en-wrap` | `#alpha-ru-wrap` | `#alpha-kk-wrap` |

Most labels are declarative: elements carry `data-i18n`, `data-i18n-title`, or
`data-i18n-ph` and `setLang` fills them from the table. Only the parts carrying
live counts (stats bar, word count, table of contents) are rebuilt in code.

Counts come from `window._allRows`, not from a DOM query — lazy section
rendering detaches offscreen rows, so querying the DOM undercounts.

### Adding a language

1. Add an object to `i18n.js` and list its code in `_order`.
2. Add an `alpha-<code>-wrap` block in `index.html` if the alphabet is new.
3. Add one `.ex-trans` hide rule to `en.css` and extend the
   `body:not(.loc-…)` guard on the `en` rule.
4. Add `<span class="trans-<code>">` to `render-words.js`.

`en` is the base locale and must define every key; other locales fall back to
it. The plural helper `wordsLabel()` deliberately does **not** fall back across
locales, so a language without `words_one` uses its own plural rather than
English's singular.

---

## Rendering and performance

Carried over from hsk-base, and worth knowing about when debugging:

- **Lazy sections are disabled** (`LAZY_SECTIONS = false`). The mechanism
  detached whole POS sections from the document, so the page height collapsed to
  a fraction of its real size and rebuilt itself as each section scrolled back
  in. Measured with 5,000 words, the document height swung between 25,000px and
  155,000px and `scrollTo` missed its target by up to 120,000px — the page
  scrolled at "light speed", and 8 of 9 sections rendered with no rows at all.
- **Row virtualization is disabled** (`VIRTUAL_ROWS = false`). It renders a
  window of rows with spacer padding sized from an *estimated* row height, which
  left the document height drifting by ~4,600px while scrolling. With today's
  light rows the whole table renders comfortably: turning it off pinned the
  height swing at zero and made scrolling 4x cheaper (1508ms to 375ms across
  twelve jumps). Turn it back on when translations and examples make rows
  expensive — `measureRowHeight()` now derives the height from a laid-out row
  rather than falling back to a hardcoded 28px, which was about half the real
  49px and was the source of the drift.
- **Group size matters.** The vocabulary is split into ~135 groups — one per
  initial letter within each part of speech — rather than one giant group per
  section. That bounds any estimation error and matches the shape hsk-base has
  with its phonetic groups.
- **Flat filtered view.** Any active search, level filter, topic filter, or
  non-default sort switches to a single flat table in `#filtered-view`; the
  sectioned view returns when everything is cleared.
- **Group merging.** With root headers hidden, groups smaller than three words
  merge into the standalone-words group.

---

## Responsive behaviour

| Viewport | Behaviour |
|---|---|
| > 900px | full layout, fixed column proportions |
| ≤ 900px | table fills the width; columns rescale proportionally |
| ≤ 600px | example column hidden; word and translation split 45 / 55 |

Below 768px a mobile header with a hamburger replaces the inline toolbar.

---

## localStorage keys

| Key | Holds |
|---|---|
| `eng_learned` / `eng_fam` | learned and familiar word lists |
| `eng_mode` | `light` / `dark` / `sepia` |
| `eng_palette` | accent palette name |
| `eng_locale` | `en` / `ru` / `kk` |
| `eng_prefs` | font family and size choices |
| `eng_snapshots` | saved progress snapshots |
| `eng_row_order` | manual drag ordering |
| `eng-hide-{num,word,trans,ex}` | hidden columns |
| `eng-speed` / `eng-volume` | speech settings |
| `ph_hidden` | whether root group headers are hidden |

Reset clears every key beginning with `eng`.

---

## Building the word data

`data/words-data.js` and `data/words.json` are generated by
`tools/build_words.py` from a COCA-style frequency spreadsheet
(`rank`, `lemma`, `PoS`, `perMil`, `disp`, `range`, normalized `*PM` genre
columns, `%caps`, and `%allC`):

```bash
python tools/build_words.py ~/Downloads/lemmas_60k.xlsx --limit 5000
```

Neither output is hand-edited. The script:

- drops slashed alternatives and date compounds (`his/her`, `mid-1930s`)
- sorts by frequency rank and takes the first `--limit` entries
- maps the source PoS codes to the nine rendered sections
- retains the exact source PoS code for filtering
- retains only normalized per-million genre columns, never raw genre counts
- merges translations from `data/ru/*.json` and `data/kk/*.json`
- approximates a CEFR band from frequency rank
- emits one group per section, all marked `standalone` until morphology data
  exists
- writes empty `def`, `ipa`, `ex`, `ex_ipa`, `ex_ru`, `ex_kk` and `ex_def`
  fields, so the slots are present and ready to fill

### PoS code mapping

| Source | Section | Note |
|---|---|---|
| `n` | `pos_noun` | |
| `v` | `pos_verb` | |
| `j` | `pos_adj` | |
| `r`, `e` | `pos_adv` | `e` is existential *there* |
| `m`, `a`, `d` | `pos_det` | numerals, articles, determiners |
| `u` | `pos_interj` | |
| `c` | `pos_conj` | |
| `i` | `pos_prep` | |
| `p` | `pos_pron` | |

### CEFR approximation

CEFR is not in the source. `CEFR_BANDS` maps frequency rank to a level:
≤1000 → A1, ≤2500 → A2, ≤5000 → B1, ≤10000 → B2, ≤20000 → C1, above → C2.
This is a proxy, not measured data — replace the table when real level
information is available.

Each record keeps its source metrics as provenance and exposes them through
`data-coca-*` row attributes. Genre profiles compare `*PM` against overall
`perMil`; General requires `disp >= 0.90` and `range >= 100`. The optional
capitalization filter treats `%caps >= 0.80` or `%allC >= 0.50` as likely
proper-name/acronym noise.
