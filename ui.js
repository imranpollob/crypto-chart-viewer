/**
 * CryptoView — UI Management Module
 * Imran Pollob Brand Identity & Multi-Chart Controller
 */

const INTERVAL_LABELS = {
  '1': '1m',
  '3': '3m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '45': '45m',
  '60': '1h',
  '120': '2h',
  '180': '3h',
  '240': '4h',
  'D': '1D',
  'W': '1W'
};

export class UI {
  constructor() {
    this.elements = {
      widgetContainer: document.getElementById('widget-container'),
      searchInput: document.getElementById('coin-search'),
      searchResults: document.getElementById('search-results'),
      selectedTags: document.getElementById('selected-tags'),
      loadingIndicator: document.getElementById('loading-indicator'),
      layoutControl: document.getElementById('layout-control'),
      gridDropdownBtn: document.getElementById('grid-dropdown-btn'),
      gridMenu: document.getElementById('grid-menu'),
      activeGridText: document.getElementById('active-grid-text'),
      intervalControl: document.getElementById('interval-control'),
      intervalDropdownBtn: document.getElementById('interval-dropdown-btn'),
      intervalMenu: document.getElementById('interval-menu'),
      activeIntervalText: document.getElementById('active-interval-text'),
      themeToggle: document.getElementById('theme-toggle'),
      tagsBar: document.getElementById('tags-bar')
    };

    // State
    this.selectedPairs = JSON.parse(localStorage.getItem('selectedCoords')) || ['BTC/USD', 'ETH/USD'];
    this.chartsPerRow = localStorage.getItem('crypto_chart_cols') || '2';
    this.currentTheme = localStorage.getItem('crypto_theme') || 'dark';
    this.currentInterval = localStorage.getItem('crypto_chart_interval') || '5';
    this.api = null;
    this.activeSearchIndex = -1;

    // Bind methods
    this.handleSearch = this.handleSearch.bind(this);
    this.handleSearchKeydown = this.handleSearchKeydown.bind(this);
    this.handleSelection = this.handleSelection.bind(this);
    this.removePair = this.removePair.bind(this);
    this.clearAllPairs = this.clearAllPairs.bind(this);
    this.closeSearch = this.closeSearch.bind(this);
    this.setColumns = this.setColumns.bind(this);
    this.toggleTheme = this.toggleTheme.bind(this);
    this.toggleGridMenu = this.toggleGridMenu.bind(this);
    this.closeGridMenu = this.closeGridMenu.bind(this);
    this.toggleIntervalMenu = this.toggleIntervalMenu.bind(this);
    this.closeIntervalMenu = this.closeIntervalMenu.bind(this);
    this.setInterval = this.setInterval.bind(this);
  }

