import { User, Todo } from "./interfaces";
import {
  DirectoryV3 as DirectoryClient,
  DirectoryV3Config,
  DirectoryServiceV3,
  UserPropertiesSchema,
  fromJson,
  InvalidArgumentError,
  NotFoundError,
} from "@aserto/aserto-node";

export class Directory {
  client: DirectoryClient;
  isLegacy: Promise<boolean>;

  constructor(config: DirectoryV3Config) {
    const url = config.url ?? process.env.ASERTO_DIRECTORY_SERVICE_URL;
    const tenantId = config.tenantId ?? process.env.ASERTO_TENANT_ID;
    const apiKey = config.apiKey ?? process.env.ASERTO_DIRECTORY_API_KEY;
    let rejectUnauthorized = config.rejectUnauthorized;
    const caFile =
      config.caFile ??
      (process.env.ASERTO_DIRECTORY_CERT_PATH ||
        process.env.ASERTO_GRPC_CA_CERT_PATH);

    if (rejectUnauthorized === undefined) {
      rejectUnauthorized =
        process.env.ASERTO_DIRECTORY_REJECT_UNAUTHORIZED === "true";
    }

    this.client = DirectoryServiceV3({
      url,
      tenantId,
      apiKey,
      rejectUnauthorized,
      caFile: caFile,
    });

    this.isLegacy = isLegacy(this.client)
  }


  private async getUserByLegacyIdentity(identity: string): Promise<User> {
    try {
      const relation = await this.client.relation({
        subjectType: "user",
        objectType: "identity",
        objectId: identity,
        relation: "identifier",
        withObjects: true,
      });

      const userID = relation.result.subjectId
      const user = relation.objects[`user:${userID}`]

      const { email, picture } = fromJson(
        UserPropertiesSchema,
        user.properties,
        { ignoreUnknownFields: true }
      )

      return {
        id: user.id,
        name: user.displayName,
        email: email,
        picture: picture,
      };
    } catch (e) {
      if (e instanceof NotFoundError) {
        console.error(e);
        return
      }
      throw e
    }

  }

  async getUserByIdentity(identity: string): Promise<User> {
    if (await this.isLegacy) {
      return this.getUserByLegacyIdentity(identity)
    }

    try {
      const relation = await this.client.relation({
        objectType: "user",
        subjectType: "identity",
        subjectId: identity,
        relation: "identifier",
        withObjects: true,
      });

      const userID = relation.result.objectId
      const user = relation.objects[`user:${userID}`]

      const { email, picture } = fromJson(
        UserPropertiesSchema,
        user.properties,
        { ignoreUnknownFields: true }
      )

      return {
        id: user.id,
        name: user.displayName,
        email: email,
        picture: picture,
      };
    } catch (e) {
      if (e instanceof NotFoundError) {
        console.error(e);
        return
      }
    }

  }

  async getUserById(id: string): Promise<User> {
    const user = (await this.client.object({ objectId: id, objectType: "user" })).result;
    const { email, picture } = fromJson(
      UserPropertiesSchema,
      user.properties,
      { ignoreUnknownFields: true }
    )

    return {
      id: user.id,
      name: user.displayName,
      email: email,
      picture: picture,
    };
  }

  async insertTodo(todo: Todo) {
    try {
      await this.client.setObject({
        object: {
          id: todo.ID,
          type: "resource",
          displayName: todo.Title,
        },
      });
      await this.client.setRelation({
        relation: {
          subjectId: todo.OwnerID,
          subjectType: "user",
          objectId: todo.ID,
          objectType: "resource",
          relation: "owner",
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  async deleteTodo(todoId: string) {
    try {
      await this.client.deleteObject({
        objectId: todoId,
        objectType: "resource",
        withRelations: true,
      });
    } catch (e) {
      console.error(e);
    }
  }
}


const isLegacy = async (dirClient: DirectoryClient): Promise<boolean> => {
  try {
    await dirClient.relation({
      objectType: "identity",
      objectId: "todoDemoIdentity",
      relation: "identifier",
      subjectType: "user",
      subjectId: "todoDemoUser"
    });
    return true;
  } catch (e) {
    if (e instanceof InvalidArgumentError) {
      // There is no identity#identifier relation. We're using new style identities.
      return false;
    }
    if (e instanceof NotFoundError) {
      // The relation doesn't exist but the types are valid. The model uses legacy
      // identities.
      return true;
    }
    throw e;
  }
}
