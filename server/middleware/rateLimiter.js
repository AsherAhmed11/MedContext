import rateLimit from "express-rate-limit";

// Applies a rate limit of 10 requests per 15 minutes for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});
