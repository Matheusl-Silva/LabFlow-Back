import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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

    async getActives(): Promise<ExamTemplate[]>{
        return this.repo.findBy({active: true})
    }

    async getAll(): Promise<ExamTemplate[]>{
        return this.repo.find();
    }

    async getById(id: number): Promise<ExamTemplate | null>{
        return this.repo.findOneBy({id});
    }

    async createNewVersion(id: number, dto: CreateNewVersionExamTemplateDto): Promise<ExamTemplate>{
        return await this.dataSource.transaction(async (manager)=>{
            const repo = manager.getRepository(ExamTemplate);
            const activeTemplate = await repo.findOneBy({id});
            if(!activeTemplate) throw new NotFoundException('Exam template not found');
            if(!activeTemplate.active) throw new ConflictException("Exam template is already inactive");

            const updateDto: UpdateExamTemplateDto = {active: false};
            await repo.update(id, updateDto);

            const latestVersion = await repo.createQueryBuilder('et')
                                            .select('MAX(et.version)', 'max')
                                            .where('et.name = :name', {name: activeTemplate.name})
                                            .getRawOne<{max: number}>();
            const newVersionDto : CreateExamTemplateDto = {...dto, name: activeTemplate.name, version: (latestVersion?.max ?? activeTemplate.version) + 1}
            const newTemplate = repo.create(newVersionDto);

            return repo.save(newTemplate);
        });
    }
}