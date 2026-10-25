# Деплой cvapp с GitHub на DigitalOcean через Docker

Результат: API и PostgreSQL работают на Droplet, а Apollo Sandbox доступен другим людям по ссылке `http://IP_СЕРВЕРА:4001/graphql`.

Инструкция рассчитана на новый Droplet с Ubuntu 24.04 LTS и входом root по SSH. Если выбрана другая ОС, сначала уточните её: команды установки ниже предназначены для Ubuntu. Dockerfile, docker-entrypoint.sh, prisma.config.ts, package-lock.json и папка prisma/migrations должны уже быть в GitHub.

На Mac нужен только SSH-клиент. Docker Engine, Git и проект устанавливаем на сервер. Node.js отдельно не устанавливаем: он находится внутри Docker-образа проекта.

## 1. Подготовить адреса

В браузере найдите:

- DigitalOcean → Droplets → ваш Droplet → Public IPv4. Это IP_СЕРВЕРА.
- GitHub → ваш репозиторий → Code → HTTPS. Скопируйте URL, например https://github.com/YOUR_USERNAME/cvapp.git.

Во всех командах ниже заменяйте IP_СЕРВЕРА и YOUR_USERNAME на свои значения. Если репозиторий назван иначе, меняйте и его имя в URL. На сервере папку всё равно назовём /opt/cvapp.

Новые файлы на этом шаге не создаём. Это ручной деплой: публикация новых коммитов в GitHub сама по себе сервер не обновит.

## 2. Подключиться к серверу с Mac

Где: Terminal на Mac. Команду можно выполнить из любой папки. Ключ ~/.ssh/digitalocean — тот, который вы добавили при создании Droplet.

```bash
ssh -i ~/.ssh/digitalocean root@IP_СЕРВЕРА
```

При первом подключении проверьте адрес и отпечаток хоста через данные/консоль Droplet, затем подтвердите yes. Если запрошена passphrase, введите пароль вашего SSH-ключа. Символы не отображаются.

После подключения приглашение станет примерно `root@имя-сервера:~#`. Все команды до отдельного указания «на Mac» теперь выполняются на сервере.

Проверьте ОС:

```bash
cd /root
cat /etc/os-release
```

Если это не Ubuntu, остановитесь перед установкой Docker по следующим командам. На этом шаге новые файлы не создаём.

## 3. Установить Git и Docker на Ubuntu

Где: сервер, папка /root. Проверьте, не установлен ли Docker уже:

```bash
cd /root
docker --version
docker compose version
```

Если обе команды успешно показывают версии, установку Docker пропустите, но Git, curl и openssl ниже должны быть доступны. Если Docker установлен частично или из другого источника, не смешивайте пакеты: следуйте разделу удаления конфликтующих пакетов в официальной инструкции Docker.

```bash
cd /root
apt-get update
apt-get install -y ca-certificates curl git openssl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
```

Эти команды устанавливают утилиты и сохраняют ключ официального репозитория Docker в /etc/apt/keyrings/docker.asc.

Создайте файл источника пакетов /etc/apt/sources.list.d/docker.sources следующей командой. Весь блок, включая завершающую строку EOF, вставляется в терминал на сервере:

```bash
cd /root
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

Установите Docker Engine и Compose plugin:

```bash
cd /root
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker --version
docker compose version
git --version
```

systemctl включает Docker сейчас и при загрузке сервера. Это отдельно от политики перезапуска контейнеров.

Если Docker уже был установлен, при необходимости установите только недостающие утилиты:

```bash
cd /root
apt-get update
apt-get install -y git curl openssl
```

## 4. Скачать проект из GitHub

Где: сервер. Создаём папку проекта /opt/cvapp командой git clone. Клонировать нужно один раз.

Для публичного репозитория:

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/cvapp.git cvapp
cd /opt/cvapp
ls
```

Ожидаемые файлы: package.json, package-lock.json, Dockerfile, docker-entrypoint.sh, prisma.config.ts, папки src и prisma. git clone скачивает исходники и историю, но не базу данных с Mac.

