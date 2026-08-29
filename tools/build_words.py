#!/usr/bin/env python
"""Convert the COCA-style lemma frequency spreadsheet into the site's word data.

Reads an .xlsx with columns rank / lemma / PoS / freq / ... and writes:

    data/words.json      the vocabulary as plain JSON
    data/words-data.js   the same records as the two globals index.html loads

Translation, definition, and example fields are emitted empty — the slots exist
so they can be filled in later without touching the schema.

    python tools/build_words.py ~/Downloads/lemmas_60k.xlsx --limit 5000
"""
import argparse
import json
import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent

# COCA part-of-speech codes -> the nine sections the interface renders.
POS_MAP = {
    'n': 'pos_noun',
    'v': 'pos_verb',
    'j': 'pos_adj',
    'r': 'pos_adv',
    'e': 'pos_adv',      # existential "there"
    'm': 'pos_det',      # numerals behave as determiners in English
    'a': 'pos_det',      # articles
    'd': 'pos_det',
    'u': 'pos_interj',
    'c': 'pos_conj',
    'i': 'pos_prep',
    'p': 'pos_pron',
}

# Section order, matching the table of contents in js/render-words.js.
POS_ORDER = ['pos_noun', 'pos_verb', 'pos_adj', 'pos_adv', 'pos_det',
             'pos_interj', 'pos_conj', 'pos_prep', 'pos_pron']

# CEFR is not in the source, so it is approximated from frequency rank. These
# bands are a rough proxy, not measured levels — replace them when real CEFR
# data is available.
CEFR_BANDS = [(1000, 'a1'), (2500, 'a2'), (5000, 'b1'),
              (10000, 'b2'), (20000, 'c1')]


def cefr_for(rank):
    for limit, level in CEFR_BANDS:
        if rank <= limit:
            return level
    return 'c2'


def load_translations(kind):
    """Merge every data/<kind>/*.json into {pos: {word: translation}}.

    Translations live apart from the generated word data so the list can be
    rebuilt from the spreadsheet without losing them, and so each part of speech
    can be worked on in its own file.
    """
    merged = {}
    folder = ROOT / 'data' / kind
    if not folder.is_dir():
        return merged
    for path in sorted(folder.glob('*.json')):
        with path.open(encoding='utf-8') as f:
            data = json.load(f)
        for pos, entries in data.items():
            merged.setdefault(pos, {}).update(entries)
    return merged


