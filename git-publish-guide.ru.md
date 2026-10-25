# Как опубликовать cvapp на GitHub

Git хранит историю изменений на вашем компьютере. GitHub размещает репозиторий онлайн, чтобы вы могли дать ссылку на исходный код. Публикация исходников не запускает API: для работающего приложения нужен отдельный деплой.

Все команды выполняются в Terminal на вашем Mac, а не в SSH-сессии сервера. Здесь публикуем текущий проект `/Users/artemurev/JavaScript/cvapp`. Если вы проходите учебную инструкцию в `cvapp-example`, во всех командах замените путь проекта на `~/JavaScript/cvapp-example`.

Эта инструкция описывает действия, но сама ничего не публикует. Не запускайте все шаги одним блоком: читайте результат каждого шага.

## 1. Войти в GitHub

Откройте https://github.com/ и войдите в аккаунт. Если аккаунта нет, зарегистрируйтесь. Запомните свой username: он понадобится для ссылки на репозиторий.

Новые файлы проекта на этом шаге не создаются.

## 2. Открыть папку проекта и проверить Git

```bash
cd /Users/artemurev/JavaScript/cvapp
pwd
git --version
git status
```

- cd переводит терминал в корень проекта, где находится package.json.
- pwd показывает текущую папку: проверьте, что это нужный проект.
- git --version проверяет наличие Git.
- git status показывает состояние репозитория и изменённые файлы.

В текущем cvapp Git уже настроен и есть коммиты, поэтому git init повторно не требуется. Если в вашем новом проекте git status сообщает `not a git repository`, выполните:

```bash
cd /Users/artemurev/JavaScript/cvapp
git init
```

Команда создаёт служебную папку .git в корне проекта. Вручную её создавать или редактировать не нужно.

Если Git не установлен, на macOS выполните следующую команду и завершите установку в появившемся окне:

```bash
cd /Users/artemurev/JavaScript/cvapp
xcode-select --install
```

После установки повторите git --version.

## 3. Проверить имя и email автора коммитов

```bash
cd /Users/artemurev/JavaScript/cvapp
git config user.name
git config user.email
```

Если значения отсутствуют или неверны, задайте свои. Текст в кавычках ниже замените на свои имя и email:

```bash
cd /Users/artemurev/JavaScript/cvapp
git config user.name "Ваше имя"
git config user.email "ваш-email@example.com"
```

Команды сохраняют настройки только этого проекта в .git/config. Это подпись новых коммитов, а не вход в GitHub. Для публичного репозитория можно использовать GitHub noreply-email из Settings → Emails, если не хотите показывать личный email в новых коммитах.

## 4. Проверить, какие файлы не должны публиковаться

В корне проекта уже есть .gitignore. Откройте его в редакторе и убедитесь, что присутствуют следующие строки. Существующее содержимое целиком заменять не нужно:

```gitignore
node_modules/
dist/
coverage/
*.tsbuildinfo
.env
.env.*
!.env.example
src/generated/prisma/
*.log
.DS_Store
```

Если в новом проекте файла нет, создайте его рядом с package.json:

```bash
cd /Users/artemurev/JavaScript/cvapp
touch .gitignore
```

Затем откройте .gitignore в редакторе, вставьте строки выше и сохраните.

.env содержит настройки подключения к базе: его не публикуем. .env.example можно публиковать только с учебными значениями и без настоящих паролей. Приватные SSH-ключи, токены и реальные пароли также не должны находиться в репозитории. Проверьте содержимое Docker Compose: учебные локальные пароли не заменяют реальные production-секреты.

В Git сохраняем исходники, Dockerfile, docker-compose.yml, README, package.json, package-lock.json, prisma.config.ts и папку prisma/migrations. Содержимое PostgreSQL и Docker volumes в Git не загружается.

Проверьте, что локальные файлы игнорируются, и посмотрите уже отслеживаемые файлы:

