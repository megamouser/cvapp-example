export const profileSeedData = {
  name: 'Юрьев Артем',
  description:
    'Разрабатываю веб-приложения на TypeScript, PHP и Python. Соединяю интерфейс, серверную логику и базу данных в работающий продукт.',
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
      company: 'Коммерческая backend-разработка',
      position: 'Fullstack Developer',
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
      name: 'Распределённая микросервисная архитектура — VIRITIA',
      url: '/projects#viritia-microservices-title',
      description:
        'Распределённая микросервисная архитектура на Python, FastAPI и Django с API и документацией Swagger для VIRITIA.',
    },
    {
      name: 'Деплой и администрирование Redmine',
      url: '/projects#redmine-title',
      description:
        'Развёртывание и администрирование Redmine для компании VIRITIA.',
    },
    {
      name: 'Внутренняя CRM для отдела рекламы',
      url: '/projects#advertising-crm-title',
      description:
        'Разработка внутренней CRM для рабочих процессов рекламного отдела компании Пневмотех.',
    },
    {
      name: 'Внутренняя CRM для отдела продаж',
      url: '/projects#sales-crm-title',
      description:
        'Разработка внутренней CRM для менеджеров по продажам компании Пневмотех.',
    },
    {
      name: 'WhatsApp-бот для Пневмотех',
      url: '/projects#whatsapp-title',
      description: 'Автоматизация общения с клиентами через WhatsApp.',
    },
    {
      name: 'Интеграции email-маркетинга для Пневмотех',
      url: '/projects#email-title',
      description: 'Интеграции для поддержки email-маркетинга компании.',
    },
    {
      name: 'Аналитика звонков менеджеров Пневмотех',
      url: '/projects#calls-title',
      description: 'Аналитика телефонных обращений и звонков менеджеров.',
    },
    {
      name: 'Интеграция IP-телефонии для Пневмотех',
      url: '/projects#telephony-title',
      description: 'Интеграция IP-телефонии с рабочими процессами компании.',
    },
    {
      name: 'SMS-оповещения при покупке компрессоров',
      url: '/projects#sms-title',
      description:
        'SMS-уведомления покупателей компрессоров компании Пневмотех.',
    },
    {
      name: 'phpAppStart',
      url: 'https://github.com/megamouser/phpAppStart',
      description:
        'Прототип PHP-приложения: собственный Router, контроллеры, шаблоны, Composer PSR-4 и примеры Zadarma API.',
    },
    {
      name: 'elektrodisel.ru — Электродизель',
      url: 'https://elektrodisel.ru/',
      description:
        'Коммерческий каталог генераторов и промышленного оборудования: подбор по мощности и бренду, корзина и запрос консультации.',
    },
    {
      name: 'pnevmotex.com — ПневмоТех',
      url: 'https://pnevmotex.com/',
      description:
        'Корпоративный интернет-магазин промышленного оборудования: каталог, поиск, фильтры, корзина и запросы покупателей.',
    },
    {
      name: 'Сервис ЦФО',
      url: 'https://github.com/megamouser/servis',
      description:
        'Демонстрационный PHP-лендинг: AJAX-формы, SQLite, email-уведомления и webhook WhatsApp-бота.',
    },
    {
      name: 'kompr.ru — ПНЕВМОТЕХ',
      url: 'https://kompr.ru/',
      description:
        'Интернет-магазин промышленного оборудования на PHP: каталог, фильтры, корзина и запрос коммерческого предложения.',
    },
    {
      name: 'cvapp',
      url: '/',
      description: 'Портфолио разработчика с регистрацией и личным кабинетом.',
    },
  ],
};
