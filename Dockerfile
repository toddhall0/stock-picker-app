FROM node:20-alpine AS builder

WORKDIR /app

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Install server dependencies and build
COPY server/package*.json ./server/
RUN cd server && npm ci

COPY server/ ./server/
RUN cd server && npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app/server

COPY --from=builder /app/server/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/public ./public

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
