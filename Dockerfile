# Stage 1: install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# Stage 2: build Next.js
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Stage 3: production image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
RUN npm install --omit=dev
EXPOSE 3000
CMD ["node", "server.js"]
