import { Todo } from "./interfaces";

const express = require("express");
const cors = require("cors");
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const { jwtAuthz, is } = require("express-jwt-aserto");
const { getUserByUserSub } = require("./directory");

const { initDb, getTodos, insertTodo, updateTodo, deleteTodo } = require("./store");

const authzOptions = {
  authorizerServiceUrl: process.env.AUTHORIZER_SERVICE_URL,
  policyId: process.env.POLICY_ID,
  policyRoot: process.env.POLICY_ROOT,
  authorizerApiKey: process.env.AUTHORIZER_API_KEY,
  tenantId: process.env.TENANT_ID,
};

//Aserto authorizer middleware function
const checkAuthz = jwtAuthz(authzOptions);

const checkJwt = jwt({
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

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3001;

//Users cache
const users = {};

app.get("/user/:sub", checkJwt, checkAuthz, async (req, res) => {
  const { sub } = req.params;
  const user = users[sub] ? users[sub] : await getUserByUserSub(sub);
  users[sub] = user;
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
    res.json({msg: "Todo created"});
  } catch (error){
    res.status(500).send(error);
  }
});

app.put(
  "/todo",
  checkJwt,
  async (req, res, next) => {
    try {
      const allowed = await is(
        "allowed",
        req,
        {
          ...authzOptions,
        },
        "todo.PUT.todo",
        {
          ownerEmail: req.body.UserEmail,
        }
      );
      if (allowed) {
        next();
      } else {
        res.status(403).send("Unauthorized");
      }
    } catch (e) {
      res.status(500).send(e.message);
    }
  },
  async (req, res) => {
    const todo: Todo = req.body;
    try {
      await updateTodo(todo);
      res.json({msg: "Todo updated"});
    } catch ( error ) {
      res.status(500).send( error);
    }
  }
);

app.delete(
  "/todo",
  checkJwt,
  async (req, res, next) => {
    try {
      const allowed = await is(
        "allowed",
        req,
        {
          ...authzOptions,
        },
        "todo.DELETE.todo",
        {
          ownerEmail: req.body.UserEmail,
        }
      );
      if (allowed) {
        next();
      } else {
        res.status(403).send("Unauthorized");
      }
    } catch (e) {
      res.status(500).send(e.message);
    }
  },
  async (req, res) => {
    const todo: Todo = req.body;
    try{
      deleteTodo(todo);
      res.json({msg: "Todo deleted"});
    } catch (e){
      res.status(500).send(e);
    }
  }
);

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
  });
})


