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
