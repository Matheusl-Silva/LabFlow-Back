FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000
# start:prod roda as migrations pendentes (idempotente) e só então sobe a API.
# O CLI JS do TypeORM está disponível porque `typeorm` é dependency de produção.
CMD ["npm", "run", "start:prod"]
