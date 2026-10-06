(() => {
  'use strict';
  const items = window.MORE_RESULTS;
  if (!items?.length) return;
  const $ = id => document.getElementById(id);
  const video = $('more-player'), strip = $('more-cards');
  let current = items[0], segment = -1;
  const seconds = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function updatePrompt() {
    const index = Math.min(5, Math.max(0, current.switchTimes.filter(t => t <= (video.currentTime || 0)).length - 1));
    if (segment === index) return;
    segment = index;
    $('more-prompt-label').textContent = `INSTRUCTION ${String(index + 1).padStart(2, '0')} / 06`;
    $('more-prompt-time').textContent = `${index * 10}–${(index + 1) * 10} s`;
    $('more-prompt-text').textContent = current.prompts[index];
    $('more-instructions').querySelectorAll('button').forEach((b, i) => {
      b.classList.toggle('active', i === index);
      b.setAttribute('aria-pressed', String(i === index));
    });
  }
  function play() {
    const pending = video.play();
    if (pending) pending.catch(e => {
      if (e.name !== 'AbortError') $('more-status').textContent = 'Press play to watch this result.';
    });
  }
  function seek(t) {
    if (video.readyState >= 1) { video.currentTime = t; updatePrompt(); play(); return; }
    const id = current.id;
    video.addEventListener('loadedmetadata', () => {
      if (current.id !== id) return;
      video.currentTime = t; updatePrompt(); play();
    }, {once: true});
    video.preload = 'metadata'; video.load();
  }
  function keepVisible(card) {
    const a = card.getBoundingClientRect(), b = strip.getBoundingClientRect();
    if (a.left < b.left + 3) strip.scrollBy({left: a.left - b.left - 3, behavior: 'smooth'});
    else if (a.right > b.right - 3) strip.scrollBy({left: a.right - b.right + 3, behavior: 'smooth'});
  }
  function select(item, autoplay = true, reveal = true, defer = false) {
    video.pause(); current = item; segment = -1;
    $('more-status').textContent = '';
    video.poster = item.poster; video.preload = 'none';
    if (defer) video.dataset.pendingSource = item.media;
    else {delete video.dataset.pendingSource; video.src = item.media; video.load();}
    $('more-current-title').textContent = item.title;
    $('more-category').textContent = item.category.toUpperCase();
    $('more-position').textContent = `${items.indexOf(item) + 1} / ${items.length}`;
    $('more-panel').setAttribute('aria-labelledby', 'more-tab-' + item.id);
    $('more-download').href = item.media; $('more-download').download = item.id + '.mp4';
    strip.querySelectorAll('.more-card').forEach(card => {
      const active = card.dataset.id === item.id;
      card.classList.toggle('current', active); card.setAttribute('aria-selected', String(active)); card.tabIndex = active ? 0 : -1;
    });
    const buttons = current.switchTimes.map((t, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = `${i * 10}–${(i + 1) * 10} s`;
      b.title = current.prompts[i]; b.setAttribute('aria-label', `Instruction ${i + 1}: ${current.prompts[i]}`);
      b.addEventListener('click', () => seek(t)); return b;
    });
    $('more-instructions').replaceChildren(...buttons); updatePrompt();
    if (autoplay) play();
    if (reveal) keepVisible($('more-tab-' + item.id));
  }
  items.forEach(item => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'more-card'; card.id = 'more-tab-' + item.id; card.dataset.id = item.id;
    card.setAttribute('role', 'tab'); card.setAttribute('aria-controls', 'more-panel'); card.setAttribute('aria-selected', 'false'); card.tabIndex = -1;
    const thumb = document.createElement('div'); thumb.className = 'thumb';
    const img = document.createElement('img'); img.src = item.poster; img.alt = ''; img.loading = 'lazy'; img.draggable = false; img.width = 624; img.height = 360;
    const duration = document.createElement('span'); duration.className = 'clip-duration'; duration.textContent = seconds(item.duration);
    const selected = document.createElement('span'); selected.className = 'selected-label'; selected.textContent = 'SELECTED'; thumb.append(img, duration, selected);
    const body = document.createElement('div'); body.className = 'card-body';
    const category = document.createElement('p'); category.className = 'card-category'; category.textContent = item.category;
    const title = document.createElement('p'); title.className = 'card-title'; title.textContent = item.title;
    body.append(category, title); card.append(thumb, body); card.addEventListener('click', () => select(item)); strip.appendChild(card);
  });
  function arrows() {
    $('more-left').disabled = strip.scrollLeft <= 2;
    $('more-right').disabled = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 2;
  }
  $('more-left').addEventListener('click', () => strip.scrollBy({left: -strip.clientWidth * .75, behavior: 'smooth'}));
  $('more-right').addEventListener('click', () => strip.scrollBy({left: strip.clientWidth * .75, behavior: 'smooth'}));
  strip.addEventListener('scroll', arrows, {passive: true}); window.addEventListener('resize', arrows);
  let drag = null, suppressClick = false;
  strip.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) { suppressClick = false; drag = {id: e.pointerId, x: e.clientX, left: strip.scrollLeft, moved: false}; } });
  strip.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) {drag.moved = true; strip.setPointerCapture(e.pointerId); strip.classList.add('dragging');}
    if (drag.moved) {e.preventDefault(); strip.scrollLeft = drag.left - dx;}
  });
  function finish(e) {
    if (!drag || drag.id !== e.pointerId) return;
    suppressClick = drag.moved; drag = null; strip.classList.remove('dragging');
    if (strip.hasPointerCapture(e.pointerId)) strip.releasePointerCapture(e.pointerId);
    setTimeout(() => {suppressClick = false;}, 0);
  }
  strip.addEventListener('pointerup', finish); strip.addEventListener('pointercancel', finish);
  strip.addEventListener('click', e => {if (suppressClick) {e.preventDefault(); e.stopImmediatePropagation();}}, true);
  strip.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const cards = [...strip.querySelectorAll('.more-card')]; let i = cards.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); i = e.key === 'Home' ? 0 : e.key === 'End' ? cards.length - 1 : Math.max(0, Math.min(cards.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    cards[i].focus({preventScroll: true}); select(items[i], false);
  });
  // One active player across the demo, comparisons, and additional results.
  document.addEventListener('play', e => {
    if (!(e.target instanceof HTMLVideoElement)) return;
    document.querySelectorAll('video').forEach(other => {if (other !== e.target) other.pause();});
  }, true);
  video.addEventListener('timeupdate', updatePrompt);
  video.addEventListener('playing', () => {$('more-status').textContent = '';});
  video.addEventListener('error', () => {$('more-status').textContent = 'The video could not be loaded. Try reloading or use Download video.';});
  select(items[0], false, false, true);
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    if (video.dataset.pendingSource) {
      video.src = video.dataset.pendingSource; delete video.dataset.pendingSource; video.load();
    }
    observer.disconnect();
  }, {rootMargin: '200px'});
  observer.observe(video);
  requestAnimationFrame(arrows);
})();
