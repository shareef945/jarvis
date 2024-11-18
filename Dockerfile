FROM node:lts

WORKDIR /usr/src/app

# Install Python and build dependencies
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with Python path specified
RUN pnpm install --prod --python=/usr/bin/python3

# Copy application files
COPY . .

# Build the application
RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]