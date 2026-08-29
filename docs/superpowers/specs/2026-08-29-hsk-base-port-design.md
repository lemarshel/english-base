# English Base — Port of the HSK Base Engine

**Date:** 2026-08-29
**Status:** Approved, in implementation

## Goal

Make `english-base` look identical to and behave identically to `hsk-base`, with
English as the target language instead of Chinese. No word data in this pass —
the shell must boot cleanly with zero rows.

## Approach

Fork-and-adapt. `hsk-base`'s CSS and app logic are copied into `english-base`
and the Chinese-specific paths are surgically replaced. The look is identical
because it is the same stylesheet; the behaviour is identical because it is the
same 4,915-line engine (virtualized sections, worker-backed search, snapshots,
quiz, study, export).

Rejected: extracting a shared `lingua-bridge` engine (requires editing working
`hsk-base` production across two unlinked repos — revisit once `english-base`
shows which parts are genuinely generic). Rejected: clean rewrite (discards the
accumulated behaviour that took longest to get right).

## Row schema

| Slot | hsk-base | english-base |
|---|---|---|
| Headword | 汉字 | English word |
| Phonetics | pinyin | IPA |
| Translation | RU / EN gloss | RU / KK translation, EN definition |
| Example | 例句 + pinyin + translation | sentence + IPA + translation |
| Grouping | phonetic component | word root / affix |
| Level | HSK 1–6 | CEFR A1 A2 B1 B2 C1 C2 |

Six CEFR buttons replace six HSK buttons, so the toolbar row does not reflow.
Both HSK sorts become CEFR ascending / descending.

## Localization

The `RU | EN` toggle becomes a locale switcher. Selecting a locale changes
three things at once:

1. the Translation column
2. the translation under each example
3. every button and label in the interface

The headword, IPA, and example sentence are always English. Locales ship as
`en` (base), `ru`, `kk`; adding another is one more object in `i18n.js` with no
other edits.

- Elements carry `data-i18n="key"`.
- `applyLocale(code)` swaps label text and sets `body.loc-ru` / `body.loc-kk`
  (absent = `en`).
- Existing CSS display rules swap `.trans-ru` / `.trans-kk` / `.trans-def` and
  the `.ex-trans-*` spans.
- Alpha filter follows the locale: A–Z, А–Я (33), Kazakh Cyrillic (42, adding
  Ә Ғ Қ Ң Ө Ұ Ү Һ І).
- Persisted in `localStorage` under `eng_locale`.

In `en` locale the Translation column shows the English definition (`def`
field), empty until data arrives.

## File map

```
english-base/
  index.html          shell: toolbar, overlays, title, TOC, empty #word-tables-mount
  en.css              from hsk.css, selectors renamed
  en-head.js          from hsk-head.js — theme/palette before first paint
  en-body.js          from hsk-body.js — locale + column visibility
  en.js               from hsk.js, minus Chinese-only paths
  i18n.js             NEW — locale tables + applyLocale()
  js/render-words.js  NEW — builds table DOM from EN_WORDS + EN_GROUPS
  data/words-data.js  EN_WORDS = [] · EN_GROUPS = []
  tracker.js          copied, key prefix changed
  search-worker.js    copied, searches word / ipa / ru / kk
  text-topics.js      topic map, empty stub
  sortable.min.js     copied
  xlsx.full.min.js    copied
  channels.js         existing 427 entries, resplit TV / RADIO
  news_data.js        stub: { channels: [] }
```

## Rename map

Applied mechanically across CSS and JS.

| hsk-base | english-base |
|---|---|
| `.zh` / `.py` | `.wd` / `.ipa` |
| `.ex-zh` / `.ex-py` | `.ex-en` / `.ex-ipa` |
| `.trans-en` / `.ex-trans-en` | `.trans-kk` / `.ex-trans-kk` |
| `body.lang-en` | `body.loc-ru` / `body.loc-kk` |
| `data-py` | `data-ipa` |
| `data-hsk` | `data-cefr` |
| `data-radical` / `data-component` | `data-root` / `data-affix` |
| `h3.phonetic-group` | `h3.root-group` |
| `.hsk-badge` | `.cefr-badge` |
| localStorage `hsk_*` | `eng_*` |

## Dropped and repurposed

| hsk-base | english-base |
|---|---|
| `hanzi-writer.min.js`, `#hz-popup`, `showHz`, `wrapHanziInScope`, stroke practice | deleted |
| `window.EN_DICT` (~980 lines of ZH→EN fallback) | deleted |
| `getTone()` / `colorPinyin()` | `markStress()` — highlights the syllable after `ˈ` |
| 汉字 font row | Word font row |
| Search dropdown 中文 / Pinyin / Русский / English | Word / IPA / Русский / Қазақша |
| `speakZh()`, `zh-CN` voice | `speakEn()`, `en-US` voice |
| `segmentChinese()` caption tokenizer | whitespace tokenizer |
| "Показать фонемы" | "Show roots" |

## News

All 427 entries in the existing `channels.js` are video streams, so
`TV_CHANNELS` receives all of them and `RADIO_CHANNELS` starts empty — the
Radio option renders disabled until entries exist. The RSS reader overlay ports
in full but reads an empty `news_data.js` and shows an empty state.

## Empty state

The page must boot with zero rows: stats read 0, the table of contents is
empty, and every filter, sort, search, quiz, study, and export path tolerates an
empty row set without throwing. This is the main risk of the port and is
verified in a browser, not assumed.

## Out of scope

- Word data of any kind
- The RSS build pipeline (`news_build.py` equivalent)
- Radio channel entries
- Extracting a shared engine across both repos
