FROM node:lts

WORKDIR /usr/src/app

# Create directory for credentials
RUN mkdir -p /usr/src/app/credentials

RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm @nestjs/cli
COPY package.json pnpm-lock.yaml ./
ENV PYTHON=/usr/bin/python3
RUN pnpm install
COPY . .
RUN pnpm run build
RUN pnpm install --prod
EXPOSE 3000

CMD ["node", "dist/main.js"]