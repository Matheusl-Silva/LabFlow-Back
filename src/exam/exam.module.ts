import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamTemplate } from '../entities/exam-template.entity';
import { Exam } from '../entities/exam.entity';
import { Patient } from '../entities/patient.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Patient, User, ExamTemplate])],
  providers: [ExamService],
  controllers: [ExamController],
})
export class ExamModule {}