```bash
cd /Users/artemurev/JavaScript/cvapp
git check-ignore .env node_modules dist src/generated/prisma
git ls-files
git status --short
```

check-ignore выводит совпадения с правилами игнорирования; отсутствие конкретного пути в выводе требует проверки правила. .gitignore не исключает файл, если его уже добавили в Git ранее. Если обнаружили, что .env отслеживается, уберите его из индекса, сохранив локальную копию:

```bash
cd /Users/artemurev/JavaScript/cvapp
git rm --cached .env
```

Если реальные секреты уже попадали в старые коммиты, не публикуйте такую историю без очистки; соответствующие секреты нужно заменить. Удаления файла из последнего коммита недостаточно для удаления из истории.

## 5. Подготовить изменения и создать коммит

Сначала добавьте файлы в список изменений будущего коммита:

```bash
cd /Users/artemurev/JavaScript/cvapp
git add .
git diff --cached --stat
git diff --cached
git status
```

- git add . подготавливает изменения из текущей папки с учётом .gitignore.
- git diff --cached показывает точное содержимое подготовленных изменений.
- git status показывает, что войдёт в коммит.

Если добавили лишний файл, уберите его из подготовки командой `git restore --staged ПУТЬ_К_ФАЙЛУ` (в текущем cvapp уже есть история). Сам файл останется на диске.

Когда список проверен, сохраните коммит:

```bash
cd /Users/artemurev/JavaScript/cvapp
git commit -m "docs: add project guides"
```

Для первого коммита нового учебного проекта вместо этого сообщения можно написать `feat: implement profile GraphQL API`. Если Git отвечает `nothing to commit`, новых изменений нет — переходите дальше. Старые коммиты уже существуют и тоже будут опубликованы.

## 6. Создать пустой репозиторий на GitHub

В браузере откройте https://github.com/new.

1. Owner — ваш аккаунт.
2. Repository name — cvapp.
3. Выберите Public, если исходники должны быть доступны любому по ссылке. Для Private потребуется отдельно предоставлять доступ.
4. Не добавляйте README, .gitignore и License: локальный проект уже содержит свои файлы и историю, нужен пустой репозиторий.
5. Нажмите Create repository.

Если репозиторий cvapp уже существует, выберите другое имя, например cvapp-demo. Затем используйте выбранное имя в командах ниже.

Новые локальные файлы на этом шаге не создаются.

## 7. Создать отдельный SSH-ключ для GitHub

Этот ключ позволит загружать код без ввода пароля GitHub. Если доступ по SSH к GitHub у вас уже настроен, новую пару создавать не нужно: проверьте подключение на шаге 9.

Команды можно выполнять из корня проекта, но ключи сохраняются в домашней папке ~/.ssh, за пределами репозитория:

```bash
cd /Users/artemurev/JavaScript/cvapp
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -C "github" -f ~/.ssh/github_cvapp
```

При запросе Enter passphrase задайте пароль ключа, затем повторите его. При вводе символы не отображаются. Если появляется вопрос Overwrite, не перезаписывайте существующий ключ: ответьте n и используйте существующий ключ либо выберите другое имя файла.

Будут созданы:

- ~/.ssh/github_cvapp — приватный ключ, остаётся на Mac.
- ~/.ssh/github_cvapp.pub — публичный ключ для добавления в GitHub.

В проект эти файлы копировать не нужно. Ключ DigitalOcean из предыдущих шагов здесь не используем.

## 8. Добавить публичный ключ в GitHub

Скопируйте публичную часть ключа:

```bash
cd /Users/artemurev/JavaScript/cvapp
pbcopy < ~/.ssh/github_cvapp.pub
```

В браузере откройте https://github.com/settings/keys → New SSH key.

1. Title: например My Mac cvapp.
2. Key type: Authentication Key.
3. Key: нажмите Cmd+V. Вставится строка, начинающаяся с ssh-ed25519.
4. Нажмите Add SSH key и подтвердите действие, если GitHub запросит.

