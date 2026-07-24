import { Module } from "@nestjs/common";
import { ExamTemplateController } from "./exam-template.controller";
import { ExamTemplateService } from "./exam-template.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExamTemplate } from "../entities/exam-template.entity";
import { Exam } from "../entities/exam.entity";
import { AuditModule } from "../audit/audit.module";

@Module({
    imports:[TypeOrmModule.forFeature([ExamTemplate, Exam]), AuditModule],
    controllers: [ExamTemplateController],
    providers: [ExamTemplateService],
})
export class ExamTemplateModule{}