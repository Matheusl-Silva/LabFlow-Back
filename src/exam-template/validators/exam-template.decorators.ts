import { validateSchema } from "./exam-template.validator";
import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export function IsSchema(options?: ValidationOptions){
    return function (object: object, propertyName: string){
        registerDecorator({
            name: 'isSchema',
            target: (object as any).constructor,
            propertyName,
            options: options,
            validator: {
                validate(value: any){
                    return validateSchema(value);
                },

                defaultMessage(args: ValidationArguments){
                    return `${args.property} must be an object where all values contains a 'references' key of the type object`
                }
            }   
       });
    }
}