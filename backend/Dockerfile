FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY src/ ./src/
RUN bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
