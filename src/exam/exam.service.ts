import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exam } from '../entities/exam.entity';
import { Repository } from 'typeorm';
import { CreateExamDto } from './dto/create-exam.dto';
import { isValidExam } from './validators/exam.validator';
import { ExamTemplate } from '../entities/exam-template.entity';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam) private readonly repo: Repository<Exam>,
    @InjectRepository(ExamTemplate)
    private readonly templateRepo: Repository<ExamTemplate>,
  ) {}

  async create(dto: CreateExamDto): Promise<Exam> {
    if (!(await isValidExam(this.templateRepo, dto))) throw new BadRequestException("The exam does not follow its schema");

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
}
