// const Keycloak = require("keycloak-connect");
// const session = require("express-session");
// require("dotenv").config();

// const memoryStore = new session.MemoryStore();

// const keycloak = new Keycloak(
//   { store: memoryStore },
//   {
//     realm: process.env.KEYCLOAK_REALM || "library-realm",
//     "auth-server-url": process.env.KEYCLOAK_URL || "http://localhost:8080",
//     "ssl-required": "none",
//     resource: process.env.KEYCLOAK_CLIENT_ID || "library-backend",
//     "verify-token-audience": false,
//     credentials: {
//       secret: process.env.KEYCLOAK_CLIENT_SECRET || "x7zZGEpaLc8w7A8CJlnkTCY4GdcPYx9c",
//     },
//     "confidential-port": 0,
//   }
// );

// const SessionMiddleware = session({
//   secret: "secure-session-key",
//   resave: false,
//   saveUninitialized: true,
//   store: memoryStore,
// });

// module.exports = {
//   keycloak,
//   memoryStore,
//   SessionMiddleware,
// };
