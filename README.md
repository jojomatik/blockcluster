# blockcluster [![Docker CI](https://github.com/jojomatik/blockcluster/actions/workflows/docker_ci.yml/badge.svg)](https://github.com/jojomatik/blockcluster/actions/workflows/docker_ci.yml)

An in-browser manager for your minecraft servers.

## Features
- Start and stop servers
- View current status
- View console log and send commands
- Change start flags
- Start servers with backend

## Roadmap for future releases
- Authentication
- Show resource usage
- Create servers and download server jars

## Project setup with Docker (recommended)
### Compiles and hot-reloads for development
```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Compiles and minifies for production and starts production
```
docker-compose -f docker-compose.yml up
```

## Project setup (manual)
```
npm run install_all
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build_all
```

### Start production
```
npm run start
```

### Run your unit tests
```
npm run test:unit
```

### Lints and fixes files
```
npm run lint
```
