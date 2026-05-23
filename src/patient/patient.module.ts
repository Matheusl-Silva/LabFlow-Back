import { Module } from "@nestjs/common";
import { PatientController } from "./patient.controller";
import { PatientService } from "./patient.service";
import { Patient } from "../entities/patient.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Exam } from "../entities/exam.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Patient, Exam])],
    controllers: [PatientController],
    providers: [PatientService]
})
export class PatientModule{}