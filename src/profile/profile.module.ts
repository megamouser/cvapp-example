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
