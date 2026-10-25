const form = document.getElementById('login-form');
const email = form.elements.email;
const password = form.elements.password;
const button = document.getElementById('submit-button');
const error = document.getElementById('form-error');
const notice = document.getElementById('login-notice');
const params = new URLSearchParams(location.search);
if (params.has('registered') || params.has('expired')) {
  notice.textContent = params.has('registered')
    ? window.cvappI18n.t(
        'Аккаунт создан. Теперь войдите с вашим email и паролем.',
      )
    : window.cvappI18n.t('Сессия завершена. Войдите в аккаунт ещё раз.');
  notice.hidden = false;
}
for (const input of [email, password])
  input.addEventListener('input', () => {
    error.hidden = true;
    document.getElementById(`${input.name}-error`).textContent = '';
    input.removeAttribute('aria-invalid');
  });
document
  .getElementById('toggle-password')
  .addEventListener('click', (event) => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    event.currentTarget.textContent = show
      ? window.cvappI18n.t('Скрыть')
      : window.cvappI18n.t('Показать');
    event.currentTarget.setAttribute(
      'aria-label',
      show
        ? window.cvappI18n.t('Скрыть пароль')
        : window.cvappI18n.t('Показать пароль'),
    );
    event.currentTarget.setAttribute('aria-pressed', String(show));
  });
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  email.value = email.value.trim();
  const messages = {};
  if (!email.value || !email.validity.valid)
    messages.email = window.cvappI18n.t('Укажите корректный email.');
  if (!password.value)
    messages.password = window.cvappI18n.t('Введите пароль.');
  if (Object.keys(messages).length) {
    for (const [key, value] of Object.entries(messages)) {
      document.getElementById(`${key}-error`).textContent = value;
      form.elements[key].setAttribute('aria-invalid', 'true');
    }
    form.elements[Object.keys(messages)[0]].focus();
    return;
  }
  button.disabled = true;
  button.firstElementChild.textContent = window.cvappI18n.t('Входим…');
  form.setAttribute('aria-busy', 'true');
  error.hidden = true;
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        response.status >= 500
          ? window.cvappI18n.t('Сервис временно недоступен. Попробуйте позже.')
          : typeof data.message === 'string'
            ? window.cvappI18n.t(data.message)
            : window.cvappI18n.t('Не удалось войти. Попробуйте ещё раз.'),
      );
    form.reset();
    location.replace(window.cvappI18n.path('/account'));
  } catch (failure) {
    error.textContent =
      failure instanceof TypeError
        ? window.cvappI18n.t(
            'Нет соединения с сервером. Проверьте подключение.',
          )
        : failure.message;
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.firstElementChild.textContent =
      window.cvappI18n.t('Войти в аккаунт');
    form.removeAttribute('aria-busy');
  }
});
