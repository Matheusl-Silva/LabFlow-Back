import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { ExamTemplate } from "../entities/exam-template.entity";
import { DataSource, Repository } from "typeorm";
import { CreateExamTemplateDto } from "./dto/create-exam-template.dto";
import { UpdateExamTemplateDto } from "./dto/update-exam-template.dto";
import { CreateNewVersionExamTemplateDto } from "./dto/create-new-version-exam-template.dto";

@Injectable()
export class ExamTemplateService{
    constructor(@InjectRepository(ExamTemplate) private readonly repo: Repository<ExamTemplate>,
                @InjectDataSource() private dataSource: DataSource){}

    async create(dto: CreateExamTemplateDto): Promise<ExamTemplate>{
        const template = await this.repo.create(dto);
        return await this.repo.save(template);
    }

    async get(): Promise<ExamTemplate[]>{
        return this.repo.findBy({active: true})
    }

    async getById(id: number): Promise<ExamTemplate | null>{
        return this.repo.findOneBy({id});
    }

    async createNewVersion(id: number, dto: CreateNewVersionExamTemplateDto): Promise<ExamTemplate>{
        return await this.dataSource.transaction(async ()=>{
            const activeTemplate = await this.repo.findOneBy({id});
            if(!activeTemplate) throw new NotFoundException('Exam template not found');

            const updateDto: UpdateExamTemplateDto = {active: false};
            await this.repo.update(id, updateDto);

            const newVerstionDto: CreateExamTemplateDto = {...dto, name: activeTemplate.name, version: activeTemplate.version + 1};
            const newTemplate = this.repo.create(newVerstionDto);

            return this.repo.save(newTemplate);
        });
    }
}