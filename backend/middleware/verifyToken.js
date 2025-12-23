const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { getKeycloakUserInfo } = require("../utils/keycloak");

const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const kcAccessToken = req.cookies.kc_access_token;
    const { user } = await getKeycloakUserInfo({ accessToken: kcAccessToken });

    req.user = user;
    req.role = user.role

    console.log("request contain: ", req.user);
    
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};


module.exports = verifyToken;
