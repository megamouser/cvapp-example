# Создание cvapp с нуля: команды и полный код

Все действия выполняются в терминале на вашем Mac. Новый проект создаём в `~/JavaScript/cvapp-example` (полный путь на вашем компьютере: `/Users/artemurev/JavaScript/cvapp-example`). Существующий `/Users/artemurev/JavaScript/cvapp` не изменяем.

Команды в блоках `bash` выполняйте в терминале. Код в блоках `typescript`, `yaml`, `prisma`, `json`, `dockerfile`, `sh` и `text` вставляйте в указанный файл через редактор и сохраняйте. Блок GraphQL выполняется в Apollo Sandbox в браузере. Команда `touch` создаёт пустой файл, но не открывает его; если файл уже существует, содержимое сохраняется. Не вставляйте код файлов в терминал.

Каждый блок команд ниже начинается с перехода в нужную папку. Файлы с путями `src/...` создаются относительно корня проекта; переходить в `src` для этого не нужно. Файлы `package.json`, `tsconfig.json`, `tsconfig.build.json` и `nest-cli.json` создаёт NestJS CLI; последние три оставляем без ручной замены.

Инструкция воспроизводит GraphQL API текущего cvapp (бывшего digital-card). Все необходимые вручную написанные файлы приведены полностью. Сгенерированные Prisma Client и SQL-миграция создаются командами.

Используйте отдельную папку `cvapp-example`: существующий cvapp менять не требуется. Нужны Node.js 24, npm и запущенный Docker Desktop. Для примера используются порты 4002 (API) и 5435 (PostgreSQL), чтобы не мешать текущему проекту.

В этой инструкции явно выбран Prisma 7, как в текущем приложении. Основные версии зависимостей соответствуют текущему проекту; package-lock.json после установки следует сохранить в Git.

## 1. Создать каркас NestJS

```bash
mkdir -p ~/JavaScript
cd ~/JavaScript
npx @nestjs/cli@12 new cvapp-example --package-manager npm
cd cvapp-example
mkdir -p src/prisma src/profile src/database
```

Установите GraphQL и Apollo. npm автоматически добавит пакеты в package.json и обновит package-lock.json; заменять package.json целиком не нужно.

```bash
cd ~/JavaScript/cvapp-example
npm install @nestjs/graphql@14 @nestjs/apollo@14 \
  @apollo/server@5 @as-integrations/express5 graphql@16
```

Установите Prisma 7 и PostgreSQL-драйвер. Prisma устанавливается без -D, в dependencies: его CLI используется в production-контейнере при запуске миграций. CLI, клиент и адаптер закреплены на одной версии.

```bash
cd ~/JavaScript/cvapp-example
npm install prisma@7.10.1 @prisma/client@7.10.1 \
  @prisma/adapter-pg@7.10.1 pg dotenv
npm install -D @types/pg
```

Включите ES-модули для кода из инструкции. Стандартные скрипты запуска NestJS менять не нужно; команды Prisma далее вызываются напрямую через npx.

```bash
cd ~/JavaScript/cvapp-example
npm pkg set type=module
```

Удалите только стандартные файлы шаблона в новой папке: ниже вместо них будет собственный AppModule. Эти команды не предназначены для существующего проекта.

```bash
cd ~/JavaScript/cvapp-example
rm src/app.controller.ts src/app.controller.spec.ts src/app.service.ts
rm -rf test
```

## 2. Настроить PostgreSQL и Docker Compose

Compose сразу содержит базу и API. На первом этапе запускаем только postgres; API соберём после написания кода. Контейнеры не запускаются автоматически при старте Docker.

Файл docker-compose.yml не создаётся командой nest new. Создаём его в корне проекта, рядом с package.json. Все команды docker compose выполняем из корня проекта.

### `docker-compose.yml`

Создайте файл `docker-compose.yml` в корне проекта, рядом с package.json:

