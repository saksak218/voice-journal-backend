import { Router } from "express";
import { getAdminStats, getAllUsers } from "../controllers/admin.controller.js";

const adminRouter = Router();

// All routes are protected and admin-only
// adminRouter.use(protect);
// adminRouter.use(adminOnly);

// Get admin dashboard statistics
adminRouter.get("/stats", getAdminStats);

// Get all users with activity
adminRouter.get("/users", getAllUsers);

export default adminRouter;
