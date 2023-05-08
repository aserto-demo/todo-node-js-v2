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
    const rejectUnauthorized = config.rejectUnauthorized ?? !!process.env.ASERTO_DIRECTORY_REJECT_UNAUTHORIZED;

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
    const { email, picture } = user.properties.fields;
    return {
      key: user.key,
      name: user.displayName,
      email,
      picture,
    };
  }
}
