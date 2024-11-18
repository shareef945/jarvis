FROM node:lts

WORKDIR /usr/src/app

# Install Python and build dependencies
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm and NestJS CLI globally
RUN npm install -g pnpm @nestjs/cli

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Set Python path and install ALL dependencies (including dev dependencies)
ENV PYTHON=/usr/bin/python3
RUN pnpm install

# Copy application files
COPY . .

# Build the application
RUN pnpm run build

# Clean up dev dependencies after build
RUN pnpm install --prod

EXPOSE 3000

CMD ["node", "dist/main.js"]