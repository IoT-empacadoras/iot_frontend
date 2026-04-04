/**
 * ReadyPackers IoT — Frontend
 * Vista: Telemetría + Auditoría de eventos
 */

const BACKEND_URL    = 'https://iot-backend-b5v5.onrender.com';
const DEFAULT_DEVICE = '441095104B78F267112345678';
let   currentDevice  = DEFAULT_DEVICE;
let   chart          = null;
let   allTags        = [];

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEventListeners();
  checkHealth();
  loadDevices();
  setInterval(checkHealth, 8000);
});

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      const titles = {
        telemetry: ['Telemetría', 'Datos continuos de proceso'],
        audit:     ['Auditoría',  'Historial de configuración y alarmas']
      };
      document.getElementById('page-title').textContent    = titles[tab][0];
      document.getElementById('page-subtitle').textContent = titles[tab][1];
      if (tab === 'audit') { loadEventSummary(); loadEvents(); }
    });
  });
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────
function setupEventListeners() {
  document.getElementById('device-selector').addEventListener('change', e => {
    currentDevice = e.target.value || DEFAULT_DEVICE;
    document.getElementById('sidebar-device-id').textContent = currentDevice;
    loadTags();
  });
  document.getElementById('load-data-btn').addEventListener('click', loadChartData);
  document.getElementById('variable-selector').addEventListener('change', loadChartData);
  document.getElementById('time-range-selector').addEventListener('change', loadChartData);
  document.getElementById('load-events-btn').addEventListener('click', () => { loadEventSummary(); loadEvents(); });
  document.getElementById('refresh-audit-btn').addEventListener('click', () => { loadEventSummary(); loadEvents(); });
}

// ─────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────
async function checkHealth() {
  try {
    const r = await fetch(BACKEND_URL + '/api/health');
    setConnStatus(r.ok ? 'online' : 'offline');
  } catch { setConnStatus('offline'); }
}

function setConnStatus(state) {
  const dot   = document.getElementById('conn-dot');
  const label = document.getElementById('conn-label');
  const map = { online:['online','Conectado'], offline:['offline','Desconectado'], loading:['loading','Conectando…'] };
  const [cls, txt] = map[state] || map.offline;
  dot.className     = 'conn-dot ' + cls;
  label.textContent = txt;
}

// ─────────────────────────────────────────────
// DEVICES
// ─────────────────────────────────────────────
async function loadDevices() {
  const sel = document.getElementById('device-selector');
  sel.innerHTML = '<option value="' + DEFAULT_DEVICE + '">' + DEFAULT_DEVICE + '</option>';
  try {
    const r = await fetch(BACKEND_URL + '/api/devices');
    const d = await r.json();
    const ids = Array.from(new Set([DEFAULT_DEVICE, ...(d.devices || []).map(x => x.id).filter(Boolean)]));
    sel.innerHTML = ids.map(id => '<option value="' + id + '">' + id + '</option>').join('');
  } catch {}
  sel.value = currentDevice;
  document.getElementById('sidebar-device-id').textContent = currentDevice;
  loadTags();
}

// ─────────────────────────────────────────────
// TAGS (TELEMETRÍA)
// ─────────────────────────────────────────────
async function loadTags() {
  try {
    const r = await fetch(BACKEND_URL + '/api/devices/' + currentDevice + '/sensors');
    const d = await r.json();
    allTags = (d.tags || []).filter(t => t.startsWith('telemetry_'));
    if (allTags.length === 0) {
      const r2 = await fetch(BACKEND_URL + '/api/devices/' + currentDevice + '/latest');
      const d2 = await r2.json();
      allTags = Object.keys(d2.data || {}).filter(t => t.startsWith('telemetry_'));
    }
    const sel = document.getElementById('variable-selector');
    if (allTags.length === 0) {
      sel.innerHTML = '<option value="">Sin variables aún</option>';
      updateKpiCards({});
      return;
    }
    sel.innerHTML = allTags.map(t => '<option value="' + t + '">' + formatTagLabel(t) + '</option>').join('');
    setConnStatus('online');
    updateKpiFromLatest();
    loadChartData();
  } catch (err) {
    setConnStatus('offline');
    console.error('[TAGS]', err);
  }
}

