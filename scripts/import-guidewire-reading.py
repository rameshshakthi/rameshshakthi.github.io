"""Rebuild guidewire-assurance-analyst.html from the source study-material markdown.

Usage: python scripts/import-guidewire-reading.py path/to/guidewire-study-material.md

Mechanical, line-based conversion so every numbered section is transcribed
faithfully rather than hand-retyped. Produces one <div class="unit"> block
per section, using the same .callout/.diagram/.unit h4 vocabulary as the
AINS-21 chapter pages so it matches the site's existing reading-page design,
then wraps the result in the page shell (nav, hero, TOC, footer).
"""
import html
import re
import sys
from pathlib import Path

src = Path(sys.argv[1]).read_text(encoding='utf-8')
OUT = Path('guidewire-assurance-analyst.html')


def inline(text):
    text = text.strip()
    text = html.escape(text, quote=False)
    text = text.replace('\\&lt;', '&lt;').replace('\\&gt;', '&gt;')
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    return text


def norm(lines):
    return inline(' '.join(l.strip() for l in lines))


def render_body(body_lines):
    out = []
    i = 0
    n = len(body_lines)

    def peek_nonblank(j):
        while j < n and not body_lines[j].strip():
            j += 1
        return j

    guard = 0
    while i < n:
        guard += 1
        if guard > 5000:
            raise RuntimeError(f"non-terminating parse at i={i} line={body_lines[i]!r}")
        line = body_lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        m = re.match(r'^```\s*(\w*)\s*$', stripped)
        if m:
            i += 1
            code_lines = []
            while i < n and not re.match(r'^```\s*$', body_lines[i].strip()):
                code_lines.append(body_lines[i])
                i += 1
            i += 1
            code = '\n'.join(code_lines).rstrip('\n')
            out.append(f'<pre class="diagram">{html.escape(code, quote=False)}</pre>')
            continue

        if stripped.startswith('>'):
            quote_lines = []
            while i < n and body_lines[i].strip().startswith('>'):
                q = body_lines[i].strip()[1:].strip()
                quote_lines.append(q)
                i += 1
            paras, cur = [], []
            for q in quote_lines:
                if not q:
                    if cur:
                        paras.append(cur); cur = []
                else:
                    cur.append(q)
            if cur:
                paras.append(cur)
            label = None
            first_joined = ' '.join(paras[0]) if paras else ''
            lm = re.match(r'^\*\*(.+?):\*\*\s*(.*)$', first_joined)
            body_paras = paras
            if lm:
                label = lm.group(1)
                rest = lm.group(2)
                body_paras = ([[rest]] if rest else []) + paras[1:]
            cls = 'callout--trap' if (label or '').lower() in ('important',) else ''
            label_html = f'<span class="callout-label">{html.escape(label)}</span>' if label else ''
            out.append(f'<div class="callout {cls}">{label_html}' +
                       ''.join(f'<p>{norm(p)}</p>' for p in body_paras) + '</div>')
            continue

        m = re.match(r'^(##|###)\s+(.*)$', stripped)
        if m:
            heading = m.group(2).strip()
            j = peek_nonblank(i + 1)
            if heading.lower() == 'example' and j < n:
                i = j
                para_lines = []
                while i < n and body_lines[i].strip() and not re.match(r'^(#|>|```|-\s|\d+\.\s)', body_lines[i].strip()):
                    para_lines.append(body_lines[i]); i += 1
                out.append(f'<div class="callout callout--example"><span class="callout-label">Example</span><p>{norm(para_lines)}</p></div>')
                continue
            out.append(f'<h4>{inline(heading)}</h4>')
            i += 1
            continue

        if re.match(r'^-\s+', stripped):
            items = []
            while i < n and re.match(r'^-\s+', body_lines[i].strip()):
                item_lines = [re.sub(r'^-\s+', '', body_lines[i].strip())]
                i += 1
                while i < n and body_lines[i].strip() and not re.match(r'^(-\s|\d+\.\s|#|>|```)', body_lines[i].strip()):
                    item_lines.append(body_lines[i].strip()); i += 1
                items.append(norm(item_lines))
            out.append('<ul>' + ''.join(f'<li>{it}</li>' for it in items) + '</ul>')
            continue

        if re.match(r'^\d+\.\s+', stripped):
            items = []
            while i < n and re.match(r'^\d+\.\s+', body_lines[i].strip()):
                item_lines = [re.sub(r'^\d+\.\s+', '', body_lines[i].strip())]
                i += 1
                while i < n and body_lines[i].strip() and not re.match(r'^(-\s|\d+\.\s|#|>|```)', body_lines[i].strip()):
                    item_lines.append(body_lines[i].strip()); i += 1
                items.append(norm(item_lines))
            out.append('<ol>' + ''.join(f'<li>{it}</li>' for it in items) + '</ol>')
            continue

        para_lines = []
        while i < n and body_lines[i].strip() and not re.match(r'^(#|>|```|-\s|\d+\.\s)', body_lines[i].strip()):
            para_lines.append(body_lines[i]); i += 1
        if not para_lines:
            para_lines = [body_lines[i]]; i += 1
        out.append(f'<p>{norm(para_lines)}</p>')

    return '\n      '.join(out)


section_re = re.compile(r'^# (\d+)\.\s+(.+?)\s*$', re.M)
matches = list(section_re.finditer(src))
assert matches, "no numbered '# N. Title' sections found in the source markdown"

units_html_parts = []
toc_items = []
for idx, m in enumerate(matches):
    num = int(m.group(1))
    title = m.group(2).strip()
    start = m.end()
    end = matches[idx + 1].start() if idx + 1 < len(matches) else len(src)
    body = re.sub(r'\n-{5,}\s*\Z', '', src[start:end])
    body_html = render_body(body.split('\n'))
    uid = f'u{num}'
    units_html_parts.append(
        f'<div class="unit reveal" id="{uid}">\n'
        f'      <span class="unit-num">Section {num:02d}</span>\n'
        f'      <h2 class="unit-title">{inline(title)}</h2>\n'
        f'      {body_html}\n'
        f'    </div>'
    )
    toc_items.append(f'<li><span class="toc-n">{num:02d}</span><a href="#{uid}">{inline(title)}</a></li>')

units_html = '\n\n    '.join(units_html_parts)
toc_html = '\n      '.join(toc_items)

PAGE_TEMPLATE = (Path(__file__).parent / 'guidewire-reading-page-template.html').read_text(encoding='utf-8')
page = PAGE_TEMPLATE.replace('__TOC__', toc_html).replace('__UNITS__', units_html)
OUT.write_text(page, encoding='utf-8')
print(f"Imported {len(matches)} sections into {OUT}.")
