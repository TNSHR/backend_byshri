import { Router } from "express";
import { loginUser, logoutUser, registerUser,refreshAcessToken } from "../controllers/user.controller.js";
import { upload } from "../middelwares/multer.middelware.js";
import jwt from "jsonwebtoken";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),registerUser);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT,logoutUser) ;   
router.route("refresh-token").post(verifyJWT,refreshAcessToken)

export default router;