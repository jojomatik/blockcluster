FROM openjdk:17-alpine
RUN apk add --update nodejs npm
# Install http-server, concurrently and typescript.
RUN npm install -g http-server
RUN npm install -g concurrently
RUN npm install -g typescript
# Set working directory.
WORKDIR /usr/games/minecraft
# Copy package.json and package-lock.json for frontend and backend and install dependencies, before copying the rest. This is more efficient as only changes to these files require a new npm install.
COPY package*.json ./
RUN npm install
COPY server/package*.json ./server/
RUN cd server && npm install
# Create servers directory to prevent errors.
RUN mkdir servers
# Copy app source.
COPY . .
# Build frontend.
RUN npm run build
# Compile backend.
RUN cd server && tsc
EXPOSE 8080
EXPOSE 3001
CMD ["concurrently", "\"http-server dist -p 8080\"", "\"cd server && node dist/server/src/server.js\""]