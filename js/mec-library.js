/**
 * MEC Library - Tutorial Filtering and Display System
 *
 * Features:
 * - Dynamic loading from tutorials.json
 * - Real-time search with debounce
 * - Multi-filter support (year, status, topic)
 * - Random shuffling within year groups
 * - URL parameter persistence
 * - Responsive card rendering with dynamic heights
 */

// ===========================
// Global State
// ===========================

let allTutorials = [];
let filteredTutorials = [];
let searchDebounce = null;

// DOM Elements
const libraryContainer = document.getElementById('mec-library');
const searchInput = document.getElementById('mec-search');
const yearSelect = document.getElementById('mec-year-filter');
const topicSelect = document.getElementById('mec-topic-filter');
const resultsCount = document.getElementById('mec-results-count');
const clearButton = document.getElementById('mec-clear-filters');

// ===========================
// Data Loading
// ===========================

/**
 * Load tutorials from JSON file
 */
async function loadTutorials() {
  try {
    console.log('Starting to load tutorials...');
    showLoading();

    const response = await fetch('data/tutorials.json');
    console.log('Fetch response:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('JSON parsed successfully, data:', data);

    allTutorials = data.tutorials || [];
    console.log(`Loaded ${allTutorials.length} tutorials`);

    // Initialize UI
    populateFilters();
    initializeFromURL();

  } catch (error) {
    console.error('Error loading tutorials:', error);
    console.error('Error details:', error.message, error.stack);

    // More helpful error message
    const errorMsg = error.message.includes('Failed to fetch')
      ? 'Cannot load tutorials. Please make sure you are viewing this page through a web server (not file://). Try using "python3 -m http.server" or similar.'
      : `Failed to load tutorials: ${error.message}`;

    showError(errorMsg);
  }
}

// ===========================
// Rendering
// ===========================

/**
 * Render tutorials as cards in the grid
 * @param {Array} tutorials - Array of tutorial objects
 */
function renderTutorials(tutorials) {
  if (!libraryContainer) return;

  // Clear container
  libraryContainer.innerHTML = '';

  // Show empty state if no results
  if (tutorials.length === 0) {
    showEmptyState();
    updateResultsCount(0);
    return;
  }

  // Group tutorials by year
  const byYear = {};
  tutorials.forEach(tutorial => {
    if (!byYear[tutorial.year]) {
      byYear[tutorial.year] = [];
    }
    byYear[tutorial.year].push(tutorial);
  });

  // Render each year section (newest first)
  const years = Object.keys(byYear).sort((a, b) => b - a);

  years.forEach(year => {
    // Create year header
    const yearHeader = document.createElement('h2');
    yearHeader.className = 'mec-year-header';
    yearHeader.textContent = `${year} Materials`;
    libraryContainer.appendChild(yearHeader);

    // Create grid for this year's tutorials
    const yearGrid = document.createElement('div');
    yearGrid.className = 'mec-library-grid';

    // Render cards for this year
    byYear[year].forEach(tutorial => {
      const card = createTutorialCard(tutorial);
      yearGrid.appendChild(card);
    });

    libraryContainer.appendChild(yearGrid);
  });

  updateResultsCount(tutorials.length);
}

/**
 * Create a tutorial card element
 * @param {Object} tutorial - Tutorial data object
 * @returns {HTMLElement} Card element
 */
function createTutorialCard(tutorial) {
  const card = document.createElement('a');
  card.className = 'mec-card';
  card.href = tutorial.url || '#';
  card.target = '_blank';
  card.rel = 'noopener noreferrer';

  // Add status modifier classes
  if (tutorial.status === 'winner') {
    card.classList.add('mec-card--winner');
  } else if (tutorial.status === 'finalist') {
    card.classList.add('mec-card--finalist');
  }

  // Add image/no-image modifier
  if (tutorial.thumbnail && tutorial.thumbnail.trim() !== '') {
    card.classList.add('mec-card--has-image');
  } else {
    card.classList.add('mec-card--no-image');
  }

  // Build card HTML
  card.innerHTML = `
    ${renderBadge(tutorial.status)}
    ${renderThumbnail(tutorial.thumbnail)}
    <div class="mec-card__content">
      <h3 class="mec-card__title">${escapeHtml(tutorial.title)}</h3>
      <p class="mec-card__authors">${renderAuthors(tutorial.authors)}</p>
      ${renderKeywords(tutorial.keywords)}
    </div>
    <div class="mec-card__link">
      View Tutorial <i class="fa fa-external-link"></i>
    </div>
  `;

  return card;
}

/**
 * Render status badge (winner/finalist)
 */
function renderBadge(status) {
  if (status === 'winner') {
    return '<span class="mec-card__badge mec-card__badge--winner">Winner</span>';
  } else if (status === 'finalist') {
    return '<span class="mec-card__badge mec-card__badge--finalist">Finalist</span>';
  }
  return '';
}

/**
 * Render thumbnail or placeholder
 */
function renderThumbnail(thumbnail) {
  if (thumbnail && thumbnail.trim() !== '') {
    return `
      <div class="mec-card__thumbnail">
        <img src="${escapeHtml(thumbnail)}"
             alt="Tutorial thumbnail"
             loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=\\'mec-card__placeholder\\'><i class=\\'fa fa-file-text\\'></i></div>'">
      </div>
    `;
  } else {
    return `
      <div class="mec-card__thumbnail">
        <div class="mec-card__placeholder">
          <i class="fa fa-file-text"></i>
        </div>
      </div>
    `;
  }
}

/**
 * Render authors list
 */
function renderAuthors(authors) {
  if (!authors || authors.length === 0) return 'Unknown';

  // Join authors with commas
  return escapeHtml(authors.join(', '));
}

/**
 * Render keyword tags
 */
function renderKeywords(keywords) {
  if (!keywords || keywords.length === 0) return '';

  const keywordTags = keywords
    .slice(0, 5) // Limit to 5 keywords
    .map(kw => `<span class="mec-card__keyword">${escapeHtml(kw)}</span>`)
    .join('');

  return `<div class="mec-card__keywords">${keywordTags}</div>`;
}

// ===========================
// Filtering & Search
// ===========================

/**
 * Apply all filters and render results
 */
function filterTutorials() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedYear = yearSelect.value;
  const selectedTopic = topicSelect.value;

  // Filter tutorials
  let filtered = allTutorials.filter(tutorial => {
    // Search filter (title, authors, keywords)
    const matchesSearch = !searchTerm ||
      tutorial.title.toLowerCase().includes(searchTerm) ||
      tutorial.authors.some(author => author.toLowerCase().includes(searchTerm)) ||
      tutorial.keywords.some(kw => kw.toLowerCase().includes(searchTerm));

    // Year filter
    const matchesYear = !selectedYear || tutorial.year == selectedYear;

    // Topic filter
    const matchesTopic = !selectedTopic || tutorial.keywords.includes(selectedTopic);

    // All filters must match (AND logic)
    return matchesSearch && matchesYear && matchesTopic;
  });

  // Shuffle within year groups
  filtered = shuffleWithinYears(filtered);

  // Store and render
  filteredTutorials = filtered;
  renderTutorials(filtered);

  // Update URL
  updateURL();

  // Show/hide clear button
  updateClearButton();
}

