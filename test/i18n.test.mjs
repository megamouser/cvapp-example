import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const dictionary = readFileSync(
  new URL('../src/public/assets/translations.js', import.meta.url),
  'utf8',
);
const script = readFileSync(
  new URL('../src/public/assets/i18n.js', import.meta.url),
  'utf8',
);
function setup(search = '', saved = null, blocked = false) {
  const buttons = [];
  const text = { nodeValue: '  Войти  ', parentElement: { tagName: 'SPAN' } };
  const document = {
    documentElement: {},
    createTreeWalker: () => ({
      nextNode() {
        if (this.currentNode) return false;
        this.currentNode = text;
        return true;
      },
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => ({
      setAttribute() {},
      addEventListener() {},
      append() {},
      set textContent(value) {
        buttons.push(value);
      },
    }),
  };
  const context = {
    window: {},
    document,
    NodeFilter: { SHOW_TEXT: 4 },
    URL,
    URLSearchParams,
    location: { search, href: `http://localhost/login${search}` },
    localStorage: {
      getItem() {
        if (blocked) throw Error();
        return saved;
      },
      setItem() {
        if (blocked) throw Error();
      },
    },
  };
  vm.runInNewContext(dictionary, context);
  vm.runInNewContext(script, context);
  return { ...context, text };
}
test('English preference translates UI, preserves whitespace and leaves user content intact', () => {
  const c = setup('', 'en');
  assert.equal(c.document.documentElement.lang, 'en');
  assert.equal(c.text.nodeValue, '  Sign in  ');
  assert.equal(
    c.window.cvappI18n.t('Имя пользователя Иван'),
    'Имя пользователя Иван',
  );
  assert.equal(
    c.window.cvappI18n.t('Неверный email или пароль.'),
    'Incorrect email or password.',
  );
});
test('Explicit Russian overrides saved English', () => {
  const c = setup('?lang=ru', 'en');
  assert.equal(c.text.nodeValue, '  Войти  ');
  assert.equal(c.document.documentElement.lang, 'ru');
});
test('URL preference and redirects work without local storage', () => {
  const c = setup('?lang=en', null, true);
  assert.equal(
    c.window.cvappI18n.path('/login?expired=1'),
    '/login?expired=1&lang=en',
  );
  assert.equal(c.document.documentElement.lang, 'en');
});
test('Unsupported language falls back to Russian', () => {
  assert.equal(setup('?lang=xx').document.documentElement.lang, 'ru');
});
