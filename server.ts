import { v4 as uuidv4 } from "uuid";
import { Request as JWTRequest } from "express-jwt";
import { Response } from "express";
import { Todo, User } from "./interfaces";
import { Store } from "./store";
import { Directory } from "./directory";

export class Server {
  store: Store;
  directory: Directory;
  isLegacy: Promise<boolean>

  constructor(store: Store) {
    this.store = store;
    this.directory = new Directory({});
    this.isLegacy = this.directory.isLegacy()
  }

  async list(_: Request, res: Response) {
    const todos = await this.store.list();
    res.json(todos);
  }

  async create(req: JWTRequest, res: Response) {
    let user: User
    const todo: Todo = req.body;
    todo.ID = uuidv4();
    try {
      if (await this.isLegacy) {
        user = await this.directory.getUserByLegacyIdentity(req.auth.sub);
      } else {
        user = await this.directory.getUserByIdentity(req.auth.sub);
      }

      todo.OwnerID = user.id;

      await this.store.insert(todo);
      await this.directory.insertTodo(todo);
      res.json({ msg: "Todo created" });
    } catch (error) {
      res.status(422).send({ error: (error as Error).message })
    }
  }

  async update(req: JWTRequest, res: Response) {
    const todo: Todo = req.body;
    todo.ID = req.params.id;

    await this.store.update(todo);
    res.json({ msg: "Todo updated" });
  }

  async delete(req: JWTRequest, res: Response) {
    await this.store.delete(req.params.id);
    await this.directory.deleteTodo(req.params.id);
    res.json({ msg: "Todo deleted" });
  }
}