```bash
cd ~/JavaScript/cvapp-example
touch docker-compose.yml
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: cvapp
      POSTGRES_PASSWORD: cvapp
      POSTGRES_DB: cvapp
    ports:
      - "5435:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cvapp -d cvapp"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: .
    ports:
      - "4002:3000"
    environment:
      DATABASE_URL: postgresql://cvapp:cvapp@postgres:5432/cvapp?schema=public
      PORT: 3000
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

Создайте файл .env в корне проекта. Это локальные учебные учётные данные. Приложение из терминала подключается через localhost:5435, а внутри Docker — через postgres:5432, как указано в Compose.

### `.env`

Создайте файл `.env` в корне проекта, рядом с package.json:

```bash
cd ~/JavaScript/cvapp-example
touch .env
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

```text
DATABASE_URL="postgresql://cvapp:cvapp@localhost:5435/cvapp?schema=public"
PORT=4002
```

```bash
cd ~/JavaScript/cvapp-example
docker compose up -d postgres
docker compose ps
```

Дождитесь статуса healthy у PostgreSQL, прежде чем создавать миграцию.

## 3. Описать Prisma и создать таблицы

Создайте папку для схемы в корне нового проекта. Отдельный prisma init не требуется: файлы конфигурации и схемы создаём вручную ниже.

```bash
cd ~/JavaScript/cvapp-example
mkdir prisma
```

Если папка prisma уже существует, пропустите mkdir prisma. Файл prisma.config.ts будет в корне проекта, а schema.prisma — в папке prisma.

### `prisma.config.ts`

Создайте файл `prisma.config.ts` в корне проекта, рядом с package.json:

```bash
cd ~/JavaScript/cvapp-example
touch prisma.config.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

CLI читает строку подключения из .env. В Prisma 7 URL вынесен из schema.prisma в этот конфигурационный файл.

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

### `prisma/schema.prisma`

Создайте файл `prisma/schema.prisma` в папке `prisma` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch prisma/schema.prisma
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Профиль связан со ссылками, навыками, опытом и проектами; достижения связаны с опытом. sortOrder задаёт порядок элементов.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Profile {
  id          String        @id @default(cuid())
  name        String
  description String
  links       ProfileLink[]
  skills      Skill[]
  experience  Experience[]
  projects    Project[]
}

model ProfileLink {
  id        String  @id @default(cuid())
  label     String
  url       String
  sortOrder Int     @default(0)
  profileId String
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
}

model Skill {
  id        String  @id @default(cuid())
  name      String
  category  String?
  sortOrder Int     @default(0)
  profileId String
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
}

model Experience {
  id           String        @id @default(cuid())
  company      String
  position     String
  startDate    DateTime
  endDate      DateTime?
  sortOrder    Int           @default(0)
  profileId    String
  profile      Profile       @relation(fields: [profileId], references: [id], onDelete: Cascade)
  achievements Achievement[]

  @@index([profileId])
}

model Achievement {
  id           String     @id @default(cuid())
  description  String
  sortOrder    Int        @default(0)
  experienceId String
  experience   Experience @relation(fields: [experienceId], references: [id], onDelete: Cascade)

  @@index([experienceId])
}

model Project {
  id          String  @id @default(cuid())
  name        String
  url         String
  description String?
  sortOrder   Int     @default(0)
  profileId   String
  profile     Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
}
```

Теперь проверьте схему, создайте таблицы и сгенерируйте клиент. Выполняйте команды последовательно; при ошибке сначала исправьте её, затем переходите к следующей команде. PostgreSQL из предыдущего этапа должен быть запущен.

**1. Перейдите в корень нового проекта:**

```bash
cd ~/JavaScript/cvapp-example
```

cd меняет текущую папку терминала. Здесь находятся package.json, prisma.config.ts и .env, необходимые для следующих команд. npx запускает Prisma CLI, установленный в этом проекте.

**2. Проверьте правильность схемы Prisma:**

```bash
cd ~/JavaScript/cvapp-example
npx prisma validate
```

Команда читает prisma.config.ts и prisma/schema.prisma, проверяет синтаксис моделей, связи и корректность схемы. Например, обнаружит неверный тип поля или ошибку в описании связи. Она не создаёт таблицы, не меняет данные и не проверяет работоспособность подключения к PostgreSQL. При успехе появится сообщение о валидности схемы.

**3. Создайте и примените первую миграцию:**

```bash
cd ~/JavaScript/cvapp-example
npx prisma migrate dev --name init
```

