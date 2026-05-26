/* ==========================================
   CALENDÁRIO EDITORIAL — App Logic
   Dados persistidos via localStorage
   ========================================== */

'use strict';

// ─── CONSTANTS ───────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const WEEKDAYS_FULL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const DAYS_SHORT = ['D','S','T','Q','Q','S','S'];

const FORMATS = ['Feed', 'Stories', 'Reels', 'Carrossel'];

const BRANDS = {
  lacustre: {
    name:  'Lacustre Hall',
    color: '#C8A97E',
    light: '#F5EFE6',
    dark:  '#8B6E4E',
    tag:   'Eventos & Espaço'
  },
  alma: {
    name:  'Alma Gastronomia',
    color: '#D4687A',
    light: '#FAEDEF',
    dark:  '#9A3B4A',
    tag:   'Gastronomia'
  }
};

const STORAGE_KEY = 'editorial_posts_v1';

// ─── STATE ───────────────────────────────────────────────────────

let currentClient  = null;
let currentDayKey  = null;
let allPosts       = loadPosts();

// ─── PERSISTENCE ─────────────────────────────────────────────────

function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Erro ao carregar posts:', e);
    return {};
  }
}

function savePosts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPosts));
  } catch (e) {
    console.warn('Erro ao salvar posts:', e);
  }
}

function dayKey(client, y, m, d) {
  return `${client}_${y}_${m}_${d}`;
}

function getPosts(client, y, m, d) {
  return allPosts[dayKey(client, y, m, d)] || [];
}

function setPosts(client, y, m, d, arr) {
  const key = dayKey(client, y, m, d);
  if (arr.length === 0) {
    delete allPosts[key];
  } else {
    allPosts[key] = arr;
  }
  savePosts();
}

// ─── NAVIGATION ──────────────────────────────────────────────────

function openClient(client) {
  currentClient = client;
  const b = BRANDS[client];

  document.getElementById('cal-title').textContent = b.name;
  document.getElementById('cal-dot').style.background = b.color;

  document.getElementById('screen-home').classList.remove('active');
  document.getElementById('screen-cal').classList.add('active');

  document.getElementById('cal-body').scrollTop = 0;
  renderCalendar(client);
}

function goHome() {
  document.getElementById('screen-cal').classList.remove('active');
  document.getElementById('screen-home').classList.add('active');
  currentClient = null;
}

// ─── KEYBOARD SUPPORT ────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

document.querySelectorAll('.client-card').forEach(card => {
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });
});

// ─── CALENDAR RENDERING ──────────────────────────────────────────

function renderCalendar(client) {
  const body  = document.getElementById('cal-body');
  body.innerHTML = '';

  const now        = new Date();
  const startYear  = now.getFullYear();
  const startMonth = now.getMonth();
  const endYear    = 2026;
  const endMonth   = 11;

  const fragment = document.createDocumentFragment();

  for (let y = startYear; y <= endYear; y++) {
    const mStart = (y === startYear) ? startMonth : 0;
    const mEnd   = (y === endYear)   ? endMonth   : 11;

    for (let m = mStart; m <= mEnd; m++) {
      fragment.appendChild(renderMonth(client, y, m, now));
    }
  }

  body.appendChild(fragment);
}

