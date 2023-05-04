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
    const caFile = config.caFile ?? process.env.ASERTO_DIRECTORY_CA_FILE;

    this.client = ds({
      url,
      tenantId,
      apiKey,
      caFile,
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
    if (!relation && !relation.resultsList || relation.resultsList.length === 0) {
      throw new Error(`No relations found for identity ${identity}`, )
    }

    const user = await this.client.object(relation.resultsList[0].subject);
    const { email, picture } = user.properties;
    return {
      id: user.id,
      key: user.key,
      name: user.displayName,
      email,
      picture,
    };
  }
}