// ─────────────────────────────────────────────
// KPI CARDS
// ─────────────────────────────────────────────
async function updateKpiFromLatest() {
  try {
    const r = await fetch(BACKEND_URL + '/api/devices/' + currentDevice + '/latest');
    const d = await r.json();
    updateKpiCards(d.data || {});
    updateSidebarTime();
  } catch {}
}

function updateKpiCards(data) {
  const kpis = [
    { id: 'kpi-ppm',    key: 'telemetry_pv_ppm',            unit: 'ppm', decimals: 1 },
    { id: 'kpi-th',     key: 'telemetry_pv_temp_mordaza_H', unit: '°C',  decimals: 1 },
    { id: 'kpi-tv',     key: 'telemetry_pv_temp_mordaza_V', unit: '°C',  decimals: 1 },
    { id: 'kpi-peso',   key: 'telemetry_pv_peso_promedio',  unit: 'g',   decimals: 1 },
    { id: 'kpi-presion',key: 'telemetry_pv_presion_aire',   unit: 'bar', decimals: 2 },
  ];
  kpis.forEach(({ id, key, unit, decimals }) => {
    const card = document.getElementById(id);
    if (!card) return;
    const entry = data[key];
    const val   = entry?.value ?? null;
    const valEl = card.querySelector('.kpi-value');
    valEl.textContent = val !== null ? (+val).toFixed(decimals) + ' ' + unit : '—';
  });

  const presVal = data['telemetry_pv_presion_aire']?.value;
  const presEl  = document.getElementById('kpi-presion-status');
  if (presEl && presVal !== undefined) {
    presEl.className = 'kpi-status ' + (+presVal < 5 ? 'err' : +presVal < 5.5 ? 'warn' : 'ok');
  }

  const runVal = data['telemetry_is_running']?.value;
  const runEl  = document.getElementById('kpi-running-val');
  const runSt  = document.getElementById('kpi-running-status');
  if (runEl && runVal !== undefined) {
    const on = runVal == 1 || runVal === true || runVal === 'true';
    runEl.textContent = on ? 'EN MARCHA' : 'PARADA';
    runEl.style.color = on ? 'var(--green)' : 'var(--red)';
    if (runSt) runSt.className = 'kpi-status ' + (on ? 'ok' : 'err');
  }
}

// ─────────────────────────────────────────────
// GRÁFICO
// ─────────────────────────────────────────────
async function loadChartData() {
  const tag   = document.getElementById('variable-selector').value;
  const range = document.getElementById('time-range-selector').value;
  if (!tag) return;
  try {
    const r = await fetch(BACKEND_URL + '/api/devices/' + currentDevice + '/history/' + range);
    const d = await r.json();
    const rows = (d.data || []).filter(row => row.tag_name === tag);
    document.getElementById('chart-count').textContent = rows.length + ' puntos';
    document.getElementById('chart-title').textContent = formatTagLabel(tag) + ' — ' + range;
    if (rows.length === 0) { clearChart(); renderTable([], 'table-body', 5); return; }
    renderChart(rows, tag);
    renderTable(rows.slice().reverse(), 'table-body', 5);
    updateSidebarTime();
  } catch (err) { console.error('[CHART]', err); }
}

