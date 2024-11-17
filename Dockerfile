FROM node:alpine AS development
WORKDIR /usr/src/app/jarvis
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .

RUN pnpm run build

FROM node:alpine AS production
ARG NODE_ENV=prod
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app/jarvis
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod
COPY --from=development /usr/src/app/jarvis/dist ./dist
COPY service-account.json ./
CMD ["node", "dist/main.js"]