FROM node:18-alpine AS development
WORKDIR /usr/src/app/jarvis

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies with specific platform settings
RUN pnpm install --no-optional

# Copy rest of the files
COPY . .

# Build the application
RUN pnpm run build

FROM node:18-alpine AS production
WORKDIR /usr/src/app/jarvis

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies with platform settings
RUN apk add --no-cache libc6-compat && \
    pnpm install --prod --no-optional

# Copy built files from development stage
COPY --from=development /usr/src/app/jarvis/dist ./dist
COPY service-account.json ./

CMD ["node", "dist/main.js"]