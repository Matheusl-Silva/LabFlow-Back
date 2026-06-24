import { registerDecorator, ValidationOptions } from "@nestjs/class-validator";
import { isValidCPF } from "../validators/cpf.validator";

export function IsCPF(options?: ValidationOptions){
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'isCPF',
            target: object.constructor,
            propertyName,
            options,
            validator: {
                validate(value: any){
                    return isValidCPF(value);
                },
                defaultMessage(){
                    return 'Invalid CPF'
                }
            }
        })
    }
}