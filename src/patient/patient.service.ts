import { ConflictException, HttpStatus, Injectable, NotFoundException} from "@nestjs/common";
import { Patient } from "../entities/patient.entity";
import { Repository } from "typeorm";
import { Anamnesis } from "../entities/anamnesis.entity";
import { Exam } from "../entities/exam.entity";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { AuditService } from "../audit/audit.service";
import { AuditAction, AuditEntity } from "../audit/audit.types";

/**
 * Marca o 409 de "paciente retornando" — o único conflito de cadastro que o
 * usuário pode resolver confirmando. O cliente testa este `code`; a mensagem é
 * texto para humano e pode ser reescrita sem quebrar ninguém.
 */
export const PATIENT_RETURNING_CODE = 'PATIENT_RETURNING';

@Injectable()
export class PatientService{
    constructor(
        @InjectRepository(Patient) private readonly repo : Repository<Patient>,
        private readonly audit: AuditService,
    ){}

    /**
     * Snapshot do paciente para auditoria SEM o CPF: é dado pessoal sensível
     * (LGPD) e guardá-lo em texto no histórico de logs seria exposição
     * desnecessária. O id do registro já identifica quem foi alterado.
     */
    private snapshot(patient: Patient): Record<string, unknown> {
        const { cpf, ...rest } = patient;
        return rest;
    }
    
    get() : Promise<Patient[]>{
        return this.repo.find();
    }

    /**
     * Único recorte que um usuário comum pode enxergar. Fora daqui é dado
     * pessoal (nome, e-mail, CPF, telefone, nascimento) ou dado de saúde
     * (medicação, patologia) — ambos restritos ao administrador.
     */
    private static readonly NON_IDENTIFYING_FIELDS = {
        id: true,
        period: true,
        createdAt: true,
    } as const;

    async getPrivate(): Promise<Patient[]>{
        return this.repo.find({
            select: PatientService.NON_IDENTIFYING_FIELDS
        })
    }

    async getById(id: number) : Promise<Patient | null>{
        const pacient = await this.repo.findOneBy({id});
        if(!pacient) throw new NotFoundException("Patient not found");
        return pacient;
    }

    /** Mesmo recorte de `getPrivate`, para um paciente só. */
    async getPrivateById(id: number): Promise<Patient | null>{
        const patient = await this.repo.findOne({
            where: {id},
            select: PatientService.NON_IDENTIFYING_FIELDS
        });
        if(!patient) throw new NotFoundException("Patient not found");
        return patient;
    }

    /**
     * Reativar um cadastro excluído é o oposto do que o usuário acha que está
     * fazendo ao clicar em "Cadastrar": em vez de uma ficha em branco, o
     * registro antigo volta com o id, os exames e as anamneses dele. Por isso a
     * primeira tentativa é RECUSADA com este 409 descritivo — o cliente mostra a
     * confirmação e só então repete a chamada com `confirmReturn`.
     *
     * Os totais de exames e anamneses vão junto porque são o que o usuário
     * precisa saber para decidir: é o histórico que ele vai reencontrar
     * vinculado ao paciente.
     */
    private async returningPatientConflict(deleted: Patient): Promise<ConflictException>{
        const manager = this.repo.manager;
        const [exams, anamneses] = await Promise.all([
            manager.count(Exam, {where: {patientId: deleted.id}}),
            manager.count(Anamnesis, {where: {patientId: deleted.id}}),
        ]);

        return new ConflictException({
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            code: PATIENT_RETURNING_CODE,
            message:
                'Já existe um paciente excluído com este CPF. ' +
                'Confirme o retorno para reativar o cadastro.',
            patient: {
                id: deleted.id,
                name: deleted.name,
                deletedAt: deleted.deletedAt,
                examCount: exams,
                anamnesisCount: anamneses,
            },
        });
    }

    /**
     * `confirmReturn` só tem efeito quando existe um cadastro excluído com o
     * mesmo CPF: é o "sim, é a mesma pessoa voltando" vindo da tela. Fora desse
     * caso o cadastro segue igual, confirmado ou não.
     */
    async create(dto : CreatePatientDto, userId: number, confirmReturn = false) : Promise<Patient>{
        // CPF é identidade nacional: mesmo CPF = mesma pessoa. Se já existe um
        // paciente ATIVO com esse CPF, é conflito real. Se existe um paciente
        // EXCLUÍDO (soft delete) com esse CPF, é a mesma pessoa voltando —
        // reativamos o registro (mantendo o id e o histórico de exames/anamneses)
        // em vez de criar um novo.
        const active = await this.repo.findOneBy({cpf: dto.cpf});
        if(active) throw new ConflictException('Patient already registered');

        const deleted = await this.repo.findOne({
            where: {cpf: dto.cpf},
            withDeleted: true,
            order: {id: 'DESC'},
        });

        if(deleted){
            if(!confirmReturn) throw await this.returningPatientConflict(deleted);

            await this.repo.update(deleted.id, dto); // sobrescreve com os dados do novo cadastro
            await this.repo.restore(deleted.id);     // deleted_at = null (reativa)
            const restored = await this.repo.findOneByOrFail({id: deleted.id});
            await this.audit.record({
                action: AuditAction.CREATE, // registro voltando: tratamos como criação
                entity: AuditEntity.PATIENT,
                entityId: restored.id,
                userId,
                after: this.snapshot(restored),
            });
            return restored;
        }

        const patient = this.repo.create(dto);
        const saved = await this.repo.save(patient);
        await this.audit.record({
            action: AuditAction.CREATE,
            entity: AuditEntity.PATIENT,
            entityId: saved.id,
            userId,
            after: this.snapshot(saved),
        });
        return saved;
    }

    async update(id : number, dto : UpdatePatientDto, userId: number) : Promise<boolean>{
        const patient = await this.repo.findOneBy({id});
        if(!patient) throw new NotFoundException('Patient not found');

        const before = this.snapshot(patient);
        const result = await this.repo.update(patient.id, dto);
        const after = await this.repo.findOneBy({id});
        await this.audit.record({
            action: AuditAction.UPDATE,
            entity: AuditEntity.PATIENT,
            entityId: id,
            userId,
            before,
            after: after ? this.snapshot(after) : null,
        });

        return (result.affected ?? 0) > 0;
    }

    async delete(id : number, userId: number) : Promise<boolean>{
        const patient = await this.repo.findOneBy({id});
        if(!patient) throw new NotFoundException('Patient not found');

        // Soft delete: marca deleted_at em vez de remover a linha, preservando
        // exames/anamneses vinculados (e as respectivas FKs).
        const result = await this.repo.softDelete(id);
        if(!result.affected) throw new NotFoundException('Patient not found');
        await this.audit.record({
            action: AuditAction.DELETE,
            entity: AuditEntity.PATIENT,
            entityId: id,
            userId,
            before: this.snapshot(patient),
        });
        return (result.affected ?? 0) > 0;
    }
}