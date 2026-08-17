import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  /*
      steps to write registerUser Logic...

      1. get user details from frontend
      2. validate data
      3. check if user already exists
      4. check for images and avatar (required fields)
      5. upload them to cloudinary, avatar
      6. create entry in db
      7. remove password and refresh token fields from response
      8. check if user has successfully been created
      9. return response
    */
  const { fullName, email, username, password } = req.body;
  //  if(! fullName){
  //   throw new ApiError(400,"fullName is required");
  //  } a better way to check if data is present or not is available
  console.log("req.files:", req.files);

  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // checking if the user already exists
  const exists = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (exists) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path; // "req.files" ye multer ne add ki hai field to check images, isko console.log() krke dekho
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
  // checking if entry was successful or not & removing password and refreshToken fields
  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering the user");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully!!"));
});

export { registerUser };
