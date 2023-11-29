import { User } from "./interfaces";
import {
  DirectoryV3 as DirectoryClient,
  DirectoryV3Config,
  DirectoryServiceV3,
} from "@aserto/aserto-node";

export class Directory {
  client: DirectoryClient;

  constructor(config: DirectoryV3Config) {
    const url = config.url ?? process.env.ASERTO_DIRECTORY_SERVICE_URL;
    const tenantId = config.tenantId ?? process.env.ASERTO_TENANT_ID;
    const apiKey = config.apiKey ?? process.env.ASERTO_DIRECTORY_API_KEY;
    let rejectUnauthorized = config.rejectUnauthorized
    const caFile = config.caFile ?? process.env.ASERTO_DIRECTORY_CERT_PATH

    if (rejectUnauthorized === undefined) {
      rejectUnauthorized = process.env.ASERTO_DIRECTORY_REJECT_UNAUTHORIZED === "true"
    }

    this.client = DirectoryServiceV3({
      url,
      tenantId,
      apiKey,
      rejectUnauthorized,
      caFile: caFile,
    });
  }

  async getUserByIdentity(identity: string): Promise<User> {
    const relation = await this.client.relation(
      {
          subjectType: 'user',
          objectType: 'identity',
          objectId: identity,
          relation: 'identifier',
      }
    )

    if (!relation || !relation.result) {
      throw new Error(`No relations found for identity ${identity}`, )
    }

    const user = await this.client.object({
      objectId: relation.result.subjectId,
      objectType: relation.result.subjectType,
    });
    const { email, picture } = JSON.parse(user.properties.toJsonString());
    return {
      key: user.id,
      name: user.displayName,
      email,
      picture,
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.client.object({objectId: id, objectType: 'user'});
    const { email, picture } = JSON.parse(user.properties.toJsonString());
    return {
      key: user.id,
      name: user.displayName,
      email,
      picture,
    };
  }
}
