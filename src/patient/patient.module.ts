import { Module } from "@nestjs/common";
import { PatientController } from "./patient.controller";
import { PatientService } from "./patient.service";
import { Patient } from "../entities/patient.entity";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
    imports: [TypeOrmModule.forFeature([Patient])],
    controllers: [PatientController],
    providers: [PatientService]
})
export class PatientModule{}