import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponce } from "../utils/ApiResponce.js";

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
    const loggedInUser = await User.findById(user._id).select(-password,-refreshToken)
})


export {registerUser, loginUser}