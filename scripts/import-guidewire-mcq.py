"""Rebuild assets/guidewire-assessment-data.js from the 18-module MCQ markdown bank.

Usage: python scripts/import-guidewire-mcq.py path/to/guidewire-mcq-bank.md

Flat structure: 18 modules x 10 questions, no chapter nesting. Options are
kept in the exact A/B/C/D order given in the markdown, and the answer letter
is copied verbatim from the bolded letter in the "Answer Key & Explanations"
section -- nothing is reordered, so the key can never drift out of sync with
the question text.
"""
import json
import re
import sys
from pathlib import Path

src = Path(sys.argv[1]).read_text(encoding='utf-8')


def clean(s):
    s = re.sub(r'\s+', ' ', s).strip()
    s = s.replace('\\<', '<').replace('\\>', '>').replace('\\$', '$').replace('\\*', '*')
    return s


parts = re.split(r'^# Module (\d+): (.+?)\s*$', src, flags=re.M)
assert len(parts) == 1 + 18 * 3, f"expected 18 modules, got {(len(parts) - 1) // 3}"

modules = []
for i in range(18):
    num = int(parts[1 + i * 3])
    title = parts[2 + i * 3].strip()
    body = parts[3 + i * 3]

    q_section, _, a_section_rest = body.partition('## Answer Key & Explanations')
    a_section = a_section_rest.split('\n------', 1)[0]

    q_blocks = re.split(r'^### Question (\d+)\s*$', q_section, flags=re.M)[1:]
    questions_by_num = {}
    for j in range(0, len(q_blocks), 2):
        qnum = int(q_blocks[j])
        block = q_blocks[j + 1]
        stem_part, _, options_part = block.partition('-   **A.**')
        stem = clean(stem_part)
        options_part = '-   **A.**' + options_part
        opt_matches = re.findall(
            r'-\s+\*\*([A-D])\.\*\*\s*(.*?)(?=\n-\s+\*\*[A-D]\.\*\*|\Z)',
            options_part, re.S)
        assert len(opt_matches) == 4, f"module {num} Q{qnum}: found {len(opt_matches)} options"
        options = [{'id': letter, 'text': clean(text)} for letter, text in opt_matches]
        questions_by_num[qnum] = {'text': stem, 'options': options}
    assert len(questions_by_num) == 10, f"module {num}: found {len(questions_by_num)} questions"

    ans_matches = re.findall(
        r'^(\d+)\.\s+\*\*([A-D])\*\*\.\s*(.*?)(?=\n\d+\.\s+\*\*[A-D]\*\*\.|\Z)',
        a_section, re.S | re.M)
    assert len(ans_matches) == 10, f"module {num}: found {len(ans_matches)} answers"

    questions = []
    for anum, letter, expl in ans_matches:
        anum = int(anum)
        q = questions_by_num[anum]
        opt_ids = {o['id'] for o in q['options']}
        assert letter in opt_ids, f"module {num} Q{anum}: answer {letter} not among options {opt_ids}"
        questions.append({
            'number': anum,
            'text': q['text'],
            'options': q['options'],
            'answer': letter,
            'explanation': clean(expl),
        })
    questions.sort(key=lambda q: q['number'])
    assert [q['number'] for q in questions] == list(range(1, 11))

    modules.append({'id': num, 'title': title, 'questions': questions})

assert [m['id'] for m in modules] == list(range(1, 19))
total_q = sum(len(m['questions']) for m in modules)
assert total_q == 180

Path('assets/guidewire-assessment-data.js').write_text(
    'window.GUIDEWIRE_MODULES = ' + json.dumps(modules, ensure_ascii=False, indent=2) + ';\n',
    encoding='utf-8')
print(f"Imported {len(modules)} modules, {total_q} questions.")
