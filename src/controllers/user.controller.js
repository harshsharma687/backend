import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generate refresh and acces token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user detail from frontend
  //validation - not empty
  // check if user already exists : username , email
  // check for images , for avtar
  //upload them to cloudinary, avtar
  //create user object - create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //retun responsem

  // Frontend posts "fullname"; accept "fullName" too so API clients can't
  // fail on casing.
  const { fullname, email, username, password } = {
    ...req.body,
    fullname: req.body?.fullname ?? req.body?.fullName,
  };
  // No PII in server logs.
  if (!fullname || !email || !username || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }
  //  console.log("req.files:", req.files)
  // Avatar is optional now — users can sign up without a profile photo and
  // the UI falls back to an initial. coverImage was already optional.
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  const user = await User.create({
    fullname,
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "User creation failed");
  }

  // Log the user in right after signup so the frontend can immediately use
  // protected routes (channel, upload, etc.) without a separate login call.
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  return res
    .status(201)
    .cookie("accessToken", accessToken, authCookieOptions)
    .cookie("refreshToken", refreshToken, authCookieOptions)
    .json(
      new ApiResponse(
        201,
        {
          user: createdUser,
          accessToken,
          refreshToken,
        },
        "User registered successfully"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined;
  const password = body.password;

  if ((!username && !email) || !password) {
    throw new ApiError(400, "Username or email and password are required");
  }

  // Email/username are stored lowercased — the lookup must be too, or valid
  // credentials fail with "user not found" (this made login flaky).
  const identityFilter = [];
  if (username) identityFilter.push({ username });
  if (email) identityFilter.push({ email });
  const user = await User.findOne({ $or: identityFilter });

  // Same message for unknown user and wrong password so the endpoint does
  // not reveal which accounts exist.
  if (!user) {
    throw new ApiError(401, "Incorrect email/username or password");
  }

  const isPasswordvalid = await user.isPasswordCorrect(password);

  if (!isPasswordvalid) {
    throw new ApiError(401, "Incorrect email/username or password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, authCookieOptions)
    .cookie("refreshToken", refreshToken, authCookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user loggedIn Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", authCookieOptions)
    .clearCookie("refreshToken", authCookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, authCookieOptions)
      .cookie("refreshToken", newRefreshToken, authCookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const changeCurrentPasword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const fullname = typeof req.body?.fullname === "string" ? req.body.fullname.trim() : "";
  // Lowercase here: findByIdAndUpdate can bypass schema setters, and mixed-case
  // emails would then never match the login lookup.
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  if (!fullname || !email) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true, runValidators: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account detail update successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage?.url) {
    throw new ApiError(400, "error while uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup:{
        from : "subscriptions",
        localField : "_id",
        foreignField :"channel",
        as:"subscribers"
      }
    },
    {
      $lookup:{
        from : "subscriptions",
        localField : "_id",
        foreignField :"subscriber",
        as:"subscribedTo"
      }
    },
    {
        $addFields: {
          subscribersCount:{
            $size: "$subscribers"
          },
            channelsSubscribedToCount: {
              $size: "$subscribedTo"
            },
            isSubscribed: {
              $in: [req.user?._id || null, "$subscribers.subscriber"]
            }
          }
      },{
        $project:{
          fullname : 1,
          username :1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed :1,
          avatar :1,
          coverImage :1,
          email :1
          
        }
      }
  ])

  if(!channel?.length){
         throw new ApiError(404,"channel does not exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0], "user channel fetched successfully")
  )
});

const getWatchHistory = asyncHandler (async(req,res) => {
        const user = await User.aggregate([
          {
            $match:{
              _id: new mongoose.Types.ObjectId(req.user._id)
            }
          },
          {
            $lookup :{
              from : "videos",
              localField: "watchHistory",
              foreignField : "_id",
              as:"watchHistory",
              pipeline: [
                {
                  $lookup:{
                    from :"users",
                    localField:"owner",
                    foreignField : "_id",
                    as :"owner",
                    pipeline:[
                      {
                        $project:{
                           fullname: 1,
                           username :1,
                           avatar :1
                        }
                      }
                    ]

                  }

                },
                {
                     $addFields: {
                      owner:{
                        $first:"$owner"
                      }
                     }

                }

              ]

            }

          }

        ])

        return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            user[0]?.watchHistory || [],
            "watchHistory fetched successfully"
          )
        );
});



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPasword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
