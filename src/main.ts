import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cabeçalhos de segurança (HSTS, X-Content-Type-Options, etc.).
  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // CORS restrito à(s) origem(ns) do front. Configure FRONT_URL no .env
  // (aceita lista separada por vírgula). Sem a env, cai no front local.
  const allowedOrigins = (process.env.FRONT_URL ?? 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Documentação exposta apenas fora de produção: em produção o /api/docs
  // revelaria toda a superfície da API (e mantém tokens com persistAuthorization).
  if (process.env.NODE_ENV !== 'production') {
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
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
