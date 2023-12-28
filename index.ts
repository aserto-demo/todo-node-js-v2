import express = require("express");
import cors = require("cors");
import { expressjwt as jwt, GetVerificationKey } from "express-jwt";
import jwksRsa = require("jwks-rsa");
import { Directory } from "./directory";
import { Store } from "./store";
import { Server } from "./server";
import { UserCache, User, Todo } from "./interfaces";
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";
import { Request as JWTRequest } from "express-jwt";



dotenvExpand.expand(dotenv.config());

import { Authorizer, Middleware, getSSLCredentials } from "@aserto/aserto-node";
import { getConfig } from "./config";

const authzOptions = getConfig();

const ssl = getSSLCredentials(authzOptions.authorizerCertCAFile)

const authClient = new Authorizer({
    authorizerServiceUrl: authzOptions.authorizerServiceUrl,
    authorizerApiKey: authzOptions.authorizerApiKey,
    tenantId: authzOptions.tenantId,
  }, ssl)

const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URI,
  }) as GetVerificationKey,

  // Validate the audience and the issuer
  audience: process.env.AUDIENCE,
  issuer: process.env.ISSUER,
  algorithms: ["RS256"],
});

const app: express.Application = express();
app.use(express.json());
app.use(cors());

const PORT = 3001;

Store.open().then((store) => {
  const server = new Server(store);

  // Aserto authorizer middleware
  const restMiddleware = new Middleware({
    client: authClient,
    policy: {
      name: authzOptions.instanceName,
      instanceLabel: authzOptions.instanceLabel,
      root: authzOptions.policyRoot,
    },
    resourceMapper: async (req: express.Request) => {
      if (!req.params?.id) {
        return {};
      }

      return { object_id: req.params.id };
    }
  });

  // Aserto check middleware
  const checkMiddleware = new Middleware({
    client: authClient,
    policy: {
      name: authzOptions.instanceName,
      instanceLabel: authzOptions.instanceLabel,
      root: 'rebac',
    }
  })

  const directory = new Directory({});

  // Users cache
  const users: UserCache = {};
  app.get("/users/:userID", checkJwt, restMiddleware.Authz(), async (req: JWTRequest, res) => {
    const { userID } = req.params;
    let user: User = users[userID]

    if(user){
      res.json(user);
      return
    }

    if(req.auth.sub === userID) {
      user =  await directory.getUserByIdentity(userID)
    } else {
      user =  await directory.getUserById(userID)
    }

    // Fill cache
    users[userID] = user;
    res.json(user);
  });

  // using restMiddleware.Authz() will dispatch to a custom policy module based on REST convention
  //   e.g. GET /todos -> todoApp.GET.todos
  app.get("/todos", checkJwt, restMiddleware.Authz(), server.list.bind(server));
  app.put("/todos/:id", checkJwt, restMiddleware.Authz(), server.update.bind(server));
  app.delete("/todos/:id", checkJwt, restMiddleware.Authz(), server.delete.bind(server));

  // commenting out the REST convention middleware to demonstrate the use of the Check middleware
  // app.post("/todos", checkJwt, middleware.Authz(), server.create.bind(server));

  // using checkMiddleware.Check() will dispatch to the "standard" rebac.check module
  // the Check below will check whether the user is a member of the resource-creators instance
  app.post("/todos",
    checkJwt,
    checkMiddleware.Check({
      objectType: 'resource-creator',
      objectId: 'resource-creators',
      relation: 'member'
    }),
    server.create.bind(server));

  app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
  });
});
