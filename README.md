## Description
API for Sphene.

## Installation

### Prerequisites
1. MongoDB 3.4+ (and/or [Compass](https://www.mongodb.com/try/download/community))
2. Add `.env` (see [.env.example](https://github.com/sbsrnt/api-sphene/blob/master/.env.example))

### Dependencies
```bash
$ yarn
```

## Running the app

### Commands
```bash
# development
$ yarn dev

# watch mode
$ yarn start:dev

# production mode
$ yarn start:prod
```

## Code Quality
```bash
# eslint
$ yarn lint

# prettier
$ yarn format
```

## Test
Currently 94.54% coverage.
```bash
# e2e tests
$ yarn test

# test coverage
$ yarn test:cov
```

### DB Seeding
```bash
# Drop database
$ yarn schema:drop

# Seed database
$ yarn seed:run
```

## Stay in touch

- Author - [Sebastian Krzyżanowski](https://sebastian-krzyzanowski.dev)