/**
 * Sort tutorials within their year groups
 * Order: Winners first, then Finalists, then Regular (shuffled)
 * @param {Array} tutorials - Array of tutorial objects
 * @returns {Array} Sorted array
 */
function shuffleWithinYears(tutorials) {
  // Group by year
  const byYear = {};
  tutorials.forEach(tutorial => {
    if (!byYear[tutorial.year]) {
      byYear[tutorial.year] = [];
    }
    byYear[tutorial.year].push(tutorial);
  });

  // Sort each year group: winners, finalists, then shuffled regulars
  Object.keys(byYear).forEach(year => {
    const group = byYear[year];

    // Separate by status
    const winners = group.filter(t => t.status === 'winner');
    const finalists = group.filter(t => t.status === 'finalist');
    const regulars = group.filter(t => !t.status || t.status === 'regular');

    // Shuffle only the regular tutorials (Fisher-Yates)
    for (let i = regulars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regulars[i], regulars[j]] = [regulars[j], regulars[i]];
    }

    // Combine: winners first, then finalists, then shuffled regulars
    byYear[year] = [...winners, ...finalists, ...regulars];
  });

  // Flatten back to array (newest years first)
  return Object.keys(byYear)
    .sort((a, b) => b - a) // Sort years descending
    .flatMap(year => byYear[year]);
}

/**
 * Search with debounce to avoid excessive filtering
 */
