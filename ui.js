/**
 * CryptoView — UI Management Module
 * Imran Pollob Brand Identity & Multi-Chart Controller
 */

export class UI {
  constructor() {
    this.elements = {
      widgetContainer: document.getElementById('widget-container'),
      searchInput: document.getElementById('coin-search'),
      searchResults: document.getElementById('search-results'),
      selectedTags: document.getElementById('selected-tags'),
      loadingIndicator: document.getElementById('loading-indicator'),
      layoutControl: document.getElementById('layout-control'),
      themeToggle: document.getElementById('theme-toggle'),
      tagsBar: document.getElementById('tags-bar')
    };

    // State
    this.selectedPairs = JSON.parse(localStorage.getItem('selectedCoords')) || ['BTC/USD', 'ETH/USD'];
    this.chartsPerRow = localStorage.getItem('crypto_chart_cols') || '2';
    this.currentTheme = localStorage.getItem('crypto_theme') || 'dark';
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
  }

  init(api) {
    this.api = api;

    // Apply saved theme
    this.applyTheme(this.currentTheme);

    // Apply saved column layout
    this.setColumns(this.chartsPerRow);

    // Search input listeners
    this.elements.searchInput.addEventListener('input', this.handleSearch);
    this.elements.searchInput.addEventListener('focus', this.handleSearch);
    this.elements.searchInput.addEventListener('keydown', this.handleSearchKeydown);

    // Global keyboard shortcut ('/' to focus search)
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.elements.searchInput) {
        e.preventDefault();
        this.elements.searchInput.focus();
        this.elements.searchInput.select();
      }
    });

    // Layout buttons
    if (this.elements.layoutControl) {
      const layoutButtons = this.elements.layoutControl.querySelectorAll('.layout-btn');
      layoutButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const cols = btn.getAttribute('data-cols');
          if (cols) {
            this.setColumns(cols);
          }
        });
      });
    }

    // Theme Toggle
    if (this.elements.themeToggle) {
      this.elements.themeToggle.addEventListener('click', this.toggleTheme);
    }

    // Click outside to close search
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.closeSearch();
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

  setColumns(cols) {
    const validCols = ['1', '2', '3', '4'].includes(cols) ? cols : '2';
    this.chartsPerRow = validCols;
    localStorage.setItem('crypto_chart_cols', validCols);

    if (this.elements.widgetContainer) {
      this.elements.widgetContainer.setAttribute('data-cols', validCols);
    }

    if (this.elements.layoutControl) {
      const buttons = this.elements.layoutControl.querySelectorAll('.layout-btn');
      buttons.forEach(btn => {
        if (btn.getAttribute('data-cols') === validCols) {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        }
      });
    }

    // Trigger window resize event so TradingView widgets adapt dimensions
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
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
            "interval": "5",
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
