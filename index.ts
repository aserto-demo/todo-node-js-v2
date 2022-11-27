import { Todo } from "./interfaces";

import express = require("express");
import cors = require("cors");
import jwt = require("express-jwt");
import jwksRsa = require("jwks-rsa");
import { getUserByUserID } from "./directory";
import { initDb, getTodos, getTodo, insertTodo, updateTodo, deleteTodo } from "./store";
import { UserCache, User } from "./interfaces";
import * as dotenv from "dotenv";

dotenv.config();

import { jwtAuthz, is } from "@aserto/aserto-node";
import { getConfig } from "./config";

const authzOptions = getConfig();

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

//Users cache
const users: UserCache = {};

// use checkAuthz middleware to authorize the operation
app.get("/user/:userID", checkJwt, checkAuthz, async (req, res) => {
  const { userID } = req.params;
  const user: User = users[userID]
    ? users[userID]
    : await getUserByUserID(userID);

  //Fill cache
  users[userID] = user;
  res.json(user);
});

// use checkAuthz middleware to authorize the operation
app.get("/todos", checkJwt, checkAuthz, async (req, res) => {
  try {
    const todos: Todo[] = await getTodos();
    res.json(todos);
  } catch (error) {
    res.status(500).send(error);
  }
});

// use checkAuthz middleware to authorize the operation
app.post("/todo", checkJwt, checkAuthz, async (req, res) => {
  const todo: Todo = req.body;
  try {
    await insertTodo(todo);
    res.json({ msg: "Todo created" });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put("/todo/:ownerID", checkJwt, async (req, res) => {
  const body: Todo = req.body;
  try {
    // retrieve todo from db, and overwrite updateable properties with incoming payload
    const todo = await getTodo(body);
    todo.Completed = body.Completed;
    todo.Title = body.Title;

    // call authorizer to determine whether operation is allowed
    // resource context is passed in as the OwnerID of the todo in the database
    if (await is("allowed", req, authzOptions, null, { ownerID: todo.OwnerID })) {
      await updateTodo(todo);
      res.json({ msg: "Todo updated" });
    } else {
      res.status(403).send({ "msg": "not allowed" })
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.delete("/todo/:ownerID", checkJwt, async (req, res) => {
  const body: Todo = req.body;
  try {
    // retrieve todo from db via ID in incoming payload
    const todo = await getTodo(body);

    // call authorizer to determine whether operation is allowed
    // resource context is passed in as the OwnerID of the todo in the database
    if (await is("allowed", req, authzOptions, null, { ownerID: todo.OwnerID })) {
      await deleteTodo(todo);
      res.json({ msg: "Todo deleted" });
    } else {
      res.status(403).send({ "message": "not allowed" })
    }
  } catch (e) {
    res.status(500).send(e);
  }
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
  });
});
