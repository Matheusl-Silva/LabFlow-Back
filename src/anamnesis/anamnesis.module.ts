import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnamnesisService } from './anamnesis.service';
import { AnamnesisController } from './anamnesis.controller';
import { Anamnesis } from '../entities/anamnesis.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Anamnesis]), AuditModule],
  controllers: [AnamnesisController],
  providers: [AnamnesisService],
})
export class AnamnesisModule {}
