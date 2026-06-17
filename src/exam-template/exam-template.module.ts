import { Module } from "@nestjs/common";
import { ExamTemplateController } from "./exam-template.controller";
import { ExamTemplateService } from "./exam-template.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExamTemplate } from "../entities/exam-template.entity";
import { Exam } from "../entities/exam.entity";

@Module({
    imports:[TypeOrmModule.forFeature([ExamTemplate, Exam])],
    controllers: [ExamTemplateController],
    providers: [ExamTemplateService],
})
export class ExamTemplateModule{}