Миграция — это сохранённый набор SQL-команд для изменения структуры базы. Prisma сравнит описанные модели с состоянием миграций и базы, создаст SQL-файл примерно по пути prisma/migrations/ДАТА_ВРЕМЯ_init/migration.sql и выполнит его в PostgreSQL, указанном в DATABASE_URL. Слово init — выбранное нами имя первой миграции.

В этой новой учебной базе появятся таблицы Profile, ProfileLink, Skill, Experience, Achievement и Project, их связи и индексы, а также служебная таблица _prisma_migrations. Данные профиля пока не добавляются: это сделает SeedService при запуске приложения на следующем этапе.

Эта команда предназначена для разработки. Если Prisma неожиданно предлагает сбросить существующую базу, не подтверждайте автоматически: сброс удалит данные. На сервере для применения уже сохранённых миграций используется prisma migrate deploy — эта команда будет в Docker entrypoint ниже.

**4. Сгенерируйте Prisma Client для TypeScript:**

```bash
cd ~/JavaScript/cvapp-example
npx prisma generate
```

Команда читает модели из prisma/schema.prisma и создаёт код клиента и типы в src/generated/prisma — путь задан полем output в generator client. Через этот клиент приложение обращается к базе, например prisma.profile.findFirst(). Файлы генерируются автоматически, вручную их писать или редактировать не нужно.

generate не создаёт таблицы, не применяет миграции и не добавляет данные. В Prisma 7 после migrate dev генерацию выполняем отдельно. После изменения моделей нужно снова обновить миграции и сгенерировать клиент.

Сохраните созданную папку prisma/migrations в Git вместе с исходниками. Каталог src/generated/prisma будет исключён через .gitignore: клиент пересоздаётся при сборке.

## 4. Подключить Prisma к NestJS

Папка src/prisma создана на первом этапе. Теперь создаём в ней два файла; все команды выполняем из корня cvapp-example.

### `src/prisma/prisma.service.ts`

Создайте файл `src/prisma/prisma.service.ts` в папке `src/prisma` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/prisma/prisma.service.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Один PrismaClient на процесс приложения; PostgreSQL подключается через адаптер PrismaPg. Сервис открывает и закрывает соединение в lifecycle NestJS.

```typescript
import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### `src/prisma/prisma.module.ts`

Создайте файл `src/prisma/prisma.module.ts` в папке `src/prisma` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/prisma/prisma.module.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Глобальный модуль экспортирует PrismaService для repository и seed.

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## 5. Описать GraphQL-типы

Папка src/profile создана на первом этапе. В ней создаём файл с GraphQL-типами.

### `src/profile/profile.model.ts`

Создайте файл `src/profile/profile.model.ts` в папке `src/profile` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/profile/profile.model.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Эти классы определяют доступные клиенту поля. NestJS автоматически строит GraphQL-схему из декораторов ObjectType и Field.

```typescript
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Skill {
    @Field()
    name: string;
}

@ObjectType()
export class Experience {
    @Field()
    company: string;

    @Field()
    position: string;

    @Field()
    period: string;

    @Field(() => [String])
    achievements: string[];
}

@ObjectType()
export class Project {
    @Field()
    name: string;

    @Field()
    url: string;
}

@ObjectType()
export class Link {
    @Field()
    label: string;

    @Field()
    url: string;
}

@ObjectType()
export class Profile {
    @Field()
    name: string;

    @Field()
    description: string;

    @Field(() => [Link])
    links: Link[];

    @Field(() => [Skill])
    skills: Skill[];

    @Field(() => [Experience])
    experience: Experience[];

