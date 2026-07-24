import { IsBase64, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsImageMatchingMime } from '../validators/is-image-matching-mime.validator';

/** Mime-types aceitos para a logo — raster inerte, sem SVG. */
export const ALLOWED_LOGO_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;

// Limite de 512 KB. Em base64 o conteúdo cresce ~4/3, então 512 KB de imagem
// viram ~699 KB de texto — a folga cobre o overhead.
export const MAX_LOGO_BASE64_LENGTH = 700_000;

export class UpdateLogoDto {
  @ApiProperty({
    description: 'Conteúdo da logo em base64 puro (sem o prefixo data:...;base64,)',
    example: 'iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  @MaxLength(MAX_LOGO_BASE64_LENGTH, { message: 'A logo excede o tamanho máximo de 512 KB.' })
  @IsImageMatchingMime('logoMime', {
    message: 'O conteúdo enviado não corresponde a uma imagem válida do formato informado.',
  })
  logoBase64!: string;

  @ApiProperty({
    description: 'Mime-type da logo',
    enum: ALLOWED_LOGO_MIMES,
    example: 'image/png',
  })
  @IsString()
  @IsIn(ALLOWED_LOGO_MIMES, { message: 'Formato inválido. Use PNG, JPG ou WebP.' })
  logoMime!: string;
}
