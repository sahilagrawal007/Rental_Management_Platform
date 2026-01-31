// middleware/auth.js
// This checks if a user is logged in before accessing protected routes

const jwt = require("jsonwebtoken");

// Check if user has valid token
function authMiddleware(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Extract token (format: "Bearer TOKEN_HERE")
    const token = authHeader.replace("Bearer ", "");

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user info to request
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next(); // Continue to next function
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Check if user has required role
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

module.exports = { authMiddleware, checkRole };
