const form = document.getElementById('register-form');
const fields = {
  name: form.elements.name,
  email: form.elements.email,
  password: form.elements.password,
  confirm: form.elements.passwordConfirm,
};
const errors = {
  name: 'name-error',
  email: 'email-error',
  password: 'password-error',
  confirm: 'confirm-error',
};
function setError(key, message) {
  document.getElementById(errors[key]).textContent = message;
  if (message) fields[key].setAttribute('aria-invalid', 'true');
  else fields[key].removeAttribute('aria-invalid');
}
for (const key of Object.keys(fields))
  fields[key].addEventListener('input', () => {
    setError(key, '');
    document.getElementById('form-error').hidden = true;
  });
document
  .getElementById('toggle-password')
  .addEventListener('click', (event) => {
    const visible = fields.password.type === 'password';
    fields.password.type = visible ? 'text' : 'password';
    event.currentTarget.textContent = visible
      ? window.cvappI18n.t('Скрыть')
      : window.cvappI18n.t('Показать');
    event.currentTarget.setAttribute(
      'aria-label',
      visible
        ? window.cvappI18n.t('Скрыть пароль')
        : window.cvappI18n.t('Показать пароль'),
    );
    event.currentTarget.setAttribute('aria-pressed', String(visible));
  });
fields.password.addEventListener('input', () => {
  const length = fields.password.value.length;
  const progress = length >= 12 ? 4 : Math.floor(length / 3);
  document
    .querySelectorAll('.password-progress i')
    .forEach((bar, index) => bar.classList.toggle('filled', index < progress));
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('submit-button');
  if (button.disabled) return;
  const name = fields.name.value.trim();
  const email = fields.email.value.trim();
  const password = fields.password.value;
  for (const key of Object.keys(fields)) setError(key, '');
  const messages = {};
  if (name.length < 2 || name.length > 80 || /[\p{Cc}\p{Cf}]/u.test(name))
    messages.name = window.cvappI18n.t('Введите имя от 2 до 80 символов.');
  fields.email.value = email;
  if (!email || !fields.email.validity.valid)
    messages.email = window.cvappI18n.t('Введите корректный email.');
  if (password.length < 12 || password.length > 128 || !password.trim())
    messages.password = window.cvappI18n.t(
      'Используйте от 12 до 128 символов.',
    );
  if (fields.confirm.value !== password || !fields.confirm.value)
    messages.confirm = window.cvappI18n.t('Пароли должны совпадать.');
  if (Object.keys(messages).length) {
    for (const [key, message] of Object.entries(messages))
      setError(key, message);
    fields[Object.keys(messages)[0]].focus();
    return;
  }
  const feedback = document.getElementById('form-error');
  feedback.hidden = true;
  button.disabled = true;
  button.firstElementChild.textContent = window.cvappI18n.t('Создаём аккаунт…');
  form.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409) {
        setError(
          'email',
          window.cvappI18n.t(
            'Этот email уже зарегистрирован. Используйте другой адрес.',
          ),
        );
        fields.email.focus();
        return;
      }
      throw new Error(
        response.status >= 500
          ? window.cvappI18n.t('Сервис временно недоступен. Попробуйте позже.')
          : typeof data.message === 'string'
            ? window.cvappI18n.t(data.message)
            : window.cvappI18n.t('Проверьте данные и попробуйте ещё раз.'),
      );
    }
    document.getElementById('success-name').textContent = data.name;
    document.getElementById('success-email').textContent = data.email;
    form.reset();
    document.getElementById('form-content').hidden = true;
    const success = document.getElementById('success-content');
    success.hidden = false;
    success.focus();
  } catch (error) {
    feedback.textContent =
      error instanceof TypeError
        ? window.cvappI18n.t(
            'Нет соединения с сервером. Проверьте подключение и повторите попытку.',
          )
        : error.message;
    feedback.hidden = false;
  } finally {
    button.disabled = false;
    button.firstElementChild.textContent =
      window.cvappI18n.t('Создать аккаунт');
    form.removeAttribute('aria-busy');
  }
});
