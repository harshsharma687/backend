const API_HOST = window.location.port === "8000" ? window.location.origin : "http://localhost:8000";
const API = `${API_HOST}/api/v1`;
const main = document.querySelector("#app-main");
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const demoOwners = [
  { _id: "channel-nova", username: "nova_studio", fullname: "Nova Studio", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&q=80" },
  { _id: "channel-aryan", username: "aryanbuilds", fullname: "Aryan Builds", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80" },
  { _id: "channel-kiara", username: "kiara_frames", fullname: "Kiara Frames", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80" },
  { _id: "channel-sunday", username: "sunday.club", fullname: "Sunday Club", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80" },
];

const demoVideos = [
  { _id: "demo-1", title: "Designing a calmer digital life", description: "A few small systems that help your screen time feel intentional instead of overwhelming.", thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85", videofile: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", duration: 754, views: 128400, createdAt: "2026-09-12", owner: demoOwners[0], category: "Design" },
  { _id: "demo-2", title: "I built a desk setup that makes me want to work", description: "The small details that brought focus and warmth to my everyday work space.", thumbnail: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=85", videofile: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", duration: 612, views: 84700, createdAt: "2026-09-10", owner: demoOwners[1], category: "Tech" },
  { _id: "demo-3", title: "A monsoon morning in the mountains", description: "A slow, misty trip through rain-soaked hills and little tea stalls.", thumbnail: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=85", videofile: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", duration: 1082, views: 220300, createdAt: "2026-09-08", owner: demoOwners[2], category: "Travel" },
  { _id: "demo-4", title: "The 20-minute recipe I keep making", description: "Crispy vegetables, a fast sauce and the best kind of weeknight dinner.", thumbnail: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85", videofile: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", duration: 423, views: 64300, createdAt: "2026-09-06", owner: demoOwners[3], category: "Food" },
  { _id: "demo-5", title: "How I plan a focused week", description: "A practical planning method that leaves room for rest, people and unexpected ideas.", thumbnail: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1000&q=85", videofile: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", duration: 923, views: 99100, createdAt: "2026-09-02", owner: demoOwners[0], category: "Productivity" },
  { _id: "demo-6", title: "Understanding JavaScript closures visually", description: "A no-pressure explanation of closures, scopes and the mental model behind them.", thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1000&q=85", videofile: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", duration: 1310, views: 174200, createdAt: "2026-08-31", owner: demoOwners[1], category: "Tech" },
  { _id: "demo-7", title: "Portraits in soft afternoon light", description: "A gentle behind-the-scenes look at working with natural light and real expressions.", thumbnail: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=85", videofile: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", duration: 841, views: 42100, createdAt: "2026-08-29", owner: demoOwners[2], category: "Photography" },
  { _id: "demo-8", title: "An evening ride through the city", description: "Street lights, late conversations and a reminder to take the long way home.", thumbnail: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1000&q=85", videofile: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", duration: 684, views: 70800, createdAt: "2026-08-26", owner: demoOwners[3], category: "Travel" },
];

const state = {
  token: localStorage.getItem("streamly_access_token") || "",
  user: JSON.parse(localStorage.getItem("streamly_user") || "null"),
  videos: [],
  activeCategory: "All",
  activeVideo: null,
  pendingVideoId: null,
  renderId: 0,
  usingDemoData: false,
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function escapeAttribute(value = "") { return escapeHTML(value); }
function initials(name = "Guest") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "G"; }
function isDemo(id) { return String(id || "").startsWith("demo-"); }
function isCurrentUser(ownerId) { return state.user && String(ownerId) === String(state.user._id); }

function formatDuration(seconds) {
  seconds = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

function formatViews(views) {
  const number = Number(views) || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1)}M views`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1)}K views`;
  return `${number} view${number === 1 ? "" : "s"}`;
}

function relativeDate(value) {
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(delta / 3_600_000);
  if (hours < 24) return hours < 1 ? "just now" : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function avatarFor(owner = {}) { return owner.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.fullname || owner.username || "NovaPlay")}&background=f4c95d&color=33290f&bold=true`; }

function normaliseVideo(video = {}) {
  return {
    ...video,
    _id: video._id || video.id,
    title: video.title || "Untitled video",
    description: video.description || "No description was added.",
    thumbnail: video.thumbnail || "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=1000&q=80",
    videofile: video.videofile || video.videoFile || "",
    owner: typeof video.owner === "object" && video.owner ? video.owner : demoOwners[0],
    duration: video.duration || 0,
    views: video.views || 0,
    createdAt: video.createdAt || new Date().toISOString(),
  };
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
  const response = await fetch(`${API}${path}`, { credentials: "include", ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function toast(message, kind = "success") {
  const element = document.createElement("div");
  element.className = `toast ${kind === "error" ? "error" : ""}`;
  element.textContent = message;
  $("#toast-region").append(element);
  setTimeout(() => element.remove(), 3600);
}

// Small floating menu for the ⋮ button on the user's own video cards.
function closeVideoMenu() { $("#video-menu")?.remove(); }

function openVideoMenu(button) {
  closeVideoMenu();
  const menu = document.createElement("div");
  menu.id = "video-menu";
  menu.className = "video-menu glass";
  menu.innerHTML = `
    <button type="button" data-menu-action="watch" data-video-id="${escapeAttribute(button.dataset.videoId)}">▶ Watch</button>
    <button type="button" class="danger" data-menu-action="delete" data-video-id="${escapeAttribute(button.dataset.videoId)}">🗑 Delete video</button>`;
  document.body.append(menu);
  const rect = button.getBoundingClientRect();
  const width = menu.offsetWidth || 180;
  const height = menu.offsetHeight || 90;
  menu.style.top = `${Math.min(window.innerHeight - height - 12, rect.bottom + 6)}px`;
  menu.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width))}px`;
}

async function deleteVideo(videoId) {
  if (!requireAuth()) return;
  if (!window.confirm("Delete this video permanently? This also removes its comments, likes and files.")) return;
  closeVideoMenu();
  try {
    await request(`/videos/${videoId}`, { method: "DELETE" });
    state.videos = state.videos.filter((video) => video._id !== videoId);
    toast("Video deleted.");
    if (state.activeVideo?._id === videoId) {
      state.activeVideo = null;
      goto("home");
    } else {
      navigate(); // refresh the current page (channel/library/home) without a reload
    }
  } catch (error) {
    toast(error.message || "Could not delete the video.", "error");
  }
}

function setLoading(message = "Loading…") {
  main.innerHTML = `<div class="page-loading"><span class="spinner"></span><p>${escapeHTML(message)}</p></div>`;
}

function setModal(id, open) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (open && !modal.open) modal.showModal();
  if (!open && modal.open) modal.close();
}

// Creator forms live in the static HTML, so their values survive modal
// close/reopen and even account switches (browser form restoration keeps the
// previous user's draft). Always start a new upload/playlist from a clean
// slate so one account's title/description can never leak into another's.
function resetCreatorForms() {
  $("#upload-form")?.reset();
  $("#playlist-form")?.reset();
}

function requireAuth(afterLogin) {
  if (state.user && state.token) return true;
  if (afterLogin) state.afterLogin = afterLogin;
  setAuthTab("login");
  setModal("auth-modal", true);
  toast("Please sign in to continue.", "error");
  return false;
}

function updateIdentityUI() {
  const avatar = $("#nav-avatar");
  const initial = $("#nav-initials");
  const signedIn = Boolean(state.user);
  $("#sidebar-login").hidden = signedIn;
  $("#subscriptions-mini").hidden = !signedIn;
  initial.textContent = initials(state.user?.fullname || state.user?.username || "Guest");
  initial.hidden = signedIn && Boolean(state.user?.avatar);
  if (signedIn && state.user.avatar) {
    avatar.src = state.user.avatar;
    avatar.alt = `${state.user.fullname || state.user.username}'s profile`;
  } else {
    avatar.removeAttribute("src");
    avatar.alt = "Guest profile";
  }
  if (signedIn) loadMiniSubscriptions();
}

async function loadMiniSubscriptions() {
  if (!state.user) return;
  try {
    const subscriptions = await request("/subscriptions/user");
    const list = $("#subscription-list");
    list.innerHTML = subscriptions.slice(0, 5).map(({ channel }) => channel ? `<a class="subscription-mini-item" href="#channel/${encodeURIComponent(channel.username)}"><img src="${escapeAttribute(avatarFor(channel))}" alt="" /><span>${escapeHTML(channel.fullname || channel.username)}</span></a>` : "").join("");
  } catch { /* The main app stays usable when subscriptions are not available yet. */ }
}

function setAuthTab(tab) {
  setModal("auth-modal", false);
  setModal("register-modal", false);
  setModal(tab === "register" ? "register-modal" : "auth-modal", true);
}

function createVideoCard(video) {
  const item = normaliseVideo(video);
  const fragment = $("#video-card-template").content.cloneNode(true);
  const card = $(".video-card", fragment);
  const thumb = $(".video-thumb", fragment);
  const thumbImage = $(".video-thumb img", fragment);
  const avatar = $(".channel-avatar", fragment);
  const title = $("h3", fragment);
  const channel = $(".channel-link", fragment);
  const stats = $(".video-stats", fragment);
  thumb.dataset.videoId = item._id;
  card.dataset.videoId = item._id;
  thumbImage.src = item.thumbnail;
  thumbImage.alt = "";
  thumbImage.onerror = () => { thumbImage.src = demoVideos[0].thumbnail; };
  avatar.src = avatarFor(item.owner);
  avatar.alt = "";
  title.textContent = item.title;
  channel.textContent = item.owner.fullname || item.owner.username;
  channel.dataset.channel = item.owner.username || "";
  stats.textContent = `${formatViews(item.views)} · ${relativeDate(item.createdAt)}`;
  $(".duration", fragment).textContent = formatDuration(item.duration);
  // Own videos get a small ⋮ menu with a Delete option (and Watch).
  if (isCurrentUser(item.owner?._id) && !isDemo(item._id)) {
    const more = $(".more-button", fragment);
    more.dataset.action = "video-menu";
    more.dataset.videoId = item._id;
    more.dataset.videoTitle = item.title;
    more.setAttribute("aria-label", "Video options");
  }
  return fragment;
}

function renderVideoGrid(videos, target = main) {
  const grid = target.matches?.(".video-grid") ? target : $(".video-grid", target);
  if (!grid) return;
  if (!videos.length) {
    const newFeed = location.hash === "#home" && state.activeCategory === "All" && !state.usingDemoData;
    grid.outerHTML = newFeed
      ? `<div class="empty-state"><span class="empty-icon">▶</span><h2>No videos here yet</h2><p>Be the first creator to share something with this community.</p><button class="primary-button" type="button" data-action="open-upload">Upload a video</button></div>`
      : `<div class="empty-state"><span class="empty-icon">⌕</span><h2>Nothing matched that search</h2><p>Try a different keyword, or reset the filters to explore the whole community.</p><button class="outline-button" type="button" data-action="reset-search">Show all videos</button></div>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  videos.forEach((video) => fragment.append(createVideoCard(video)));
  grid.replaceChildren(fragment);
}

async function getVideos(query = "") {
  try {
    const params = new URLSearchParams({ limit: "36" });
    if (query) params.set("query", query);
    const data = await request(`/videos?${params}`);
    const videos = (data.videos || data.docs || data || []).map(normaliseVideo);
    state.usingDemoData = false;
    return videos;
  } catch (error) {
    state.usingDemoData = true;
    const needle = query.toLowerCase();
    return demoVideos.filter((video) => !needle || `${video.title} ${video.description} ${video.owner.fullname}`.toLowerCase().includes(needle));
  }
}

async function renderHome({ query = "" } = {}) {
  const renderId = ++state.renderId;
  setLoading(query ? `Searching for “${query}”…` : "Loading your feed…");
  const videos = await getVideos(query);
  if (renderId !== state.renderId) return;
  state.videos = videos;
  const categories = ["All", "Tech", "Travel", "Design", "Food", "Productivity", "Photography"];
  const selected = state.activeCategory;
  const filtered = selected === "All" ? videos : videos.filter((video) => video.category === selected || video.title.toLowerCase().includes(selected.toLowerCase()));
  main.innerHTML = `
    <section class="page-head">
      <div><h1>${query ? `Results for “${escapeHTML(query)}”` : "Good evening, explore something new."}</h1><p>${state.usingDemoData ? "A preview feed is shown until you publish your first video." : "Fresh stories, ideas and skills from your community."}</p></div>
      <button class="outline-button" type="button" data-action="open-upload">Upload video</button>
    </section>
    ${!query ? `<section class="hero" style="--hero-image:url('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1500&q=85')"><div class="hero-content"><span class="eyebrow">Featured collection</span><h1>Small stories. Big ideas.</h1><p>Thoughtful videos from creators making their own corner of the internet a little more interesting.</p><button class="primary-button" type="button" data-action="explore-featured">Explore the collection <span>→</span></button></div></section>` : ""}
    <div class="chips" aria-label="Video topics">${categories.map((category) => `<button class="chip ${category === selected ? "active" : ""}" type="button" data-category="${category}">${category}</button>`).join("")}</div>
    <section><div class="video-grid"></div></section>`;
  renderVideoGrid(filtered);
}

function suggestedMarkup(videos) {
  return videos.map((raw) => {
    const video = normaliseVideo(raw);
    return `<article class="suggested-card" data-video-id="${escapeAttribute(video._id)}"><div class="suggested-thumb"><img src="${escapeAttribute(video.thumbnail)}" alt="" /><span>${formatDuration(video.duration)}</span></div><div><h3>${escapeHTML(video.title)}</h3><p>${escapeHTML(video.owner.fullname || video.owner.username)}</p><p>${formatViews(video.views)} · ${relativeDate(video.createdAt)}</p></div></article>`;
  }).join("");
}

async function getComments(videoId) {
  if (isDemo(videoId)) return [
    { _id: "comment-1", content: "This was exactly the kind of reset I needed today. Beautifully done.", createdAt: "2026-09-14", owner: demoOwners[2] },
    { _id: "comment-2", content: "Saving this for later — so many useful ideas in one video.", createdAt: "2026-09-13", owner: demoOwners[1] },
  ];
  try { return await request(`/comments/video/${videoId}`); } catch { return []; }
}

async function getLikeCount(videoId) {
  if (isDemo(videoId)) return 1284;
  try { return (await request("/likes/count", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId }) })).count || 0; } catch { return 0; }
}

function commentMarkup(comment) {
  const owner = comment.owner || demoOwners[0];
  return `<article class="comment"><img src="${escapeAttribute(avatarFor(owner))}" alt="" /><div><span class="comment-name">${escapeHTML(owner.fullname || owner.username)}<span class="comment-time">${relativeDate(comment.createdAt)}</span></span><p>${escapeHTML(comment.content)}</p></div></article>`;
}

async function renderWatch(videoId) {
  const renderId = ++state.renderId;
  setLoading("Loading video…");
  let video;
  try {
    video = isDemo(videoId) ? demoVideos.find((item) => item._id === videoId) : normaliseVideo(await request(`/videos/${videoId}`));
    if (!video) throw new Error("Video not found");
  } catch {
    main.innerHTML = `<div class="empty-state"><span class="empty-icon">!</span><h2>That video is unavailable</h2><p>It may have been removed, made private, or the link is incorrect.</p><a href="#home" class="primary-button">Back to home</a></div>`;
    return;
  }
  if (renderId !== state.renderId) return;
  video = normaliseVideo(video);
  state.activeVideo = video;
  const others = (state.videos.length ? state.videos : demoVideos).filter((item) => item._id !== video._id).slice(0, 8);
  const owner = video.owner;
  const ownVideo = isCurrentUser(owner._id);
  main.innerHTML = `
    <div class="watch-layout">
      <section class="watch-primary">
        <div class="player-wrap"><video controls autoplay playsinline poster="${escapeAttribute(video.thumbnail)}"><source src="${escapeAttribute(video.videofile)}" type="video/mp4" />Your browser does not support video playback.</video></div>
        <h1 class="watch-title">${escapeHTML(video.title)}</h1>
        <div class="watch-info-row">
          <div class="channel-summary"><img src="${escapeAttribute(avatarFor(owner))}" alt="" /><div><strong>${escapeHTML(owner.fullname || owner.username)}</strong><small>${escapeHTML(owner.username ? `@${owner.username}` : "Creator")}</small></div>${!ownVideo ? `<button class="subscribe-button" type="button" data-action="subscribe" data-channel-id="${escapeAttribute(owner._id)}">Subscribe</button>` : ""}</div>
          <div class="watch-actions"><button class="action-button" type="button" data-action="like" data-video-id="${escapeAttribute(video._id)}">♡ <span id="like-count">0</span></button><button class="action-button" type="button" data-action="save-video" data-video-id="${escapeAttribute(video._id)}">＋ Save</button><button class="action-button" type="button" data-action="share-video" data-video-id="${escapeAttribute(video._id)}">↗ Share</button>${ownVideo && !isDemo(video._id) ? `<button class="action-button delete-video-button" type="button" data-action="delete-video" data-video-id="${escapeAttribute(video._id)}">🗑 Delete</button>` : ""}</div>
        </div>
        <div class="video-description"><small>${formatViews(video.views)} · ${relativeDate(video.createdAt)}</small>${escapeHTML(video.description)}</div>
        <section class="comments-section"><h2 class="comments-title" id="comments-heading">Comments</h2><div id="comment-area"></div><div class="comment-list" id="comment-list"><div class="page-loading"><span class="spinner"></span></div></div></section>
      </section>
      <aside class="watch-aside"><h2 class="suggestions-title">Up next</h2><div class="suggested-list">${suggestedMarkup(others)}</div></aside>
    </div>`;
  const [comments, likes] = await Promise.all([getComments(video._id), getLikeCount(video._id)]);
  if (renderId !== state.renderId) return;
  $("#like-count").textContent = likes;
  $("#comments-heading").textContent = `${comments.length} comment${comments.length === 1 ? "" : "s"}`;
  $("#comment-area").innerHTML = state.user
    ? `<form class="comment-form" id="comment-form"><img src="${escapeAttribute(avatarFor(state.user))}" alt="" /><div><textarea name="content" required maxlength="2000" placeholder="Add a comment…"></textarea><div class="comment-submit-row"><button type="reset">Cancel</button><button class="submit-comment" type="submit">Comment</button></div></div></form>`
    : `<div class="empty-state" style="min-height:auto;margin-bottom:20px"><p>Join the conversation.</p><button class="outline-button" type="button" data-action="open-login">Sign in to comment</button></div>`;
  $("#comment-list").innerHTML = comments.length ? comments.map(commentMarkup).join("") : `<div class="empty-state" style="min-height:auto"><p>Be the first person to comment.</p></div>`;
}

async function renderChannel(username) {
  const renderId = ++state.renderId;
  setLoading("Loading channel…");
  let channel;
  let videos = [];
  try {
    channel = await request(`/users/c/${encodeURIComponent(username)}`);
    videos = await getVideosForOwner(channel._id);
  } catch {
    const owner = demoOwners.find((item) => item.username === username) || demoOwners[0];
    channel = { ...owner, subscribersCount: Math.floor(Math.random() * 90 + 10) * 1000, channelsSubscribedToCount: 12, coverImage: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1500&q=80" };
    videos = demoVideos.filter((item) => item.owner.username === owner.username);
  }
  if (renderId !== state.renderId) return;
  const ownChannel = isCurrentUser(channel._id);
  main.innerHTML = `
    <section class="channel-banner">${channel.coverImage ? `<img src="${escapeAttribute(channel.coverImage)}" alt="" />` : ""}</section>
    <section class="channel-profile">
      <img src="${escapeAttribute(avatarFor(channel))}" alt="" />
      <div class="channel-profile-info">
        <h1>${escapeHTML(channel.fullname || channel.username)}</h1>
        <p>@${escapeHTML(channel.username || "creator")} · <b>${Number(channel.subscribersCount || 0).toLocaleString()}</b> subscribers · <b>${Number(videos.length)}</b> videos</p>
      </div>
      ${!ownChannel ? `<button class="subscribe-button ${channel.isSubscribed ? "subscribed" : ""}" type="button" data-action="subscribe" data-channel-id="${escapeAttribute(channel._id)}">${channel.isSubscribed ? "Subscribed" : "Subscribe"}</button>` : ""}
    </section>
    <section class="section-heading"><h2>Videos</h2></section><div class="video-grid"></div>`;
  renderVideoGrid(videos);
}

async function getVideosForOwner(ownerId) {
  try {
    const data = await request(`/videos?${new URLSearchParams({ userId: ownerId, limit: "36" })}`);
    return (data.videos || data.docs || data || []).map(normaliseVideo);
  } catch (error) {
    if (isDemo(ownerId)) return demoVideos.filter((video) => String(video.owner._id) === String(ownerId));
    throw error;
  }
}

function libraryEmpty(title, description, action = "open-login", label = "Sign in") {
  main.innerHTML = `<section class="page-head"><div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(description)}</p></div></section><div class="empty-state"><span class="empty-icon">▤</span><h2>${escapeHTML(title)}</h2><p>${escapeHTML(description)}</p><button class="primary-button" type="button" data-action="${action}">${escapeHTML(label)}</button></div>`;
}

async function renderHistory() {
  if (!requireAuth(() => renderHistory())) return;
  const renderId = ++state.renderId;
  setLoading("Loading watch history…");
  try {
    const history = (await request("/users/history")).map(normaliseVideo);
    if (renderId !== state.renderId) return;
    main.innerHTML = `<section class="page-head"><div><h1>Watch history</h1><p>Continue where curiosity took you.</p></div></section><div class="video-grid"></div>`;
    renderVideoGrid(history);
  } catch (error) { libraryEmpty("Watch history", error.message, "home", "Explore videos"); }
}

async function renderSubscriptions() {
  if (!requireAuth(() => renderSubscriptions())) return;
  const renderId = ++state.renderId;
  setLoading("Loading subscriptions…");
  try {
    const subscriptions = await request("/subscriptions/user");
    const result = await Promise.all(subscriptions.filter((item) => item.channel?._id).map((item) => getVideosForOwner(item.channel._id)));
    if (renderId !== state.renderId) return;
    const videos = result.flat();
    main.innerHTML = `<section class="page-head"><div><h1>Subscriptions</h1><p>The newest videos from channels you follow.</p></div></section>${subscriptions.length ? `<div class="chips">${subscriptions.map(({ channel }) => channel ? `<a class="chip" href="#channel/${encodeURIComponent(channel.username)}">${escapeHTML(channel.fullname || channel.username)}</a>` : "").join("")}</div><div class="video-grid"></div>` : `<div class="empty-state"><span class="empty-icon">＋</span><h2>Your feed is ready for creators</h2><p>Subscribe to channels you love and their latest uploads will appear here.</p><a class="primary-button" href="#home">Discover channels</a></div>`}`;
    if (subscriptions.length) renderVideoGrid(videos);
  } catch (error) { libraryEmpty("Subscriptions", error.message, "home", "Discover channels"); }
}

async function renderPlaylists() {
  if (!requireAuth(() => renderPlaylists())) return;
  const renderId = ++state.renderId;
  setLoading("Loading playlists…");
  try {
    const playlists = await request("/playlists");
    if (renderId !== state.renderId) return;
    main.innerHTML = `<section class="page-head"><div><h1>Your playlists</h1><p>Collections made for every mood and moment.</p></div><button class="primary-button" type="button" data-action="open-playlist">＋ New playlist</button></section>${playlists.length ? `<div class="playlist-grid">${playlists.map((playlist) => `<article class="playlist-card"><div class="playlist-cover"><span class="playlist-count">${playlist.video?.length || 0} videos</span></div><div class="playlist-card-body"><h3>${escapeHTML(playlist.name)}</h3><p>${escapeHTML(playlist.description)}</p></div></article>`).join("")}</div>` : `<div class="empty-state"><span class="empty-icon">≡</span><h2>Make your first playlist</h2><p>Keep track of the videos you want to come back to.</p><button class="primary-button" type="button" data-action="open-playlist">Create playlist</button></div>`}`;
  } catch (error) { libraryEmpty("Your playlists", error.message, "open-playlist", "Create playlist"); }
}

async function renderLibrary() {
  if (!requireAuth(() => renderLibrary())) return;
  const renderId = ++state.renderId;
  setLoading("Loading your library…");
  try {
    const [playlists, history, uploads] = await Promise.all([
      request("/playlists"),
      request("/users/history"),
      getVideosForOwner(state.user._id),
    ]);
    if (renderId !== state.renderId) return;
      main.innerHTML = `<section class="page-head"><div><h1>Your library</h1><p>A home for everything you want to watch and make.</p></div><div class="page-actions"><button class="outline-button" type="button" data-action="open-channel">Create channel</button><button class="primary-button" type="button" data-action="open-upload">＋ Upload</button></div></section><section class="library-summary"><article class="stat-card"><b>${history.length}</b><span>Videos watched</span></article><article class="stat-card"><b>${playlists.length}</b><span>Playlists</span></article><article class="stat-card"><b>${state.user.username ? "@" + escapeHTML(state.user.username) : "You"}</b><span>Your channel</span></article></section><section class="section-heading"><h2>Your playlists</h2><button class="text-button" type="button" data-action="go-playlists">View all</button></section><div class="playlist-grid">${playlists.slice(0, 3).map((playlist) => `<article class="playlist-card"><div class="playlist-cover"><span class="playlist-count">${playlist.video?.length || 0} videos</span></div><div class="playlist-card-body"><h3>${escapeHTML(playlist.name)}</h3><p>${escapeHTML(playlist.description)}</p></div></article>`).join("") || `<div class="empty-state" style="min-height:auto"><p>Start collecting videos that matter to you.</p><button class="outline-button" type="button" data-action="open-playlist">New playlist</button></div>`}</div><section class="section-heading"><h2>Watch history</h2><button class="text-button" type="button" data-action="go-history">View history</button></section><div class="video-grid" id="history-grid"></div>`;
      renderVideoGrid(history.slice(0, 4), $("#history-grid"));
    const uploadsHeading = document.createElement("section");
    uploadsHeading.className = "section-heading library-uploads-heading";
    uploadsHeading.innerHTML = `<h2>Your uploads</h2><a class="text-button" href="#channel/${encodeURIComponent(state.user.username)}">View channel</a>`;
    const uploadsGrid = document.createElement("div");
    uploadsGrid.className = "video-grid";
    main.append(uploadsHeading, uploadsGrid);
    renderVideoGrid(uploads, uploadsGrid);
  } catch (error) { libraryEmpty("Your library", error.message, "home", "Explore videos"); }
}

async function renderShorts() {
  const videos = state.videos.length ? state.videos : await getVideos();
  main.innerHTML = `<section class="page-head"><div><h1>Shorts</h1><p>Quick ideas worth a pause.</p></div></section><div class="video-grid"></div>`;
  renderVideoGrid(videos.filter((video) => Number(video.duration) < 900));
}

// ---------- Posts (image-only) ----------

function renderPostComments(comments) {
  if (!comments.length) return `<p class="posts-empty">No comments yet.</p>`;
  return comments
    .map((comment) => {
      const owner = comment.owner || {};
      const own = state.user && String(owner._id) === String(state.user._id);
      return `<article class="comment" data-comment-id="${escapeAttribute(comment._id)}"><img src="${escapeAttribute(avatarFor(owner))}" alt="" /><div><span class="comment-name">${escapeHTML(owner.fullname || owner.username)}<span class="comment-time">${relativeDate(comment.createdAt)}</span></span><p>${escapeHTML(comment.content)}</p>${own ? `<button class="text-button comment-delete" type="button" data-action="delete-post-comment" data-comment-id="${escapeAttribute(comment._id)}">Delete</button>` : ""}</div></article>`;
    })
    .join("");
}

async function renderPosts() {
  main.innerHTML = `<section class="page-head"><div><h1>Posts</h1><p>Share moments as images — like and comment with your community.</p></div>${state.user ? `<button class="primary-button" type="button" data-action="open-post-composer"><span>＋</span> New post</button>` : ""}</section><div class="posts-list" id="posts-list"><div class="page-loading"><span class="spinner"></span><p>Loading posts…</p></div></div>`;

  let posts = [];
  try {
    const data = await request("/posts");
    posts = Array.isArray(data) ? data : [];
  } catch (error) {
    main.querySelector("#posts-list").innerHTML = `<p class="posts-empty">${escapeHTML(error.message || "Could not load posts.")}</p>`;
    return;
  }

  const list = main.querySelector("#posts-list");
  if (!posts.length) {
    list.innerHTML = `<p class="posts-empty">No posts yet. ${state.user ? "Create the first one!" : "Sign in to create the first one."}</p>`;
    return;
  }

  list.innerHTML = "";
  for (const post of posts) {
    const owner = post.owner || {};
    const own = state.user && String(owner._id) === String(state.user._id);
    const card = document.createElement("article");
    card.className = "post-card";
    card.dataset.postId = post._id;
    card.innerHTML = `
      <header class="post-head">
        <img class="channel-avatar" src="${escapeAttribute(avatarFor(owner))}" alt="" />
        <div class="post-owner"><strong>${escapeHTML(owner.fullname || owner.username || "Creator")}</strong><small>${escapeHTML(owner.username ? `@${owner.username}` : "")} · ${relativeDate(post.createdAt)}</small></div>
        ${own ? `<button class="more-button" type="button" data-action="delete-post" data-post-id="${escapeAttribute(post._id)}" aria-label="Delete post">🗑</button>` : ""}
      </header>
      <img class="post-image" src="${escapeAttribute(post.image)}" alt="${escapeAttribute(post.caption || "Post image")}" loading="lazy" />
      <div class="post-actions">
        <button class="post-like${post.liked ? " liked" : ""}" type="button" data-action="post-like" data-post-id="${escapeAttribute(post._id)}"><span>${post.liked ? "♥" : "♡"}</span> ${post.likesCount ?? 0}</button>
        <button class="text-button" type="button" data-action="post-comments" data-post-id="${escapeAttribute(post._id)}" data-open="false">💬 ${post.commentsCount ?? 0} comments</button>
      </div>
      ${post.caption ? `<p class="post-caption">${escapeHTML(post.caption)}</p>` : ""}
      <div class="post-comments" hidden></div>`;
    list.appendChild(card);
  }
}

async function togglePostComments(button) {
  const card = button.closest(".post-card");
  const panel = card?.querySelector(".post-comments");
  if (!panel) return;
  if (!panel.hidden) { panel.hidden = true; button.dataset.open = "false"; return; }
  panel.hidden = false;
  button.dataset.open = "true";
  panel.innerHTML = `<div class="page-loading"><span class="spinner"></span></div>`;
  try {
    const comments = await request(`/posts/${encodeURIComponent(button.dataset.postId)}/comments`);
    const list = Array.isArray(comments) ? comments : [];
    panel.innerHTML = `${state.user ? `<form class="comment-form post-comment-form"><img src="${escapeAttribute(avatarFor(state.user))}" alt="" /><div><textarea name="content" required maxlength="1000" placeholder="Add a comment…"></textarea><div class="comment-submit-row"><button class="submit-comment" type="submit">Comment</button></div></div></form>` : ""}<div class="post-comments-list">${renderPostComments(list)}</div>`;
  } catch (error) {
    panel.innerHTML = `<p class="posts-empty">${escapeHTML(error.message || "Could not load comments.")}</p>`;
  }
}

async function handleCreatePost(form) {
  const image = form.elements.image?.files?.[0];
  if (!image) return toast("Choose an image first.", "error");
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    await request("/posts", { method: "POST", body: new FormData(form) });
    form.reset();
    setModal("post-modal", false);
    toast("Post created!");
    renderPosts();
  } catch (error) {
    toast(error.message || "Could not create post.", "error");
  } finally { button.disabled = false; }
}

async function deletePost(postId) {
  if (!confirm("Delete this post permanently? Its comments and likes will also be removed.")) return;
  try {
    await request(`/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
    toast("Post deleted.");
    renderPosts();
  } catch (error) { toast(error.message, "error"); }
}

