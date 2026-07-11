import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true
  }));

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('LabFlow API')
    .setDescription(
      'Documentação da API do sistema de laboratório.\n\n' +
      '**Tipos de acesso:**\n' +
      '- 🔓 **Público** — sem autenticação\n' +
      '- 🔒 **Usuário** (`access-token`) — requer JWT de usuário autenticado\n' +
      '- 🔒 **Admin** (`admin-token`) — requer JWT com perfil administrador',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT de usuário autenticado (comum ou admin)',
      },
      'access-token',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT exclusivo para rotas de administrador',
      },
      'admin-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // mantém o token preenchido ao recarregar a página
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
