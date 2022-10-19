import { Todo } from "./interfaces";

import express = require("express");
import cors = require("cors");
import jwt = require("express-jwt");
import jwksRsa = require("jwks-rsa");
// import aserto = require("express-jwt-aserto");
import { getUserByUserID } from "./directory";
import { initDb, getTodos, insertTodo, updateTodo, deleteTodo } from "./store";
import { UserCache, User } from "./interfaces";
import * as dotenv from "dotenv";

dotenv.config();
// const { jwtAuthz } = aserto;

import { is, jwtAuthz } from "aserto-node";

const authzOptions = {
  authorizerServiceUrl: process.env.ASERTO_AUTHORIZER_SERVICE_URL,
  policyName: process.env.ASERTO_POLICY_NAME,
  policyRoot: process.env.ASERTO_POLICY_ROOT,
  authorizerApiKey: process.env.ASERTO_AUTHORIZER_API_KEY,
  tenantId: process.env.ASERTO_TENANT_ID,
  authorizerCertCAFile: process.env.CA_FILE,
};

//Aserto authorizer middleware function
const checkAuthz: express.Handler = jwtAuthz(authzOptions);

const checkJwt: jwt.RequestHandler = jwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URI,
  }),

  // Validate the audience and the issuer
  audience: process.env.AUDIENCE,
  issuer: process.env.ISSUER,
  algorithms: ["RS256"],
});

const app: express.Application = express();
app.use(express.json());
app.use(cors());

const PORT = 3001;

app.get("/", checkJwt, async (req, res) => {
  // const allowed = "wow";
  // console.log("IS", is);
  const allowed = await is(
    "allowed",
    req,
    authzOptions,
    "todoApp.GET.todos",
    {}
  );
  res.send(`result is ${allowed}`);
});

//Users cache
const users: UserCache = {};
app.get("/user/:userID", checkJwt, checkAuthz, async (req, res) => {
  const { userID } = req.params;
  const user: User = users[userID]
    ? users[userID]
    : await getUserByUserID(userID);

  //Fill cache
  users[userID] = user;
  res.json(user);
});

app.get("/todos", checkJwt, checkAuthz, async (req, res) => {
  try {
    const todos: Todo[] = await getTodos();
    res.json(todos);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/todo", checkJwt, checkAuthz, async (req, res) => {
  const todo: Todo = req.body;
  try {
    await insertTodo(todo);
    res.json({ msg: "Todo created" });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put("/todo/:ownerID", checkJwt, checkAuthz, async (req, res) => {
  const todo: Todo = req.body;
  try {
    await updateTodo(todo);
    res.json({ msg: "Todo updated" });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.delete("/todo/:ownerID", checkJwt, checkAuthz, async (req, res) => {
  const todo: Todo = req.body;
  try {
    deleteTodo(todo);
    res.json({ msg: "Todo deleted" });
  } catch (e) {
    res.status(500).send(e);
  }
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
  });
});
