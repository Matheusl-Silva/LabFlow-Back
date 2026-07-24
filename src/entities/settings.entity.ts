import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Configurações globais do laboratório — tabela SINGLETON: sempre a linha id=1.
 * Guarda o que o laudo de impressão exibe como marca institucional: a logo do
 * cabeçalho e o texto do rodapé (nome/endereço do laboratório).
 *
 * A logo fica em base64 no próprio banco (e não no disco) de propósito: o
 * container do back não tem volume, então um arquivo salvo em disco seria
 * apagado a cada rebuild. O Postgres persiste no volume postgres_data.
 */
@Entity({ name: 'settings', database: process.env.MAIN_DB })
export class Settings {
  @PrimaryColumn({ default: 1 })
  id!: number;

  // Conteúdo base64 puro da imagem (sem o prefixo "data:...;base64,").
  @Column({ name: 'logo_base64', type: 'text', nullable: true })
  logoBase64!: string | null;

  // Mime-type da logo (image/png | image/jpeg | image/webp) — o front remonta
  // o data URL a partir dele.
  @Column({ name: 'logo_mime', type: 'varchar', nullable: true })
  logoMime!: string | null;

  // Texto do rodapé do laudo (nome/endereço do laboratório). Pode ter várias
  // linhas; nulo quando não configurado, e aí o laudo não mostra rodapé.
  @Column({ name: 'footer_text', type: 'text', nullable: true })
  footerText!: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
