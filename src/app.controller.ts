import { Controller, Get, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Req } from '@nestjs/common';
import { AuthService } from './auth/auth.service.js';
import { join } from 'node:path';
import { ProfileService } from './profile/profile.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  home(@Res() response: Response) {
    return response.sendFile(join(import.meta.dirname, 'public', 'index.html'));
  }

  @Get('register')
  register(@Res() response: Response) {
    return response.sendFile(
      join(import.meta.dirname, 'public', 'register.html'),
    );
  }

  @Get('about')
  about(@Res() response: Response) {
    return response.sendFile(join(import.meta.dirname, 'public', 'about.html'));
  }

  @Get('experience')
  experience(@Res() response: Response) {
    return response.sendFile(
      join(import.meta.dirname, 'public', 'experience.html'),
    );
  }

  @Get('projects')
  projects(@Res() response: Response) {
    return response.sendFile(
      join(import.meta.dirname, 'public', 'projects.html'),
    );
  }

  @Get('faq')
  faq(@Res() response: Response) {
    return response.sendFile(join(import.meta.dirname, 'public', 'faq.html'));
  }

  @Get('pages')
  pages(@Res() response: Response) {
    return response.sendFile(join(import.meta.dirname, 'public', 'pages.html'));
  }

  @Get('api/profile')
  async profile() {
    const profile = await this.profileService.getProfile();
    return {
      ...profile,
      experience: profile.experience.map((item) => ({
        ...item,
        period: this.profileService.formatPeriod(item),
        achievements: this.profileService.getAchievementDescriptions(item),
      })),
    };
  }

  @Get('login')
  login(@Res() response: Response) {
    return response.sendFile(join(import.meta.dirname, 'public', 'login.html'));
  }

  @Get('account')
  async account(@Req() request: Request, @Res() response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    if (!(await this.auth.currentUser(request)))
      return response.redirect('/login');
    return response.sendFile(
      join(import.meta.dirname, 'public', 'account.html'),
    );
  }
}
