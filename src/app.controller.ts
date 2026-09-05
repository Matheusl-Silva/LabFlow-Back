import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Sobra do esqueleto do Nest. Não faz parte da API do LabFlow e, pelo padrão
   * fail-closed do RolesGuard, hoje exige perfil de administrador — o que
   * também a inutiliza como sonda de saúde (um health check em `/` toma 401).
   *
   * Fica fora da documentação em vez de ser documentada como endpoint: listar
   * um "Hello World!" no Swagger sugeriria que ele existe por algum motivo.
   * O certo é removê-la; até lá, ao menos não confunde quem lê os docs.
   */
  @ApiExcludeEndpoint()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
