import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Categoria do item — serve para filtrar e agrupar o estoque na tela. */
export enum StockItemType {
  REAGENT = 'Reagente',
  CONSUMABLE = 'Consumível',
  GLASSWARE = 'Vidraria',
  EQUIPMENT = 'Equipamento',
  MEDICATION = 'Medicamento',
  PPE = 'EPI',
  OTHER = 'Outro',
}

/** Unidade em que a quantidade é contada. */
export enum StockUnit {
  UNIT = 'Unidade',
  BOX = 'Caixa',
  PACK = 'Pacote',
  BOTTLE = 'Frasco',
  ML = 'mL',
  L = 'L',
  G = 'g',
  KG = 'kg',
}

@Entity({ name: 'stock_items', database: process.env.MAIN_DB })
// Mesma estratégia dos pacientes: unicidade só entre registros ATIVOS, para que
// o nome de um item excluído volte a ficar livre para recadastro.
@Index('ux_stock_items_name_active', ['name'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class StockItem {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'Luva de procedimento M' })
  @Column({ length: 120 })
  name!: string;

  @ApiProperty({ enum: StockItemType, enumName: 'StockItemType' })
  @Column({ type: 'enum', enum: StockItemType })
  type!: StockItemType;

  @ApiProperty({ enum: StockUnit, enumName: 'StockUnit' })
  @Column({ type: 'enum', enum: StockUnit, default: StockUnit.UNIT })
  unit!: StockUnit;

  /**
   * Quantidade em números inteiros: a menor fração que o laboratório movimenta
   * é 1 na unidade escolhida (1 mL, 1 caixa, 1 frasco). Inteiro evita o
   * `numeric` do Postgres, que o driver devolve como string.
   */
  @ApiProperty({ example: 120 })
  @Column({ type: 'int', default: 0 })
  quantity!: number;

  /**
   * Estoque mínimo. É o que define o alerta de "prestes a acabar":
   * quantity <= minQuantity → repor. Zero desliga o alerta do item.
   */
  @ApiProperty({ name: 'minQuantity', example: 20 })
  @Column({ name: 'min_quantity', type: 'int', default: 0 })
  minQuantity!: number;

  @ApiPropertyOptional({ example: 'Caixa com 100 unidades, tamanho M' })
  @Column({ type: 'varchar', length: 250, nullable: true })
  description!: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Soft delete para preservar o histórico de auditoria do item.
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
