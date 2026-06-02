import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamTemplate } from '../entities/exam-template.entity';
import { Exam } from '../entities/exam.entity';
import { Patient } from '../entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Patient, ExamTemplate])],
  providers: [ExamService],
  controllers: [ExamController],
})
export class ExamModule {}