def usable(lemma):
    """Skip slashed alternatives and date compounds — 'his/her', 'mid-1930s'."""
    if not lemma:
        return False
    text = str(lemma).strip()
    if not text or '/' in text or any(ch.isdigit() for ch in text):
        return False
    return bool(re.match(r"^[A-Za-z][A-Za-z'\- ]*$", text))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('xlsx')
    ap.add_argument('--limit', type=int, default=5000)
    ap.add_argument('--sheet', default=None)
    args = ap.parse_args()

    wb = openpyxl.load_workbook(args.xlsx, read_only=True)
    ws = wb[args.sheet] if args.sheet else wb[wb.sheetnames[0]]

    rows = []
    for rank, lemma, pos, *_ in ws.iter_rows(min_row=2, values_only=True):
        if rank is None or not usable(lemma):
            continue
        rows.append((int(rank), str(lemma).strip(), (pos or '').strip()))

    rows.sort(key=lambda r: r[0])          # most frequent first
    rows = rows[:args.limit]

    ru = load_translations('ru')
    kk = load_translations('kk')

    words = []
    for i, (rank, lemma, pos) in enumerate(rows, start=1):
        section = POS_MAP.get(pos, 'pos_noun')
        words.append({
            'id': i,
            'word': lemma,
            'ipa': '',
            'ru': ru.get(section, {}).get(lemma, ''),
            'kk': kk.get(section, {}).get(lemma, ''),
            'def': '',
            'pos': section,
            'group': 'g_' + section.replace('pos_', ''),
            'root': '',
            'affix': '',
            'cefr': cefr_for(rank),
            'ex': '',
            'ex_ipa': '',
            'ex_ru': '',
            'ex_kk': '',
            'ex_def': '',
            'rank': rank,
        })

    # Group by first letter inside each part of speech.
    #
    # The size matters as much as the grouping: the row virtualizer estimates a
    # tbody's height from a single measured row, so a 2400-row tbody turns a
    # few pixels of error into thousands, and the page height thrashes while
    # scrolling. Small groups keep that error bounded — the same shape hsk-base
    # has with its phonetic groups. Headers are hidden by default anyway.
    words.sort(key=lambda w: (POS_ORDER.index(w['pos']), w['word'][0].lower(), w['rank']))

    groups = []
    seen_pos = set()
    for w in words:
        letter = w['word'][0].upper()
        gid = 'g_%s_%s' % (w['pos'].replace('pos_', ''), letter.lower())
        w['group'] = gid
        if gid in {g['id'] for g in groups}:
            continue
        first_of_section = w['pos'] not in seen_pos
        seen_pos.add(w['pos'])
        groups.append({
            'id': gid,
            'label': letter,          # rendered instead of a root
            'root': '',
            'root_key': '',
            'affix': '',
            'affix_key': '',
            'standalone': False,
            'pos_heading_before': w['pos'] if first_of_section else None,
        })

    for i, w in enumerate(words, start=1):
        w['id'] = i

    (ROOT / 'data').mkdir(exist_ok=True)

    # One record per line: valid JSON, but diffable and a third the size of
    # a fully indented dump.
    def compact(obj):
        return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))

    with (ROOT / 'data' / 'words.json').open('w', encoding='utf-8') as f:
        f.write('{\n"groups": [\n')
        for i, g in enumerate(groups):
            f.write(compact(g) + (',' if i < len(groups) - 1 else '') + '\n')
        f.write('],\n"words": [\n')
        for i, w in enumerate(words):
            f.write(compact(w) + (',' if i < len(words) - 1 else '') + '\n')
        f.write(']\n}\n')

    header = (
        '/* ==========================================================================\n'
        '   English Base — word data\n'
        '   --------------------------------------------------------------------------\n'
        '   GENERATED by tools/build_words.py — do not hand-edit the arrays below;\n'
        '   edit data/words.json and regenerate, or extend the build script.\n'
        '\n'
        '   Translation (ru / kk), definition (def), example (ex) and the example\n'
        '   translations are intentionally empty — the slots are here to be filled in.\n'
        '   Field reference: docs/architecture.md\n'
        '   ========================================================================== */\n'
    )
    with (ROOT / 'data' / 'words-data.js').open('w', encoding='utf-8') as f:
        f.write(header)
        f.write('window.EN_GROUPS = ' + json.dumps(groups, ensure_ascii=False) + ';\n')
        f.write('window.EN_WORDS = [\n')
        for i, w in enumerate(words):
            comma = ',' if i < len(words) - 1 else ''
            f.write(json.dumps(w, ensure_ascii=False, separators=(',', ':')) + comma + '\n')
        f.write('];\n')

    counts = {}
    for w in words:
        counts[w['pos']] = counts.get(w['pos'], 0) + 1
    levels = {}
    for w in words:
        levels[w['cefr']] = levels.get(w['cefr'], 0) + 1

    print('words: %d   rank span: %d-%d'
          % (len(words), min(w['rank'] for w in words), max(w['rank'] for w in words)))
    print('sections:', {k: counts[k] for k in POS_ORDER if k in counts})
    print('cefr:', {k: levels[k] for k in ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] if k in levels})

    for lang in ('ru', 'kk'):
        done = sum(1 for w in words if w[lang])
        if done or lang == 'ru':
            missing = {}
            for w in words:
                if not w[lang]:
                    missing[w['pos']] = missing.get(w['pos'], 0) + 1
            print('%s: %d/%d translated' % (lang, done, len(words)),
                  ('| missing: ' + str(missing)) if missing else '| complete')


if __name__ == '__main__':
    main()
