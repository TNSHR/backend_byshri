import { Router } from "express";
import { loginUser, logoutUser, registerUser,refreshAcessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getChannelUserProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middelwares/multer.middelware.js";
import { verifyJWT } from "../middelwares/auth.middelware.js";

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
//secure routes
router.route("/logout").post(verifyJWT,logoutUser) ;   
router.route("refresh-token").post(verifyJWT,refreshAcessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/update-account").patch(verifyJWT,updateAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("/cover-Image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getChannelUserProfile)

router.route("/history").get(verifyJWT,getWatchHistory);

export default router;