function renderChart(rows, tag) {
  const sorted  = [...rows].reverse().filter((_, i) => rows.length > 60 ? i % 3 === 0 : true);
  const labels  = sorted.map(r => fmtTime(r.minute_ts || r.interval_ts || r.hour_ts));
  const avg     = sorted.map(r => r.avg_value);
  const mn      = sorted.map(r => r.min_value);
  const mx      = sorted.map(r => r.max_value);

  if (chart) chart.destroy();
  const ctx = document.getElementById('data-chart').getContext('2d');

  chart = new Chart(ctx, {
    type: 'line',
    plugins: [ChartDataLabels],
    data: {
      labels,
      datasets: [
        {
          label: 'Promedio', data: avg,
          borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.08)',
          borderWidth: 2, tension: 0.4, fill: true,
          pointRadius: sorted.length > 30 ? 0 : 4, pointHoverRadius: 6,
          datalabels: {
            display: sorted.length <= 20,
            align: 'top', anchor: 'end',
            backgroundColor: '#0057d9', borderColor: '#003c96', borderWidth: 1, borderRadius: 4,
            color: '#ffeb3b', font: { weight: 'bold', size: 10 },
            formatter: v => (+v).toFixed(1), padding: 4,
          }
        },
        {
          label: 'Mínimo', data: mn,
          borderColor: '#22c55e', borderDash: [4, 4], borderWidth: 1.5,
          fill: false, tension: 0.4, pointRadius: 0,
          datalabels: { display: false }
        },
        {
          label: 'Máximo', data: mx,
          borderColor: '#ef4444', borderDash: [4, 4], borderWidth: 1.5,
          fill: false, tension: 0.4, pointRadius: 0,
          datalabels: { display: false }
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 28 } },
      plugins: {
        legend: { labels: { color: '#475569', boxWidth: 14, font: { size: 12 } } },
        title: { display: false },
      },
      scales: {
        x: { ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.06)' } },
        y: {
          ticks: { color: '#64748b', font: { size: 11 } },
          grid:  { color: 'rgba(0,0,0,.06)' },
          title: { display: true, text: tag.replace('telemetry_', ''), color: '#64748b', font: { size: 11 } },
          grace: '10%'
        }
      }
    }
  });
}

function clearChart() { if (chart) { chart.destroy(); chart = null; } }

function renderTable(rows, tbodyId, cols) {
  const tbody = document.getElementById(tbodyId);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="' + cols + '" class="empty-row">Sin datos disponibles</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r =>
    '<tr>' +
    '<td>' + fmtDateTime(r.minute_ts || r.interval_ts || r.hour_ts) + '</td>' +
    '<td>' + fmt2(r.avg_value) + '</td>' +
    '<td>' + fmt2(r.min_value) + '</td>' +
    '<td>' + fmt2(r.max_value) + '</td>' +
    '<td>' + (r.count || 0) + '</td>' +
    '</tr>'
  ).join('');
}

// ─────────────────────────────────────────────
// AUDITORÍA — SUMMARY
// ─────────────────────────────────────────────
async function loadEventSummary() {
  const grid = document.getElementById('summary-grid');
  grid.innerHTML = '<div class="summary-empty">Cargando...</div>';
  try {
    const r = await fetch(BACKEND_URL + '/api/devices/' + currentDevice + '/events/summary');
    const d = await r.json();
    const items = Object.values(d.summary || {});
    if (!items.length) {
      grid.innerHTML = '<div class="summary-empty">Sin configuración registrada</div>';
      return;
    }
    const relevant = items.filter(e =>
      ['SETPOINT_CHANGE','RECIPE_LOAD','CALIBRATION','TARE_ACTION'].includes(e.event_type)
    );
    grid.innerHTML = relevant.map(e => {
      const isBool = e.new_bool !== null;
      const val    = isBool
        ? (e.new_bool ? '<span class="val-bool-true">TRUE</span>' : '<span class="val-bool-false">FALSE</span>')
        : (e.new_value !== null ? (+e.new_value).toFixed(2) : '—');
      return '<div class="summary-card">' +
        '<div class="summary-param">' + formatTagLabel(e.parameter) + '</div>' +
        '<div class="summary-value">' + val + '</div>' +
        '<div class="summary-meta">' + fmtDateTime(e.received_at) + '</div>' +
      '</div>';
    }).join('');
    // Poblar filtro de parámetros
    const paramSel = document.getElementById('evt-param-filter');
    const existing = new Set(Array.from(paramSel.options).map(o => o.value));
    items.forEach(e => {
      if (!existing.has(e.parameter)) {
        const opt = document.createElement('option');
        opt.value = e.parameter;
        opt.textContent = formatTagLabel(e.parameter);
        paramSel.appendChild(opt);
        existing.add(e.parameter);
      }
    });
  } catch (err) {
    grid.innerHTML = '<div class="summary-empty">Error al cargar configuración</div>';
    console.error('[SUMMARY]', err);
  }
}

