(() => {
  'use strict';
  const units = [...document.querySelectorAll('.chapter-inner .unit')];
  if (!units.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toc = document.querySelector('.toc-box');
  if (toc) {
    const tools = document.createElement('div');
    tools.className = 'reading-tools';
    const info = document.createElement('span');
    const words = units.reduce((count, unit) => count + unit.textContent.trim().split(/\s+/).length, 0);
    info.textContent = `${units.length} topics · About ${Math.ceil(words / 200)} min read · Go at your own pace`;
    const size = document.createElement('button');
    size.type = 'button';
    size.textContent = 'Aa · Larger text';
    size.setAttribute('aria-pressed', 'false');
    try { document.body.classList.toggle('large-reading', localStorage.getItem('ains-reading-size') === 'large'); } catch {}
    size.setAttribute('aria-pressed', String(document.body.classList.contains('large-reading')));
    size.addEventListener('click', () => {
      const large = document.body.classList.toggle('large-reading');
      size.setAttribute('aria-pressed', String(large));
      try { localStorage.setItem('ains-reading-size', large ? 'large' : 'normal'); } catch {}
      scheduleUpdate();
    });
    tools.append(info, size);
    toc.prepend(tools);
  }
  document.querySelectorAll('.data-table').forEach((table, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'reading-table';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    const title = table.closest('.unit')?.querySelector('.unit-title')?.textContent;
    wrapper.setAttribute('aria-label', `${title || 'Chapter'} table ${i + 1}; scroll horizontally if needed`);
    table.before(wrapper);
    wrapper.append(table);
  });
  units.forEach((unit, i) => {
    const next = units[i + 1];
    if (!next?.id) return;
    const link = document.createElement('a');
    link.className = 'next-topic';
    link.href = `#${next.id}`;
    link.textContent = `Next topic: ${next.querySelector('.unit-title')?.textContent || i + 2} →`;
    unit.append(link);
  });
  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  progress.append(fill);
  document.body.append(progress);
  const tocLinks = [...document.querySelectorAll('.toc-list a')];
  let scheduled = false;
  function update() {
    scheduled = false;
    const first = units[0].getBoundingClientRect().top + window.scrollY;
    const last = units[units.length - 1].getBoundingClientRect().bottom + window.scrollY;
    const fraction = Math.max(0, Math.min(1, (window.scrollY + window.innerHeight - first) / Math.max(1, last - first)));
    fill.style.transform = `scaleX(${fraction})`;
    let current = null;
    units.forEach(unit => { if (unit.getBoundingClientRect().top <= window.innerHeight * .4) current = unit.id; });
    tocLinks.forEach(link => {
      if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleUpdate() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', scheduleUpdate, {passive:true});
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleUpdate).observe(document.querySelector('.chapter-inner'));
  scheduleUpdate();
  // Animate individual headings, never hide long sections or delay access to text.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!reducedMotion.matches && entry.target.animate) entry.target.animate(
          [{opacity:.45, transform:'translateY(10px)'}, {opacity:1, transform:'translateY(0)'}],
          {duration:420, easing:'ease-out'}
        );
        observer.unobserve(entry.target);
      });
    }, {threshold:.2});
    document.querySelectorAll('.unit-title').forEach(title => observer.observe(title));
  }
})();
