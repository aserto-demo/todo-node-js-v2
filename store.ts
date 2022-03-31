import { Todo } from "./interfaces";

const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("database.db");

export const initDb: () => Promise<void> = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.prepare(
        `CREATE TABLE IF NOT EXISTS todos (
          ID TEXT PRIMARY KEY,
          Title TEXT NOT NULL,
          Completed BOOLEAN NOT NULL,
          UserEmail TEXT NOT NULL,
          UserSub TEXT NOT NULL
      );`
      )
        .run()
        .finalize();
    });
    resolve()
  })
}

export const getTodos: () => Promise<Todo[]> = async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM todos", function (err: any, result: any) {
      err ? reject(err) : result ? resolve(result) : resolve([]);
    });
  });
};

export const insertTodo: (Todo) => Promise<void> = async (todo: Todo) => {
  return new Promise((resolve, reject) => {
    const { ID, Title, Completed, UserEmail, UserSub } = todo;
    db.run(
      "INSERT INTO todos VALUES ($id, $title, $completed, $userEmail, $userSub)",
      {
        $id: ID,
        $title: Title,
        $completed: Completed ? 1 : 0,
        $userEmail: UserEmail,
        $userSub: UserSub,
      },
      function (err) {
        err ? reject(err) : resolve();
      }
    );
  });
}

export const updateTodo: (Todo) => Promise<void> = async (todo: Todo) => {
  return new Promise((resolve, reject) => {
    const { ID, Title, Completed, UserEmail, UserSub } = todo;
    db.run(
      "UPDATE todos SET Title=?, Completed=?, UserEmail=?, UserSub=? WHERE ID=?",
      [Title, Completed, UserEmail, UserSub, ID],
      function (err, result) {
        err ? reject(err) : resolve();
      }
    );
  })
}

export const deleteTodo: (Todo) => Promise<void> = async (todo: Todo) => {
  return new Promise((resolve, reject) => {
    const { ID } = todo;
    db.run(
      "DELETE FROM todos WHERE ID=$id",
      {
        $id: ID,
      },
      function (err) {
        err ? reject(err) : resolve();
      }
    );
  })
}