async function togglePostLike(postId, button) {
  if (!requireAuth()) return;
  try {
    const response = await request(`/posts/${encodeURIComponent(postId)}/like`, { method: "POST" });
    button.classList.toggle("liked", response.liked);
    button.querySelector("span").textContent = response.liked ? "♥" : "♡";
    button.childNodes[1].textContent = ` ${response.likesCount}`;
  } catch (error) { toast(error.message, "error"); }
}

async function postComment(form) {
  const card = form.closest(".post-card");
  const postId = card?.dataset.postId;
  const content = new FormData(form).get("content")?.trim();
  if (!postId || !content) return;
  try {
    await request(`/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
    const comments = await request(`/posts/${encodeURIComponent(postId)}/comments`);
    const listEl = card.querySelector(".post-comments-list");
    if (listEl) listEl.innerHTML = renderPostComments(comments);
    form.reset();
    const counter = card.querySelector("[data-action=post-comments]");
    if (counter) counter.textContent = `💬 ${comments.length} comments`;
  } catch (error) { toast(error.message, "error"); }
}

async function deletePostComment(commentId) {
  if (!confirm("Delete this comment?")) return;
  try {
    await request(`/posts/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
    const commentEl = main.querySelector(`.post-card [data-comment-id="${commentId}"]`);
    const card = commentEl?.closest(".post-card");
    commentEl?.remove();
    if (card) {
      const remaining = card.querySelectorAll(".post-comments-list [data-comment-id]").length;
      const counter = card.querySelector("[data-action=post-comments]");
      if (counter) counter.textContent = `💬 ${remaining} comments`;
    }
    toast("Comment deleted.");
  } catch (error) { toast(error.message, "error"); }
}

async function navigate() {
  const raw = decodeURIComponent(location.hash.slice(1) || "home");
  const [route, ...parts] = raw.split("/");
  $$(".nav-item").forEach((link) => link.classList.toggle("active", link.dataset.route === route));
  if (route === "watch") return renderWatch(parts.join("/"));
  if (route === "channel") return renderChannel(parts.join("/"));
  if (route === "search") return renderHome({ query: parts.join("/") });
  if (route === "subscriptions") return renderSubscriptions();
  if (route === "library") return renderLibrary();
  if (route === "history") return renderHistory();
  if (route === "playlists") return renderPlaylists();
  if (route === "shorts") return renderShorts();
  if (route === "posts") return renderPosts();
  return renderHome();
}

function goto(hash) { location.hash = hash; }

async function handleLogin(form) {
  const formData = new FormData(form);
  const identity = String(formData.get("identity") || "").trim();
  const password = String(formData.get("password") || "");
  if (!identity || !password) {
    toast("Enter your email or username and password.", "error");
    return;
  }

  const body = { password };
  if (identity.includes("@")) body.email = identity; else body.username = identity;
  const button = $("button[type=submit]", form);
  button.disabled = true; button.textContent = "Signing in…";
  try {
    state.token = "";
    const data = await request("/users/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!data?.accessToken || !data?.user) {
      throw new Error("Login response was incomplete. Please try again.");
    }
    state.token = data.accessToken;
    state.user = data.user;
    localStorage.setItem("streamly_access_token", state.token);
    localStorage.setItem("streamly_user", JSON.stringify(state.user));
    resetCreatorForms(); // never carry the previous account's draft into this session
    updateIdentityUI();
    setModal("auth-modal", false);
    setModal("register-modal", false);
    setModal("channel-modal", false);
    toast(`Welcome back, ${state.user.fullname || state.user.username}!`);
    state.afterLogin = null;
    goto("home");
  } catch (error) {
    toast(error.message || "Login failed. Check your credentials.", "error");
  }
  finally { button.disabled = false; button.innerHTML = "Sign in <span>→</span>"; }
}

async function handleRegister(form) {
  const button = $("button[type=submit]", form);
  button.disabled = true; button.textContent = "Creating account…";
  try {
    const formData = new FormData(form);
    const identity = String(formData.get("email") || formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");
    await request("/users/register", { method: "POST", body: formData });

    const loginBody = { password };
    if (identity.includes("@")) loginBody.email = identity;
    else loginBody.username = identity;

    const data = await request("/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginBody),
    });

    state.token = data.accessToken;
    state.user = data.user;
    localStorage.setItem("streamly_access_token", state.token);
    localStorage.setItem("streamly_user", JSON.stringify(state.user));
    updateIdentityUI();
    form.reset();
    setModal("register-modal", false);
    setModal("auth-modal", false);
    toast(`Welcome to NovaPlay, ${state.user.fullname || state.user.username}!`);
    goto("home");
  } catch (error) { toast(error.message, "error"); }
  finally { button.disabled = false; button.innerHTML = "Create account <span>→</span>"; }
}

async function handleChannel(form) {
  if (!requireAuth()) return;
  const button = $("button[type=submit]", form);
  const status = $("#channel-status");
  const data = new FormData(form);
  button.disabled = true;
  status.hidden = false;
  status.textContent = "Saving your channel…";
  try {
    const user = await request("/users/update-account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullname: data.get("fullname"), email: data.get("email") }),
    });
    const avatar = data.get("avatar");
    const coverImage = data.get("coverImage");
    if (avatar?.size) {
      await request("/users/avatar", { method: "PATCH", body: (() => { const body = new FormData(); body.append("avatar", avatar); return body; })() });
    }
    if (coverImage?.size) {
      await request("/users/cover-image", { method: "PATCH", body: (() => { const body = new FormData(); body.append("coverImage", coverImage); return body; })() });
    }
    state.user = { ...state.user, ...user };
    localStorage.setItem("streamly_user", JSON.stringify(state.user));
    updateIdentityUI();
    form.reset();
    setModal("channel-modal", false);
    toast("Your channel is ready.");
    renderLibrary();
  } catch (error) {
    status.textContent = error.message;
    toast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Save channel";
  }
}

