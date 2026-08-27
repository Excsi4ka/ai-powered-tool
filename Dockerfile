# Build the HireLens AI backend.
FROM node:20-alpine AS build

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend ./
RUN npm run build

# Run only the backend and production dependencies.
FROM node:20-alpine AS production

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/public ./public
COPY backend/database ./database
COPY --from=build /app/backend/dist ./dist

EXPOSE 5000

CMD ["npm", "start"]
