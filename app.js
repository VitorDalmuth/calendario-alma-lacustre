/* ==========================================
   CALENDÁRIO EDITORIAL — App Logic
   Dados sincronizados via Supabase
   ========================================== */

'use strict';

// ─── SUPABASE CONFIG ─────────────────────────────────────────────

const SUPABASE_URL  = 'https://ivvuamutykifzcidomeb.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dnVhbXV0eWtpZnpjaWRvbWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDcyNTMsImV4cCI6MjA5NTMyMzI1M30.5ho_3oKhWVt_lHdS0zZThdZAQPD3H2mm8hhx6DV_AEM';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function sbFetch(path, options = {}) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ─── CONSTANTS ───────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];
const WEEKDAYS_FULL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const DAYS_SHORT    = ['D','S','T','Q','Q','S','S'];
const FORMATS       = ['Feed', 'Stories', 'Reels', 'Carrossel'];

const BRANDS = {
  lacustre: { name: 'Lacustre Hall',     color: '#C8A97E', light: '#F5EFE6', dark: '#8B6E4E' },
  alma:     { name: 'Alma Gastronomia',  color: '#D4687A', light: '#FAEDEF', dark: '#9A3B4A' }
};

// ─── STATE ───────────────────────────────────────────────────────

let currentClient = null;
let currentDayKey = null;
// Cache: key = "client_y_m_d" → array of post objects
let cache = {};

// ─── DATA LAYER ──────────────────────────────────────────────────

function cacheKey(client, y, m, d) {
  return `${client}_${y}_${m}_${d}`;
}

async function loadClientPosts(client) {
  showLoadingBar(true);
  try {
    const rows = await sbFetch(
      `posts?client=eq.${client}&order=created_at.asc&select=*`
    );
    // Clear cache for this client
    Object.keys(cache).forEach(k => { if (k.startsWith(client + '_')) delete cache[k]; });
    rows.forEach(row => {
      const k = cacheKey(row.client, row.year, row.month, row.day);
      if (!cache[k]) cache[k] = [];
      cache[k].push({ id: row.id, format: row.format, content: row.content });
    });
  } catch (e) {
    showToast('Erro ao carregar posts. Verifique a conexão.', 'error');
    console.error(e);
  } finally {
    showLoadingBar(false);
  }
}

function getCached(client, y, m, d) {
  return cache[cacheKey(client, y, m, d)] || [];
}

async function saveDay(client, y, m, d, editPosts) {
  // editPosts = [{id?, format, content}, ...]
  // 1. Delete all existing rows for this day
  await sbFetch(
    `posts?client=eq.${client}&year=eq.${y}&month=eq.${m}&day=eq.${d}`,
    { method: 'DELETE', headers: { ...headers, 'Prefer': '' } }
  );

  // 2. Insert new rows
  if (editPosts.length > 0) {
    const rows = editPosts.map(p => ({
      client, year: y, month: m, day: d,
      format: p.format,
      content: p.content || ''
    }));
    const inserted = await sbFetch('posts', {
      method: 'POST',
      body: JSON.stringify(rows)
    });
    // Update cache
    cache[cacheKey(client, y, m, d)] = inserted.map(r => ({
      id: r.id, format: r.format, content: r.content
    }));
  } else {
    cache[cacheKey(client, y, m, d)] = [];
  }
}

// ─── UI HELPERS ──────────────────────────────────────────────────

