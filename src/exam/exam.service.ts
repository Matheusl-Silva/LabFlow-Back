import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exam } from '../entities/exam.entity';
import { Repository } from 'typeorm';
import { CreateExamDto } from './dto/create-exam.dto';
import { isValidExam } from './validators/exam.validator';
import { ExamTemplate } from '../entities/exam-template.entity';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam) private readonly repo: Repository<Exam>,
    @InjectRepository(ExamTemplate)
    private readonly templateRepo: Repository<ExamTemplate>,
  ) {}

  async create(dto: CreateExamDto): Promise<Exam> {
    const template = await this.templateRepo.findOneBy({id: dto.examTemplateId});
    if(!template) throw new BadRequestException("Exam template does not exist");

    if(!isValidExam(dto.data, template.schema)) throw new BadRequestException("The exam does not follow it's schema");

    const exam = this.repo.create(dto);
    return this.repo.save(exam);
  }

  async get(): Promise<Exam[]> {
    return this.repo.find();
  }

  async getByPatientId(patientId: number): Promise<Exam[]> {
    return this.repo.find({
      where: { patient: { id: patientId } },
      relations: { patient: true },
    });
  }

  async getById(id: number): Promise<Exam | null> {
    return await this.repo.findOneBy({ id });
  }

  async update(id: number, dto: UpdateExamDto){
    const exam = await this.repo.findOneBy({id});
    if(!exam) throw new NotFoundException('Exam not found');

    const template = await this.templateRepo.findOneBy({id: exam.examTemplateId});
    if(!template) throw new InternalServerErrorException("Template not found");
  
    if(dto.data && !isValidExam(dto.data, template.schema)) throw new BadRequestException("The exam does not follow it's schema");

    const result = await this.repo.update(id, dto);

    return (result.affected ?? 0) > 0;
  }

  async softDelete(id: number): Promise<boolean>{
    const result = await this.repo.softDelete(id);
    if(!result.affected) throw new NotFoundException("Exam not found");
    return (result.affected ?? 0) > 0;
  }
}
