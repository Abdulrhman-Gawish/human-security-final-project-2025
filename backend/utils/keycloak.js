const axios = require("axios");
const jwt = require("jsonwebtoken");

async function getKeycloakUserInfo({ code, accessToken }) {
  if (!code && !accessToken) throw new Error("Code or access token is required");

  let tokenData = {};

  if (code) {
    const tokenResponse = await axios.post(
      "http://localhost:8080/realms/library-realm/protocol/openid-connect/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "library-frontend",
        code,
        redirect_uri: "https://localhost:3000/callback",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    tokenData = tokenResponse.data;
  } else {
    tokenData.access_token = accessToken;
  }

  const { access_token, refresh_token, expires_in } = tokenData;

  if (!access_token) throw new Error("Failed to retrieve access token");

  const publicKey = `-----BEGIN PUBLIC KEY-----\n${process.env.PUBLICKEY}\n-----END PUBLIC KEY-----`;
  const decoded = jwt.verify(access_token, publicKey, { algorithms: ["RS256"] });

  const kcRoles = decoded.realm_access?.roles || [];
  let appRole = kcRoles.includes("LIB_ADMIN")
    ? "admin"
    : kcRoles.includes("LIB_STAFF")
    ? "staff"
    : "user";

  const userInfoResponse = await axios.get(
    "http://localhost:8080/realms/library-realm/protocol/openid-connect/userinfo",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  const { sub: userId, name, email } = userInfoResponse.data;

  return {
    user: { userId, name, email, role: appRole },
    access_token,
    refresh_token,
    expires_in,
  };
}

module.exports = { getKeycloakUserInfo };
