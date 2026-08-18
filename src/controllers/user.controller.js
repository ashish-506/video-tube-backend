import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async(userId)=>{
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave : false});

    return {accessToken,refreshToken};
  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating tokens");
  }
}
const registerUser = asyncHandler(async (req, res) => {
  
  const { fullName, email, username, password } = req.body;
  console.log("req.files:", req.files);

  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const exists = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (exists) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path; 
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

  // upload them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Avatar file is required");

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // checking if entry was successful or not, & removing password and refreshToken fields
  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering the user");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully!!"));
});

const loginUser = asyncHandler(async (req,res)=>{
  const {username, email, password} = req.body;

  if(!username && !email){
    throw new ApiError(400,"username or email is required");
  }

  const user = await User.findOne({
    $or : [{username},{email}]
  })

  // yaha dhyaan dena hoga ki "user" hai ya "User", "User" mongodb me ek model ka naam hai, ek collection hai

  if(!user) throw new ApiError(404,"user doesn't exists");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if(!isPasswordValid) throw new ApiError(401,"invalid user credentials");

  const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true // ab cookies sirf server prr hi modify ho paengi
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(new ApiResponse(200,{
    user: loggedInUser, accessToken, refreshToken 
    // yaha isiliye phirse bhej rhe hai kyuki kya pta client inko apne local storage me set krna chhah rha ho ya any other use
  },"User loggedIn successfully"));
})

const logoutUser = asyncHandler(async (req,res)=>{
  // yaha sbse badi problem hai ki userId kaise pta chale
  // agr req.body se le liya id tb to koi bhi doosre user ko logout krr sakta hai
  // just ek req.body me doosre ki userId bhej kr

  // solution: ek middleware krdo kyuki cookieParser to hai hi jisme user ki details hongi
  
  // step-1: clear the refresh token from db
  const userId = req.user._id;
  await User.findByIdAndUpdate(userId,{
    $set : {refreshToken}
  },{
    new: true // isse response me updated value milegi purana data nahi
  });

  //step-2: browser se hata do 
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"User logged out"));
})
export { registerUser, loginUser, logoutUser };
