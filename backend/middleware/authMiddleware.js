import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

const protect = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  if (!process.env.JWT_SECRET) {
    throw new AppError('Authentication is not configured', 500, 'AUTH_CONFIGURATION_ERROR');
  }

  let decoded;
  try {
    decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired token', 401, 'UNAUTHENTICATED');
  }

  if (!decoded.jti) {
    throw new AppError('Token must be renewed; please sign in again', 401, 'UNAUTHENTICATED');
  }

  const revoked = await RevokedToken.findByPk(decoded.jti);
  if (revoked) {
    throw new AppError('Token has been revoked', 401, 'UNAUTHENTICATED');
  }

  const user = await User.findByPk(decoded.id, {
    attributes: { exclude: ['password'] }
  });

  if (!user) {
    throw new AppError('Account no longer exists', 401, 'UNAUTHENTICATED');
  }

  req.user = user;
  req.authToken = authorization.slice(7);
  req.tokenPayload = decoded;
  next();
});

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    next(new AppError('Administrator access required', 403, 'FORBIDDEN'));
  }
};

export { protect, admin };