import { DataSource } from "typeorm";
import { join } from "path";
import * as dotenv from 'dotenv';

dotenv.config();

// Globs relativos a __dirname para funcionar tanto em dev (src/*.ts, via
// ts-node) quanto em produção (dist/*.js, via `node`/CLI JS do TypeORM). Se
// apontássemos para "src/", o container de produção — que só tem `dist/` — não
// acharia as migrations e o migration:run rodaria sem aplicar nada.
export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.MAIN_DB_URL,
    entities: [join(__dirname, '../../entities/*.entity{.ts,.js}')],
    migrations: [join(__dirname, '../../migrations/*{.ts,.js}')],
    synchronize: false
});
