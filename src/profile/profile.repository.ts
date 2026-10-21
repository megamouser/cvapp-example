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
