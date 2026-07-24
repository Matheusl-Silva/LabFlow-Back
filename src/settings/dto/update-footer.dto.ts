import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const MAX_FOOTER_LENGTH = 500;

export class UpdateFooterDto {
  @ApiProperty({
    description: 'Texto do rodapé do laudo (aceita várias linhas)',
    example:
      'LEAC – LABORATÓRIO DE ENSINO DE ANÁLISES CLÍNICAS. UNIVERSIDADE POSITIVO.\nRUA: JOÃO ROGÉRIO RIBEIRO BONESI, 150 – LONDRINA/PR. CEP: 86047-625.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_FOOTER_LENGTH, {
    message: `O rodapé excede o limite de ${MAX_FOOTER_LENGTH} caracteres.`,
  })
  footerText!: string;
}
