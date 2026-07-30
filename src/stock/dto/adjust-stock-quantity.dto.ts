import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Movimentação de estoque. Trabalha com DELTA (e não com o valor final) porque
 * o uso real é "saíram 3 caixas" / "chegaram 50 unidades": mandar o total
 * calculado no cliente abriria espaço para sobrescrever a movimentação de
 * outra pessoa que aconteceu no meio do caminho.
 */
export class AdjustStockQuantityDto {
  @ApiProperty({
    description:
      'Quantidade a somar (entrada) ou subtrair (saída, valor negativo). Não pode ser zero nem deixar o estoque negativo.',
    example: -3,
  })
  @IsInt()
  @IsNotEmpty()
  delta!: number;
}
