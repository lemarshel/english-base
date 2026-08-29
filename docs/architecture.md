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
| `def` | English definition | `data-def`; shown in the `en` locale |
| `pos` | `pos_noun` `pos_verb` `pos_adj` `pos_adv` `pos_det` `pos_interj` `pos_conj` `pos_prep` `pos_pron` | `data-section`; POS filter; section headings |
| `group` | id of an `EN_GROUPS` entry | which `<tbody>` the row lands in |
| `root` | word root, e.g. `spect` | `data-root`; Root A–Z sort |
| `affix` | prefix or suffix, e.g. `in-` | `data-affix`; Affix A–Z sort |
| `cefr` | `a1` `a2` `b1` `b2` `c1` `c2` | `data-cefr`; level filter; badge; CEFR sort |
| `ex` | example sentence | example column; TTS |
| `ex_ipa` | IPA of the example | example column; stress highlighting |
| `ex_ru` | Russian translation of the example | shown in the `ru` locale |
| `ex_kk` | Kazakh translation of the example | shown in the `kk` locale |
| `ex_def` | English paraphrase of the example | shown in the `en` locale |

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
| POS buttons | `pos-hide` | `data-section` |
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

- **Lazy sections.** POS sections more than 600px outside the viewport are
  detached from the DOM and reattached by an `IntersectionObserver`. Rows in a
  detached section are absent from `document.querySelectorAll`, so read
  `window._allRows` when you need the full set.
- **Row virtualization.** Long tbodies render a window of rows with spacer
  padding above and below.
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
(`rank`, `lemma`, `PoS`, `freq`, …):

```bash
python tools/build_words.py ~/Downloads/lemmas_60k.xlsx --limit 5000
```

Neither output is hand-edited. The script:

- drops slashed alternatives and date compounds (`his/her`, `mid-1930s`)
- sorts by frequency rank and takes the first `--limit` entries
- maps the source PoS codes to the nine rendered sections
- approximates a CEFR band from frequency rank
- emits one group per section, all marked `standalone` until morphology data
  exists
- writes empty `ru`, `kk`, `def`, `ipa`, `ex`, `ex_ipa`, `ex_ru`, `ex_kk` and
  `ex_def` fields, so the slots are present and ready to fill

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

Each record keeps its source `rank` as provenance; nothing in the interface
reads it.
