"""Import the supplied practice bank without changing its questions or answer key."""
import json
import re
import sys
from pathlib import Path

source = Path(sys.argv[1]).read_text(encoding='utf-8')
def clean(value):
    return re.sub(r'\s+', ' ', value).replace('\\$', '$').replace('**', '').strip()

chapters = []
for part in re.split(r'^# Chapter ', source, flags=re.M)[1:]:
    number, title = part.split('\n', 1)[0].split(': ', 1)
    chapter = {'id': int(number), 'title': title, 'modules': []}
    chapter['focus'] = clean(re.search(r'\*\*Focus:\*\* (.*?)(?=\n##)', part, re.S)[1])
    for letter in ('A', 'B'):
        section = re.search(r'## Test Module ' + letter + r'.*?\n(.*?)(?=### STOP)', part, re.S)[1]
        key = re.search(r'### Module ' + letter + r'\n(.*?)(?=\n###|\n\*\*Scoring)', part, re.S)[1]
        answers = {int(n): (a, clean(e)) for n, a, e in re.findall(r'(\d+)\.\s+\*\*([A-D])\*\* --- (.*?)(?=\n\d+\.|\Z)', key, re.S)}
        questions = []
        for n, block in re.findall(r'### (\d+)\. (.*?)(?=\n###|\Z)', section, re.S):
            stem = block.split('\n-')[0]
            options = re.findall(r'-\s+\*\*([A-D])\.\*\* (.*?)(?=\n-\s+\*\*|\Z)', block, re.S)
            answer, explanation = answers[int(n)]
            assert len(options) == 4
            questions.append({'number': int(n), 'text': clean(stem), 'options': [{'id': a, 'text': clean(t)} for a, t in options], 'answer': answer, 'explanation': explanation})
        assert len(questions) == 10
        chapter['modules'].append({'id': letter, 'title': 'Scenario challenge' if letter == 'A' else 'Exam practice', 'questions': questions})
    chapters.append(chapter)
assert len(chapters) == 10
Path('assets/ains-assessment-data.js').write_text('window.AINS_CHAPTERS = ' + json.dumps(chapters, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print('Imported 10 chapters, 20 modules, 200 questions and supplied answers.')
