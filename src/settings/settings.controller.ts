import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService, SettingsView } from './settings.service';
import { UpdateLogoDto } from './dto/update-logo.dto';
import { UpdateFooterDto } from './dto/update-footer.dto';
import { SettingsSwagger } from './settings.swagger';
import { AllowCommonUser } from '../common/decorators/allow-common-user.decorator';

@ApiTags('Configurações')
@Controller('/settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  // Qualquer usuário autenticado precisa ler a logo/rodapé para gerar o laudo.
  @SettingsSwagger.getSettings()
  @AllowCommonUser()
  @Get()
  async getSettings(): Promise<SettingsView> {
    return this.service.getSettings();
  }

  // Enviar/remover logo e rodapé é exclusivo de admin (regra padrão do AdminGuard).
  @SettingsSwagger.updateLogo()
  @Put('/logo')
  async updateLogo(@Body() dto: UpdateLogoDto): Promise<SettingsView> {
    return this.service.updateLogo(dto);
  }

  @SettingsSwagger.removeLogo()
  @Delete('/logo')
  async removeLogo(): Promise<{ message: string }> {
    await this.service.removeLogo();
    return { message: 'Logo has been removed successfully' };
  }

  @SettingsSwagger.updateFooter()
  @Put('/footer')
  async updateFooter(@Body() dto: UpdateFooterDto): Promise<SettingsView> {
    return this.service.updateFooter(dto);
  }

  @SettingsSwagger.removeFooter()
  @Delete('/footer')
  async removeFooter(): Promise<{ message: string }> {
    await this.service.removeFooter();
    return { message: 'Footer has been removed successfully' };
  }
}
