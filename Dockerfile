FROM openjdk:17-alpine
RUN apk add --update nodejs npm
# Install http-server, concurrently and typescript.
RUN npm install -g http-server
RUN npm install -g concurrently
RUN npm install -g typescript
RUN npm install -g nodemon
# Set working directory.
WORKDIR /usr/games/minecraft
# Copy package.json and package-lock.json for frontend, backend and proxy and install dependencies, before copying the rest. This is more efficient as only changes to these files require a new npm install.
COPY package*.json ./
RUN npm install
COPY server/package*.json ./server/
RUN cd server && npm install
COPY proxy/package*.json ./proxy/
RUN cd proxy && npm install
# Create servers directory to prevent errors.
RUN mkdir servers
# Copy app source.
COPY common ./common/
COPY src ./src/
COPY server ./server/
COPY proxy ./proxy/
# Copy compilation config files.
COPY .eslintrc.js babel.config.js tsconfig.json ./
# Build frontend.
RUN npm run build
# Compile backend and proxy.
RUN cd server && tsc
RUN cd proxy && tsc
EXPOSE 80
CMD ["npm", "run", "start"]