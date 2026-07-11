import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

export const MainDatabase = TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('MAIN_DB_URL'),
        autoLoadEntities: true,
        synchronize: true
    })
})