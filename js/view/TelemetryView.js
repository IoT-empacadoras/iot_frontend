/**
 * js/view/TelemetryView.js
 * Renders telemetry tab UI.
 */
const TelemetryView = (() => {
  function t(key, params = {}, fallback = '') {
    return I18nService.t(key, params, fallback);
  }

  function setConnStatus(state) {
    const dot = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    const statusMap = {
      online: ['online', t('common.connected')],
      offline: ['offline', t('common.disconnected')],
      loading: ['loading', t('common.recentDataMissing')],
    };

    const [cls, text] = statusMap[state] || statusMap.offline;
    if (dot) dot.className = 'conn-dot ' + cls;
    if (label) label.textContent = text;
  }

  function updateSidebarTime() {
    const element = document.getElementById('sidebar-last-update');
    if (element) element.textContent = Helpers.fmtTime(Date.now());
  }

  function buildDeviceOptionLabel(id, isActive) {
    return isActive
      ? '\u25cf ' + id + ' (' + t('telemetry.activeDeviceSuffix') + ')'
      : '\u25cb ' + id;
  }

  function getSensorTag(sensor) {
    return typeof sensor === 'string'
      ? sensor
      : sensor?.tag_name || sensor?.tag || sensor?.tagName || sensor?.name || sensor?.variable_name || '';
  }

  function getSensorLabel(sensor) {
    if (typeof sensor === 'string') return Helpers.formatTagLabel(sensor);
    const tag = getSensorTag(sensor);
    const name = sensor?.description || sensor?.label || sensor?.display_name || sensor?.displayName || sensor?.name || Helpers.formatTagLabel(tag);
    const unit = sensor?.engineering_unit || sensor?.unit || '';
    return unit ? name + ' (' + unit + ')' : name;
  }

  function getSensorIcon(tag) {
    const label = Helpers.formatTagLabel(tag).trim();
    const parts = label.split(/\s+/).filter(Boolean);
    return (parts[0] || tag || '--').slice(0, 3).toUpperCase();
  }

  function formatCurrentValue(value, unit) {
    if (value === null || value === undefined || value === '') return t('common.emptyDash', {}, 'â€”');
    if (typeof value === 'boolean') return String(value).toUpperCase();
    const numeric = Number(value);
    const formatted = Number.isFinite(numeric)
      ? (Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2))
      : String(value);
    return formatted + (unit ? ' ' + unit : '');
  }

  function populateDeviceSelector(devices, currentId) {
    const select = document.getElementById('device-selector');
    if (!select) return;

    if (!devices.length) {
      select.innerHTML = '<option value="">' + Helpers.escapeHtml(t('telemetry.noDevices')) + '</option>';
      select.value = '';
      document.getElementById('sidebar-device-id').textContent = t('common.emptyDash', {}, '—');
      return;
    }

    select.innerHTML = devices.map(({ id, health }) => {
      const isActive = health?.status === 'healthy';
      const label = buildDeviceOptionLabel(id, isActive);
      return '<option value="' + Helpers.escapeHtml(id) + '"' + (id === currentId ? ' selected' : '') + '>' + Helpers.escapeHtml(label) + '</option>';
    }).join('');

    document.getElementById('sidebar-device-id').textContent = currentId || t('common.emptyDash', {}, '—');
  }

  function refreshDeviceLabels(deviceMap) {
    const select = document.getElementById('device-selector');
    if (!select) return;
    Array.from(select.options).forEach(option => {
      const device = deviceMap[option.value];
      const isActive = device?.health?.status === 'healthy';
      option.textContent = buildDeviceOptionLabel(option.value, isActive);
    });
  }

  function populateVariableSelector(sensors) {
    const select = document.getElementById('variable-selector');
    if (!select) return;

    if (!sensors.length) {
      select.innerHTML = '<option value="">' + Helpers.escapeHtml(t('telemetry.noVariablesYet')) + '</option>';
      return;
    }

    const previousValue = select.value;
    const tags = sensors.map(getSensorTag).filter(Boolean);
    select.innerHTML = sensors.map(sensor => {
      const tag = getSensorTag(sensor);
      return '<option value="' + Helpers.escapeHtml(tag) + '">' + Helpers.escapeHtml(getSensorLabel(sensor)) + '</option>';
    }
    ).join('');

    if (tags.includes(previousValue)) {
      select.value = previousValue;
    }
  }

  function syncTelemetryLayout(sensors) {
    const tags = sensors.map(getSensorTag).filter(Boolean);

    const variableSelector = document.getElementById('variable-selector');
    const controlsBar = variableSelector?.closest('.controls-bar');
    if (controlsBar) controlsBar.classList.toggle('is-hidden', !tags.length);
  }

  function renderSensorCards(rows) {
    const grid = document.querySelector('.kpi-grid');
    if (!grid) return;

    if (!rows.length) {
      grid.innerHTML = '<div class="kpi-card"><div class="kpi-body"><div class="kpi-value">' +
        Helpers.escapeHtml(t('common.emptyDash', {}, 'â€”')) +
        '</div><div class="kpi-label">' + Helpers.escapeHtml(t('telemetry.noVariablesYet')) + '</div></div></div>';
      return;
    }

    grid.innerHTML = rows.map(row => {
      const tag = getSensorTag(row);
      const unit = row.unit || row.engineering_unit || '';
      const label = row.name || getSensorLabel(row);
      const timestamp = row.timestamp ? Helpers.fmtDateTime(row.timestamp) : t('common.emptyDash', {}, 'â€”');

      return (
        '<div class="kpi-card" data-tag="' + Helpers.escapeHtml(tag) + '">' +
          '<div class="kpi-icon">' + Helpers.escapeHtml(getSensorIcon(tag)) + '</div>' +
          '<div class="kpi-body">' +
            '<div class="kpi-value">' + Helpers.escapeHtml(formatCurrentValue(row.value, unit)) + '</div>' +
            '<div class="kpi-label">' + Helpers.escapeHtml(label) + '</div>' +
            '<div class="kpi-sub">' + Helpers.escapeHtml(timestamp) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function updateKpiCards(data) {
    [].forEach(({ id, key, unit, dec }) => {
      const card = document.getElementById(id);
      if (!card) return;
      const valueElement = card.querySelector('.kpi-value');
      if (!valueElement) return;
      const value = data[key]?.value ?? null;
      valueElement.classList.remove('is-muted');
      valueElement.textContent = value !== null
        ? Number(value).toFixed(dec) + (unit ? ' ' + unit : '')
        : t('common.emptyDash', {}, '—');
    });
  }

  function setRunningInactive() {}

  function renderChart(rows, tag) {
    const sorted = [...rows].reverse().filter((_, index) => rows.length > 60 ? index % 3 === 0 : true);
    const labels = sorted.map(row => Helpers.fmtTime(row.minute_ts || row.interval_ts || row.hour_ts));
    const average = sorted.map(row => row.avg_value);
    const minimum = sorted.map(row => row.min_value);
    const maximum = sorted.map(row => row.max_value);

    AppState.clearChart();
    const ctx = document.getElementById('data-chart').getContext('2d');
    const instance = new Chart(ctx, {
      type: 'line',
      plugins: [ChartDataLabels],
      data: {
        labels,
        datasets: [
          {
            label: t('telemetry.datasetAverage'),
            data: average,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,.08)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: sorted.length > 30 ? 0 : 4,
            pointHoverRadius: 6,
            datalabels: {
              display: sorted.length <= 20,
              align: 'top',
              anchor: 'end',
              backgroundColor: '#0057d9',
              borderColor: '#003c96',
              borderWidth: 1,
              borderRadius: 4,
              color: '#ffeb3b',
              font: { weight: 'bold', size: 10 },
              formatter: value => Number(value).toFixed(1),
              padding: 4,
            },
          },
          {
            label: t('telemetry.datasetMinimum'),
            data: minimum,
            borderColor: '#22c55e',
            borderDash: [4, 4],
            borderWidth: 1.5,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            datalabels: { display: false },
          },
          {
            label: t('telemetry.datasetMaximum'),
            data: maximum,
            borderColor: '#ef4444',
            borderDash: [4, 4],
            borderWidth: 1.5,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            datalabels: { display: false },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 28 } },
        plugins: {
          legend: { labels: { color: '#475569', boxWidth: 14, font: { size: 12 } } },
          title: { display: false },
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,.06)' },
          },
          y: {
            ticks: { color: '#64748b', font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,.06)' },
            title: {
              display: true,
              text: Helpers.formatTagLabel(tag),
              color: '#64748b',
              font: { size: 11 },
            },
            grace: '10%',
          },
        },
      },
    });

    AppState.setChart(instance);
  }

  function updateChartHeader(tag, range, count) {
    const label = tag ? Helpers.formatTagLabel(tag) : t('telemetry.seriesTitle');
    document.getElementById('chart-title').textContent = range
      ? t('telemetry.chartRangeLabel', { label, range })
      : label;
    document.getElementById('chart-count').textContent = t('telemetry.points', { count });
  }

  function renderTable(rows) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">' + Helpers.escapeHtml(t('telemetry.noAvailableData')) + '</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(row =>
      '<tr>' +
        '<td>' + Helpers.fmtDateTime(row.minute_ts || row.interval_ts || row.hour_ts) + '</td>' +
        '<td>' + Helpers.fmt2(row.avg_value) + '</td>' +
        '<td>' + Helpers.fmt2(row.min_value) + '</td>' +
        '<td>' + Helpers.fmt2(row.max_value) + '</td>' +
        '<td>' + (row.count || 0) + '</td>' +
      '</tr>'
    ).join('');
  }

  return {
    setConnStatus,
    updateSidebarTime,
    populateDeviceSelector,
    refreshDeviceLabels,
    populateVariableSelector,
    syncTelemetryLayout,
    renderSensorCards,
    setRunningInactive,
    renderChart,
    updateChartHeader,
    renderTable,
  };
})();
