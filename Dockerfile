# Base stage for installing dependencies
FROM node:alpine AS base
WORKDIR /usr/src/app/jarvis

# Install pnpm globally
RUN npm install -g pnpm

# Copy files needed for dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Development stage
FROM base AS development
# Copy the rest of the application
COPY . .
CMD ["pnpm", "run", "start:dev"]

# Production stage
FROM base AS production
ENV NODE_ENV=prod
WORKDIR /usr/src/app/jarvis

# Only copy production dependencies
RUN pnpm install --prod

# Copy built files from development stage
COPY --from=development /usr/src/app/jarvis/dist ./dist
COPY service-account.json ./

CMD ["node", "dist/main.js"]