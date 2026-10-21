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
