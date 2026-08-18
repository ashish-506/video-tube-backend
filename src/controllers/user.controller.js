import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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

  if(!user) throw new ApiError(404,"user doesn't exists");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if(!isPasswordValid) throw new ApiError(401,"invalid user credentials");

  const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(new ApiResponse(200,{
    user: loggedInUser, accessToken, refreshToken 
  },"User loggedIn successfully"));
})

const logoutUser = asyncHandler(async (req,res)=>{
  // step-1: clear the refresh token from db
  const userId = req.user._id;
  await User.findByIdAndUpdate(userId,{
    $set : {refreshToken:null}
  },{
    new: true
  });

  //step-2: clear it from browser 
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

const refreshAccessToken = asyncHandler(async (req,res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken) throw new ApiError(401,"Unauthorized Request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(401, "Invalid Refresh Token");

    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, "Refresh Token is Expired or used");

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Refresh Token")
  }
})

const changeCurrentPassword = asyncHandler(async (req,res)=>{
  const {oldPassword, newPassword} = req.body;
  
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if(!isPasswordCorrect) throw new ApiError(400,"Invalid old Password");

  user.password = newPassword;
  await user.save({validateBeforeSave: false});

  return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Updated Successfully"));
})

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res.status(200).json(new ApiResponse(200, req.user, "Current User Fetched Successfully"));

})

const updateAccountDetails = asyncHandler(async (req,res)=>{
  const {fullName,email} = req.body;

  if(!fullName || !email) throw new ApiError("All fields are required");

  const user = await User.findByIdAndUpdate(req.user?._id,{
    $set : {fullName, email}
  },{new: true}).select("-password");

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Account Details Updated Successfully"));

})

const updateUserAvatar = asyncHandler(async (req,res)=>{
  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath) throw new ApiError(400,"Avatar file is missing");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if(!avatar.url) throw new ApiError(400, "Error while updating avatar");

  const user = await User.findByIdAndUpdate(req.user._id,{
    $set: {avatar: avatar.url}
  },{new : true}).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image Updated Successfully"));

})

const updateUserCoverImage = asyncHandler(async (req,res)=>{
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath) throw new ApiError(400,"Avatar file is missing");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url) throw new ApiError(400, "Error while updating avatar");

  const user = await User.findByIdAndUpdate(req.user._id,{
    $set: {coverImage: coverImage.url}
  },{new : true}).select("-password");

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Cover Image Updated Successfully"));
})

const getUserChannelProfile = asyncHandler(async (req,res)=>{
  // finding subscribers of a user, or count of subscribers... look subsciption.model.js for schema
  const {username} = req.params;

  if(!username?.trim()){
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {// stage 1
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {// stage 2
      $lookup: {
        // my subscribers
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {// stage 3
      $lookup: {
        // whom I have subscribed
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    { // stage 4
      $addFields:{
        subscribersCount:{
          $size: "$subscribers"
        },
        channelsSubscribedToCount:{
          $size: "$subscribedTo"
        },
        isSubscribed:{
          // if user has subscribed to the current channel the he will see "subscribed" button else "subscribe" button
          $cond:{
            if:{$in: [req.user?._id,"$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {// stage 5
      $project:{
        // client ko kon kon si fields show hongi
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ]);

  if(!channel?.length) throw new ApiError(404,"channel Does not exists");

  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"User Channel fetched Successfully"));
})

export { 
  registerUser, 
  loginUser, 
  logoutUser, 
  refreshAccessToken, 
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile
};