function handleSearch() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    filterTutorials();
  }, 300);
}

/**
 * Clear all filters
 */
function clearFilters() {
  searchInput.value = '';
  yearSelect.value = '';
  topicSelect.value = '';

  filterTutorials();
}

// ===========================
// Filter Population
// ===========================

/**
 * Populate year and topic dropdowns from tutorial data
 */
function populateFilters() {
  // Extract unique years (sorted descending)
  const years = [...new Set(allTutorials.map(t => t.year))].sort((a, b) => b - a);

  // Populate year dropdown
  yearSelect.innerHTML = '<option value="">All Years</option>';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  // Extract unique keywords (sorted alphabetically)
  const allKeywords = new Set();
  allTutorials.forEach(tutorial => {
    if (tutorial.keywords) {
      tutorial.keywords.forEach(kw => allKeywords.add(kw));
    }
  });

  const keywords = [...allKeywords].sort((a, b) => a.localeCompare(b));

  // Populate topic dropdown
  topicSelect.innerHTML = '<option value="">All Topics</option>';
  keywords.forEach(keyword => {
    const option = document.createElement('option');
    option.value = keyword;
    option.textContent = capitalizeFirst(keyword);
    topicSelect.appendChild(option);
  });
}

// ===========================
// URL State Management
// ===========================

/**
 * Update URL parameters based on current filters
 */
function updateURL() {
  const params = new URLSearchParams();

  if (searchInput.value) params.set('search', searchInput.value);
  if (yearSelect.value) params.set('year', yearSelect.value);
  if (topicSelect.value) params.set('topic', topicSelect.value);

  const newURL = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, '', newURL);
}

/**
 * Initialize filters from URL parameters
 */
function initializeFromURL() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('search')) searchInput.value = params.get('search');
  if (params.has('year')) yearSelect.value = params.get('year');
  if (params.has('topic')) topicSelect.value = params.get('topic');

  // Apply filters
  filterTutorials();
}

// ===========================
// UI Helpers
// ===========================

/**
 * Update results count display
 */
function updateResultsCount(count) {
  if (!resultsCount) return;

  const total = allTutorials.length;
  if (count === total) {
    resultsCount.textContent = `Showing all ${total} tutorials`;
  } else {
    resultsCount.textContent = `Showing ${count} of ${total} tutorials`;
  }
}

/**
 * Show/hide clear filters button
 */
function updateClearButton() {
  if (!clearButton) return;

  const hasFilters = searchInput.value || yearSelect.value || topicSelect.value;
  clearButton.style.display = hasFilters ? 'inline-block' : 'none';
}

/**
 * Show loading state
 */
function showLoading() {
  if (!libraryContainer) return;

  libraryContainer.innerHTML = `
    <div class="mec-library-grid">
      <div class="mec-loading">
        <div class="mec-loading__spinner"></div>
        <p class="mec-loading__text">Loading tutorials...</p>
      </div>
    </div>
  `;
}

/**
 * Show empty state (no results)
 */
function showEmptyState() {
  if (!libraryContainer) return;

  libraryContainer.innerHTML = `
    <div class="mec-library-grid">
      <div class="mec-empty-state">
        <div class="mec-empty-state__icon">
          <i class="fa fa-search"></i>
        </div>
        <h2 class="mec-empty-state__title">No tutorials found</h2>
        <p class="mec-empty-state__description">
          Try adjusting your filters or search terms to find what you're looking for.
        </p>
      </div>
    </div>
  `;
}

/**
 * Show error state
 */
function showError(message) {
  if (!libraryContainer) return;

  libraryContainer.innerHTML = `
    <div class="mec-library-grid">
      <div class="mec-empty-state">
        <div class="mec-empty-state__icon">
          <i class="fa fa-exclamation-triangle"></i>
        </div>
        <h2 class="mec-empty-state__title">Error</h2>
        <p class="mec-empty-state__description">${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===========================
// Event Listeners
// ===========================

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', filterTutorials);
  }

  if (topicSelect) {
    topicSelect.addEventListener('change', filterTutorials);
  }

  if (clearButton) {
    clearButton.addEventListener('click', clearFilters);
  }
}

// ===========================
// Initialization
// ===========================

/**
 * Initialize the MEC Library
 */
function init() {
  console.log('Initializing MEC Library...');

  // Set up event listeners
  initializeEventListeners();

  // Load tutorials data
  loadTutorials();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
