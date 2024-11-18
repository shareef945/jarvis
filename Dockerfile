FROM node:18-alpine AS development
WORKDIR /usr/src/app/jarvis

# Install pnpm globally and necessary build dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && npm install -g pnpm

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

# Install pnpm globally and necessary dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies with node-gyp configuration
RUN PYTHON=/usr/bin/python3 \
    pnpm install --prod \
    --build-from-source \
    --target_arch=arm64 \
    --target_platform=linux

# Copy built files from development stage
COPY --from=development /usr/src/app/jarvis/dist ./dist
COPY service-account.json ./

CMD ["node", "dist/main.js"]