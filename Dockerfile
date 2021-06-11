ARG ENVIRONMENT=production

FROM node AS builder
# Install typescript.
RUN npm install -g typescript
# Set working directory.
WORKDIR /usr/games/minecraft
# Copy package.json and package-lock.json for frontend and backend and install dependencies, before copying the rest. This is more efficient as only changes to these files require a new npm install.
COPY package*.json ./
RUN npm install
COPY backend/package*.json ./backend/
RUN cd backend && npm install
# Copy app source.
COPY common ./common/
COPY public ./public/
COPY src ./src/
# Copy compilation config files.
COPY .eslintrc.js babel.config.js tsconfig.json ./
# Build frontend.
RUN npm run build
# Copy backend src and compile.
COPY backend ./backend/
RUN cd backend && tsc

FROM adoptopenjdk/openjdk15:alpine-jre AS base
RUN apk add --update nodejs npm
# Install concurrently.
RUN npm install -g concurrently
# Set working directory.
WORKDIR /usr/games/minecraft
# Create servers directory to prevent errors.
RUN mkdir servers

FROM base AS base-production
# Copy package.json and package-lock.json for frontend and install production dependencies.
COPY package*.json ./
RUN npm install --only=prod

FROM base AS base-develop
# Copy package.json and package-lock.json for frontend and install all dependencies.
COPY package*.json ./
RUN npm install
COPY .eslintrc.js babel.config.js tsconfig.json vue.config.js ./

FROM base-${ENVIRONMENT}
# Copy package.json and package-lock.json for backend and proxy and install production dependencies.
COPY backend/package*.json ./backend/
RUN cd backend && npm install --only=prod

COPY backend/settings.properties backend/settings.properties
COPY --from=builder /usr/games/minecraft/dist dist
COPY --from=builder /usr/games/minecraft/backend/dist backend/dist

# Add group and user
RUN addgroup -S blockcluster -g 1080 && adduser -S blockcluster -G blockcluster -u 1080
USER blockcluster

EXPOSE 8081
CMD ["npm", "run", "start"]