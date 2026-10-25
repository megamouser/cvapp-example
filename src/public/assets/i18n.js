(() => {
  const requested = new URLSearchParams(location.search).get('lang');
  let saved;
  try {
    saved = localStorage.getItem('cvapp-language');
  } catch {
    /* Storage may be disabled. */
  }
  const language = ['ru', 'en'].includes(requested)
    ? requested
    : saved === 'en'
      ? 'en'
      : 'ru';
  try {
    localStorage.setItem('cvapp-language', language);
  } catch {
    /* URL remains a fallback. */
  }
  function t(value) {
    if (language !== 'en' || typeof value !== 'string') return value;
    const normalized = value.replace(/\s+/g, ' ').trim();
    const translated = window.cvappEnglish[normalized];
    return translated
      ? value.replace(/\S[\s\S]*\S|\S/, () => translated)
      : value;
  }
  function path(value) {
    const url = new URL(value, location.href);
    url.searchParams.set('lang', language);
    return url.pathname + url.search + url.hash;
  }
  window.cvappI18n = { language, t, path };
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(
    document.documentElement,
    NodeFilter.SHOW_TEXT,
  );
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName))
      nodes.push(node);
  }
  for (const node of nodes) node.nodeValue = t(node.nodeValue);
  for (const element of document.querySelectorAll(
    '[aria-label], [placeholder], meta[name="description"]',
  )) {
    for (const attribute of ['aria-label', 'placeholder', 'content']) {
      if (element.hasAttribute(attribute))
        element.setAttribute(attribute, t(element.getAttribute(attribute)));
    }
  }
  const switcher = document.createElement('div');
  switcher.className = 'language-switch';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', language === 'en' ? 'Language' : 'Язык');
  for (const code of ['ru', 'en']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = code.toUpperCase();
    button.lang = code;
    button.setAttribute('aria-label', code === 'ru' ? 'Русский' : 'English');
    button.setAttribute('aria-pressed', String(code === language));
    button.addEventListener('click', () => {
      if (code === language) return;
      try {
        localStorage.setItem('cvapp-language', code);
      } catch {
        /* Use URL preference. */
      }
      const url = new URL(location.href);
      url.searchParams.set('lang', code);
      location.assign(url.href);
    });
    switcher.append(button);
  }
  document.querySelector('.header-inner')?.append(switcher);
  // Keep the language in links even when browser storage is unavailable.
  for (const anchor of document.querySelectorAll('a[href^="/"]')) {
    const url = new URL(anchor.href);
    if (url.origin !== location.origin || url.pathname === '/graphql') continue;
    url.searchParams.set('lang', language);
    anchor.href = url.pathname + url.search + url.hash;
  }
})();
