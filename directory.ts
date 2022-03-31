import 'dotenv/config'

const authorizerServiceUrl = process.env.AUTHORIZER_SERVICE_URL;
const tenantId = process.env.TENANT_ID;
const authorizerApiKey = process.env.AUTHORIZER_API_KEY;

const axios = require("axios");

// get a user's profile from the management API
const getUser = async (userId) => {
  try {
    const url = `${authorizerServiceUrl}/api/v1/dir/users/${userId}?fields.mask=id,display_name,picture,email`;

    const response = await axios({
      method: "get",
      url,
      headers: {
        Authorization: `basic ${authorizerApiKey}`,
        "aserto-tenant-id": tenantId,
        "Content-Type": "application/json",
      }
    });

    const result = response.data && response.data.result;
    return result;
  } catch (error) {
    console.error(`getUser: caught exception: ${error}`);
    return null;
  }
};

const getUserIdByUserSub = async (userSub) => {
  try {
    const url = `${authorizerServiceUrl}/api/v1/dir/identities`;
    const response = await axios({
      method: "post",
      url,
      headers: {
        Authorization: `basic ${authorizerApiKey}`,
        "aserto-tenant-id": tenantId,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        identity: userSub,
      }),
    })

    const result = response.data && response.data.id;
    return result;
  } catch (error) {
    console.error(`getUser: caught exception: ${error}`);
    return null;
  }
}

const getUserByUserSub = async (userSub) => {
  const userId = await getUserIdByUserSub(userSub);
  return await getUser(userId);
}

export { getUserByUserSub };
