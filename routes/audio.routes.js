import { Router } from "express";
import { upload } from "../config/cloudinary.js";
import {
  getAudioJournals,
  getAudioJournal,
  uploadAudio,
  updateAudioJournal,
  deleteAudioJournal,
  getUserStats,
} from "../controllers/audio.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const audioRouter = Router();

audioRouter.post("/upload", authorize, upload.single("audio"), uploadAudio);

audioRouter.get("/", authorize, getAudioJournals);

audioRouter.get("/stats", getUserStats);

audioRouter.get("/:id", getAudioJournal);

audioRouter.put("/:id", updateAudioJournal);

audioRouter.delete("/:id", authorize, deleteAudioJournal);

export default audioRouter;
