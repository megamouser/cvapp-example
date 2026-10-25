(() => {
  const themes = ['light', 'dark', 'material'];
  let saved;
  try {
    saved = localStorage.getItem('cvapp-theme');
  } catch {
    /* Use default if storage is disabled. */
  }
  const theme = themes.includes(saved) ? saved : 'light';
  document.documentElement.dataset.theme = theme;
  document.addEventListener('DOMContentLoaded', () => {
    const english = window.cvappI18n?.language === 'en';
    const label = document.createElement('label');
    label.className = 'theme-switch';
    const caption = document.createElement('span');
    caption.textContent = english ? 'Theme' : 'Тема';
    const select = document.createElement('select');
    select.id = 'theme-select';
    select.name = 'theme';
    for (const value of themes) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      select.append(option);
    }
    select.value = theme;
    select.addEventListener('change', () => {
      if (!themes.includes(select.value)) return;
      document.documentElement.dataset.theme = select.value;
      try {
        localStorage.setItem('cvapp-theme', select.value);
      } catch {
        /* Theme still works for this page. */
      }
    });
    label.append(caption, select);
    document.querySelector('.header-inner')?.append(label);
  });
})();
