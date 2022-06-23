import { Todo } from "./interfaces";
import sqlite3 = require("sqlite3");

const db = new sqlite3.Database("./todo.db");

export const initDb: () => Promise<void> = async () => {
  return new Promise((resolve, reject) => {
    try {
      db.serialize(() => {
        db.prepare(
          `CREATE TABLE IF NOT EXISTS todos (
          ID TEXT PRIMARY KEY,
          Title TEXT NOT NULL,
          Completed BOOLEAN NOT NULL,
          OwnerID TEXT NOT NULL
      );`
        )
          .run()
          .finalize();
      });
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

export const getTodos: () => Promise<Todo[]> = async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM todos", function (err: Error, result: Todo[]) {
      err ? reject(err) : result ? resolve(result) : resolve([]);
    });
  });
};

export const insertTodo: (Todo) => Promise<void> = async (todo: Todo) => {
  return new Promise((resolve, reject) => {
    const { ID, Title, Completed, OwnerID } = todo;
    db.run(
      "INSERT INTO todos VALUES ($id, $title, $completed, $ownerID)",
      {
        $id: ID,
        $title: Title,
        $completed: Completed ? 1 : 0,
        $ownerID: OwnerID,
      },
      function (err: Error) {
        err ? reject(err) : resolve();
      }
    );
  });
};

export const updateTodo: (Todo) => Promise<void> = async (todo: Todo) => {
  return new Promise((resolve, reject) => {
    const { ID, Title, Completed, OwnerID } = todo;
    db.run(
      "UPDATE todos SET Title=?, Completed=?, OwnerID=? WHERE ID=?",
      [Title, Completed, OwnerID, ID],
      function (err: Error) {
        err ? reject(err) : resolve();
      }
    );
  });
};

export const deleteTodo: (Todo) => Promise<void> = async (todo: Todo) => {
  return new Promise((resolve, reject) => {
    const { ID } = todo;
    db.run(
      "DELETE FROM todos WHERE ID=$id",
      {
        $id: ID,
      },
      function (err: Error) {
        err ? reject(err) : resolve();
      }
    );
  });
};
