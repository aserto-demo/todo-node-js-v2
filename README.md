# Node.JS

## Setup

### Install dependencies
To install the application dependencies, run the following command:
```
yarn
```

### Set up the `.env` file
Rename the `.env.example` file to `.env` and update the `CA_FILE` path to correspond to the path in which Topaz generated your certificates (by default this path will be `~/.config/topaz/certs/grpc-ca.crt`).

```
ASERTO_POLICY_ROOT="todoApp"
ASERTO_AUTHORIZER_SERVICE_URL=localhost:8282

JWKS_URI=https://citadel.demo.aserto.com/dex/keys
ISSUER=https://citadel.demo.aserto.com/dex
AUDIENCE=citadel-app

CA_FILE=<PATH_TO_CERTIFICATES>/certs/grpc-ca.crt
```

## Start the server
```
yarn start
```
