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
