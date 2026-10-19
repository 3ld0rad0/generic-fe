FROM node:22-bookworm-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN useradd --uid 1000 --no-create-home app
WORKDIR /app/server
COPY server/requirements.txt ./
RUN pip install -r requirements.txt
COPY server/app ./app
COPY --from=client /app/client/dist /app/client/dist
ENV DB_PATH=/data/paintball.db
VOLUME /data
EXPOSE 3000
USER app
CMD ["uvicorn", "app.main:create_default_app", "--factory", "--host", "0.0.0.0", "--port", "3000", "--proxy-headers", "--forwarded-allow-ips", "*"]
