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
