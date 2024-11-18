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

# Set Python path and install dependencies
ENV PYTHON=/usr/bin/python3
RUN pnpm install --prod

# Copy application files
COPY . .

# Build the application
RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]