function renderMonth(client, y, m, now) {
  const block = document.createElement('div');
  block.className = 'month-block';

  // Month label
  const label = document.createElement('div');
  label.className = 'month-label';
  label.textContent = `${MONTHS[m]} ${y}`;
  block.appendChild(label);

  // Weekday headers
  const wdRow = document.createElement('div');
  wdRow.className = 'week-days';
  wdRow.setAttribute('aria-hidden', 'true');
  DAYS_SHORT.forEach(d => {
    const wd = document.createElement('div');
    wd.className = 'week-day-label';
    wd.textContent = d;
    wdRow.appendChild(wd);
  });
  block.appendChild(wdRow);

  // Days grid
  const grid = document.createElement('div');
  grid.className = 'days-grid';

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr    = now.toDateString();

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    empty.setAttribute('aria-hidden', 'true');
    grid.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d);
    const isPast   = cellDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday  = cellDate.toDateString() === todayStr;
    const dayPosts = getPosts(client, y, m, d);

    const cell = document.createElement('div');
    cell.className = 'day-cell'
      + (isPast   ? ' past'    : '')
      + (isToday  ? ' today'   : '')
      + (dayPosts.length > 0 ? ' has-post' : '');

    if (!isPast) {
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', `${d} de ${MONTHS[m]}, ${dayPosts.length} postagens`);
      cell.addEventListener('click', () => openDay(client, y, m, d));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDay(client, y, m, d);
        }
      });
    }

    // Day number
    const numWrap = document.createElement('div');
    numWrap.className = 'day-num';
    const numInner = document.createElement('div');
    numInner.className = 'day-num-inner';
    numInner.textContent = d;
    numWrap.appendChild(numInner);
    cell.appendChild(numWrap);

    // Post indicators
    if (dayPosts.length > 0) {
      const indicators = document.createElement('div');
      indicators.className = 'post-indicators';

      dayPosts.slice(0, 2).forEach(p => {
        const pill = document.createElement('div');
        pill.className = 'post-pill format-' + p.format.toLowerCase();
        pill.textContent = p.format;
        indicators.appendChild(pill);
      });

      if (dayPosts.length > 2) {
        const more = document.createElement('div');
        more.className = 'post-pill format-extra';
        more.textContent = `+${dayPosts.length - 2}`;
        indicators.appendChild(more);
      }

      cell.appendChild(indicators);
    }

    grid.appendChild(cell);
  }

  block.appendChild(grid);
  return block;
}

// ─── MODAL ───────────────────────────────────────────────────────

