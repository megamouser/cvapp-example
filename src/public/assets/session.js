async function updateSessionLink() {
  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    const login = document.querySelector('[data-login-link]');
    const register = document.querySelector('[data-register-link]');
    if (response.ok) {
      login.textContent = window.cvappI18n.t('Личный кабинет ↗');
      login.href = window.cvappI18n.path('/account');
      register.hidden = true;
    } else {
      login.textContent = window.cvappI18n.t('Войти');
      login.href = window.cvappI18n.path('/login');
      register.hidden = false;
    }
  } catch {
    /* The public page remains usable while authentication is unavailable. */
  }
}
window.addEventListener('pageshow', updateSessionLink);
