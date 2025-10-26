import mongoose from "mongoose";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  JWT_ACCESS_EXPIRE,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
  NODE_ENV,
} from "../config/env.js";

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRE,
  });
};

const generateRefreshToken = (userId) => {
  // Create refresh token
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
  });
};

const generateAdminToken = (userId, userRole) => {
  return jwt.sign({ id: userId, role: userRole }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const adminToken = generateAdminToken(user._id, user.role);

  //   Cookie options
  const cookieOptions = {
    httpOnly: true,
    // secure: NODE_ENV === "production",
    // sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  // Set refresh token in HTTP-only cookie
  res.cookie("refreshToken", refreshToken, cookieOptions);
  if (user.role === "admin") {
    res.cookie("adminToken", adminToken, cookieOptions);
  }
  res.status(statusCode).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
    },
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    console.log("hi");
    // Validation
    if (!name || !email || !password) {
      const error = new Error("Please provide email, password, and name");
      error.statusCode = 400;
      throw error;
    }

    // Check if the user already exist
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("User already exists with this email");
      error.statusCode = 409;
      throw error;
    }

    const user = await User.create({ name, email, password });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      const error = new Error("Please provide email and password");
      error.statusCode = 400;
      throw error;
    }

    // Find user (include password for comparison)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    // Check if user is active
    if (!user.isActive) {
      const error = new Error("Account is deactivated");
      error.statusCode = 401;
      throw error;
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      const error = new Error("Password is incorrect");
      error.statusCode = 401;
      throw error;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    console.log(refreshToken);

    if (!refreshToken) {
      const error = new Error("No refresh token found");
      error.statusCode = 401;
      throw error;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Check if User still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      const error = new Error("User not found or inactive");
      error.statusCode = 401;
      throw error;
    }

    // Generate the access token
    const newAccessToken = generateAccessToken(user._id);
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // Clear the expired cookie
      res.clearCookie("refreshToken");
      return res.status(401).json({
        success: false,
        message: "Refresh token expired. Please login again.",
      });
    } else {
      next(error);
    }
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
    });
    if (req.user.role === "admin") {
      res.clearCookie("adminToken", {
        httpOnly: true,
        secure: NODE_ENV === "production",
        sameSite: "strict",
      });
    }
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const currentUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
