/**
 * socketAuth.js
 * Socket.io handshake check: the connecting client must send its login token, and the
 * socket acts as the user INSIDE that token. The `userId` the client sends is ignored
 * (before this, anyone who knew a user id could join that user's chats).
 *
 * The access token expires every 30 minutes and the app refreshes it in the background,
 * so an expired-but-genuine token is still accepted for the length of a login session
 * (7 days) — otherwise an open chat would drop on its next reconnect.
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

const MAX_TOKEN_AGE_SECONDS = 7 * 24 * 60 * 60;

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));

    const decoded = jwt.verify(token, config.jwtSecret, { ignoreExpiration: true });
    if (!decoded?.id || !decoded.iat || Date.now() / 1000 - decoded.iat > MAX_TOKEN_AGE_SECONDS) {
      return next(new Error('unauthorized'));
    }

    const user = await User.findById(decoded.id).select('_id accountStatus').lean();
    if (!user || ['blocked', 'deleted'].includes(user.accountStatus)) {
      return next(new Error('unauthorized'));
    }

    // The chat handlers read the user from handshake.auth.userId — make it the verified one
    socket.handshake.auth.userId = String(user._id);
    socket.data.userId = String(user._id);
    next();
  } catch (err) {
    next(new Error('unauthorized'));
  }
};

module.exports = socketAuth;