async function handleLogout() {
  try {
    if (state.token) await request("/users/logout", { method: "POST" });
  } catch {
    // Clear local session even when the server cannot be reached.
  } finally {
    state.token = "";
    state.user = null;
    state.afterLogin = null;
    localStorage.removeItem("streamly_access_token");
    localStorage.removeItem("streamly_user");
    resetCreatorForms(); // wipe any draft so the next account starts clean
    setModal("channel-modal", false);
    setModal("auth-modal", false);
    setModal("register-modal", false);
    updateIdentityUI();
    toast("You have been logged out.");
    goto("home");
  }
}

async function handleUpload(form) {
  if (!requireAuth()) return;
  const button = $("button[type=submit]", form);
  const status = $("#upload-status");
  const videoFile = form.elements.videoFile?.files?.[0];
  const thumbnail = form.elements.thumbnail?.files?.[0];
  if (!videoFile || !thumbnail) {
    toast("Select both a video file and a thumbnail.", "error");
    return;
  }
  const sizeMB = (videoFile.size / (1024 * 1024)).toFixed(1);
  if (videoFile.size > 500 * 1024 * 1024) {
    toast("Video must be smaller than 500 MB.", "error");
    return;
  }
  button.disabled = true; status.hidden = false; status.textContent = "Uploading your video. Keep this window open…";
  status.textContent = `Uploading ${videoFile.name} (${sizeMB} MB)…`;
  try {
    const video = await request("/videos", { method: "POST", body: new FormData(form) });
    form.reset();
    setModal("upload-modal", false);
    toast("Your video is live!");
    goto(`watch/${video._id}`);
  } catch (error) { status.textContent = error.message; toast(error.message, "error"); }
  finally { button.disabled = false; button.innerHTML = "Publish video <span>↑</span>"; }
}

