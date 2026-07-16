import { ConflictException, Injectable, NotFoundException} from "@nestjs/common";
import { Patient } from "../entities/patient.entity";
import { Repository } from "typeorm";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { CreatePatientDto } from "./dto/create-patient.dto";
@Injectable()
export class PatientService{
    constructor(@InjectRepository(Patient) private readonly repo : Repository<Patient>){}
    
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

    async create(dto : CreatePatientDto) : Promise<Patient>{
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
            await this.repo.update(deleted.id, dto); // sobrescreve com os dados do novo cadastro
            await this.repo.restore(deleted.id);     // deleted_at = null (reativa)
            return this.repo.findOneByOrFail({id: deleted.id});
        }

        const patient = this.repo.create(dto);
        return this.repo.save(patient);
    }

    async update(id : number, dto : UpdatePatientDto) : Promise<boolean>{
        const patient = await this.repo.findOneBy({id});
        if(!patient) throw new NotFoundException('Patient not found');
        const result = await this.repo.update(patient.id, dto);

        return (result.affected ?? 0) > 0;
    }

    async delete(id : number) : Promise<boolean>{
        // Soft delete: marca deleted_at em vez de remover a linha, preservando
        // exames/anamneses vinculados (e as respectivas FKs).
        const result = await this.repo.softDelete(id);
        if(!result.affected) throw new NotFoundException('Patient not found');
        return (result.affected ?? 0) > 0;
    }
}