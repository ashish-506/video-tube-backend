import { Router } from "express";
import {
  getChannelStats,
  getChannelVideos,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // dashboard is always the logged-in user's own channel

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;
