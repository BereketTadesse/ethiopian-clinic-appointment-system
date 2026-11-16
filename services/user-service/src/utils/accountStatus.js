import redisClient from '../config/redis.js';

// Shared with clinic-service (same Redis): lets other services reject a disabled
// user's still-valid access token immediately instead of waiting for it to expire.
export const disabledUserKey = (userId) => `user:disabled:${userId}`;

// Must outlive the longest access token (JWT_ACCESS_EXPIRES_IN, 15m by default).
const DISABLED_FLAG_TTL_SECONDS = 24 * 60 * 60;

/**
 * Apply an active/inactive state to a user document and propagate it:
 *  - deactivating clears the stored refresh token, so the session cannot be renewed;
 *  - a Redis flag marks the user disabled for services that only verify the JWT.
 * Saves the user document.
 */
export const applyUserActiveState = async (user, isActive) => {
  user.isActive = isActive;
  if (!isActive) user.refreshToken = undefined;
  await user.save();

  if (!redisClient?.isReady) return;
  try {
    if (isActive) {
      await redisClient.del(disabledUserKey(user._id));
    } else {
      await redisClient.set(disabledUserKey(user._id), '1', { EX: DISABLED_FLAG_TTL_SECONDS });
    }
  } catch (err) {
    console.warn(`⚠️ Could not update disabled-user flag in Redis for ${user._id}: ${err.message}`);
  }
};
