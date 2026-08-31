import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { ExamTemplate } from "../entities/exam-template.entity";
import { DataSource, Repository } from "typeorm";
import { CreateExamTemplateDto } from "./dto/create-exam-template.dto";
import { UpdateExamTemplateDto } from "./dto/update-exam-template.dto";
import { CreateNewVersionExamTemplateDto } from "./dto/create-new-version-exam-template.dto";
import { AuditService } from "../audit/audit.service";
import { AuditAction, AuditEntity } from "../audit/audit.types";

@Injectable()
export class ExamTemplateService{
    constructor(@InjectRepository(ExamTemplate) private readonly repo: Repository<ExamTemplate>,
                @InjectDataSource() private dataSource: DataSource,
                private readonly audit: AuditService){}

    async create(dto: CreateExamTemplateDto, userId: number): Promise<ExamTemplate>{
        const template = await this.repo.create(dto);
        const saved = await this.repo.save(template);
        await this.audit.record({
            action: AuditAction.CREATE,
            entity: AuditEntity.EXAM_TEMPLATE,
            entityId: saved.id,
            userId,
            after: { ...saved },
        });
        return saved;
    }

    async getActives(): Promise<ExamTemplate[]>{
        return this.repo.findBy({active: true})
    }

    async getAll(): Promise<ExamTemplate[]>{
        return this.repo.find();
    }

    async getById(id: number): Promise<ExamTemplate | null>{
        const template = await this.repo.findOneBy({id});
        if(!template) throw new NotFoundException("Exam template not found");
        return template;
    }

    async createNewVersion(id: number, dto: CreateNewVersionExamTemplateDto, userId: number): Promise<ExamTemplate>{
        const { oldTemplate, newTemplate } = await this.dataSource.transaction(async (manager)=>{
            const repo = manager.getRepository(ExamTemplate);
            const activeTemplate = await repo.findOneBy({id});
            if(!activeTemplate) throw new NotFoundException('Exam template not found');
            if(!activeTemplate.active) throw new ConflictException("Exam template is already inactive");

            const before = { ...activeTemplate };

            const updateDto: UpdateExamTemplateDto = {active: false};
            await repo.update(id, updateDto);

            const latestVersion = await repo.createQueryBuilder('et')
                                            .select('MAX(et.version)', 'max')
                                            .where('et.name = :name', {name: activeTemplate.name})
                                            .getRawOne<{max: number}>();
            // `?? activeTemplate.x` não serve aqui: `null` é um valor legítimo
            // (limpar o material/método), e só `undefined` significa "não mexi
            // nisso" — aí a nova versão herda o que a atual tinha.
            const newVersionDto : CreateExamTemplateDto = {
                ...dto,
                name: dto.name ?? activeTemplate.name,
                material: dto.material !== undefined ? dto.material : activeTemplate.material,
                method: dto.method !== undefined ? dto.method : activeTemplate.method,
                version: (latestVersion?.max ?? activeTemplate.version) + 1,
            }
            const created = repo.create(newVersionDto);
            const saved = await repo.save(created);

            return { oldTemplate: before, newTemplate: saved };
        });

        // Para o usuário, versionar é apenas "editar o modelo". A troca de versão
        // (desativar a atual + criar a próxima com id novo) é mecânica interna,
        // então gravamos UM ÚNICO evento de edição, com o snapshot enxuto do que
        // o usuário de fato mexe: nome e campos. Sem id/versão/timestamps, para
        // não vazar o funcionamento por baixo dos panos no log.
        await this.audit.record({
            action: AuditAction.UPDATE,
            entity: AuditEntity.EXAM_TEMPLATE,
            entityId: id,
            userId,
            before: {
                name: oldTemplate.name,
                schema: oldTemplate.schema,
                material: oldTemplate.material,
                method: oldTemplate.method,
            },
            after: {
                name: newTemplate.name,
                schema: newTemplate.schema,
                material: newTemplate.material,
                method: newTemplate.method,
            },
        });

        return newTemplate;
    }

    async update(id: number, dto:UpdateExamTemplateDto, userId: number) : Promise<boolean>{
        const examTemplate = await this.repo.findOneBy({id});
        if(!examTemplate) throw new NotFoundException("Exam template not found");

        const existingTemplate = await this.repo.findBy({name: dto.name, active: true});
        if(existingTemplate && examTemplate.id !== id) throw new ConflictException("There is already a template with this name");

        const before = { ...examTemplate };
        const result = await this.repo.update(id, dto);
        const after = await this.repo.findOneBy({id});
        await this.audit.record({
            action: AuditAction.UPDATE,
            entity: AuditEntity.EXAM_TEMPLATE,
            entityId: id,
            userId,
            before,
            after: after ? { ...after } : null,
        });

        return (result.affected ?? 0) > 0;
    }

    async softDelete(id: number, userId: number): Promise<boolean>{
        const affected = await this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(ExamTemplate);

            const template = await repo.findOneBy({id});
            if(!template) throw new NotFoundException("Exam template not found");

            await repo.update(id, {active: false});
            const result = await repo.softDelete(id);

            return (result.affected ?? 0) > 0;
        });

        await this.audit.record({
            action: AuditAction.DELETE,
            entity: AuditEntity.EXAM_TEMPLATE,
            entityId: id,
            userId,
        });

        return affected;
    }
}