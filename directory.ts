import { User } from "./interfaces";
import {
  ds,
  Directory as DirectoryClient,
  ServiceConfig,
} from "@aserto/aserto-node";

export class Directory {
  client: DirectoryClient;

  constructor(config: ServiceConfig) {
    const url = config.url ?? process.env.ASERTO_DIRECTORY_SERVICE_URL;
    const tenantId = config.tenantId ?? process.env.ASERTO_TENANT_ID;
    const apiKey = config.apiKey ?? process.env.ASERTO_DIRECTORY_API_KEY;
    let rejectUnauthorized = config.rejectUnauthorized

    if (rejectUnauthorized === undefined) {
      rejectUnauthorized = process.env.ASERTO_DIRECTORY_REJECT_UNAUTHORIZED === "true"
    }

    this.client = ds({
      url,
      tenantId,
      apiKey,
      rejectUnauthorized,
    });
  }

  async getUserByIdentity(identity: string): Promise<User> {
    const relation = await this.client.relation(
      {
        subject: {
          type: 'user',
        },
        object: {
          type: 'identity',
          key: identity
        },
        relation: {
          name: 'identifier',
          objectType: 'identity'
        }
      }
    )
    if (!relation || relation.length === 0) {
      throw new Error(`No relations found for identity ${identity}`, )
    }

    const user = await this.client.object(relation[0].subject);
    const { email, picture } = JSON.parse(user.properties.toJsonString());
    return {
      key: user.key,
      name: user.displayName,
      email,
      picture,
    };
  }

  async getUserByKey(key: string): Promise<User> {
    const user = await this.client.object({key: key, type: 'user'});
    const { email, picture } = JSON.parse(user.properties.toJsonString());
    return {
      key: user.key,
      name: user.displayName,
      email,
      picture,
    };
  }
}
