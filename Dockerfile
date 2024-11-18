FROM node:18-alpine AS development
WORKDIR /usr/src/app/jarvis

# Install pnpm globally and necessary build dependencies
RUN apk add --no-cache libc6-compat python3 make g++ && \
    npm install -g pnpm

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install

# Copy rest of the files
COPY . .

# Build the application
RUN pnpm run build

FROM node:18-alpine AS production
WORKDIR /usr/src/app/jarvis

# Install pnpm globally and minimal runtime dependencies
RUN apk add --no-cache libc6-compat && \
    npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod

# Copy built files from development stage
COPY --from=development /usr/src/app/jarvis/dist ./dist
COPY service-account.json ./

# Set NODE_ENV
ENV NODE_ENV=prod

CMD ["node", "dist/main.js"]