import { Module } from "@nestjs/common";
import { PatientController } from "./patient.controller";
import { PatientService } from "./patient.service";
import { Patient } from "../entities/patient.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Exam } from "../entities/exam.entity";
import { Anamnesis } from "../entities/anamnesis.entity";
import { AuditModule } from "../audit/audit.module";

@Module({
    // Exam e Anamnesis entram porque o cadastro conta o histórico do paciente
    // excluído antes de pedir a confirmação do retorno.
    imports: [TypeOrmModule.forFeature([Patient, Exam, Anamnesis]), AuditModule],
    controllers: [PatientController],
    providers: [PatientService]
})
export class PatientModule{}