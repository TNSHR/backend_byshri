import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import jwt from "jsonwebtoken";
const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.genrateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
       return{accessToken,refreshToken};

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res)=>{
    //get user details from frontend
    //validation - not empty
    //check if user already exits: username email
    //check images check for avtar
    //create user object - create entry in db
    //remove password and refresh token feild from responce
    //check for user creation
    //return res


    const {fullName, email, username, password} = req.body
    console.log("email:", email)
    if([fullName,email,username,password].some((field)=> field?.trim()===""

    )){
        throw new ApiError(400,"All feilds are compalsary or required")
    }

    const existedUser = await User.findOne({
        $or: [{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already existed!!! ")
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;


     let avatarLocalPath;
     if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length >0){
        avatarLocalPath = req.files.avatar[0].path;
     }

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;


   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
     coverImageLocalPath = req.files.coverImage[0].path;
   }


    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar files is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

   const createdUser = await User.findById(user._id).select("-password -refreshToken");
   if (!createdUser) {
       throw new ApiError(500, "Something went wrong while registering the user!!!");
    
   }

   return res.status(201).json(
    new ApiResponce(200,createdUser,"User registered successfully")
   )

   
});

const loginUser = asyncHandler(async(req,res)=>{
    //req-body-//data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookies
    const {email, username, password} = req.body

    if (!username || !email) {
        throw new ApiError(400, "username or email is required")
        
        
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if (!user) {
        throw new ApiError(404, "user does not exists");
        
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401,"Password is invalid");
    }

    const {accessToken,refreshToken} =await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select(-password,-refreshToken);
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cokkie("accessToken",accessToken,options)
    .cokkie("refreshToken",refreshToken,options).json(
        new ApiResponce(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged in succsessfully"
        )
    )
});

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new : true
        }
    );
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookies("accessToken",options)
    .clearCookies("refreshToken",options).json(new ApiResponce(200,{},"User logged out"))

})

const refreshAcessToken = asyncHandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        
        throw new ApiError(401, "Unotherise request");
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
     );
     const user = await User.findById(decodedToken?._id)
     if (!user) {
         throw new ApiError(401, "Ivalid refresh token")
         
     }
     if (incomingRefreshToken!== user?.refreshToken) {
         throw new ApiError(401,"Invalid refresh token")
     }
 
     const options = {
         httpOnly: true,
         secure: true
     }
    const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
 
     return res.status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(
         new ApiResponce(
             200,{
             accessToken, refreshToken:newRefreshToken},
             "Access token refreshed succesfully"
             
         )
     )
   } catch (error) {
       throw new ApiError(401,error?.message|| "Invalid refresh token");
       
   }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}= req.body
     const user = await User.findById(req.user?._id)
     const isPasswordIsCorrect= await user.isPasswordCorrect(oldPassword)
     if (!isPasswordIsCorrect) {
        throw new ApiError(400,"Old password is incorrect")
        
     }
     user.password = newPassword;
     await user.save({validateBeforeSave:false})
     return res.status(200).json(new ApiResponce(200,{},"password change successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200,req.user,"Current user fetch succsesfully");
})


const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body;
    if (!fullName || !email) {
        throw new ApiError(400,"All feilds are required");
        
    }
    const user = User.findById(req.user?._id,
        {
            $set:{
                fullName: fullName,
                email: email
            }
        },{new: true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponce(200,user,"Account details updated succsesfully"))
})


const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing");
        
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400,"Error while uploading on avatar");
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },{new:true}
    ).select("-password")
    
    return res.status(200).json(new ApiResponce(200,user,"Avatar has successfully updated"))

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400,"Cover image file is missing");
        
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400,"Error while uploading on coverImage");
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },{new:true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponce(200,user,"Cover image has successfully updated"))

})

const getChannelUserProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params
    if (!username?.trim()) {
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([{
        $match:{
            username:username?.toLowerCase()
        }
    },{
        $lookup:{
            from:"subscription",
            localField:"_id",
            foreignField:"channel",
            as: "subscribers"
        }
    },{
        $lookup:{
            from:"subscription",
            localField:"_id",
            foreignField:"subscriber",
            as: "subscribedTo"
        }
    },{
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            channelSubscriedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:
                        true
                    ,
                    else:false

                    
                }
            }
        }
    },{
        $project:{
            fullName:1,
            username:1,
            subscribersCount:1,
            channelSubscriedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
])
if (!channel?.length) {
    throw new ApiError(404,"channel does not exits");
    
}

return res.status(200)
.json(new ApiResponce(200,channel[0],"User channel fetched successfully"))


})



export {registerUser, 
    loginUser,logoutUser,
    refreshAcessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,getChannelUserProfile}