Если /opt/cvapp уже существует, сначала выясните, что в ней находится. Повторный git clone в непустую папку не выполняйте; обновление существующего проекта описано в шаге 10.

### Если репозиторий Private

Серверу нужен доступ к GitHub. Создайте на сервере отдельный ключ; приватный ключ с Mac копировать не нужно:

```bash
cd /root
mkdir -p /root/.ssh
chmod 700 /root/.ssh
ssh-keygen -t ed25519 -C "cvapp-droplet" -f /root/.ssh/cvapp_github
cat /root/.ssh/cvapp_github.pub
```

Не перезаписывайте существующий ключ, если появится Overwrite. Скопируйте выведенную публичную строку ssh-ed25519. В браузере: GitHub → репозиторий → Settings → Deploy keys → Add deploy key. Название cvapp-droplet, Key — публичная строка. Флажок Allow write access не включайте: серверу достаточно чтения.

Затем на сервере:

```bash
cd /opt
GIT_SSH_COMMAND='ssh -i /root/.ssh/cvapp_github -o IdentitiesOnly=yes' git clone git@github.com:YOUR_USERNAME/cvapp.git cvapp
cd /opt/cvapp
git config core.sshCommand 'ssh -i /root/.ssh/cvapp_github -o IdentitiesOnly=yes'
```

При первом SSH-подключении к GitHub сравните отпечаток с https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints. Этот вариант выполняется ВМЕСТО HTTPS-клонирования, а не после него.

## 5. Создать отдельные настройки для сервера

Где: сервер, корень проекта /opt/cvapp. Локальный docker-compose.yml из GitHub не редактируем. Для деплоя используем самостоятельный compose.deploy.yml, чтобы не публиковать порт PostgreSQL и не использовать учебный пароль из локального Compose.

Создайте два файла с секретами/настройками и исключите их из Git только на сервере:

```bash
cd /opt/cvapp
touch .env.deploy
chmod 600 .env.deploy
touch compose.deploy.yml
printf '\n.env.deploy\ncompose.deploy.yml\n' >> .git/info/exclude
```

.env.deploy хранит пароль PostgreSQL. compose.deploy.yml описывает запуск контейнеров. .git/info/exclude существует после git clone; записи исключают серверные файлы из Git, не меняя .gitignore репозитория.

Сгенерируйте случайный пароль и запишите его в .env.deploy. Эту команду выполняем ТОЛЬКО при первой настройке новой базы, а не при каждом обновлении: замена переменной не меняет пароль в уже существующей PostgreSQL.

```bash
cd /opt/cvapp
printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env.deploy
```

При существующей базе используйте её действующий пароль, а не создавайте новый.

Теперь откройте /opt/cvapp/compose.deploy.yml в редакторе на сервере:

```bash
cd /opt/cvapp
nano compose.deploy.yml
```

Вставьте следующий YAML. Это содержимое файла, а не команды терминала:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: cvapp
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env.deploy}
      POSTGRES_DB: cvapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cvapp -d cvapp"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: .
    restart: unless-stopped
    ports:
      - "4001:3000"
    environment:
      DATABASE_URL: postgresql://cvapp:${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env.deploy}@postgres:5432/cvapp?schema=public
      PORT: 3000
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

В nano: Ctrl+O → Enter сохраняет файл; Ctrl+X закрывает редактор. Если nano не установлен, установите его командой apt-get install -y nano из /root и повторите открытие файла.

У PostgreSQL намеренно отсутствует ports: к ней обращается API внутри Docker. Для пароля используется hex-строка, поэтому её можно безопасно подставлять в DATABASE_URL без дополнительного URL-кодирования.

restart: unless-stopped возвращает сервис после сбоя/перезапуска сервера, если его не остановили вручную. Здесь это настройка серверного демо; она не меняет контейнеры на Mac.

Проверьте конфигурацию без вывода пароля:

```bash
cd /opt/cvapp
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml config --quiet
```

