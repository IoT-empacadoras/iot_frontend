/**
 * js/model/AppState.js
 * Estado global de la aplicación. Única fuente de verdad.
 */
const AppState = {
  // URL activa usada por ApiService en la version modular del frontend.
  backendUrl:    'https://iot-backend-b5v5.onrender.com',
  defaultDevice: '',
  currentDevice: '',
  allTags:       [],
  chart:         null,   // instancia Chart.js activa
  deviceMap:     {},     // id → objeto device con health
  authToken:     '',
  currentUser:   null,

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

  setDeviceMap(map) {
    this.deviceMap = map;
  },

  setAuthSession(token, user) {
    this.authToken = token || '';
    this.currentUser = user || null;
  },

  clearAuthSession() {
    this.authToken = '';
    this.currentUser = null;
  },
};
