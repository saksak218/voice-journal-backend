import { Router } from "express";
import {
  currentUser,
  login,
  logout,
  refreshToken,
  register,
} from "../controllers/auth.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", authorize, logout);
authRouter.post("/refresh", refreshToken);
authRouter.get("/currentUser/:id", authorize, currentUser);

export default authRouter;