Приватный файл без .pub сюда не вставляйте.

## 9. Проверить SSH-подключение к GitHub

Для новой пары github_cvapp выполните:

```bash
cd /Users/artemurev/JavaScript/cvapp
ssh -i ~/.ssh/github_cvapp -o IdentitiesOnly=yes -T git@github.com
```

При первом подключении проверьте отпечаток сервера по официальному списку: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints. После совпадения подтвердите подключение словом yes. Затем при необходимости введите пароль ключа.

Успешный ответ начинается примерно так: `Hi USERNAME! You've successfully authenticated...`. Сообщение, что GitHub не предоставляет shell access, нормально: этот доступ нужен для Git. Команда ssh -T при успешной проверке GitHub может завершиться кодом 1.

Чтобы именно этот репозиторий использовал созданный ключ и при git push, сохраните настройку:

```bash
cd /Users/artemurev/JavaScript/cvapp
git config core.sshCommand "ssh -i ~/.ssh/github_cvapp -o IdentitiesOnly=yes"
```

Настройка записывается в .git/config и на GitHub не загружается. Если используете уже настроенный другой SSH-ключ, проверьте доступ через `ssh -T git@github.com` и не задавайте путь к github_cvapp.

## 10. Связать локальный проект с GitHub

Сначала посмотрите существующие адреса:

```bash
cd /Users/artemurev/JavaScript/cvapp
git remote -v
```

В текущем cvapp на момент подготовки инструкции remote не настроен. Если вывод пустой, добавьте origin. Замените YOUR_USERNAME на свой логин GitHub, а cvapp — на фактически созданное имя репозитория:

```bash
cd /Users/artemurev/JavaScript/cvapp
git remote add origin git@github.com:YOUR_USERNAME/cvapp.git
git remote -v
```

origin — условное имя удалённого репозитория. Команда сохраняет адрес, но ещё не загружает файлы.

Если origin уже существует, сначала проверьте его адрес. Если он правильный, ничего менять не нужно. Если это неверный адрес и вы хотите привязать проект к новому репозиторию, выполните:

```bash
cd /Users/artemurev/JavaScript/cvapp
git remote set-url origin git@github.com:YOUR_USERNAME/cvapp.git
```

Здесь также замените YOUR_USERNAME и имя репозитория на свои.

## 11. Загрузить коммиты на GitHub

```bash
cd /Users/artemurev/JavaScript/cvapp
git branch -M main
git push -u origin main
```

git branch -M main задаёт текущей локальной ветке имя main. git push загружает её коммиты на GitHub. Флаг -u запоминает связь с origin/main: в дальнейшем достаточно git push.

Обновите страницу репозитория в браузере. Должны появиться файлы и история коммитов. Проверьте, что .env, node_modules и приватных ключей нет среди опубликованных файлов.

Ссылка, которую можно отправить:

```text
https://github.com/YOUR_USERNAME/cvapp
```

Если push отклонён из-за существующих коммитов на GitHub, не используйте force push. Проверьте, что выбрали нужный пустой репозиторий. Удалённую историю нужно отдельно согласовать с локальной.

## 12. Публиковать последующие изменения

После редактирования проекта:

```bash
cd /Users/artemurev/JavaScript/cvapp
git status
git add .
git diff --cached
git commit -m "docs: clarify setup instructions"
git push
```

Сообщение коммита заменяйте кратким описанием своих изменений. При отсутствии изменений новый коммит создавать не нужно.

Новые файлы для самого процесса публикации больше не требуются. Чтобы скачать исходники на другой компьютер или сервер, используется git clone; запуск приложения выполняется отдельно.

## Официальные материалы

- Публикация локального проекта: https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
- Создание SSH-ключа: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent
- Добавление ключа в аккаунт: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account
