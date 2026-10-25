async function loadAccount() {
  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    if (response.status === 401) {
      location.replace(window.cvappI18n.path('/login?expired=1'));
      return;
    }
    if (!response.ok) throw new Error('Unavailable');
    const user = await response.json();
    document.getElementById('account-name').textContent = user.name;
    document.getElementById('account-avatar').textContent = Array.from(
      user.name,
    )[0].toUpperCase();
    document.getElementById('detail-name').textContent = user.name;
    document.getElementById('detail-email').textContent = user.email;
    document.getElementById('detail-date').textContent =
      new Intl.DateTimeFormat(window.cvappI18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(user.createdAt));
    document.getElementById('account-content').hidden = false;
  } catch {
    document.getElementById('account-error').hidden = false;
  } finally {
    document.getElementById('account-loading').hidden = true;
  }
}
document
  .getElementById('logout-button')
  .addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    button.firstElementChild.textContent = window.cvappI18n.t('Выходим…');
    document.getElementById('logout-error').hidden = true;
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error('Logout failed');
      document.getElementById('account-content').hidden = true;
      location.replace(window.cvappI18n.path('/login'));
    } catch {
      document.getElementById('logout-error').textContent = window.cvappI18n.t(
        'Не удалось завершить сессию. Повторите попытку.',
      );
      document.getElementById('logout-error').hidden = false;
      button.disabled = false;
      button.firstElementChild.textContent =
        window.cvappI18n.t('Выйти из аккаунта');
    }
  });
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    document.getElementById('account-content').hidden = true;
    loadAccount();
  }
});
loadAccount();
