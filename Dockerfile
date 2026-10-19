FROM node:22-bookworm-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/src ./src
COPY --from=client /app/client/dist /app/client/dist
ENV DB_PATH=/data/paintball.db PORT=3000
VOLUME /data
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
