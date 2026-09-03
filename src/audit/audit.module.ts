import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { Patient } from '../entities/patient.entity';
import { Exam } from '../entities/exam.entity';
import { ExamTemplate } from '../entities/exam-template.entity';
import { Anamnesis } from '../entities/anamnesis.entity';
import { StockItem } from '../entities/stock-item.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  // Além do AuditLog, entram as entidades auditadas: o serviço resolve o nome
  // do autor e o nome do registro de cada evento (ver AuditService).
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      User,
      Patient,
      Exam,
      ExamTemplate,
      Anamnesis,
      StockItem,
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService], // usado pelos módulos de exam/patient/template/anamnesis
})
export class AuditModule {}
