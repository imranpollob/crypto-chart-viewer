/**
 * CryptoView — Main Application Entry Point
 * Imran Pollob Multi-Chart Cryptocurrency Terminal
 */
import { KrakenAPI } from './api.js';
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  const api = new KrakenAPI();
  const ui = new UI();

  // Show loading indicator
  ui.setLoading(true);

  try {
    // Fetch asset pairs (reads local tokens.json or falls back to live API)
    await api.fetchAssetPairs();
  } catch (error) {
    console.error('Initialization warning: asset fetch encountered an issue, running with local cache/defaults', error);
  } finally {
    // Initialize UI listeners and controls
    ui.init(api);
    ui.setLoading(false);

    // Render active charts
    ui.renderCharts();
  }
});
