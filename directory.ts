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

  async getUserByUserID(subject: string): Promise<User> {
    const user = await this.client.object({
      type: "user",
      key: subject,
    });
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
