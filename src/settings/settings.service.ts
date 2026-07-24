import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { UpdateLogoDto } from './dto/update-logo.dto';
import { UpdateFooterDto } from './dto/update-footer.dto';

const SINGLETON_ID = 1;

export interface SettingsView {
  logoBase64: string | null;
  logoMime: string | null;
  footerText: string | null;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings) private readonly repo: Repository<Settings>,
  ) {}

  /**
   * Retorna a linha singleton, criando-a se ainda não existir. A migration já
   * garante a linha id=1, mas isto blinda o caso de um banco antigo sem ela.
   */
  private async getSingleton(): Promise<Settings> {
    let settings = await this.repo.findOneBy({ id: SINGLETON_ID });
    if (!settings) {
      settings = this.repo.create({
        id: SINGLETON_ID,
        logoBase64: null,
        logoMime: null,
        footerText: null,
      });
      settings = await this.repo.save(settings);
    }
    return settings;
  }

  private toView(settings: Settings): SettingsView {
    return {
      logoBase64: settings.logoBase64,
      logoMime: settings.logoMime,
      footerText: settings.footerText,
    };
  }

  /** Todas as configurações do laudo (logo + rodapé). */
  async getSettings(): Promise<SettingsView> {
    return this.toView(await this.getSingleton());
  }

  async updateLogo(dto: UpdateLogoDto): Promise<SettingsView> {
    const settings = await this.getSingleton();
    settings.logoBase64 = dto.logoBase64;
    settings.logoMime = dto.logoMime;
    return this.toView(await this.repo.save(settings));
  }

  async removeLogo(): Promise<void> {
    const settings = await this.getSingleton();
    settings.logoBase64 = null;
    settings.logoMime = null;
    await this.repo.save(settings);
  }

  async updateFooter(dto: UpdateFooterDto): Promise<SettingsView> {
    const settings = await this.getSingleton();
    settings.footerText = dto.footerText;
    return this.toView(await this.repo.save(settings));
  }

  async removeFooter(): Promise<void> {
    const settings = await this.getSingleton();
    settings.footerText = null;
    await this.repo.save(settings);
  }
}
