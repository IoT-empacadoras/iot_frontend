/**
 * js/view/TelemetryView.js
 * Renderiza la pestaña Telemetría: KPI cards, gráfico y tabla.
 * Depende de: Helpers, AppState
 */
const TelemetryView = (() => {

  // ── Conexión ────────────────────────────────────────────────────────────────
  function setConnStatus(state) {
    const dot   = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    const map = {
      online:  ['online',  'Conectado'],
      offline: ['offline', 'Desconectado'],
      loading: ['loading', 'Sin datos recientes'],  // online pero inactivo
    };
    const [cls, txt] = map[state] || map.offline;
    dot.className     = 'conn-dot ' + cls;
    label.textContent = txt;
  }

  function updateSidebarTime() {
    const el = document.getElementById('sidebar-last-update');
    if (el) el.textContent = Helpers.fmtTime(Date.now());
  }

  // ── Device selector ─────────────────────────────────────────────────────────
  function populateDeviceSelector(devices, currentId) {
    const sel = document.getElementById('device-selector');
    sel.innerHTML = devices.map(({ id, health }) => {
      const isActive = health?.status === 'healthy';
      const label = isActive ? '\u25cf ' + id + ' (activo)' : '\u25cb ' + id;
      return '<option value="' + id + '"' + (id === currentId ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
    document.getElementById('sidebar-device-id').textContent = currentId;
  }

  // Actualiza solo los textos del selector sin re-renderizar (para polling)
  function refreshDeviceLabels(deviceMap) {
    const sel = document.getElementById('device-selector');
    Array.from(sel.options).forEach(opt => {
      const dev = deviceMap[opt.value];
      const isActive = dev?.health?.status === 'healthy';
      opt.textContent = isActive ? '\u25cf ' + opt.value + ' (activo)' : '\u25cb ' + opt.value;
    });
  }

  // ── Variable selector ────────────────────────────────────────────────────────
  function populateVariableSelector(tags) {
    const sel = document.getElementById('variable-selector');
    if (!tags.length) {
      sel.innerHTML = '<option value="">Sin variables aún</option>';
      return;
    }

    const previousValue = sel.value;
    sel.innerHTML = tags.map(t =>
      '<option value="' + t + '">' + Helpers.formatTagLabel(t) + '</option>'
    ).join('');

    if (tags.includes(previousValue)) {
      sel.value = previousValue;
    }
  }

  // ── Dispositivo inactivo ────────────────────────────────────────────────────
  function showInactiveDevice() {
    KPI_DEFS.forEach(({ id }) => {
      const card = document.getElementById(id);
      if (!card) return;
      const valEl = card.querySelector('.kpi-value');
      if (valEl) { valEl.textContent = 'Inactivo'; valEl.style.color = 'var(--text3)'; }
    });
    const runEl = document.getElementById('kpi-running-val');
    const runSt = document.getElementById('kpi-running-status');
    if (runEl) { runEl.textContent = 'INACTIVO'; runEl.style.color = 'var(--text3)'; }
    if (runSt) runSt.className = 'kpi-status';
    const presEl = document.getElementById('kpi-presion-status');
    if (presEl) presEl.className = 'kpi-status';
  }

  // ── KPI Cards ────────────────────────────────────────────────────────────────
  const KPI_DEFS = [
    { id: 'kpi-ppm',    key: 'telemetry_pv_ppm',            unit: 'ppm', dec: 1 },
    { id: 'kpi-sp-ppm', key: 'telemetry_sp_velocidad_ppm',  unit: 'ppm', dec: 1 },
    { id: 'kpi-th',     key: 'telemetry_pv_temp_mordaza_H', unit: '°C',  dec: 1 },
    { id: 'kpi-tv',     key: 'telemetry_pv_temp_mordaza_V', unit: '°C',  dec: 1 },
    { id: 'kpi-peso',   key: 'telemetry_pv_peso_promedio',  unit: 'g',   dec: 1 },
    { id: 'kpi-presion',key: 'telemetry_pv_presion_aire',   unit: 'bar', dec: 2 },
  ];

  function syncTelemetryLayout(tags) {
    const activeTags = new Set(tags);

    KPI_DEFS.forEach(({ id, key }) => {
      const card = document.getElementById(id);
      if (!card) return;
      card.style.display = activeTags.has(key) ? '' : 'none';
    });

    const runningCard = document.getElementById('kpi-running');
    if (runningCard) {
      runningCard.style.display = activeTags.has('telemetry_is_running') ? '' : 'none';
    }

    const variableSelector = document.getElementById('variable-selector');
    const controlsBar = variableSelector?.closest('.controls-bar');
    if (controlsBar) {
      controlsBar.style.display = tags.length ? '' : 'none';
    }
  }

  function updateKpiCards(data) {
    KPI_DEFS.forEach(({ id, key, unit, dec }) => {
      const card = document.getElementById(id);
      if (!card) return;
      const val = data[key]?.value ?? null;
      const valEl = card.querySelector('.kpi-value');
      valEl.style.color = '';  // restaurar color si estaba marcado como inactivo
      valEl.textContent = val !== null ? (+val).toFixed(dec) + ' ' + unit : '—';
    });

    // Estado presión
    const presVal = data['telemetry_pv_presion_aire']?.value;
    const presEl  = document.getElementById('kpi-presion-status');
    if (presEl && presVal !== undefined) {
      presEl.className = 'kpi-status ' + (+presVal < 5 ? 'err' : +presVal < 5.5 ? 'warn' : 'ok');
    }

    // Estado máquina
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

  function setRunningInactive() {
    const runEl = document.getElementById('kpi-running-val');
    const runSt = document.getElementById('kpi-running-status');
    if (runEl) {
      runEl.textContent = 'INACTIVO';
      runEl.style.color = 'var(--text3)';
    }
    if (runSt) runSt.className = 'kpi-status';
  }

  // ── Gráfico ──────────────────────────────────────────────────────────────────
  function renderChart(rows, tag) {
    const sorted = [...rows].reverse().filter((_, i) => rows.length > 60 ? i % 3 === 0 : true);
    const labels = sorted.map(r => Helpers.fmtTime(r.minute_ts || r.interval_ts || r.hour_ts));
    const avg    = sorted.map(r => r.avg_value);
    const mn     = sorted.map(r => r.min_value);
    const mx     = sorted.map(r => r.max_value);

    AppState.clearChart();                                         // liberar canvas antes de re-instanciar
    const ctx = document.getElementById('data-chart').getContext('2d');
    const instance = new Chart(ctx, {
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
            },
          },
          {
            label: 'Mínimo', data: mn,
            borderColor: '#22c55e', borderDash: [4, 4], borderWidth: 1.5,
            fill: false, tension: 0.4, pointRadius: 0,
            datalabels: { display: false },
          },
          {
            label: 'Máximo', data: mx,
            borderColor: '#ef4444', borderDash: [4, 4], borderWidth: 1.5,
            fill: false, tension: 0.4, pointRadius: 0,
            datalabels: { display: false },
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 28 } },
        plugins: {
          legend: { labels: { color: '#475569', boxWidth: 14, font: { size: 12 } } },
          title: { display: false },
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 11 } },
            grid:  { color: 'rgba(0,0,0,.06)' },
          },
          y: {
            ticks: { color: '#64748b', font: { size: 11 } },
            grid:  { color: 'rgba(0,0,0,.06)' },
            title: { display: true, text: Helpers.formatTagLabel(tag), color: '#64748b', font: { size: 11 } },
            grace: '10%',
          },
        },
      },
    });

    AppState.setChart(instance);
  }

  function updateChartHeader(tag, range, count) {
    document.getElementById('chart-title').textContent  = Helpers.formatTagLabel(tag) + ' — ' + range;
    document.getElementById('chart-count').textContent  = count + ' puntos';
  }

  // ── Tabla agregados ──────────────────────────────────────────────────────────
  function renderTable(rows) {
    const tbody = document.getElementById('table-body');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Sin datos disponibles</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r =>
      '<tr>' +
      '<td>' + Helpers.fmtDateTime(r.minute_ts || r.interval_ts || r.hour_ts) + '</td>' +
      '<td>' + Helpers.fmt2(r.avg_value) + '</td>' +
      '<td>' + Helpers.fmt2(r.min_value) + '</td>' +
      '<td>' + Helpers.fmt2(r.max_value) + '</td>' +
      '<td>' + (r.count || 0) + '</td>' +
      '</tr>'
    ).join('');
  }

  return {
    setConnStatus, updateSidebarTime,
    populateDeviceSelector, refreshDeviceLabels, populateVariableSelector,
    syncTelemetryLayout,
    updateKpiCards, showInactiveDevice, setRunningInactive,
    renderChart, updateChartHeader,
    renderTable,
  };
})();
