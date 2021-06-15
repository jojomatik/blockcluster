# blockcluster 
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/jojomatik/blockcluster?sort=semver)](https://github.com/jojomatik/blockcluster/releases) [![GitHub](https://img.shields.io/github/license/jojomatik/blockcluster)](LICENSE) [![Build and publish Docker image](https://github.com/jojomatik/blockcluster/actions/workflows/publish.yml/badge.svg)](https://github.com/jojomatik/blockcluster/actions/workflows/publish.yml) [![Docker Image Version (latest semver)](https://img.shields.io/docker/v/jojomatik/blockcluster?label=Docker%20Hub%20image&sort=semver)](https://hub.docker.com/r/jojomatik/blockcluster) [![Docker Pulls](https://img.shields.io/docker/pulls/jojomatik/blockcluster)](https://hub.docker.com/r/jojomatik/blockcluster)

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

## Setup 
### Setup with docker (recommended)
Prerequisites:
- Docker

Customize `/path/to/servers/on/host/machine` and the port directives `-p port:port` to your liking and run:
```sh
docker run -d -v /path/to/servers/on/host/machine:/usr/games/blockcluster/servers -p 8081:8081 25565-25569:25565-25569 jojomatik/blockcluster:latest
```
Open `http://[your ip]:8081` in your browser.

### Setup with `docker-compose` (also recommended)
Prerequisites:
- Docker
- Docker Compose

Download [`docker-compose.yml`](docker-compose.yml) and customize it to your liking and add a volume mount to your servers on the host machine. E.g.:
```
version: "3.9"
services:
  manager:
    ports:
      - 8081:8081
      - 25565:25565
    image: jojomatik/blockcluster
    volumes:
      - /path/to/servers/on/host/machine:/usr/games/blockcluster/servers
```

Then run the following command:
```sh
docker-compose up
```
Open `http://[your ip]:8081` in your browser.

### Manual setup 
Prerequisites:
- Git
- Node.js and npm
- TypeScript installed globally (`npm install -g typescript`)

1. First build the app using the instructions from ["Building manually"](#building-manually).
2. Create the `servers/` subdirectory and move your servers into it.
3. Run `npm run start` and open `http://[your ip]:8081` in your browser.


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

## Licensing
This project is licensed under the GNU Affero General Public License v3.0 (AGPL 3.0) or later. See also [`LICENSE`](LICENSE).
