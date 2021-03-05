# minecraft-server-manager

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
npm install
cd server && npm install
cd proxy && npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
cd server && tsc
cd proxy && tsc
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

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
