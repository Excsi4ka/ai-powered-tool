# Build the React client into static files that Express can serve.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY client ./client
COPY vite.config.js ./
RUN npm run build

# Run only the Express server and production dependencies.
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 5000

CMD ["npm", "start"]