function showLoadingBar(visible) {
  let bar = document.getElementById('loading-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'loading-bar';
    bar.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 999;
      background: linear-gradient(90deg, #C8A97E, #D4687A);
      transform-origin: left; transition: opacity 0.3s;
    `;
    document.body.appendChild(bar);
  }
  bar.style.opacity = visible ? '1' : '0';
}

function showToast(msg, type = 'info') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  const bg = type === 'error' ? '#C0392B' : type === 'success' ? '#3B6D11' : '#1A1714';
  toast.style.cssText = `
    position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
    background: ${bg}; color: white; font-family: 'DM Sans', sans-serif;
    font-size: 13px; padding: 10px 18px; border-radius: 20px; z-index: 999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2); white-space: nowrap;
    animation: fadeIn 0.2s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin 0.8s linear infinite" aria-hidden="true"></i>';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

// Add spin animation
const spinStyle = document.createElement('style');
spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(spinStyle);

// ─── NAVIGATION ──────────────────────────────────────────────────

function openClient(client) {
  currentClient = client;
  const b = BRANDS[client];
  document.getElementById('cal-title').textContent = b.name;
  document.getElementById('cal-dot').style.background = b.color;
  document.getElementById('screen-home').classList.remove('active');
  document.getElementById('screen-cal').classList.add('active');

  // Show loading skeleton while fetching from Supabase
  const calBody = document.getElementById('cal-body');
  calBody.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 1.5rem;gap:1rem;color:var(--muted);">
      <i class="ti ti-loader-2" style="font-size:32px;animation:spin 0.8s linear infinite;" aria-hidden="true"></i>
      <span style="font-size:14px;">Carregando postagens…</span>
    </div>
  `;
  calBody.scrollTop = 0;

  loadClientPosts(client).then(() => renderCalendar(client));

}

function goHome() {
  document.getElementById('screen-cal').classList.remove('active');
  document.getElementById('screen-home').classList.add('active');
  currentClient = null;
}

function refreshCalendar() {
  if (!currentClient) return;
  const btn = document.getElementById('refresh-btn');
  const icon = btn.querySelector('i');
  icon.style.animation = 'spin 0.8s linear infinite';
  btn.disabled = true;
  loadClientPosts(currentClient).then(() => {
    renderCalendar(currentClient);
    icon.style.animation = '';
    btn.disabled = false;
    showToast('Calendário atualizado!', 'success');
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ─── CALENDAR RENDERING ──────────────────────────────────────────

function renderCalendar(client) {
  const body = document.getElementById('cal-body');
  body.innerHTML = '';

  const now        = new Date();
  const startYear  = now.getFullYear();
  const startMonth = now.getMonth();
  const fragment   = document.createDocumentFragment();

  for (let y = startYear; y <= 2026; y++) {
    const mStart = (y === startYear) ? startMonth : 0;
    const mEnd   = (y === 2026) ? 11 : 11;
    for (let m = mStart; m <= mEnd; m++) {
      fragment.appendChild(renderMonth(client, y, m, now));
    }
  }
  body.appendChild(fragment);
}

function renderMonth(client, y, m, now) {
  const block = document.createElement('div');
  block.className = 'month-block';

  const label = document.createElement('div');
  label.className = 'month-label';
  label.textContent = `${MONTHS[m]} ${y}`;
  block.appendChild(label);

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

  const grid = document.createElement('div');
  grid.className = 'days-grid';

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr    = now.toDateString();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    empty.setAttribute('aria-hidden', 'true');
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d);
    const isPast   = cellDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday  = cellDate.toDateString() === todayStr;
    const dayPosts = getCached(client, y, m, d);

    const cell = document.createElement('div');
    cell.className = 'day-cell'
      + (isPast ? ' past' : '')
      + (isToday ? ' today' : '')
      + (dayPosts.length > 0 ? ' has-post' : '');

    if (!isPast) {
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', `${d} de ${MONTHS[m]}, ${dayPosts.length} postagens`);
      cell.addEventListener('click', () => openDay(client, y, m, d));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDay(client, y, m, d); }
      });
    }

    const numWrap = document.createElement('div');
    numWrap.className = 'day-num';
    const numInner = document.createElement('div');
    numInner.className = 'day-num-inner';
    numInner.textContent = d;
    numWrap.appendChild(numInner);
    cell.appendChild(numWrap);

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
  const dateObj = new Date(y, m, d);
  const b = BRANDS[client];

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

window.handleOverlayClick = function(e) {
  if (e.target === document.getElementById('modal')) closeModal();
};

// ─── MODAL VIEW ──────────────────────────────────────────────────

function renderModalView() {
  const { client, y, m, d } = currentDayKey;
  const dayPosts = getCached(client, y, m, d);
  const content  = document.getElementById('modal-content');
  const actions  = document.getElementById('modal-actions');
  content.innerHTML = '';
  actions.innerHTML = '';

  const body = document.createElement('div');
  body.className = 'modal-body';

  if (dayPosts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'post-empty';
    empty.innerHTML = '<i class="ti ti-calendar-plus" aria-hidden="true"></i>Nenhuma postagem para este dia.';
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
      const ct = document.createElement('div');
      ct.className = 'post-content-text';
      ct.innerHTML = p.content
        ? escapeHtml(p.content).replace(/\n/g, '<br>')
        : '<span style="color:var(--muted);font-style:italic">Sem descrição</span>';
      item.appendChild(header);
      item.appendChild(ct);
      body.appendChild(item);
    });
  }

  content.appendChild(body);

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

// ─── MODAL EDIT ──────────────────────────────────────────────────

function renderModalEdit() {
  const { client, y, m, d } = currentDayKey;
  const b = BRANDS[client];
  let editPosts = JSON.parse(JSON.stringify(getCached(client, y, m, d)));

  const content = document.getElementById('modal-content');
  const actions = document.getElementById('modal-actions');
  content.innerHTML = '';
  actions.innerHTML = '';

  const form = document.createElement('div');
  form.className = 'edit-form';
  const postsContainer = document.createElement('div');
  form.appendChild(postsContainer);
  content.appendChild(form);

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

      const header = document.createElement('div');
      header.className = 'edit-post-header';
      const title = document.createElement('span');
      title.className = 'edit-post-title';
      title.textContent = `Postagem ${i + 1}`;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = 'Remover';
      removeBtn.type = 'button';
      removeBtn.onclick = () => { editPosts.splice(i, 1); renderPostBlocks(); };
      header.appendChild(title);
      header.appendChild(removeBtn);
      block.appendChild(header);

      // Format
      const fmtGroup = document.createElement('div');
      fmtGroup.className = 'form-group';
      const fmtLabel = document.createElement('label');
      fmtLabel.className = 'form-label';
      fmtLabel.textContent = 'Formato';
      const fmtSelect = document.createElement('select');
      fmtSelect.className = 'form-select';
      FORMATS.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f; opt.textContent = f;
        if (p.format === f) opt.selected = true;
        fmtSelect.appendChild(opt);
      });
      fmtSelect.onchange = () => { editPosts[i].format = fmtSelect.value; };
      fmtGroup.appendChild(fmtLabel);
      fmtGroup.appendChild(fmtSelect);
      block.appendChild(fmtGroup);

      // Content
      const ctGroup = document.createElement('div');
      ctGroup.className = 'form-group';
      const ctLabel = document.createElement('label');
      ctLabel.className = 'form-label';
      ctLabel.textContent = 'Conteúdo da Postagem';
      const ctArea = document.createElement('textarea');
      ctArea.className = 'form-textarea';
      ctArea.placeholder = 'Descreva brevemente o conteúdo…';
      ctArea.value = p.content || '';
      ctArea.oninput = () => { editPosts[i].content = ctArea.value; };
      ctGroup.appendChild(ctLabel);
      ctGroup.appendChild(ctArea);
      block.appendChild(ctGroup);

      postsContainer.appendChild(block);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-dashed';
    addBtn.type = 'button';
    addBtn.innerHTML = '<i class="ti ti-plus" aria-hidden="true"></i> Adicionar postagem';
    addBtn.onclick = () => {
      editPosts.push({ format: 'Feed', content: '' });
      renderPostBlocks();
      setTimeout(() => {
        const sheet = document.getElementById('modal-sheet');
        sheet.scrollTop = sheet.scrollHeight;
      }, 50);
    };
    postsContainer.appendChild(addBtn);
  }

  renderPostBlocks();

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.style.background = b.color;
  saveBtn.type = 'button';
  saveBtn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Salvar';
  saveBtn.onclick = async () => {
    const valid = editPosts.filter(p => p.format);
    setButtonLoading(saveBtn, true);
    try {
      await saveDay(client, y, m, d, valid);
      renderCalendar(client);
      renderModalView();
      showToast('Postagens salvas!', 'success');
    } catch (e) {
      showToast('Erro ao salvar. Tente novamente.', 'error');
      console.error(e);
    } finally {
      setButtonLoading(saveBtn, false);
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-outline';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.onclick = renderModalView;

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
}

// ─── UTILS ───────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ─── EXPOSE GLOBALS ──────────────────────────────────────────────

window.openClient      = openClient;
window.goHome          = goHome;
window.refreshCalendar = refreshCalendar;
