FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN echo "Before: corepack version => $(corepack --version || echo 'not installed')" && \
    npm install -g corepack@latest && \
    echo "After: corepack version => $(corepack --version || echo 'not installed')" && \
    corepack enable && \
    corepack prepare pnpm@10.7.0 --activate && \ 
    pnpm --version
WORKDIR /app
COPY . .
COPY .env.production .env.production
RUN chown -R node:node /app
USER node

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile && \
    pnpm run build

# Final stage
FROM node:20-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN echo "Before: corepack version => $(corepack --version || echo 'not installed')" && \
    npm install -g corepack@latest && \
    echo "After: corepack version => $(corepack --version || echo 'not installed')" && \
    corepack enable && \
    corepack prepare pnpm@10.7.0 --activate && \ 
    pnpm --version
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY .env.production .env.production
COPY package.json ./
USER node
EXPOSE 3000
ENV NODE_ENV=production
CMD ["pnpm", "run", "start"]
