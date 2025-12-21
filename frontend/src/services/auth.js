// const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080";
// const realm = import.meta.env.VITE_KEYCLOAK_REALM || "library-realm";
// const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "library-frontend";
// const redirectUri = import.meta.env.VITE_REDIRECT_URI || "http://localhost:5173/callback";

export const login = () => {
  window.location.href =
    "http://localhost:8080/realms/library-realm/protocol/openid-connect/auth" +
    "?client_id=library-frontend" +
    "&response_type=code" +
    "&scope=openid" +
    "&prompt=login" +                // 🔥 FORCE LOGIN
    "&redirect_uri=https://localhost:3000/callback";
};




export const saveToken = (token) => {
  sessionStorage.setItem("access_token", token);
};

export const getToken = () => {
  return sessionStorage.getItem("access_token");
};

export const logout = () => {
  sessionStorage.removeItem("access_token");
};