FROM --platform=linux/amd64 node:20.11-alpine

WORKDIR /app

COPY . .

RUN npm install pnpm --global

RUN pnpm install

RUN pnpm run astro telemetry disable

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

CMD ["pnpm", "dev", "--host"]
