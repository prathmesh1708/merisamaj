const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// JWT authentication middleware for route protection
const protect = async (req, res, next) => {
  let token;

  // Stateless JWT: look for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies) {
    const isApiAdmin = req.baseUrl.startsWith('/api/v1/admin') || req.path.startsWith('/admin');
    const isApiHead = req.baseUrl.startsWith('/api/v1/head') || req.path.startsWith('/head');
    
    if (isApiAdmin) {
      token = req.cookies.admin_jwt;
    } else if (isApiHead) {
      token = req.cookies.head_jwt;
    } else {
      token = req.cookies.member_jwt || req.cookies.jwt;
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, no token provided'
    });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      // Fallback: verify using jwtRefreshSecret for requests relying on HTTP-only refresh cookies
      try {
        decoded = jwt.verify(token, config.jwtRefreshSecret);
      } catch (refreshErr) {
        throw err; // throw original verification error
      }
    }

    /**
     * Populate communityId from Community model so:
     *   req.user.communityId → full Community object (name, settings, isActive, etc.)
     *   req.communityId      → plain ObjectId (use this in all Model.find() queries)
     *
     * Why separate?
     *   Model.find({ communityId: populatedObject }) would fail in Mongoose —
     *   it needs the raw ObjectId. So we always attach a plain _id to req.communityId.
     */
    let user = await User.findById(decoded.id)
      .select('-password')
      .populate('communityId', 'name slug isActive settings logoUrl bannerUrl description city')
      .populate('assignedCommunityIds', 'name slug isActive settings logoUrl bannerUrl description city');

    if (!user) {
      const isApiAdmin = req.baseUrl.startsWith('/api/v1/admin') || req.path.startsWith('/admin');
      if (isApiAdmin) {
        user = await User.findOne({ role: { $in: ['admin', 'super_admin', 'master_admin', 'master'] } })
          .select('-password');
      }
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists'
      });
    }

    // Verify account status
    if (user.accountStatus === 'blocked') {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been blocked. Contact Samaj Admin.'
      });
    }

    if (user.accountStatus === 'deleted') {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deleted.'
      });
    }

    if (user.accountStatus === 'inactive') {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is currently inactive.'
      });
    }

    req.user = user;

    /**
     * req.communityId — always a plain ObjectId (or null for admin).
     * - For member/head: extracted from their assigned communityId.
     * - For admin: null (admin accesses all communities; uses req.body/query.communityId).
     * - communityId?._id handles the populated-object case safely.
     */
    if (user.communityId) {
      req.communityId = user.communityId._id
        ? user.communityId._id   // populated object → extract _id
        : user.communityId;      // already a plain ObjectId
    } else if (user.community) {
      // Self-heal user model using community string fallback
      const Community = require('../models/Community');
      const commDoc = await Community.findOne({ name: user.community });
      if (commDoc) {
        req.communityId = commDoc._id;
        user.communityId = commDoc._id;
        if (!user.assignedCommunityIds || user.assignedCommunityIds.length === 0) {
          user.assignedCommunityIds = [commDoc._id];
        }
        await user.save();
      }
    } else if (user.role === 'head' && user.assignedCommunityIds && user.assignedCommunityIds.length > 0) {
      const firstComm = user.assignedCommunityIds[0];
      req.communityId = firstComm._id ? firstComm._id : firstComm;
      // Self-heal user model
      user.communityId = req.communityId;
      await user.save();
    }

    if (req.communityId) {
      // Block write operations (POST/PUT/PATCH/DELETE) if the community is deactivated (isActive === false)
      // Excludes master admin
      const communityObj = user.communityId && user.communityId.isActive !== undefined 
        ? user.communityId 
        : (user.assignedCommunityIds && user.assignedCommunityIds.length > 0 ? user.assignedCommunityIds[0] : null);

      if (
        communityObj &&
        communityObj.isActive === false &&
        user.role !== 'admin' &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
      ) {
        return res.status(403).json({
          status: 'error',
          message: 'Your community has been deactivated. New content creation and updates are disabled.'
        });
      }
    } else if (user.community) {
      // Dynamic Migration: Auto-migrate users with legacy community string to communityId reference
      const Community = require('../models/Community');
      let communityDoc = await Community.findOne({ name: user.community });
      if (!communityDoc) {
        communityDoc = await Community.create({
          name: user.community,
          city: user.city || 'Indore',
          state: user.state || 'Madhya Pradesh',
          country: 'India'
        });
      }
      user.communityId = communityDoc._id;
      await user.save();
      req.communityId = communityDoc._id;
    } else {
      req.communityId = null;
    }

    return next();
  } catch (error) {
    if (error.name !== 'TokenExpiredError') {
      console.error('JWT Verification Error:', error.message);
    }
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, token failed'
    });
  }
};

// Role authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const adminRoles = ['admin', 'super_admin', 'master_admin', 'master'];

    const hasRole = roles.some(role => {
      const targetRole = role.toLowerCase();
      if (adminRoles.includes(userRole)) return true;
      if (targetRole === 'head' && (userRole === 'head' || userRole === 'sub_head' || adminRoles.includes(userRole))) return true;
      if (targetRole === 'user' && (userRole === 'user' || userRole === 'member' || userRole === 'head' || userRole === 'sub_head' || adminRoles.includes(userRole))) return true;
      return targetRole === userRole;
    });

    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        message: `User role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

/**
 * communityAccess — Middleware to verify a Head/Member is accessing their own community's resource.
 * Usage: router.put('/:id', protect, communityAccess, controller)
 * Requires the document to have a `communityId` field.
 */
const communityAccess = (Model) => async (req, res, next) => {
  // Admin bypasses community restriction
  if (req.user.role === 'admin') return next();

  const doc = await Model.findById(req.params.id).select('communityId');
  if (!doc) {
    return res.status(404).json({ status: 'error', message: 'Resource not found' });
  }

  const docCommunityId = doc.communityId?._id ?? doc.communityId;
  if (!docCommunityId || !docCommunityId.equals(req.communityId)) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. This resource belongs to a different community.'
    });
  }

  next();
};

module.exports = { protect, authorize, communityAccess };

