import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Assinaturas (magic numbers) de cada mime aceito. Comparamos apenas os
 * primeiros bytes do conteúdo decodificado — o suficiente para confirmar que
 * o base64 é, de fato, o formato de imagem declarado, sem decodificar tudo.
 */
const MAGIC_BYTES: Record<string, (bytes: Buffer) => boolean> = {
  // 89 50 4E 47 0D 0A 1A 0A
  'image/png': (b) =>
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  // FF D8 FF
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  // "RIFF" .... "WEBP"
  'image/webp': (b) =>
    b.length >= 12 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP',
};

@ValidatorConstraint({ name: 'isImageMatchingMime', async: false })
export class IsImageMatchingMimeConstraint implements ValidatorConstraintInterface {
  validate(base64: unknown, args: ValidationArguments): boolean {
    if (typeof base64 !== 'string') return false;

    // O mime declarado vem de outra propriedade do mesmo DTO.
    const mime = (args.object as Record<string, unknown>)[args.constraints[0]];
    const check = typeof mime === 'string' ? MAGIC_BYTES[mime] : undefined;
    if (!check) return false; // mime desconhecido -> deixa o @IsIn reportar

    // Basta o cabeçalho: 16 chars de base64 = 12 bytes, cobre todas as assinaturas.
    const header = Buffer.from(base64.slice(0, 16), 'base64');
    return check(header);
  }

  defaultMessage(): string {
    return 'O conteúdo enviado não corresponde a uma imagem válida do formato informado.';
  }
}

/**
 * Valida que o conteúdo base64 realmente começa com a assinatura do mime
 * apontado por `mimeProperty`.
 */
export function IsImageMatchingMime(mimeProperty: string, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [mimeProperty],
      options,
      validator: IsImageMatchingMimeConstraint,
    });
  };
}