При успехе вывода нет. Флаг -f выбирает только наш серверный файл; -p фиксирует имя проекта cvapp и имена его ресурсов. Используйте эти флаги во всех дальнейших командах: обычная docker compose up запустит другой, локальный файл.

## 6. Собрать образ и запустить проект

Где: сервер, /opt/cvapp.

```bash
cd /opt/cvapp
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml up --build -d
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml ps
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml logs --tail=100 api
```

- up --build собирает API из Dockerfile и запускает контейнеры.
- -d оставляет их работать в фоне после закрытия SSH.
- ps показывает состояние.
- logs показывает последние сообщения API.

При сборке выполняются npm ci, генерация Prisma Client и сборка NestJS. При старте entrypoint применяет сохранённые миграции, после чего NestJS заполняет пустую базу через SeedService. Вручную migrate dev на сервере запускать не нужно.

Серверная база новая: данные из локального Docker volume не переносятся. Первоначальные данные берутся из src/database/profile.seed-data.ts.

Проверьте ответ на самом сервере:

```bash
cd /opt/cvapp
curl --fail-with-body http://127.0.0.1:4001/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { profile { name } }"}'
```

Ожидается JSON с data.profile.name. Если есть ошибка, сначала разберите logs, затем открывайте внешний доступ.

## 7. Разрешить внешний доступ в DigitalOcean

Где: браузер на Mac, панель DigitalOcean. Файлы проекта не создаём и не меняем.

Откройте Networking → Firewalls. Если Droplet уже связан с firewall, редактируйте его; иначе создайте firewall и привяжите его к этому Droplet.

Добавьте входящие правила:

- SSH/TCP 22 — с вашего публичного IP, чтобы сохранить доступ к серверу. Если IP меняется, правило нужно обновлять.
- Custom TCP 4001 — All IPv4 и, если используете IPv6, All IPv6: это публичный порт демо API.

Сохраните разрешённые исходящие соединения: серверу нужны GitHub, Docker registry, репозитории пакетов и DNS. Не открывайте наружу PostgreSQL 5432/5434.

Не удаляйте правило SSH до проверки нового подключения. Не закрывайте текущую SSH-сессию, пока не убедитесь, что новая открывается.

Если на сервере уже активен UFW, проверьте его и разрешите нужный порт:

```bash
cd /root
ufw status
ufw allow 4001/tcp
```

Для Docker-портов не полагайтесь только на UFW: публикация портов Docker может обходить его правила. Внешние ограничения задаём DigitalOcean Cloud Firewall; базу вообще не публикуем через ports.

## 8. Открыть демо в браузере

Где: браузер на Mac или другом устройстве. Подставьте реальный IP:

```text
http://IP_СЕРВЕРА:4001/graphql
```

Это HTTP, а не HTTPS. По IP в этой инструкции HTTPS ещё не настроен. Для HTTPS нужно отдельно настроить домен и reverse proxy, например Caddy, с TLS-сертификатом.

В Apollo Sandbox вставьте запрос и нажмите Run:

```graphql
query {
  profile {
    name
    description
    links { label url }
    skills { name }
    experience { company position period achievements }
    projects { name url }
  }
}
```

Справа должен появиться JSON с профилем. Теперь эту ссылку можно передавать для проверки. Если встроенный редактор не загрузился, проверьте JSON-запрос из шага 6 и доступ к внешним ресурсам Apollo; страница и API проверяются отдельно.

Это API без авторизации, поэтому возвращаемые данные доступны посетителям демо. Отдельной страницы сайта-визитки здесь нет.

## 9. Закрыть SSH-сессию

Где: сервер, любая папка.

```bash
exit
```

Вы вернётесь в терминал Mac. Контейнеры продолжат работать: они запущены с -d.

## 10. Обновить сервер после нового коммита в GitHub

Сначала на Mac сохраните изменения в коммит и выполните git push, как в инструкции по GitHub. Затем подключитесь к Droplet:

```bash
ssh -i ~/.ssh/digitalocean root@IP_СЕРВЕРА
```

