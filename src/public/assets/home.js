function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = window.cvappI18n.t(text);
  return node;
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
async function loadProfile() {
  const previousError = document.getElementById('profile-error');
  if (previousError) previousError.hidden = true;
  document.getElementById('profile-retry')?.remove();
  try {
    const response = await fetch('/api/profile');
    if (!response.ok) throw new Error('Profile unavailable');
    const profile = await response.json();
    const name = document.getElementById('profile-name');
    if (name) name.textContent = window.cvappI18n.t(profile.name);
    const description = document.getElementById('profile-description');
    if (description)
      description.textContent = window.cvappI18n.t(profile.description);
    if (name)
      document.title = `${window.cvappI18n.t(profile.name)} — Fullstack Developer · cvapp`;
    const socials = document.getElementById('social-links');
    if (socials) {
      socials.replaceChildren();
      for (const link of profile.links) {
        const href = safeUrl(link.url);
        if (!href) continue;
        if (socials.children.length) socials.append(el('span'));
        const anchor = el('a', '', `${link.label} ↗`);
        anchor.href = href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        socials.append(anchor);
      }
    }
    const groups = {
      'skills-backend': ['Backend', 'API', 'Runtime'],
      'skills-data': ['Data', 'Queue'],
      'skills-tools': ['Language', 'DevOps'],
    };
    for (const [id, categories] of Object.entries(groups)) {
      const tags = document.getElementById(id);
      if (!tags) continue;
      tags.replaceChildren(
        ...profile.skills
          .filter((s) => categories.includes(s.category))
          .map((s) => el('span', '', s.name)),
      );
    }
    const experiences = document.getElementById('experience-list');
    if (experiences) {
      experiences.replaceChildren();
      for (const experience of profile.experience) {
        const item = el('article', 'experience-item');
        const detail = el('div', 'experience-detail');
        const achievements = el('ul', 'achievements');
        achievements.append(
          ...experience.achievements.map((a) => el('li', '', a)),
        );
        detail.append(
          el('h3', '', experience.position),
          el('p', 'company', experience.company),
          achievements,
        );
        item.append(
          el(
            'p',
            'experience-period',
            experience.period.replace(
              'настоящее время',
              window.cvappI18n.language === 'en'
                ? 'present'
                : 'настоящее время',
            ),
          ),
          detail,
        );
        experiences.append(item);
      }
      if (!experiences.children.length)
        experiences.append(
          el(
            'p',
            'loading-text',
            window.cvappI18n.t('Опыт работы пока не добавлен.'),
          ),
        );
    }
  } catch {
    const error = document.getElementById('profile-error');
    if (error) {
      error.textContent = window.cvappI18n.t(
        'Не удалось загрузить актуальный профиль. Обновите страницу чуть позже.',
      );
      error.hidden = false;
    }
    const retry = el(
      'button',
      'button button-outline retry-button',
      'Повторить загрузку',
    );
    retry.id = 'profile-retry';
    retry.type = 'button';
    retry.addEventListener('click', () => {
      retry.disabled = true;
      loadProfile();
    });
    const anchor = error || document.getElementById('experience-list');
    anchor?.after(retry);
    for (const id of ['experience-list', 'project-list']) {
      document
        .getElementById(id)
        ?.replaceChildren(
          el(
            'p',
            'loading-text',
            window.cvappI18n.t('Данные временно недоступны.'),
          ),
        );
    }
  }
}
loadProfile();
