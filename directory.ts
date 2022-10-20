import "dotenv/config";
// import axios from "axios";
import { User } from "./interfaces";
import { ds } from "aserto-node";

const dir = ds(process.env.CA_FILE);

const getUserByUserID: (string) => Promise<User> = async (userSub) => {
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
};

export { getUserByUserID };