На сервере:

```bash
cd /opt/cvapp
git status --short
git pull --ff-only origin main
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml up --build -d
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml logs --tail=100 api
```

Если основная ветка называется иначе, замените main. При локальных изменениях или ошибке git pull остановитесь и разберитесь с ними; не используйте reset --hard для обхода проблемы.

Перед применением новых миграций к важным данным делайте резервную копию из шага 12. Для обновления контейнеров не требуется down -v: данные в volume сохраняются.

Изменение seed-файла не обновляет существующие записи: SeedService заполняет только пустую базу. Для изменения уже созданного профиля нужен отдельный скрипт/SQL-обновление.

## 11. Остановить или снова запустить только cvapp

Где: сервер, /opt/cvapp. Для остановки:

```bash
cd /opt/cvapp
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml stop
```

Для повторного запуска уже существующих контейнеров:

```bash
cd /opt/cvapp
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml start
```

Команда down удаляет контейнеры и сеть, но по умолчанию сохраняет volume. Никогда не добавляйте -v, если хотите сохранить базу. Остановка контейнеров не прекращает оплату самого Droplet.

## 12. Сохранить резервную копию PostgreSQL

Где: сервер. Создаём каталог /root/backups и SQL-файл с текущей датой в имени:

```bash
cd /opt/cvapp
mkdir -p /root/backups
chmod 700 /root/backups
umask 077
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml exec -T postgres pg_dump -U cvapp -d cvapp > "/root/backups/cvapp-$(date +%Y%m%d-%H%M%S).sql"
ls -lh /root/backups
```

После pg_dump убедитесь, что нет ошибок, а файл непустой. Копия на том же Droplet не защищает от удаления сервера. Скачайте нужный SQL-файл на Mac из отдельного локального терминала:

```bash
mkdir -p ~/Downloads/cvapp-backups
cd ~/Downloads/cvapp-backups
scp -i ~/.ssh/digitalocean root@IP_СЕРВЕРА:/root/backups/ИМЯ_ФАЙЛА.sql .
```

Замените ИМЯ_ФАЙЛА.sql на имя из ls. Последняя точка означает текущую папку Mac.

## Если сборка завершается с Killed / exit code 137

На Droplet с 1 ГБ RAM во время npm ci или сборки может не хватить памяти. Проверьте:

```bash
cd /root
free -h
swapon --show
df -h /
```

Варианты: увеличить RAM Droplet либо добавить swap. Ниже пример только для сервера без существующего /swapfile, при наличии минимум 2 ГБ свободного диска:

```bash
cd /root
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
printf '/swapfile none swap sw 0 0\n' >> /etc/fstab
free -h
```

Не повторяйте этот блок при существующем swapfile. Swap медленнее RAM; это способ помочь небольшой демонстрационной сборке, а не гарантия достаточной производительности. Затем повторите up --build из шага 6.

## Если браузер не открывает API

На сервере из /opt/cvapp проверьте состояние и логи:

```bash
cd /opt/cvapp
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml ps
docker compose -p cvapp --env-file .env.deploy -f compose.deploy.yml logs --tail=100 api postgres
curl -I http://127.0.0.1:4001/graphql
```

- Локальный JSON-запрос работает, с Mac нет соединения: проверьте IP, TCP 4001 и привязку Cloud Firewall к Droplet.
- API не стартует: проверьте ошибки сборки, миграций и подключения к PostgreSQL в logs.
- Ошибка аутентификации PostgreSQL после смены .env.deploy: в volume остался старый пароль. Верните действующий пароль; не удаляйте volume ради исправления настройки.
- Permission denied при Git clone: проверьте deploy key и URL приватного репозитория.

## Официальные материалы

- Docker Engine на Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- SSH к Droplet: https://docs.digitalocean.com/products/droplets/how-to/connect-with-ssh/openssh/
- DigitalOcean Cloud Firewall: https://docs.digitalocean.com/products/networking/firewalls/how-to/create/
