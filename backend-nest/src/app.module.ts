import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { ScoreController } from './score/score.controller';
import { ScoreService } from './score/score.service';
import { ItWorkspaceController } from './it-workspace/it-workspace.controller';
import { ItWorkspaceService } from './it-workspace/it-workspace.service';
import { JwtAuthGuard } from './common/jwt-auth.guard';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [HealthController, AuthController, ScoreController, ItWorkspaceController],
  providers: [AuthService, ScoreService, ItWorkspaceService, JwtAuthGuard],
})
export class AppModule {}