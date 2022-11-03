import "dotenv/config";
// import axios from "axios";
import { User } from "./interfaces";
import { ds } from "@aserto/aserto-node";
console.log(process.env.ASERTO_AUTHORIZER_SERVICE_URL);

const dir = ds(
  process.env.CA_FILE,
  process.env.ASERTO_TENANT_ID,
  process.env.ASERTO_DIRECTORY_API_KEY,
  process.env.ASERTO_DIRECTORY_SERVICE_URL
);

const getUserByUserID: (string) => Promise<User> = async (userSub) => {
  try {
    const user = await dir.object({
      type: "user",
      key: userSub,
    });
    const { email, picture } = user.properties;
    return {
      id: user.id,
      name: user.displayName,
      email,
      picture,
    };
  } catch (e) {
    console.log(e);
    return null;
  }
};

export { getUserByUserID };
