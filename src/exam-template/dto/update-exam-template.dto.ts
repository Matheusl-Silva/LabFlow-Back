import { Column } from "typeorm";
import { IsSchema } from "../validators/exam-template.decorators";

export class UpdateExamTemplateDto{
    @Column()
    version?: number

    @Column()
    active?: boolean

    @IsSchema()
    schema!: object
}