async function handleComment(form) {
  const content = new FormData(form).get("content")?.trim();
  if (!content || !state.activeVideo || !requireAuth()) return;
  const button = $("button[type=submit]", form);
  button.disabled = true;
  try {
    const comment = isDemo(state.activeVideo._id)
      ? { _id: `demo-comment-${Date.now()}`, content, createdAt: new Date().toISOString(), owner: state.user }
      : await request(`/comments/video/${state.activeVideo._id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
    const list = $("#comment-list");
    if (list.querySelector(".empty-state")) list.replaceChildren();
    list.insertAdjacentHTML("afterbegin", commentMarkup(comment));
    form.reset();
    toast("Comment added.");
  } catch (error) { toast(error.message, "error"); }
  finally { button.disabled = false; }
}

async function handlePlaylist(form) {
  if (!requireAuth()) return;
  const button = $("button[type=submit]", form);
  button.disabled = true;
  try {
    const body = Object.fromEntries(new FormData(form));
    const playlist = await request("/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (state.pendingVideoId && !isDemo(state.pendingVideoId)) {
      await request(`/playlists/${playlist._id}/videos/${state.pendingVideoId}`, { method: "POST" });
      state.pendingVideoId = null;
      toast("Playlist created and video saved.");
    } else toast("Playlist created.");
    form.reset(); setModal("playlist-modal", false);
    if (location.hash === "#playlists") renderPlaylists();
  } catch (error) { toast(error.message, "error"); }
  finally { button.disabled = false; button.textContent = "Create playlist"; }
}

async function toggleLike(videoId, element) {
  if (!requireAuth()) return;
  try {
    const response = isDemo(videoId) ? { liked: !element.classList.contains("liked") } : await request("/likes/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId }) });
    element.classList.toggle("liked", response.liked);
    element.firstChild.textContent = response.liked ? "♥ " : "♡ ";
    toast(response.liked ? "Added to liked videos." : "Removed from liked videos.");
  } catch (error) { toast(error.message, "error"); }
}

async function toggleSubscription(channelId, element) {
  if (!requireAuth()) return;
  if (String(channelId) === String(state.user._id)) return toast("This is your channel.");
  try {
    const result = await request(`/subscriptions/c/${channelId}`, { method: "POST" });
    element.classList.toggle("subscribed", result.subscribed);
    element.textContent = result.subscribed ? "Subscribed" : "Subscribe";
    toast(result.subscribed ? "Subscribed to channel." : "Subscription removed.");
    loadMiniSubscriptions();
  } catch (error) { toast(error.message, "error"); }
}

async function saveVideo(videoId) {
  if (!requireAuth()) return;
  if (isDemo(videoId)) return toast("Sign in to the backend and save a published video to a playlist.");
  try {
    const playlists = await request("/playlists");
    if (!playlists.length) {
      state.pendingVideoId = videoId;
      setModal("playlist-modal", true);
      return;
    }
    await request(`/playlists/${playlists[0]._id}/videos/${videoId}`, { method: "POST" });
    toast(`Saved to “${playlists[0].name}”.`);
  } catch (error) { toast(error.message, "error"); }
}

async function shareVideo(videoId) {
  const url = `${location.origin}${location.pathname}#watch/${videoId}`;
  try { await navigator.clipboard.writeText(url); toast("Video link copied to your clipboard."); }
  catch { toast("Copy this link: " + url); }
}

function updateTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  localStorage.setItem("streamly_theme_v2", next);
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const menuItem = event.target.closest("[data-menu-action]");
    if (menuItem) {
      closeVideoMenu();
      if (menuItem.dataset.menuAction === "delete") deleteVideo(menuItem.dataset.videoId);
      else goto(`watch/${menuItem.dataset.videoId}`);
      return;
    }
    if (!event.target.closest("#video-menu")) closeVideoMenu();
    const channel = event.target.closest(".channel-link");
    if (channel?.dataset.channel) { goto(`channel/${encodeURIComponent(channel.dataset.channel)}`); return; }
    const videoThumb = event.target.closest(".video-thumb");
    if (videoThumb?.dataset.videoId) { goto(`watch/${videoThumb.dataset.videoId}`); return; }
    const suggested = event.target.closest(".suggested-card");
    if (suggested?.dataset.videoId) { goto(`watch/${suggested.dataset.videoId}`); return; }
    const category = event.target.closest("[data-category]");
    if (category) { state.activeCategory = category.dataset.category; renderHome(); return; }
    const tab = event.target.closest("[data-auth-tab]");
    if (tab) { setAuthTab(tab.dataset.authTab); return; }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "close-modal") { button.closest("dialog")?.close(); return; }
    if (action === "open-login") { setModal("register-modal", false); setAuthTab("login"); return; }
    if (action === "open-register") { setModal("auth-modal", false); setAuthTab("register"); return; }
    if (action === "open-channel") { if (requireAuth()) { $("#channel-form [name=fullname]").value = state.user?.fullname || ""; $("#channel-form [name=email]").value = state.user?.email || ""; setModal("channel-modal", true); } return; }
    if (action === "logout") { handleLogout(); return; }
    if (action === "open-upload") { if (requireAuth()) { resetCreatorForms(); setModal("upload-modal", true); } return; }
    if (action === "open-playlist") { if (requireAuth()) { resetCreatorForms(); setModal("playlist-modal", true); } return; }
    if (action === "open-post-composer") { if (requireAuth()) { resetCreatorForms(); setModal("post-modal", true); } return; }
    if (action === "post-like") { togglePostLike(button.dataset.postId, button); return; }
    if (action === "post-comments") { togglePostComments(button); return; }
    if (action === "delete-post") { deletePost(button.dataset.postId); return; }
    if (action === "delete-post-comment") { deletePostComment(button.dataset.commentId); return; }
    if (action === "toggle-theme") { updateTheme(); return; }
    if (action === "toggle-sidebar") { document.body.classList.toggle("sidebar-collapsed"); return; }
    if (action === "open-account") { state.user ? setModal("channel-modal", true) : setModal("auth-modal", true); return; }
    if (action === "mobile-search") { const value = window.prompt("Search NovaPlay"); if (value?.trim()) goto(`search/${encodeURIComponent(value.trim())}`); return; }
    if (action === "explore-featured") { state.activeCategory = "Design"; renderHome(); return; }
    if (action === "reset-search") { state.activeCategory = "All"; goto("home"); return; }
    if (action === "like") { toggleLike(button.dataset.videoId, button); return; }
    if (action === "subscribe") { toggleSubscription(button.dataset.channelId, button); return; }
    if (action === "save-video") { saveVideo(button.dataset.videoId); return; }
    if (action === "share-video") { shareVideo(button.dataset.videoId); return; }
    if (action === "video-menu") { openVideoMenu(button); return; }
    if (action === "delete-video") { deleteVideo(button.dataset.videoId); return; }
    if (action === "go-playlists") { goto("playlists"); return; }
    if (action === "go-history") { goto("history"); return; }
    if (action === "home") { goto("home"); }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "search-form") { event.preventDefault(); const query = new FormData(event.target).get("search") || $("#search-input").value; if (query.trim()) goto(`search/${encodeURIComponent(query.trim())}`); return; }
    if (event.target.id === "login-form") { event.preventDefault(); handleLogin(event.target); return; }
    if (event.target.id === "register-form") { event.preventDefault(); handleRegister(event.target); return; }
    if (event.target.id === "channel-form") { event.preventDefault(); handleChannel(event.target); return; }
    if (event.target.id === "upload-form") { event.preventDefault(); handleUpload(event.target); return; }
    if (event.target.id === "playlist-form") { event.preventDefault(); handlePlaylist(event.target); return; }
    if (event.target.id === "post-form") { event.preventDefault(); handleCreatePost(event.target); return; }
    if (event.target.classList?.contains("post-comment-form")) { event.preventDefault(); postComment(event.target); return; }
    if (event.target.id === "comment-form") { event.preventDefault(); handleComment(event.target); }
  });

  $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
}

async function restoreSession() {
  if (!state.token) return;
  try {
    state.user = await request("/users/current-user");
    localStorage.setItem("streamly_user", JSON.stringify(state.user));
  } catch {
    state.token = ""; state.user = null;
    localStorage.removeItem("streamly_access_token");
    localStorage.removeItem("streamly_user");
  }
}

async function boot() {
  // Light buttery theme is the new default (v2 key ignores the old dark choice).
  document.documentElement.dataset.theme = localStorage.getItem("streamly_theme_v2") || "light";
  bindEvents();
  await restoreSession();
  updateIdentityUI();
  window.addEventListener("hashchange", navigate);
  navigate();
}

boot();
