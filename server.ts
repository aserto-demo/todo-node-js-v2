import { v4 as uuidv4 } from "uuid";
import { Request as JWTRequest } from "express-jwt";
import { Response } from "express";
import { Todo } from "./interfaces";
import { Store } from "./store";
import { Directory } from "./directory";

export class Server {
  store: Store;
  directory: Directory;

  constructor(store: Store) {
    this.store = store;
    this.directory = new Directory({});
  }

  async list(_: Request, res: Response) {
    const todos = await this.store.list();
    res.json(todos);
  }

  async create(req: JWTRequest, res: Response) {
    const todo: Todo = req.body;
    todo.ID = uuidv4();
    const user = await this.directory.getUserByUserID(req.auth.sub);
    todo.OwnerID = user.key

    await this.store.insert(todo);
    res.json({ msg: "Todo created" });
  }

  async update(req: JWTRequest, res: Response) {
    const todo: Todo = req.body;
    todo.ID = req.params.id;

    await this.store.update(todo);
    res.json({ msg: "Todo updated" });
  }

  async delete(req: JWTRequest, res: Response) {
    await this.store.delete(req.params.id);
    res.json({ msg: "Todo deleted" });
  }
}
