import { IsSchema } from "../validators/exam-template.decorators";

export class CreateNewVersionExamTemplateDto{
    @IsSchema()
    schema!: object;
}