# blockcluster [![Build and publish Docker image](https://github.com/jojomatik/blockcluster/actions/workflows/publish.yml/badge.svg)](https://github.com/jojomatik/blockcluster/actions/workflows/publish.yml)

An in-browser manager for your minecraft servers.

## Features
- Start and stop servers
- View current status
- Show resource usage
- View console log and send commands
- Change start flags
- Start servers with backend

## Roadmap for future releases
- Authentication
- Create servers and download server jars

## Building
### Building with `docker-compose` (recommended)
Prerequisites:
- Git
- Docker
- Docker Compose

Run the following commands:
```sh
git clone https://github.com/jojomatik/blockcluster
cd blockcluster
```

**To build for production**, run the following command:
```sh
docker-compose up
```
Open `http://[your ip]:8081` in your browser.

**To enable hot reloads**, configure a file watcher for the TypeScript files in the `backend/src` directory to run `tsc` in the `backend` directory and run the following command:
```sh
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```
Open `http://[your ip]:8081` in your browser.

To make sure that the container is recreated and the image rebuilt, use either command with additional options, e.g.:
```sh
docker-compose up --force-recreate --build
```

### Building manually
Prerequisites:
- Git
- Node.js and npm
- TypeScript installed globally (`npm install -g typescript`)

Run the following commands:
```sh
git clone https://github.com/jojomatik/blockcluster
cd blockcluster
npm install_all
```

**To build for production**, run the following commands:
```sh
npm run build_all
npm run start
```
Open `http://[your ip]:8081` in your browser.


**To enable hot reloads**, configure a file watcher for the TypeScript files in the `backend/src` directory to run `tsc` in the `backend` directory and run the following command:
```sh
npm run serve
```
Open `http://[your ip]:8081` in your browser.
