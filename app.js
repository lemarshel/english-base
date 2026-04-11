const state = {
  data: [],
  filtered: [],
  search: '',
  levels: new Set(),
  pos: new Set(),
  showRoman: true,
  showEnglish: true,
};

const posOrder = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'numeral', 'determiner', 'interjection', 'other'];

const posLabels = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
  pronoun: 'Pronoun',
  numeral: 'Numeral',
  determiner: 'Determiner',
  interjection: 'Interjection',
  other: 'Other'
};

const levelTargets = [1,2,3,4,5,6,7];

const ALL_CHANNELS = window.ALL_CHANNELS || [];

function createChip(label, onClick, active = true) {
  const btn = document.createElement('button');
  btn.className = 'chip' + (active ? ' active' : '');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    onClick(btn.classList.contains('active'));
  });
  return btn;
}

function renderStats() {
  const stats = document.getElementById('stats');
  stats.innerHTML = '';
  if (state.data.length === 0) {
    const note = document.createElement('div');
    note.className = 'stat-card';
    note.textContent = 'Word list coming soon';
    stats.appendChild(note);
    return;
  }
  const total = state.filtered.length;
  const totalCard = document.createElement('div');
  totalCard.className = 'stat-card';
  totalCard.innerHTML = `<strong>${total}</strong> entries shown`;
  stats.appendChild(totalCard);
}

function renderTable() {
  const table = document.getElementById('wordTable');
  table.innerHTML = '';

  if (!state.filtered.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" style="padding:18px;text-align:center;color:#777">Word list coming soon</td>';
    table.appendChild(tr);
    return;
  }

  state.filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.rank}</td>
      <td class="word">${item.lemma}</td>
      <td class="col-roman">${state.showRoman ? item.romanization : ''}</td>
      <td class="col-english">${state.showEnglish ? (item.english || '') : ''}</td>
      <td>${posLabels[item.pos] || item.pos}</td>
      <td>${item.level}</td>
    `;
    table.appendChild(tr);
  });
}

function applyFilters() {
  const term = state.search.trim().toLowerCase();
  const levelSet = state.levels;
  const posSet = state.pos;

  state.filtered = state.data.filter(item => {
    const matchLevel = levelSet.size === 0 || levelSet.has(item.level);
    const matchPos = posSet.size === 0 || posSet.has(item.pos);
    if (!matchLevel || !matchPos) return false;
    if (!term) return true;
    return (
      item.lemma.toLowerCase().includes(term) ||
      (item.romanization && item.romanization.toLowerCase().includes(term)) ||
      (item.english && item.english.toLowerCase().includes(term))
    );
  });

  renderStats();
  renderTable();
}

function initFilters() {
  const levelContainer = document.getElementById('levelFilters');
  levelTargets.forEach(level => {
    const chip = createChip(`L${level}`, active => {
      if (active) state.levels.add(level); else state.levels.delete(level);
      applyFilters();
    }, false);
    levelContainer.appendChild(chip);
  });

  const posContainer = document.getElementById('posFilters');
  posOrder.forEach(pos => {
    const label = posLabels[pos] || pos;
    const chip = createChip(label, active => {
      if (active) state.pos.add(pos); else state.pos.delete(pos);
      applyFilters();
    }, false);
    posContainer.appendChild(chip);
  });

  document.getElementById('toggleRoman').addEventListener('click', (e) => {
    state.showRoman = !state.showRoman;
    e.target.classList.toggle('active', state.showRoman);
    applyFilters();
  });

  document.getElementById('toggleEnglish').addEventListener('click', (e) => {
    state.showEnglish = !state.showEnglish;
    e.target.classList.toggle('active', state.showEnglish);
    applyFilters();
  });
}

function initSearch() {
  const input = document.getElementById('search');
  input.addEventListener('input', () => {
    state.search = input.value;
    applyFilters();
  });
  document.getElementById('clearSearch').addEventListener('click', () => {
    input.value = '';
    state.search = '';
    applyFilters();
  });
}

function initNews() {
  const channelSel = document.getElementById('newsChannel');
  const qualitySel = document.getElementById('newsQuality');
  const watchBtn = document.getElementById('watchNews');
  const overlay = document.getElementById('newsOverlay');
  const closeBtn = document.getElementById('closeNews');
  const player = document.getElementById('newsPlayer');

  if (!channelSel || !qualitySel || !watchBtn || !overlay || !player) return;

  const map = {};
  ALL_CHANNELS.forEach(row => {
    if (!row || row.length < 2) return;
    const name = String(row[0] || '').trim();
    const url = String(row[1] || '').trim();
    const label = String(row[2] || 'auto').trim();
    if (!name || !url) return;
    if (!map[name]) map[name] = [];
    map[name].push({ label: label || 'auto', url });
  });

  const names = Object.keys(map).sort((a, b) => a.localeCompare(b));
  if (!names.length) {
    channelSel.innerHTML = '<option value=\"\">No channels</option>';
    channelSel.disabled = true;
    qualitySel.disabled = true;
    watchBtn.disabled = true;
    return;
  }

  channelSel.innerHTML = names.map((name) => `<option value="${name}">${name}</option>`).join('');

  function populateQualities(name) {
    const list = map[name] || [];
    qualitySel.innerHTML = list.map((q, i) => `<option value="${i}">${q.label}</option>`).join('');
    qualitySel.disabled = list.length <= 1;
  }

  function getSelectedUrl() {
    const name = channelSel.value || names[0];
    const list = map[name] || [];
    const q = list[Number(qualitySel.value)] || list[0];
    return q ? q.url : '';
  }

  function playUrl(url) {
    if (!url) return;
    try { player.pause(); } catch (e) {}
    player.src = url;
    player.load();
    const p = player.play();
    if (p && p.catch) p.catch(() => {});
  }

  populateQualities(names[0]);

  channelSel.addEventListener('change', () => {
    populateQualities(channelSel.value);
    if (overlay.classList.contains('open')) {
      playUrl(getSelectedUrl());
    }
  });

  qualitySel.addEventListener('change', () => {
    if (overlay.classList.contains('open')) {
      playUrl(getSelectedUrl());
    }
  });

  watchBtn.addEventListener('click', () => {
    overlay.classList.add('open');
    playUrl(getSelectedUrl());
  });

  function close() {
    overlay.classList.remove('open');
    try { player.pause(); } catch (e) {}
  }

  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

async function boot() {
  state.data = [];
  state.filtered = [];
  initFilters();
  initSearch();
  initNews();
  renderStats();
  renderTable();
}

boot();