  init(api) {
    this.api = api;

    // Apply saved theme
    this.applyTheme(this.currentTheme);

    // Apply saved column layout (1 to 8)
    this.setColumns(this.chartsPerRow);

    // Apply saved time interval
    this.applyInterval(this.currentInterval);

    // Search input listeners
    this.elements.searchInput.addEventListener('input', this.handleSearch);
    this.elements.searchInput.addEventListener('focus', this.handleSearch);
    this.elements.searchInput.addEventListener('keydown', this.handleSearchKeydown);

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.elements.searchInput) {
        e.preventDefault();
        this.elements.searchInput.focus();
        this.elements.searchInput.select();
      }
      if (e.key === 'Escape') {
        this.closeSearch();
        this.closeGridMenu();
        this.closeIntervalMenu();
      }
    });

    // Grid Dropdown Toggle
    if (this.elements.gridDropdownBtn) {
      this.elements.gridDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleGridMenu();
      });
    }

    // Grid Menu Items
    if (this.elements.gridMenu) {
      this.elements.gridMenu.querySelectorAll('.grid-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const cols = item.getAttribute('data-cols');
          if (cols) {
            this.setColumns(cols);
          }
        });
      });
    }

    // Interval Dropdown Toggle
    if (this.elements.intervalDropdownBtn) {
      this.elements.intervalDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleIntervalMenu();
      });
    }

    // Interval Menu Selection Items
    if (this.elements.intervalMenu) {
      this.elements.intervalMenu.querySelectorAll('.interval-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const interval = item.getAttribute('data-interval');
          if (interval) {
            this.setInterval(interval);
          }
          this.closeIntervalMenu();
        });
      });
    }

    // Theme Toggle
    if (this.elements.themeToggle) {
      this.elements.themeToggle.addEventListener('click', this.toggleTheme);
    }

    // Click outside to close search and dropdown menus
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.closeSearch();
      }
      if (!e.target.closest('#layout-control')) {
        this.closeGridMenu();
      }
      if (!e.target.closest('#interval-control')) {
        this.closeIntervalMenu();
      }
    });

    // Initial render of tags
    this.renderTags();
  }

  setLoading(isLoading) {
    if (this.elements.loadingIndicator) {
      if (isLoading) {
        this.elements.loadingIndicator.classList.remove('hidden');
      } else {
        this.elements.loadingIndicator.classList.add('hidden');
      }
    }
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crypto_theme', theme);

    if (this.elements.themeToggle) {
      const sunIcon = this.elements.themeToggle.querySelector('.sun-icon');
      const moonIcon = this.elements.themeToggle.querySelector('.moon-icon');
      if (theme === 'dark') {
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
        this.elements.themeToggle.title = 'Switch to Light Mode';
        this.elements.themeToggle.setAttribute('aria-label', 'Switch to Light Mode');
      } else {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
        this.elements.themeToggle.title = 'Switch to Dark Mode';
        this.elements.themeToggle.setAttribute('aria-label', 'Switch to Dark Mode');
      }
    }
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    // Re-render charts with matching TradingView theme
    this.renderCharts();
  }

  toggleGridMenu() {
    this.closeIntervalMenu();
    if (!this.elements.layoutControl) return;
    const isOpen = this.elements.layoutControl.classList.toggle('is-open');
    if (this.elements.gridDropdownBtn) {
      this.elements.gridDropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }

  closeGridMenu() {
    if (!this.elements.layoutControl) return;
    this.elements.layoutControl.classList.remove('is-open');
    if (this.elements.gridDropdownBtn) {
      this.elements.gridDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  }

  setColumns(cols) {
    const validCols = ['1', '2', '3', '4', '5', '6', '7', '8'].includes(cols) ? cols : '2';
    this.chartsPerRow = validCols;
    localStorage.setItem('crypto_chart_cols', validCols);

    if (this.elements.widgetContainer) {
      this.elements.widgetContainer.setAttribute('data-cols', validCols);
    }

    if (this.elements.activeGridText) {
      this.elements.activeGridText.textContent = validCols;
    }

    if (this.elements.gridMenu) {
      const items = this.elements.gridMenu.querySelectorAll('.grid-item');
      items.forEach(item => {
        if (item.getAttribute('data-cols') === validCols) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    this.closeGridMenu();

    // Trigger window resize event so TradingView widgets adapt dimensions
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  toggleIntervalMenu() {
    this.closeGridMenu();
    if (!this.elements.intervalControl) return;
    const isOpen = this.elements.intervalControl.classList.toggle('is-open');
    if (this.elements.intervalDropdownBtn) {
      this.elements.intervalDropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }

  closeIntervalMenu() {
    if (!this.elements.intervalControl) return;
    this.elements.intervalControl.classList.remove('is-open');
    if (this.elements.intervalDropdownBtn) {
      this.elements.intervalDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  }

  applyInterval(interval) {
    this.currentInterval = interval;
    localStorage.setItem('crypto_chart_interval', interval);

    if (this.elements.activeIntervalText) {
      this.elements.activeIntervalText.textContent = INTERVAL_LABELS[interval] || interval;
    }

    if (this.elements.intervalMenu) {
      this.elements.intervalMenu.querySelectorAll('.interval-item').forEach(item => {
        if (item.getAttribute('data-interval') === interval) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  }

  setInterval(interval) {
    if (this.currentInterval !== interval) {
      this.applyInterval(interval);
      this.renderCharts();
    }
  }

  handleSearch(e) {
    const query = e.target.value.trim();
    if (query.length === 0) {
      this.closeSearch();
      return;
    }

    if (!this.api) return;
    const results = this.api.search(query);
    this.renderSearchResults(results);
  }

  handleSearchKeydown(e) {
    const items = this.elements.searchResults.querySelectorAll('li');
    if (!items.length || this.elements.searchResults.style.display === 'none') {
      if (e.key === 'Escape') this.closeSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeSearchIndex = (this.activeSearchIndex + 1) % items.length;
      this.updateActiveSearchItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeSearchIndex = (this.activeSearchIndex - 1 + items.length) % items.length;
      this.updateActiveSearchItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.activeSearchIndex >= 0 && this.activeSearchIndex < items.length) {
        items[this.activeSearchIndex].click();
      } else if (items.length > 0) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      this.closeSearch();
    }
  }

  updateActiveSearchItem(items) {
    items.forEach((item, index) => {
      if (index === this.activeSearchIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  renderSearchResults(results) {
    this.elements.searchResults.innerHTML = '';
    this.activeSearchIndex = -1;

    if (results.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.style.cursor = 'default';
      emptyLi.style.color = 'var(--color-text-muted)';
      emptyLi.textContent = 'No matching pairs found';
      this.elements.searchResults.appendChild(emptyLi);
      this.elements.searchResults.style.display = 'block';
      return;
    }

    results.forEach(pair => {
      const li = document.createElement('li');

      const pairText = document.createElement('span');
      pairText.textContent = pair.display;

      const badge = document.createElement('span');
      badge.className = 'coin-badge';
      badge.textContent = pair.id || pair.symbol || '';

      li.appendChild(pairText);
      li.appendChild(badge);

      li.addEventListener('click', () => this.handleSelection(pair));
      this.elements.searchResults.appendChild(li);
    });

    this.elements.searchResults.style.display = 'block';
  }

  closeSearch() {
    this.elements.searchResults.style.display = 'none';
    this.activeSearchIndex = -1;
  }

  handleSelection(pair) {
    const pairName = pair.display || pair;
    if (!this.selectedPairs.includes(pairName)) {
      this.selectedPairs.push(pairName);
      this.saveSelections();
      this.renderTags();
      this.renderCharts();
    }
    this.elements.searchInput.value = '';
    this.closeSearch();
  }

  removePair(pairName) {
    this.selectedPairs = this.selectedPairs.filter(p => p !== pairName);
    this.saveSelections();
    this.renderTags();
    this.renderCharts();
  }

  clearAllPairs() {
    this.selectedPairs = [];
    this.saveSelections();
    this.renderTags();
    this.renderCharts();
  }

  saveSelections() {
    localStorage.setItem('selectedCoords', JSON.stringify(this.selectedPairs));
  }

  renderTags() {
    if (!this.elements.selectedTags) return;
    this.elements.selectedTags.innerHTML = '';

    if (this.selectedPairs.length === 0) {
      if (this.elements.tagsBar) {
        this.elements.tagsBar.style.display = 'none';
      }
      return;
    }

    if (this.elements.tagsBar) {
      this.elements.tagsBar.style.display = 'flex';
    }

    this.selectedPairs.forEach(pair => {
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.innerHTML = `
        <span>${pair}</span>
        <span class="remove-tag" data-pair="${pair}" title="Remove ${pair}" aria-label="Remove ${pair}">&times;</span>
      `;
      tag.querySelector('.remove-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removePair(pair);
      });
      this.elements.selectedTags.appendChild(tag);
    });

    // Add Clear All button if 2 or more pairs are selected
    if (this.selectedPairs.length >= 2) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'clear-all-btn';
      clearBtn.textContent = 'Clear All';
      clearBtn.title = 'Remove all charts';
      clearBtn.addEventListener('click', () => this.clearAllPairs());
      this.elements.selectedTags.appendChild(clearBtn);
    }
  }

  async renderCharts() {
    this.elements.widgetContainer.innerHTML = '';

    if (this.selectedPairs.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h2 class="empty-title">No Charts Active</h2>
        <p class="empty-desc">Search for any cryptocurrency above or click a popular asset below to view its live chart.</p>
        <div class="quick-presets">
          <button type="button" class="preset-chip" data-pair="BTC/USD">+ BTC/USD</button>
          <button type="button" class="preset-chip" data-pair="ETH/USD">+ ETH/USD</button>
          <button type="button" class="preset-chip" data-pair="SOL/USD">+ SOL/USD</button>
          <button type="button" class="preset-chip" data-pair="DOGE/USD">+ DOGE/USD</button>
        </div>
      `;

      emptyState.querySelectorAll('.preset-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const pair = btn.getAttribute('data-pair');
          this.handleSelection({ display: pair, symbol: pair.replace('/', '-') });
        });
      });

      this.elements.widgetContainer.appendChild(emptyState);
      return;
    }

    // Ensure TradingView script is loaded
    if (!window.TradingView) {
      await new Promise((resolve) => {
        if (document.getElementById('tv-script')) {
          const check = setInterval(() => {
            if (window.TradingView) {
              clearInterval(check);
              resolve();
            }
          }, 100);
        } else {
          const script = document.createElement('script');
          script.id = 'tv-script';
          script.src = 'https://s3.tradingview.com/tv.js';
          script.type = 'text/javascript';
          script.onload = resolve;
          document.head.appendChild(script);
        }
      });
    }

    const currentTheme = this.currentTheme === 'light' ? 'light' : 'dark';

    this.selectedPairs.forEach(pairName => {
      // TradingView widget format COINBASE:BTCUSD
      const symbolForTV = `COINBASE:${pairName.replace(/[\/-]/g, '')}`;

      const wrapper = document.createElement('div');
      wrapper.className = 'chart-wrapper';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container';

      const innerDiv = document.createElement('div');
      innerDiv.id = `tv_${pairName.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substring(2, 7)}`;
      innerDiv.style.height = '100%';
      innerDiv.style.width = '100%';

      widgetDiv.appendChild(innerDiv);
      wrapper.appendChild(widgetDiv);
      this.elements.widgetContainer.appendChild(wrapper);

      setTimeout(() => {
        try {
          new window.TradingView.widget({
            "autosize": true,
            "symbol": symbolForTV,
            "interval": this.currentInterval,
            "timezone": "Etc/UTC",
            "theme": currentTheme,
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "withdateranges": true,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "details": false,
            "calendar": false,
            "container_id": innerDiv.id
          });
        } catch (err) {
          console.error(`Failed to initialize TradingView widget for ${pairName}:`, err);
        }
      }, 0);
    });
  }
}
