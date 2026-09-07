import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Video Unliked Successfully")
      );
  }

  await Like.create({ video: videoId, likedBy: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Video Liked Successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid commentId");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Comment Unliked Successfully")
      );
  }

  await Like.create({ comment: commentId, likedBy: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Comment Liked Successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweetId");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "Tweet not found");

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Tweet Unliked Successfully")
      );
  }

  await Like.create({ tweet: tweetId, likedBy: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Tweet Liked Successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
            },
          },
          { $addFields: { owner: { $first: "$owner" } } },
        ],
      },
    },
    { $addFields: { video: { $first: "$video" } } },
    { $match: { video: { $ne: null } } }, // drop likes pointing at a deleted video
    { $replaceRoot: { newRoot: "$video" } },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked Videos Fetched Successfully")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