    @Field(() => [Project])
    projects: Project[];
}
```

## 6. Реализовать чтение профиля

### `src/profile/profile.repository.ts`

Создайте файл `src/profile/profile.repository.ts` в папке `src/profile` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/profile/profile.repository.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Repository выполняет запрос к базе. В этой реализации сразу загружаются все связи профиля, включая достижения, с сортировкой по sortOrder.

```typescript
import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const profileInclude = {
  links: { orderBy: { sortOrder: 'asc' } },
  skills: { orderBy: { sortOrder: 'asc' } },
  projects: { orderBy: { sortOrder: 'asc' } },
  experience: {
    orderBy: { sortOrder: 'asc' },
    include: { achievements: { orderBy: { sortOrder: 'asc' } } },
  },
} satisfies Prisma.ProfileInclude;

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFirst() {
    return this.prisma.profile.findFirst({ include: profileInclude });
  }
}
```

### `src/profile/profile.service.ts`

Создайте файл `src/profile/profile.service.ts` в папке `src/profile` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/profile/profile.service.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Service обрабатывает отсутствие профиля, форматирует период работы и преобразует записи достижений в строки.

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Achievement, Experience } from '../generated/prisma/client.js';
import { ProfileRepository } from './profile.repository.js';

type ExperienceWithAchievements = Experience & {
  achievements: Achievement[];
};

@Injectable()
export class ProfileService {
  constructor(private readonly profiles: ProfileRepository) {}

  async getProfile() {
    const profile = await this.profiles.findFirst();

    if (!profile) {
      throw new NotFoundException('Profile is not seeded yet');
    }

    return profile;
  }

  formatPeriod(experience: Experience) {
    const start = formatMonth(experience.startDate);
    const end = experience.endDate
      ? formatMonth(experience.endDate)
      : 'настоящее время';

    return `${start} — ${end}`;
  }

  getAchievementDescriptions(experience: ExperienceWithAchievements) {
    return experience.achievements.map((achievement) => achievement.description);
  }
}

function formatMonth(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
```

### `src/profile/profile.resolver.ts`

Создайте файл `src/profile/profile.resolver.ts` в папке `src/profile` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/profile/profile.resolver.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Query profile — точка входа API. period и achievements вычисляются через ResolveField.

```typescript
import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Experience, Profile } from './profile.model.js';
import { ProfileService } from './profile.service.js';

@Resolver(() => Profile)
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query(() => Profile)
  profile() {
    return this.profileService.getProfile();
  }
}

@Resolver(() => Experience)
export class ExperienceResolver {
  constructor(private readonly profileService: ProfileService) {}

  @ResolveField(() => String)
  period(@Parent() experience: Parameters<ProfileService['formatPeriod']>[0]) {
    return this.profileService.formatPeriod(experience);
  }

  @ResolveField(() => [String])
  achievements(
    @Parent() experience: Parameters<ProfileService['getAchievementDescriptions']>[0],
  ) {
    return this.profileService.getAchievementDescriptions(experience);
  }
}
```

### `src/profile/profile.module.ts`

Создайте файл `src/profile/profile.module.ts` в папке `src/profile` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/profile/profile.module.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Модуль регистрирует repository, service и оба resolver.

```typescript
import { Module } from '@nestjs/common';
import { ProfileResolver, ExperienceResolver } from './profile.resolver.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';

@Module({
    providers: [
      ProfileResolver,
      ExperienceResolver,
      ProfileService,
      ProfileRepository,
    ],
})

export class ProfileModule {}
```

## 7. Подготовить данные и автоматическое заполнение базы

Папка src/database создана на первом этапе. В ней создаём три файла ниже.

### `src/database/profile.seed-data.ts`

Создайте файл `src/database/profile.seed-data.ts` в папке `src/database` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/database/profile.seed-data.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Это исходные данные профиля текущего проекта. Заменяйте текст, ссылки и опыт на собственные. Ссылка проекта в этих данных пока шаблонная.

