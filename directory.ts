import { User, Todo } from "./interfaces";
import {
  DirectoryV3 as DirectoryClient,
  DirectoryV3Config,
  DirectoryServiceV3,
  UserPropertiesSchema,
  fromJson,
  GetRelationResponse,
  NotFoundError,
} from "@aserto/aserto-node";

export class Directory {
  client: DirectoryClient;

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
  }

  /**
   * Retrieves a user by their identity.
   *
   * This method fetches the user details based on the provided identity. It handles different scenarios
   * based on the `LEGACY_IDENTITIES` environment variable. If `LEGACY_IDENTITIES` is set to 'false',
   * it fetches the relation with the user as the object and identity as the subject. If set to 'true',
   * it fetches the relation with the identity as the object and user as the subject. If the environment
   * variable is not set, it tries to fetch the relation with the identity as the object and user as the
   * subject, and if not found, it fetches the relation with the user as the object and identity as the subject.
   *
   * @param identity - The identity string to search for.
   * @returns A promise that resolves to a User object containing the user's details.
   * @throws Will throw an error if no relations are found for the provided identity or if any other error occurs.
   */
  async getUserByIdentity(identity: string): Promise<User> {
    const legacyIdentities = process.env.LEGACY_IDENTITIES;
    let relation: GetRelationResponse;

    const getRelation = async ({ objectType, subjectType, id }: { objectType: string, subjectType: string, id: string }) => {
      return await this.client.relation({
        objectType,
        subjectType,
        [objectType === "identity" ? "objectId" : "subjectId"]: id,
        relation: 'identifier',
      });
    };


    if (legacyIdentities === 'false') {
      relation = await getRelation({ objectType: "user", subjectType: "identity", id: identity });
    } else if (legacyIdentities === 'true') {
      relation = await getRelation({ objectType: "identity", subjectType: "user", id: identity });
    } else {
      try {
        relation = await getRelation({ objectType: "identity", subjectType: "user", id: identity });
      } catch (error) {
        if (error instanceof NotFoundError) {
          relation = await getRelation({ objectType: "user", subjectType: "identity", id: identity });
        } else {
          throw error;
        }
      }
    }

    if (!relation || !relation.result) {
      throw new Error(`No relations found for identity ${identity}`);
    }

    const user = (await this.client.object({
      objectId: relation.result.subjectId,
      objectType: relation.result.subjectType,
    })).result;
    const { email, picture } = fromJson(UserPropertiesSchema, user.properties, {
      ignoreUnknownFields: true
    })
    return {
      id: user.id,
      name: user.displayName,
      email: email,
      picture: picture,
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = (await this.client.object({ objectId: id, objectType: "user" })).result;
    const { email, picture } = fromJson(UserPropertiesSchema, user.properties, {
      ignoreUnknownFields: true
    })
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