function openDay(client, y, m, d) {
  currentDayKey = { client, y, m, d };

  const dateObj   = new Date(y, m, d);
  const b         = BRANDS[client];

  document.getElementById('modal-date-label').textContent =
    `${b.name} · ${MONTHS[m]} ${y}`;
  document.getElementById('modal-title-el').textContent =
    `${WEEKDAYS_FULL[dateObj.getDay()]}, ${d} de ${MONTHS[m]}`;

  renderModalView();
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
  currentDayKey = null;
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// Make handleOverlayClick globally accessible
window.handleOverlayClick = handleOverlayClick;

// ─── MODAL: VIEW MODE ─────────────────────────────────────────────

function renderModalView() {
  const { client, y, m, d } = currentDayKey;
  const dayPosts = getPosts(client, y, m, d);
  const b        = BRANDS[client];

  const content = document.getElementById('modal-content');
  const actions = document.getElementById('modal-actions');
  content.innerHTML = '';
  actions.innerHTML = '';

  const body = document.createElement('div');
  body.className = 'modal-body';

  if (dayPosts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'post-empty';
    empty.innerHTML =
      '<i class="ti ti-calendar-plus" aria-hidden="true"></i>' +
      'Nenhuma postagem para este dia.';
    body.appendChild(empty);
  } else {
    dayPosts.forEach(p => {
      const item = document.createElement('div');
      item.className = 'post-item';

      const header = document.createElement('div');
      header.className = 'post-item-header';

      const badge = document.createElement('span');
      badge.className = `format-badge format-${p.format.toLowerCase()}`;
      badge.textContent = p.format;
      header.appendChild(badge);

      const contentText = document.createElement('div');
      contentText.className = 'post-content-text';
      contentText.innerHTML = p.content
        ? escapeHtml(p.content).replace(/\n/g, '<br>')
        : '<span style="color:var(--muted);font-style:italic">Sem descrição</span>';

      item.appendChild(header);
      item.appendChild(contentText);
      body.appendChild(item);
    });
  }

  content.appendChild(body);

  // Actions
  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-outline';
  editBtn.innerHTML = '<i class="ti ti-edit" aria-hidden="true"></i> Editar';
  editBtn.onclick = renderModalEdit;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-outline';
  closeBtn.style.color = 'var(--muted)';
  closeBtn.textContent = 'Fechar';
  closeBtn.onclick = closeModal;

  actions.appendChild(editBtn);
  actions.appendChild(closeBtn);
}

// ─── MODAL: EDIT MODE ─────────────────────────────────────────────

function renderModalEdit() {
  const { client, y, m, d } = currentDayKey;
  const b        = BRANDS[client];

  // Deep clone existing posts
  let editPosts = JSON.parse(JSON.stringify(getPosts(client, y, m, d)));

  const content = document.getElementById('modal-content');
  const actions = document.getElementById('modal-actions');
  content.innerHTML = '';
  actions.innerHTML = '';

  const form = document.createElement('div');
  form.className = 'edit-form';
  form.id = 'edit-form';

  const postsContainer = document.createElement('div');
  postsContainer.id = 'edit-posts-container';
  form.appendChild(postsContainer);
  content.appendChild(form);

  // ── Render post blocks ──
  function renderPostBlocks() {
    postsContainer.innerHTML = '';

    if (editPosts.length === 0) {
      const hint = document.createElement('p');
      hint.style.cssText = 'font-size:13px;color:var(--muted);text-align:center;padding:1rem 0 0.5rem;font-style:italic';
      hint.textContent = 'Clique em "Adicionar postagem" para começar.';
      postsContainer.appendChild(hint);
    }

    editPosts.forEach((p, i) => {
      const block = document.createElement('div');
      block.className = 'edit-post-block';

      // Header
      const header = document.createElement('div');
      header.className = 'edit-post-header';

      const title = document.createElement('span');
      title.className = 'edit-post-title';
      title.textContent = `Postagem ${i + 1}`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = 'Remover';
      removeBtn.type = 'button';
      removeBtn.onclick = () => {
        editPosts.splice(i, 1);
        renderPostBlocks();
      };

      header.appendChild(title);
      header.appendChild(removeBtn);
      block.appendChild(header);

      // Format select
      const fmtGroup = document.createElement('div');
      fmtGroup.className = 'form-group';

      const fmtLabel = document.createElement('label');
      fmtLabel.className = 'form-label';
      fmtLabel.textContent = 'Formato';

      const fmtSelect = document.createElement('select');
      fmtSelect.className = 'form-select';

      FORMATS.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        if (p.format === f) opt.selected = true;
        fmtSelect.appendChild(opt);
      });

      fmtSelect.onchange = () => { editPosts[i].format = fmtSelect.value; };

      fmtGroup.appendChild(fmtLabel);
      fmtGroup.appendChild(fmtSelect);
      block.appendChild(fmtGroup);

      // Content textarea
      const ctGroup = document.createElement('div');
      ctGroup.className = 'form-group';

      const ctLabel = document.createElement('label');
      ctLabel.className = 'form-label';
      ctLabel.textContent = 'Conteúdo da Postagem';

      const ctArea = document.createElement('textarea');
      ctArea.className = 'form-textarea';
      ctArea.placeholder = 'Descreva brevemente o conteúdo desta postagem…';
      ctArea.value = p.content || '';
      ctArea.oninput = () => { editPosts[i].content = ctArea.value; };

      ctGroup.appendChild(ctLabel);
      ctGroup.appendChild(ctArea);
      block.appendChild(ctGroup);

      postsContainer.appendChild(block);
    });

    // Add post button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-dashed';
    addBtn.type = 'button';
    addBtn.innerHTML = '<i class="ti ti-plus" aria-hidden="true"></i> Adicionar postagem';
    addBtn.onclick = () => {
      editPosts.push({ format: 'Feed', content: '' });
      renderPostBlocks();
      // Scroll to bottom of modal
      setTimeout(() => {
        const sheet = document.getElementById('modal-sheet');
        sheet.scrollTop = sheet.scrollHeight;
      }, 50);
    };

    postsContainer.appendChild(addBtn);
  }

  renderPostBlocks();

  // Actions
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.style.background = b.color;
  saveBtn.type = 'button';
  saveBtn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Salvar';
  saveBtn.onclick = () => {
    const validPosts = editPosts.filter(p => p.format);
    setPosts(client, y, m, d, validPosts);
    renderCalendar(client);
    renderModalView();
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-outline';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.onclick = renderModalView;

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
}

// ─── UTILS ────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── EXPOSE GLOBALS ──────────────────────────────────────────────

window.openClient = openClient;
window.goHome     = goHome;

// ─── INIT ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Prevent scroll on body when modal is open
  document.getElementById('modal').addEventListener('touchmove', (e) => {
    if (e.target === document.getElementById('modal')) {
      e.preventDefault();
    }
  }, { passive: false });
});
