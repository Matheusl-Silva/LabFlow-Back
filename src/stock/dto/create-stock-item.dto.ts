import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockItemType, StockUnit } from '../../entities/stock-item.entity';

export class CreateStockItemDto {
  @ApiProperty({
    description: 'Nome do item de estoque',
    example: 'Luva de procedimento M',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Categoria do item',
    enum: StockItemType,
    enumName: 'StockItemType',
  })
  @IsEnum(StockItemType)
  @IsNotEmpty()
  type!: StockItemType;

  @ApiProperty({
    description: 'Unidade em que a quantidade é contada',
    enum: StockUnit,
    enumName: 'StockUnit',
    default: StockUnit.UNIT,
  })
  @IsEnum(StockUnit)
  @IsNotEmpty()
  unit!: StockUnit;

  @ApiProperty({
    description: 'Quantidade atual em estoque',
    example: 120,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiProperty({
    description:
      'Estoque mínimo. Quando a quantidade atual for menor ou igual a este valor, o item é sinalizado para reposição. Zero desliga o alerta.',
    example: 20,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  minQuantity!: number;

  @ApiPropertyOptional({
    description: 'Observações sobre o item',
    example: 'Caixa com 100 unidades',
  })
  @IsString()
  @IsOptional()
  @MaxLength(250)
  description?: string | null;
}
