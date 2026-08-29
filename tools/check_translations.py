#!/usr/bin/env python
"""Sanity-check the translation files against the generated word list.

Catches the mistakes that are easy to make by hand: an entry left in English,
a key that matches no word, and words still waiting for a translation.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CYRILLIC = re.compile(r'[А-Яа-яЁёӘҒҚҢӨҰҮҺІ]')


def main():
    words = json.loads((ROOT / 'data' / 'words.json').read_text(encoding='utf-8'))['words']
    by_pos = {}
    for w in words:
        by_pos.setdefault(w['pos'], set()).add(w['word'])

    problems = {'untranslated_value': [], 'unknown_key': [], 'empty_value': []}
    seen = {}

    for lang in ('ru', 'kk'):
        folder = ROOT / 'data' / lang
        if not folder.is_dir():
            continue
        for path in sorted(folder.glob('*.json')):
            data = json.loads(path.read_text(encoding='utf-8'))
            for pos, entries in data.items():
                for word, tr in entries.items():
                    seen.setdefault(pos, set()).add(word)
                    if word not in by_pos.get(pos, ()):
                        problems['unknown_key'].append('%s: %s/%s' % (path.name, pos, word))
                    if not tr.strip():
                        problems['empty_value'].append('%s: %s' % (path.name, word))
                    elif not CYRILLIC.search(tr):
                        problems['untranslated_value'].append(
                            '%s: %s -> %r' % (path.name, word, tr))

    missing = {}
    for pos, wordset in by_pos.items():
        gap = sorted(wordset - seen.get(pos, set()))
        if gap:
            missing[pos] = gap

    ok = True
    for label, items in problems.items():
        if items:
            ok = False
            print('%s (%d):' % (label, len(items)))
            for i in items[:40]:
                print('  ' + i)
            if len(items) > 40:
                print('  ... and %d more' % (len(items) - 40))

    total_missing = sum(len(v) for v in missing.values())
    if total_missing:
        print('missing translations: %d' % total_missing)
        for pos, gap in sorted(missing.items()):
            print('  %-12s %4d   e.g. %s' % (pos, len(gap), ', '.join(gap[:8])))
    elif ok:
        print('all clear: every word translated, no stray keys')

    return 0 if ok and not total_missing else 1


if __name__ == '__main__':
    sys.exit(main())
