import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql'; // Подключает Nest-модуль, который добавляет GraphQL в приложение.
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'; // ApolloDriver — адаптер, через который NestJS запускает Apollo Server. ApolloDriverConfig — TypeScript-тип для параметров GraphQL-настройки. Он помогает редактору и компилятору подсказать допустимые параметры.
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppResolver } from './app.resolver.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SeedModule } from './database/seed.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { RegistrationModule } from './registration/registration.module.js';
import { AuthModule } from './auth/auth.module.js';

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
    RegistrationModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
