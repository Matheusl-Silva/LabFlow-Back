import { Injectable, NotFoundException} from "@nestjs/common";
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

    getById(id: number) : Promise<Patient | null>{
        return this.repo.findOneBy({id});
    }

    async create(dto : CreatePatientDto) : Promise<Patient>{
        const patient = await this.repo.create(dto);
        return this.repo.save(patient);
    }

    async update(id : number, dto : UpdatePatientDto) : Promise<boolean>{
        const patient = await this.repo.findOneBy({id});
        if(!patient) throw new NotFoundException('Patient not found');

        const result = await this.repo.update(patient.id, dto);

        return (result.affected ?? 0) > 0;
    }

    async delete(id : number) : Promise<boolean>{
        const result = await this.repo.delete(id);
        if(!result.affected) throw new NotFoundException('Patient not found');
        return (result.affected ?? 0) > 0;
    }
}