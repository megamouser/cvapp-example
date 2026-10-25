import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Response } from 'express';
import { AppController } from './app.controller.js';
import { ProfileService } from './profile/profile.service.js';
import { AuthService } from './auth/auth.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: ProfileService, useValue: {} },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('serves the home page', () => {
    const response = { sendFile: jest.fn() };
    appController.home(response as unknown as Response);
    expect(response.sendFile).toHaveBeenCalledWith(
      expect.stringMatching(/public\/index\.html$/),
    );
  });

  it('serves a separate registration page', () => {
    const response = { sendFile: jest.fn() };
    appController.register(response as unknown as Response);
    expect(response.sendFile).toHaveBeenCalledWith(
      expect.stringMatching(/public\/register\.html$/),
    );
  });
});
