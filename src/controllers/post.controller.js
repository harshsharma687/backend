import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Image-only posts. Comments are stored in the shared Comment collection with
// `post` set (same pattern as video comments), likes in the Like collection.

const createPost = asyncHandler(async (req, res) => {
  const imageLocalPath = req.file?.path; // postImage.single("image") puts the file here
  if (!imageLocalPath) {
    throw new ApiError(400, "Post image is required");
  }

  const caption = String(req.body.caption || "").trim();
  if (caption.length > 500) {
    throw new ApiError(400, "Caption must be 500 characters or fewer");
  }

  const uploaded = await uploadOnCloudinary(imageLocalPath);
  if (!uploaded?.url) {
    throw new ApiError(500, "Image upload failed. Please try again.");
  }

  const post = await Post.create({
    image: uploaded.url,
    caption,
    owner: req.user._id,
  });

  return res.status(201).json(new ApiResponse(201, post, "Post created"));
});

const getPosts = asyncHandler(async (req, res) => {
  // ?owner=me narrows the feed to the signed-in user's own posts (the mobile
  // "My posts" page). Optional additive param — the public feed is unchanged.
  const filter = req.query.owner === "me" && req.user?._id ? { owner: req.user._id } : {};
  const posts = await Post.find(filter)
    .populate("owner", "username fullname avatar")
    .sort({ createdAt: -1 });

  // Signed-in users get their own like state; guests get liked: false.
  let viewerId = null;
  if (req.user?._id) viewerId = String(req.user._id);
  const viewerLikes = viewerId
    ? await Like.find({ post: { $in: posts.map((p) => p._id) }, likedBy: req.user._id })
    : [];

  const data = posts.map((post) => ({
    ...post.toObject(),
    liked: viewerLikes.some((like) => String(like.post) === String(post._id)),
  }));

  return res.status(200).json(new ApiResponse(200, data, "Posts fetched"));
});

const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findOneAndDelete({
    _id: req.params.postId,
    owner: req.user._id,
  });
  if (!post) throw new ApiError(404, "Post not found");

  // Clean up everything attached to the post.
  await Comment.deleteMany({ post: post._id });
  await Like.deleteMany({ post: post._id });
  await deleteFromCloudinary(post.image, "image");

  return res.status(200).json(new ApiResponse(200, {}, "Post deleted"));
});

const togglePostLike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, "Post not found");

  const filter = { post: post._id, likedBy: req.user._id };
  const existing = await Like.findOne(filter);

  if (existing) {
    await existing.deleteOne();
    post.likesCount = Math.max(0, post.likesCount - 1);
    await post.save();
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false, likesCount: post.likesCount }, "Like removed"));
  }

  await Like.create(filter);
  post.likesCount += 1;
  await post.save();
  return res
    .status(201)
    .json(new ApiResponse(201, { liked: true, likesCount: post.likesCount }, "Like added"));
});

const getPostComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId })
    .populate("owner", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, comments, "Post comments fetched"));
});

const createPostComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "Comment content is required");

  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, "Post not found");

  const comment = await Comment.create({
    content: content.trim(),
    post: post._id,
    owner: req.user._id,
  });
  post.commentsCount += 1;
  await post.save();

  return res.status(201).json(new ApiResponse(201, comment, "Comment created"));
});

const deletePostComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOneAndDelete({
    _id: req.params.commentId,
    owner: req.user._id,
    post: { $exists: true },
  });
  if (!comment) throw new ApiError(404, "Comment not found");

  await Post.updateOne({ _id: comment.post }, { $inc: { commentsCount: -1 } });

  return res.status(200).json(new ApiResponse(200, {}, "Comment deleted"));
});

export {
  createPost,
  getPosts,
  deletePost,
  togglePostLike,
  getPostComments,
  createPostComment,
  deletePostComment,
};