```typescript
export const profileSeedData = {
  name: 'Юрьев Артем',
  description:
    'Backend-разработчик с подтверждённым коммерческим опытом более 7 лет. Разрабатываю API и backend-системы на TypeScript, PHP и Python.',
  links: [
    { label: 'GitHub', url: 'https://github.com/megamouser' },
    {
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/artem-iurev-a32769292/',
    },
  ],
  skills: [
    { name: 'TypeScript', category: 'Language' },
    { name: 'Node.js', category: 'Runtime' },
    { name: 'NestJS', category: 'Backend' },
    { name: 'GraphQL', category: 'API' },
    { name: 'Prisma', category: 'Data' },
    { name: 'PostgreSQL', category: 'Data' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'PHP', category: 'Language' },
    { name: 'Laravel', category: 'Backend' },
    { name: 'Symfony', category: 'Backend' },
    { name: 'Python', category: 'Language' },
    { name: 'Django', category: 'Backend' },
    { name: 'FastAPI', category: 'Backend' },
    { name: 'Redis', category: 'Data' },
    { name: 'Celery', category: 'Queue' },
    { name: 'RabbitMQ', category: 'Queue' },
    { name: 'BullMQ', category: 'Queue' },
  ],
  experience: [
    {
      company: 'Коммерческие backend-проекты',
      position: 'Backend Developer',
      startDate: new Date('2018-01-01'),
      endDate: null,
      achievements: [
        'Более 7 лет коммерческого опыта в backend-разработке.',
        'Разрабатывал API и сервисы на TypeScript, PHP и Python.',
        'Работал с PostgreSQL, Redis и асинхронными очередями задач.',
      ],
    },
  ],
  projects: [
    {
      name: 'Digital Visiting Card API',
      url: 'https://github.com/your-username/digital-card',
      description: 'GraphQL API цифровой визитки специалиста.',
    },
  ],
};
```

### `src/database/seed.service.ts`

Создайте файл `src/database/seed.service.ts` в папке `src/database` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/database/seed.service.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

После инициализации приложения сервис проверяет наличие профиля и создаёт всю структуру, если база пуста. Существующие данные он не обновляет.

```typescript
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { profileSeedData } from './profile.seed-data.js';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const existingProfiles = await this.prisma.profile.count();

    if (existingProfiles > 0) {
      this.logger.log('Profile data already present, skip seed');
      return;
    }

    await this.prisma.profile.create({
      data: {
        name: profileSeedData.name,
        description: profileSeedData.description,
        links: {
          create: profileSeedData.links.map((link, index) => ({
            ...link,
            sortOrder: index + 1,
          })),
        },
        skills: {
          create: profileSeedData.skills.map((skill, index) => ({
            ...skill,
            sortOrder: index + 1,
          })),
        },
        experience: {
          create: profileSeedData.experience.map((experience, index) => ({
            company: experience.company,
            position: experience.position,
            startDate: experience.startDate,
            endDate: experience.endDate,
            sortOrder: index + 1,
            achievements: {
              create: experience.achievements.map((description, achievementIndex) => ({
                description,
                sortOrder: achievementIndex + 1,
              })),
            },
          })),
        },
        projects: {
          create: profileSeedData.projects.map((project, index) => ({
            ...project,
            sortOrder: index + 1,
          })),
        },
      },
    });

    this.logger.log('Database seeded with profile data');
  }
}
```

### `src/database/seed.module.ts`

Создайте файл `src/database/seed.module.ts` в папке `src/database` внутри проекта:

```bash
cd ~/JavaScript/cvapp-example
touch src/database/seed.module.ts
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

```typescript
import { Module } from '@nestjs/common';
import { SeedService } from './seed.service.js';

@Module({
  providers: [SeedService],
})
export class SeedModule {}
```

## 8. Подключить Apollo Sandbox и запустить NestJS

### `src/app.module.ts`

Этот файл уже создан NestJS CLI. Откройте `src/app.module.ts` в папке `src` внутри проекта, замените его содержимое кодом ниже и сохраните. Новый файл создавать не нужно.

В учебном варианте оставлены только модули визитки; стандартный Hello World из шаблона NestJS не требуется.

```typescript
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { PrismaModule } from './prisma/prisma.module.js';
import { SeedModule } from './database/seed.module.js';
import { ProfileModule } from './profile/profile.module.js';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      graphiql: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
    }),
    PrismaModule,
    SeedModule,
    ProfileModule,
  ],
})
export class AppModule {}
```

### `src/main.ts`

Этот файл уже создан NestJS CLI. Откройте `src/main.ts` в папке `src` внутри проекта, замените его содержимое кодом ниже и сохраните. Новый файл создавать не нужно.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

```bash
cd ~/JavaScript/cvapp-example
npm run build
npm run start:dev
```

Откройте http://localhost:4002/graphql. При запуске seed заполнит базу. Для перехода к Docker остановите локальный API сочетанием Ctrl+C, чтобы освободить порт 4002.

## 9. Добавить сборку API в Docker

### `Dockerfile`

Создайте файл `Dockerfile` в корне проекта, рядом с package.json:

```bash
cd ~/JavaScript/cvapp-example
touch Dockerfile
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Первый этап генерирует Prisma Client и компилирует приложение. Второй содержит runtime-зависимости, сборку и миграции. npm ci требует package-lock.json, созданный командой npm install.

