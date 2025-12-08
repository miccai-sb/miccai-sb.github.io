'use strict';

(function() {
  const THEME_KEY = 'msb-theme';
  const THEME_LIGHT = 'light';
  const THEME_DARK = 'dark';

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.warn('Unable to store theme preference');
    }
  }

  function getPreferredTheme() {
    const stored = getStoredTheme();
    if (stored) {
      return stored;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME_DARK;
    }

    return THEME_LIGHT;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      const icon = toggle.querySelector('.theme-icon');
      if (icon) {
        icon.innerHTML = theme === THEME_DARK
          ? '<i class="fa fa-sun-o"></i>'
          : '<i class="fa fa-moon-o"></i>';
      }
      toggle.setAttribute('aria-label',
        theme === THEME_DARK ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || THEME_LIGHT;
    const newTheme = currentTheme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
    applyTheme(newTheme);
    setStoredTheme(newTheme);
  }

  function init() {
    const preferredTheme = getPreferredTheme();
    applyTheme(preferredTheme);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleTheme);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const preferredTheme = getPreferredTheme();
  applyTheme(preferredTheme);
})();
