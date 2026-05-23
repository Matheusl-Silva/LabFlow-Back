import { Body, Controller, Get, ParseIntPipe, Post, Param } from "@nestjs/common";
import { ExamTemplateService } from "./exam-template.service";
import { ExamTemplate } from "../entities/exam-template.entity";
import { CreateExamTemplateDto } from "./dto/create-exam-template.dto";
import { UpdateExamTemplateDto } from "./dto/update-exam-template.dto";
import { CreateNewVersionExamTemplateDto } from "./dto/create-new-version-exam-template.dto";

@Controller('/template')
export class ExamTemplateController{
    constructor(private readonly service: ExamTemplateService,){}

    @Get()
    async get(): Promise<ExamTemplate[]>{
        return await this.service.get();
    }

    @Get('/:id')
    async getById(@Param('id', ParseIntPipe) id: number): Promise<ExamTemplate | null>{
        return this.service.getById(id);
    }

    @Post()
    async create(@Body() dto: CreateExamTemplateDto): Promise<ExamTemplate>{
        return this.service.create(dto);
    }

    @Post('/update/:id')
    async createNewVersion(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateNewVersionExamTemplateDto): Promise<ExamTemplate>{
        return this.service.createNewVersion(id, dto);
    }
}