// ─────────────────────────────────────────────
// AUDITORÍA — TABLA DE EVENTOS
// ─────────────────────────────────────────────
async function loadEvents() {
  const tbody = document.getElementById('events-body');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Cargando...</td></tr>';
  const typeFilter  = document.getElementById('evt-type-filter').value;
  const paramFilter = document.getElementById('evt-param-filter').value;
  const limit       = document.getElementById('evt-limit-filter').value;
  let url = BACKEND_URL + '/api/devices/' + currentDevice + '/events?limit=' + limit;
  if (typeFilter)  url += '&event_type=' + encodeURIComponent(typeFilter);
  if (paramFilter) url += '&parameter='  + encodeURIComponent(paramFilter);
  try {
    const r = await fetch(url);
    const d = await r.json();
    const events = d.events || [];
    document.getElementById('events-count').textContent = events.length + ' eventos';
    if (!events.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Sin eventos registrados</td></tr>';
      return;
    }
    tbody.innerHTML = events.map(e => {
      const isBool = e.old_bool !== null || e.new_bool !== null;
      const oldVal = isBool ? boolHtml(e.old_bool) : (e.old_value !== null ? '<span class="val-old">' + fmt2(e.old_value) + '</span>' : '—');
      const newVal = isBool ? boolHtml(e.new_bool) : (e.new_value !== null ? '<span class="val-new">' + fmt2(e.new_value) + '</span>' : '—');
      return '<tr>' +
        '<td>' + fmtDateTime(e.received_at) + '</td>' +
        '<td><span class="evt-badge evt-' + e.event_type + '">' + fmtEventType(e.event_type) + '</span></td>' +
        '<td style="font-size:12px;">' + formatTagLabel(e.parameter) + '</td>' +
        '<td>' + oldVal + '</td>' +
        '<td>' + newVal + '</td>' +
        '<td style="color:var(--text3);font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;">' + (e.details || '') + '</td>' +
      '</tr>';
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Error al cargar eventos</td></tr>';
    console.error('[EVENTS]', err);
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function boolHtml(val) {
  if (val === null || val === undefined) return '—';
  return val ? '<span class="val-bool-true">TRUE</span>' : '<span class="val-bool-false">FALSE</span>';
}

function fmt2(v) {
  return typeof v === 'number' ? v.toFixed(2) : (v !== null && v !== undefined ? (+v).toFixed(2) : '—');
}

function fmtEventType(t) {
  const m = {
    SETPOINT_CHANGE: 'SetPoint', STATE_CHANGE: 'Estado',
    ALARM_TRIGGER:   'Alarma',   ALARM_CLEAR:  'Alarma OK',
    TARE_ACTION:     'Tara',     RECIPE_LOAD:  'Receta',
    CALIBRATION:     'Calibración',
  };
  return m[t] || t;
}

function formatTagLabel(tag) {
  if (!tag) return '';
  return tag
    .replace(/^telemetry_/, '').replace(/^event_/, '')
    .replace(/_/g, ' ')
    .replace(/\bpv\b/i,  'PV').replace(/\bsp\b/i,  'SP')
    .replace(/\bppm\b/i, 'PPM').replace(/\bms\b/i, 'ms');
}

function fmtTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit'
  }).format(d);
}

function fmtDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'medium'
  }).format(d);
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v > 1e12 ? v : v * 1000);
  if (typeof v === 'string') {
    const hasTz = /[zZ]|[+-]\d{2}:\d{2}$/.test(v);
    return new Date(hasTz ? v : v + 'Z');
  }
  return new Date(v);
}

function updateSidebarTime() {
  const el = document.getElementById('sidebar-last-update');
  if (el) el.textContent = fmtTime(Date.now());
}
