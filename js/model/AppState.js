/**
 * js/model/AppState.js
 * Estado global de la aplicación. Única fuente de verdad.
 */
const AppState = {
  // URL activa usada por ApiService en la version modular del frontend.
  backendUrl:    'https://iot-backend-b5v5.onrender.com',
  defaultDevice: '441095104B78F267112345678',
  currentDevice: '441095104B78F267112345678',
  allTags:       [],
  chart:         null,   // instancia Chart.js activa

  setDevice(id) {
    this.currentDevice = id || this.defaultDevice;
  },

  setTags(tags) {
    this.allTags = tags;
  },

  setChart(instance) {
    if (this.chart) this.chart.destroy();
    this.chart = instance;
  },

  clearChart() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  },
};
