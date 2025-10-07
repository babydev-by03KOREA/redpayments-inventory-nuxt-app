# ---------- Build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

# 설치
COPY package*.json ./
RUN npm ci

# 소스 복사 후 빌드
COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0
# (선택) 서버 타임존
ENV TZ=Asia/Seoul

# 빌드 산출물만 복사
COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
