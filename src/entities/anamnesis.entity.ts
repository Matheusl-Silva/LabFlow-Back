import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Patient } from './patient.entity';

@Entity({ name: 'anamneses', database: process.env.MAIN_DB })
export class Anamnesis {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'chief_complaint', length: 250 })
  chiefComplaint!: string;

  @Column({ name: 'symptoms_onset', type: 'timestamp' })
  symptomsOnset!: Date;

  @Column({ length: 250 })
  frequency!: string;

  @Column({ name: 'pain_location', length: 250 })
  painLocation!: string;

  @Column({ name: 'heart_disease', type: 'boolean' })
  heartDisease!: boolean;

  @Column({ type: 'boolean' })
  hypertension!: boolean;

  @Column({ type: 'boolean' })
  diabetes!: boolean;

  @Column({ type: 'boolean' })
  cancer!: boolean;

  @Column({ type: 'boolean' })
  surgeries!: boolean;

  @Column({ name: 'other_diseases', length: 250, nullable: true })
  otherDiseases?: string

  @Column({ length: 250, nullable: true })
  allergies?: string;

  @Column({ length: 250, nullable: true })
  medication?: string;

  @Column({ name: 'meals_per_day', type: 'int' })
  mealsPerDay!: number;

  @Column({ name: 'urinary_elimination', length: 250 })
  urinaryElimination!: string;

  @Column({ name: 'intestinal_elimination', length: 250 })
  intestinalElimination!: string;

  @Column({ name: 'menstrual_cycle', length: 250, nullable: true })
  menstrualCycle?: string;

  @Column({ name: 'sleep_and_rest', length: 250 })
  sleepAndRest!: string;

  @Column({ name: 'sleep_hours', type: 'int' })
  sleepHours!: number;

  @Column({ name: 'smoking_frequency', length: 250, nullable: true })
  smokingFrequency?: string;

  @Column({ name: 'drugs_frequency', length: 250, nullable: true })
  drugsFrequency?: string;

  @Column({ name: 'alcohol_frequency', length: 250, nullable: true })
  alcoholFrequency?: string;

  @Column({ name: 'exercise_frequency', length: 250, nullable: true })
  exerciseFrequency?: string;

  @Column({ length: 250, nullable: true })
  leisure?: string;

  @Column({ name: 'basic_sanitation', type: 'boolean' })
  basicSanitation!: boolean;

  @Column({ name: 'domestic_animals', length: 250, nullable: true })
  domesticAnimals?: string;

  @Column({ name: 'health_center', type: 'boolean' })
  healthCenter!: boolean;

  @Column({ name: 'family_disease', length: 250, nullable: true })
  familyDisease?: string;

  @Column({ name: 'family_disease_treatment', length: 250, nullable: true })
  familyDiseaseTreatment?: string;

  @ManyToOne(() => Patient, (patient) => patient.anamneses)
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'patient_id' })
  patientId!: number;

  @Column({ type: 'timestamp' })
  date!: Date;
}
