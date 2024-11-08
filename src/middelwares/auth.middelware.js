import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req,res,next)=>{
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

    if (!token) {
        throw new ApiError(401,"Anotherise request")
        
    }

    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
}