```dockerfile
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV DATABASE_URL=postgresql://cvapp:cvapp@localhost:5432/cvapp?schema=public
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
```

### `docker-entrypoint.sh`

Создайте файл `docker-entrypoint.sh` в корне проекта, рядом с package.json:

```bash
cd ~/JavaScript/cvapp-example
touch docker-entrypoint.sh
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

Сначала применяются уже созданные миграции, затем запускается API. При ошибке миграций set -e останавливает запуск.

```sh
#!/bin/sh
set -e

./node_modules/.bin/prisma migrate deploy
exec node dist/main.js
```

### `.dockerignore`

Создайте файл `.dockerignore` в корне проекта, рядом с package.json:

```bash
cd ~/JavaScript/cvapp-example
touch .dockerignore
```

Откройте созданный файл в редакторе, вставьте приведённое ниже содержимое и сохраните.

```text
node_modules
dist
.git
.env
.env.*
coverage
*.log
.DS_Store
```

```bash
cd ~/JavaScript/cvapp-example
chmod +x docker-entrypoint.sh
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 api
```

После сборки доступны тот же http://localhost:4002/graphql и PostgreSQL на localhost:5435. В Docker не нужно запускать migrate dev: entrypoint использует migrate deploy. Проверьте в логах успешный запуск приложения.

## 10. Проверить GraphQL

```graphql
query Profile {
  profile {
    name
    description
    links { label url }
    skills { name }
    experience {
      company
      position
      period
      achievements
    }
    projects { name url }
  }
}
```

Вставьте этот запрос в Apollo Sandbox и нажмите Run. Либо выполните из терминала:

```bash
cd ~/JavaScript/cvapp-example
curl --fail-with-body http://localhost:4002/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { profile { name skills { name } experience { company period achievements } } }"}'
```

Ожидается JSON с data.profile. В текущих seed-данных имя — Юрьев Артем. Это API для чтения: сайта, авторизации и мутаций редактирования здесь нет.

## 11. Сохранить файлы в Git

### `.gitignore`

Этот файл уже создан NestJS CLI. Откройте `.gitignore` в корне проекта, рядом с package.json, замените его содержимое кодом ниже и сохраните. Новый файл создавать не нужно.

Секреты из .env, зависимости, сборка и сгенерированный клиент не должны попадать в коммит. Миграции и package-lock.json, напротив, нужно сохранить.

```text
# compiled output
/dist
/node_modules
/build

# TypeScript build cache
*.tsbuildinfo

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS
.DS_Store

# Tests
/coverage
/.nyc_output

# IDEs and editors
/.idea
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# IDE - VSCode
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# temp directory
.temp
.tmp

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

/src/generated/prisma

```

```bash
cd ~/JavaScript/cvapp-example
git add .
git commit -m "feat: implement profile GraphQL API"
```

## 12. Остановка и повторный запуск

На этом этапе новые файлы не создаём. Выполняем команды в терминале из корня cvapp-example.

```bash
cd ~/JavaScript/cvapp-example
docker compose stop
docker compose start
```

После изменения кода пересоберите образ:

```bash
cd ~/JavaScript/cvapp-example
docker compose up --build -d
```

Для удаления контейнеров с сохранением данных:

```bash
cd ~/JavaScript/cvapp-example
docker compose down
```

Повторный seed автоматически не обновит существующий профиль. Для изменения существующих данных используйте отдельный скрипт обновления или Prisma Studio:

```bash
cd ~/JavaScript/cvapp-example
npx prisma studio
```

Команда docker compose down -v удаляет volume вместе с базой. Она нужна только для осознанного сброса одноразовых учебных данных; для обычной остановки её не используйте.

