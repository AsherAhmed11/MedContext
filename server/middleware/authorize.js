/**
 * Role-based authorization middleware.
 *
 * Requires requireAuth to have run first (req.user must exist).
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions." });
    }

    next();
  };
};
