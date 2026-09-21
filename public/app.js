// Smart API host that covers every way the site is opened:
// - opened from the app server itself (localhost:8000 or the deployed domain)
//   → same-origin API.
// - opened from VS Code Live Server / another dev port, or straight from disk
//   (file://) → fall back to the API server on http://localhost:8000 (this is
//   what caused "Request failed (405)" — dev servers reject POST).
// - split deployments → set window.API_HOST in index.html.
const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const isFileProtocol = window.location.protocol === "file:";
const isLocalDevPort = localHostnames.has(window.location.hostname) && window.location.port !== "8000";
const API_HOST = window.API_HOST || (isFileProtocol || isLocalDevPort ? "http://localhost:8000" : window.location.origin);
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
  uploadVideoDuration: null,
  live: {
    previewStream: null,
    room: null,
    dbStream: null,
    recorder: null,
    chunks: [],
    facingMode: "user",
    micOn: true,
    camOn: true,
    viewerTimer: null,
    lastRecording: null, // Blob kept in memory so a failed upload can be retried
    recordingFor: null,  // stream id the blob belongs to
    startedAtMs: null,   // when the broadcast actually started (min-duration guard)
    publishedTracks: [], // LiveKit publications made from the preview tracks
    isHost: false,       // this tab is broadcasting (studio) vs watching
  },
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

function avatarFor(owner) {
  // owner can be null when the account behind a video/stream was deleted while
  // its content remains — default parameters do not apply to explicit null.
  const o = owner || {};
  return o.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(o.fullname || o.username || "NovaPlay")}&background=f4c95d&color=33290f&bold=true`;
}

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

let refreshingPromise = null;

// ---------- Shared button spinner (real request state, no fake timers) ----------
const SPINNER_SVG = `<svg class="button-spinner spinner-spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>`;

// Swap a button into its loading state and return a restore() function that
// always runs (success or failure), so a button can never stay stuck.
function setButtonLoading(button, label, { icon = null } = {}) {
  if (!button) return () => {};
  if (button.dataset.busy === "1") return () => {}; // duplicate-submit guard
  button.dataset.busy = "1";
  button.disabled = true;
  const original = button.innerHTML;
  button.innerHTML = `${icon ? `<span aria-hidden="true">${icon}</span>` : ""}${SPINNER_SVG}<span class="button-spinner-label">${escapeHTML(label)}</span>`;
  return () => {
    button.dataset.busy = "";
    button.disabled = false;
    button.innerHTML = original;
  };
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(1)} GB`;
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

// fetch() has no timeout; without one a hung connection leaves spinners
// spinning forever. AbortError surfaces as a friendly network error.
// Identical in-flight GETs are collapsed to one network request (double render
// guards, mini-subscriptions etc. previously fired true duplicate calls).
const inflightGets = new Map();
async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 30000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // `dedupe: false` opts out (e.g. volatile per-user lists); otherwise identical
  // in-flight GETs share one network request.
  const shared = !options.method && options.dedupe !== false && !inflightGets.has(path);
  if (shared) {
    inflightGets.set(
      path,
      requestOnce(path, options, controller.signal).finally(() => inflightGets.delete(path))
    );
  }
  try {
    return shared ? await inflightGets.get(path) : await requestOnce(path, options, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function requestOnce(path, options = {}, signal) {
  // Strip app-only option keys so fetch never sees an invalid RequestInit.
  const { timeoutMs, dedupe, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
  const response = await fetch(`${API}${path}`, { credentials: "include", signal, ...fetchOptions, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const isAuthCall = path.startsWith("/users/login") || path.startsWith("/users/refresh-token");
    if (response.status === 401 && !isAuthCall && state.token) {
      try {
        await refreshSession();
        return await requestOnce(path, options, signal);
      } catch {
        // refresh failed — fall through to the normal error below
      }
    }
    const error = new Error(payload.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

// Direct browser → Cloudinary upload using a signature the API server minted.
// The media bytes never pass through our API server, so hosts that cap request
// body size (Vercel serverless → 413 above ~4.5 MB) cannot reject big videos.
// XHR again, so we get real upload progress.
function uploadFileToCloudinary(file, signature, resourceType, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`;
    const body = new FormData();
    body.append("file", file, file.name);
    body.append("api_key", signature.apiKey);
    body.append("timestamp", String(signature.timestamp));
    body.append("signature", signature.signature);
    body.append("folder", signature.folder);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
    }
    xhr.onload = () => {
      let payload = {};
      try { payload = JSON.parse(xhr.responseText || "{}"); } catch { /* non-JSON error body */ }
      if (xhr.status >= 200 && xhr.status < 300 && payload.secure_url) return resolve(payload);
      reject(new Error(payload?.error?.message || `Media upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(body);
  });
}

// XHR-based request for uploads: fetch cannot report progress. Reports real
// bytes-on-the-wire percentage; no fake numbers.
function uploadWithProgress(path, { method = "POST", body, onProgress, timeoutMs = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API}${path}`);
    if (state.token) xhr.setRequestHeader("Authorization", `Bearer ${state.token}`);
    xhr.withCredentials = true;
    if (timeoutMs) xhr.timeout = timeoutMs;
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
    }
    xhr.onload = () => {
      let payload = {};
      try { payload = JSON.parse(xhr.responseText || "{}"); } catch { /* non-JSON error body */ }
      if (xhr.status >= 200 && xhr.status < 300 && payload.success !== false) return resolve(payload.data);
      const error = new Error(payload.message || `Upload failed (${xhr.status})`);
      error.status = xhr.status;
      reject(error);
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try again, or use a smaller file."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(body);
  });
}

// Access tokens expire after 1 day. When that happens the server answers 401;
// silently exchange the refresh-token cookie for a fresh pair and retry once,
// so people are not logged out every day.
async function refreshSession() {
  if (!refreshingPromise) {
    refreshingPromise = request("/users/refresh-token", { method: "POST", timeoutMs: 15000 })
      .then((data) => {
        if (data?.accessToken) {
          state.token = data.accessToken;
          localStorage.setItem("streamly_access_token", state.token);
        }
      })
      .finally(() => { refreshingPromise = null; });
  }
  return refreshingPromise;
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

// Cream-themed shimmering skeletons for page shells — the layout paints
// instantly while data loads, so the app never sits on a blank screen.
function skeletonGrid(count = 12) {
  return Array.from({ length: count }, () => `<div class="video-card skeleton-card"><div class="skeleton-thumb shimmer"></div><div class="video-meta"><div class="skeleton-avatar shimmer"></div><div><div class="skeleton-line shimmer"></div><div class="skeleton-line short shimmer"></div></div></div></div>`).join("");
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
  resetUploadPreviews();
}

// ---------- Upload: file selection preview + real progress ----------

function resetUploadPreviews() {
  const videoPreviewBox = $("#video-file-preview");
  const videoPlayer = $("#video-preview-player");
  const thumbPreview = $("#thumbnail-preview");
  const progress = $("#upload-progress");
  state.uploadVideoDuration = null;
  if (videoPlayer?.dataset.objectUrl) URL.revokeObjectURL(videoPlayer.dataset.objectUrl);
  if (thumbPreview?.dataset.objectUrl) URL.revokeObjectURL(thumbPreview.dataset.objectUrl);
  if (videoPreviewBox) videoPreviewBox.hidden = true;
  if (thumbPreview) { thumbPreview.hidden = true; thumbPreview.removeAttribute("src"); }
  if (progress) progress.hidden = true;
  const fill = $("#upload-progress-fill");
  if (fill) fill.style.width = "0%";
  const percent = $("#upload-progress-percent");
  if (percent) percent.textContent = "0%";
}

function showVideoFilePreview(file) {
  const box = $("#video-file-preview");
  const name = $("#video-file-name");
  const size = $("#video-file-size");
  const player = $("#video-preview-player");
  if (!box || !player) return;
  if (player.dataset.objectUrl) URL.revokeObjectURL(player.dataset.objectUrl);
  const url = URL.createObjectURL(file);
  player.dataset.objectUrl = url;
  player.src = url;
  if (name) name.textContent = file.name;
  if (size) size.textContent = formatBytes(file.size);
  box.hidden = false;
}

function showThumbnailPreview(file) {
  const preview = $("#thumbnail-preview");
  if (!preview) return;
  if (preview.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
  const url = URL.createObjectURL(file);
  preview.dataset.objectUrl = url;
  preview.src = url;
  preview.hidden = false;
}

function bindUploadForm() {
  const form = $("#upload-form");
  if (!form) return;
  const videoInput = form.elements.videoFile;
  const thumbInput = form.elements.thumbnail;

  videoInput?.addEventListener("change", () => {
    const file = videoInput.files?.[0];
    resetUploadPreviews();
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      videoInput.value = "";
      toast("That file is not a video. Choose an MP4, WebM or MOV file.", "error");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      videoInput.value = "";
      toast(`Video is ${formatBytes(file.size)} — the limit is 500 MB.`, "error");
      return;
    }
    showVideoFilePreview(file);
  });

  thumbInput?.addEventListener("change", () => {
    const file = thumbInput.files?.[0];
    if (thumbInput.parentElement instanceof HTMLElement) thumbInput.parentElement.hidden = Boolean(file);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      thumbInput.value = "";
      toast("Thumbnails must be an image (JPG or PNG).", "error");
      return;
    }
    showThumbnailPreview(file);
  });

  // Read the real duration off the preview player as soon as the browser can
  // decode the header — the DB then gets a sensible duration immediately.
  const previewPlayer = $("#video-preview-player");
  previewPlayer?.addEventListener("loadedmetadata", () => {
    state.uploadVideoDuration = Number.isFinite(previewPlayer.duration) && previewPlayer.duration > 0
      ? Math.round(previewPlayer.duration)
      : null;
  });

  form.addEventListener("reset", () => resetUploadPreviews());
}

async function handleUpload(form) {
  if (!requireAuth()) return;
  const button = $("#upload-submit");
  if (button?.dataset.busy === "1") return; // duplicate upload guard
  const status = $("#upload-status");
  const footerStatus = $("#upload-status-footer");
  const setStatus = (message) => {
    if (status) { status.hidden = !message; status.textContent = message; }
    if (footerStatus) { footerStatus.hidden = !message; footerStatus.textContent = message; }
  };
  const videoFile = form.elements.videoFile?.files?.[0];
  const thumbnail = form.elements.thumbnail?.files?.[0];
  const title = String(form.elements.title?.value || "").trim();
  const description = String(form.elements.description?.value || "").trim();
  if (!videoFile || !thumbnail) {
    toast("Select both a video file and a thumbnail.", "error");
    return;
  }
  if (!title) {
    toast("Give your video a title before publishing.", "error");
    return;
  }
  if (videoFile.size > 500 * 1024 * 1024) {
    toast("Video must be smaller than 500 MB.", "error");
    return;
  }

  const restore = setButtonLoading(button, "Publishing...", { icon: "↑" });
  const progressBox = $("#upload-progress");
  const fill = $("#upload-progress-fill");
  const percentLabel = $("#upload-progress-percent");
  if (progressBox) progressBox.hidden = false;
  setStatus("Uploading your video… You can keep this window open.");

  try {
    // 1. Ask our API for a short-lived Cloudinary signature.
    // 2. Push the video + thumbnail straight to Cloudinary from the browser.
    // 3. Register both URLs with the API. The video bytes never touch our
    //    server, so serverless body-size limits (Vercel → 413) never apply.
    setStatus("Preparing secure upload…");
    const signature = await request("/videos/upload-signature", { timeoutMs: 15000 });

    const videoUpload = await uploadFileToCloudinary(videoFile, signature, "video", {
      onProgress: (percent) => {
        if (fill) fill.style.width = `${Math.floor(percent / 2)}%`;
        if (percentLabel) percentLabel.textContent = `${percent}%`;
      },
    });
    if (fill) fill.style.width = "50%";
    if (percentLabel) percentLabel.textContent = "100%";
    setStatus("Uploading thumbnail…");

    const thumbUpload = await uploadFileToCloudinary(thumbnail, signature, "image");
    if (fill) fill.style.width = "75%";
    setStatus("Publishing your video…");

    const video = await request("/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        videoUrl: videoUpload.secure_url,
        thumbnailUrl: thumbUpload.secure_url,
        duration: state.uploadVideoDuration || undefined,
      }),
      timeoutMs: 30000,
    });
    if (fill) fill.style.width = "100%";
    if (percentLabel) percentLabel.textContent = "100%";
    form.reset();
    resetUploadPreviews();
    setModal("upload-modal", false);
    toast("Your video is live!");
    goto(`watch/${video._id}`);
  } catch (error) {
    if (progressBox) progressBox.hidden = true;
    setStatus(`Upload failed: ${error.message}`);
    toast(error.message || "Upload failed. Please try again.", "error");
    // Give the user a one-tap retry instead of refilling the form.
    if (button && button.dataset.busy !== "1") { /* restore() already ran */ }
    window.__retryUpload = () => {
      delete window.__retryUpload;
      setStatus("");
      handleUpload(form);
    };
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "outline-button wide";
    retry.textContent = "Retry upload";
    retry.addEventListener("click", () => window.__retryUpload?.());
    footerStatus?.after(retry);
    setTimeout(() => retry.remove(), 15000);
  } finally {
    restore();
  }
}

function requireAuth(afterLogin) {
  if (state.user && state.token) return true;
  if (afterLogin) {
    state.afterLogin = afterLogin;
    // Remember the intended destination so login can return the user there
    // (used by goto after a successful login).
    const intended = location.hash.replace(/^#/, "");
    if (intended && intended !== "home") state.afterLoginRoute = intended;
  }
  setAuthTab("login");
  setModal("auth-modal", true);
  toast("Please sign in to continue.", "error");
  return false;
}

// The You tab in the bottom bar shows the user's avatar like YouTube's account
// tab; a static glyph is the fallback for guests and small screens.
function updateYouTab() {
  const avatar = $("#you-tab-avatar");
  if (!avatar) return;
  if (state.user?.avatar) {
    avatar.src = state.user.avatar;
    avatar.alt = "Your account";
  } else {
    avatar.removeAttribute("src");
    avatar.alt = "";
  }
}

function updateIdentityUI() {
  updateYouTab();
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

let miniSubscriptionsPromise = null;
async function loadMiniSubscriptions() {
  if (!state.user) return;
  // One subscription lookup per login/refresh, no matter how many callers.
  if (!miniSubscriptionsPromise) {
    miniSubscriptionsPromise = request("/subscriptions/user", { dedupe: false })
      .catch(() => [])
      .finally(() => { miniSubscriptionsPromise = null; });
  }
  const subscriptions = await miniSubscriptionsPromise;
  const list = $("#subscription-list");
  if (!list) return;
  list.innerHTML = subscriptions.slice(0, 5).map(({ channel }) => channel ? `<a class="subscription-mini-item" href="#channel/${encodeURIComponent(channel.username)}"><img src="${escapeAttribute(avatarFor(channel))}" alt="" /><span>${escapeHTML(channel.fullname || channel.username)}</span></a>` : "").join("");
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
  thumbImage.loading = "lazy";
  thumbImage.decoding = "async";
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
  if (!query) {
    // Instant shell: categories and copy paint immediately; only the grid area
    // shows a loading placeholder while the feed request is in flight.
    main.innerHTML = `
    <section class="page-head">
      <div><h1>Good evening, explore something new.</h1><p>Fresh stories, ideas and skills from your community.</p></div>
      <button class="outline-button" type="button" data-action="open-upload">Upload video</button>
    </section>
    <section class="hero" style="--hero-image:url('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1500&q=85')"><div class="hero-content"><span class="eyebrow">Featured collection</span><h1>Small stories. Big ideas.</h1><p>Thoughtful videos from creators making their own corner of the internet a little more interesting.</p><button class="primary-button" type="button" data-action="explore-featured">Explore the collection <span>→</span></button></div></section>
    <div class="chips" aria-label="Video topics">${["All", "Tech", "Travel", "Design", "Food", "Productivity", "Photography"].map((category) => `<button class="chip ${category === state.activeCategory ? "active" : ""}" type="button" data-category="${category}">${category}</button>`).join("")}</div>
    <section><div class="video-grid">${skeletonGrid(12)}</div></section>`;
  } else {
    setLoading(`Searching for “${query}”…`);
  }
  const videos = await getVideos(query);
  if (renderId !== state.renderId) return;
  state.videos = videos;
  const categories = ["All", "Tech", "Travel", "Design", "Food", "Productivity", "Photography"];
  const selected = state.activeCategory;
  const filtered = selected === "All" ? videos : videos.filter((video) => video.category === selected || video.title.toLowerCase().includes(selected.toLowerCase()));
  const grid = $(".video-grid", main);
  if (grid) {
    renderVideoGrid(filtered, grid);
    return;
  }
  // Search results (or any path that skipped the shell) render the full page.
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
  // An empty id (e.g. a stale "#watch" link) must show the unavailable state,
  // not a garbage player — the server answers GET /videos/ with the whole list.
  if (!videoId) {
    main.innerHTML = `<div class="empty-state"><span class="empty-icon">!</span><h2>That video is unavailable</h2><p>It may have been removed, made private, or the link is incorrect.</p><a href="#home" class="primary-button">Back to home</a></div>`;
    return;
  }
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
  // Independent requests run in parallel (channel profile + its videos).
  let channel;
  let videos = [];
  try {
    [channel, videos] = await Promise.all([
      request(`/users/c/${encodeURIComponent(username)}`),
      getVideosForOwnerByName(username),
    ]);
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

// Channel pages know the username, not the id — resolve videos without
// waiting for the profile request first.
async function getVideosForOwnerByName(username) {
  try {
    const data = await request(`/videos?${new URLSearchParams({ username, limit: "36" })}`);
    return (data.videos || data.docs || data || []).map(normaliseVideo);
  } catch {
    return demoVideos.filter((video) => video.owner.username === username);
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
    // One request for every subscribed channel's videos (owner IDs joined in
    // the query) instead of one request per channel.
    const ownerIds = subscriptions.map((item) => item.channel?._id).filter(Boolean).map(String);
    const data = ownerIds.length ? await request(`/videos?${new URLSearchParams({ userIds: ownerIds.join(","), limit: "36" })}`) : { videos: [] };
    if (renderId !== state.renderId) return;
    const videos = (data.videos || data.docs || data || []).map(normaliseVideo);
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
      const username = state.user.username;
      main.innerHTML = `<section class="page-head"><div><h1>Library</h1><p>Everything you make and save, in one place.</p></div><div class="page-actions"><button class="primary-button" type="button" data-action="open-upload">＋ Upload</button></div></section><section class="library-summary"><article class="stat-card"><b>${history.length}</b><span>Videos watched</span></article><article class="stat-card"><b>${playlists.length}</b><span>Playlists</span></article><article class="stat-card"><b>${state.user.username ? "@" + escapeHTML(state.user.username) : "You"}</b><span>Your channel</span></article></section><section class="section-heading"><h2>Your playlists</h2><button class="text-button" type="button" data-action="go-playlists">View all</button></section><div class="playlist-grid">${playlists.slice(0, 3).map((playlist) => `<article class="playlist-card"><div class="playlist-cover"><span class="playlist-count">${playlist.video?.length || 0} videos</span></div><div class="playlist-card-body"><h3>${escapeHTML(playlist.name)}</h3><p>${escapeHTML(playlist.description)}</p></div></article>`).join("") || `<div class="empty-state" style="min-height:auto"><p>Start collecting videos that matter to you.</p><button class="outline-button" type="button" data-action="open-playlist">New playlist</button></div>`}</div><section class="section-heading"><h2>Watch history</h2><button class="text-button" type="button" data-action="go-history">View history</button></section><div class="video-grid" id="history-grid"></div><section class="section-heading library-uploads-heading" id="library-uploads-heading"><h2>Your uploads</h2><a class="text-button" href="#channel/${encodeURIComponent(username || "")}">View channel</a></section><div class="video-grid" id="library-uploads"></div>`;
      renderVideoGrid(history.slice(0, 4), $("#history-grid"));
    renderVideoGrid(uploads, $("#library-uploads"));
  } catch (error) { libraryEmpty("Your library", error.message, "home", "Explore videos"); }
}

// ---------- Live streaming (real broadcasts via LiveKit) ----------
// Architecture: the browser publishes camera/mic to a LiveKit Cloud room using
// a short-lived JWT our API mints (secrets stay server-side). The host's own
// browser records the composite broadcast with MediaRecorder while streaming;
// on "End live" the recording uploads to Cloudinary and is registered as a
// normal Video. Viewers subscribe through LiveKit's SFU — the server never
// relays media, so this scales beyond a single box.

const liveConfigured = async () => {
  try {
    const { configured } = await request("/live/config", { timeoutMs: 10000 });
    return Boolean(configured);
  } catch { return false; }
};

async function renderLive() {
  const renderId = ++state.renderId;
  const [liveNow, mine] = await Promise.all([
    request("/live", { timeoutMs: 15000 }).catch(() => ({ streams: [] })),
    state.user ? request("/live/mine", { dedupe: false, timeoutMs: 15000 }).catch(() => null) : Promise.resolve(null),
  ]);
  if (renderId !== state.renderId) return;
  const configured = await liveConfigured();
  const groups = mine?.groups || { live: [], scheduled: [], upcoming: [], processing: [], completed: [] };
  const streamCard = (stream) => `
    <article class="live-stream-card glass" data-stream-id="${escapeAttribute(stream._id)}">
      <button class="live-card-thumb" type="button" data-action="open-watch-live" data-stream-id="${escapeAttribute(stream._id)}">
        ${stream.thumbnail ? `<img src="${escapeAttribute(stream.thumbnail)}" alt="" />` : ""}
        ${stream.status === "live" ? '<span class="live-card-badge">● LIVE</span>' : ''}
        ${stream.status === "scheduled" ? '<span class="live-card-badge scheduled">⏰ Scheduled</span>' : ''}
        ${stream.recording?.video ? '<span class="live-card-badge replay">▶ Replay</span>' : ''}
      </button>
      <div class="live-card-body">
        <h3>${escapeHTML(stream.title)}</h3>
        <p>${escapeHTML(stream.description || "No description")}</p>
        <div class="live-card-meta">
          ${stream.status === "live" ? `<span>👥 ${stream.peakViewers || 0} watching</span>` : ""}
          ${stream.startedAt ? `<span>Started ${relativeDate(stream.startedAt)}</span>` : ""}
        </div>
        <div class="live-card-actions">
          ${stream.status === "live" ? `<button class="action-button" type="button" data-action="open-watch-live" data-stream-id="${escapeAttribute(stream._id)}">Watch</button>` : ""}
          ${stream.status === "live" ? `<button class="action-button danger" type="button" data-action="live-end-from-dashboard" data-stream-id="${escapeAttribute(stream._id)}">End</button>` : ""}
          ${stream.recording?.video ? `<button class="action-button" type="button" data-action="open-recording" data-video-id="${escapeAttribute(stream.recording.video._id || stream.recording.video)}">▶ Recording</button>` : ""}
          ${["scheduled", "ended", "failed"].includes(stream.status) ? `<button class="action-button" type="button" data-action="live-edit" data-stream-id="${escapeAttribute(stream._id)}">Edit</button>` : ""}
          ${stream.status !== "live" ? `<button class="action-button danger" type="button" data-action="live-delete" data-stream-id="${escapeAttribute(stream._id)}">Delete</button>` : ""}
        </div>
        ${stream.status === "processing" ? '<p class="live-processing-note">⏳ Recording is being finalised… this page updates when it is ready.</p>' : ""}
        ${stream.status === "failed" ? '<p class="live-failed-note">⚠ Recording failed — press Edit → retry, or delete this entry.</p>' : ""}
      </div>
    </article>`;
  main.innerHTML = `
    <section class="page-head">
      <div><h1>Live</h1><p>Real-time streams from creators you follow — and your own broadcast studio.</p></div>
      <button class="primary-button" type="button" data-action="open-live-studio" ${configured ? "" : "disabled title='Live streaming is not configured on this server'"}>● Go live</button>
    </section>
    ${!configured ? `<section class="live-config-warning glass"><strong>Live streaming is not configured on this server yet.</strong><p>The Go live button needs LiveKit credentials (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET — free at cloud.livekit.io) set as environment variables. Everything else keeps working.</p></section>` : ""}
    ${state.user ? `
    <section class="live-dashboard">
      <h2 class="section-heading">Your streams</h2>
      ${groups.live.length ? `<div class="live-group"><h3>● Live now</h3><div class="live-stream-grid">${groups.live.map(streamCard).join("")}</div></div>` : ""}
      ${groups.processing.length ? `<div class="live-group"><h3>⏳ Finalising recordings</h3><div class="live-stream-grid">${groups.processing.map(streamCard).join("")}</div></div>` : ""}
      ${[...groups.scheduled, ...groups.upcoming].length ? `<div class="live-group"><h3>⏰ Scheduled</h3><div class="live-stream-grid">${[...groups.scheduled, ...groups.upcoming].map(streamCard).join("")}</div></div>` : ""}
      ${groups.completed.length ? `<div class="live-group"><h3>📼 Completed</h3><div class="live-stream-grid">${groups.completed.map(streamCard).join("")}</div></div>` : ""}
      ${!groups.live.length && !groups.scheduled.length && !groups.upcoming.length && !groups.completed.length && !groups.processing.length ? '<div class="empty-state" style="min-height:auto"><p>You have not streamed yet. Hit “Go live” to start your first broadcast.</p></div>' : ""}
    </section>` : `<section class="empty-state glass" style="min-height:auto"><p>Sign in to run your own live streams.</p><button class="outline-button" type="button" data-action="open-login">Sign in</button></section>`}
    <section class="live-now-section">
      <h2 class="section-heading">Live right now</h2>
      ${liveNow.streams.length ? `<div class="video-grid">${liveNow.streams.map((stream) => createLiveRailCard(stream)).join("")}</div>` : '<div class="empty-state" style="min-height:auto"><p>No one is live at the moment. Start the first stream!</p></div>'}
    </section>`;
}

function createLiveRailCard(stream) {
  return `
    <article class="video-card live-rail-card">
      <button class="video-thumb" type="button" data-action="open-watch-live" data-stream-id="${escapeAttribute(stream._id)}">
        ${stream.thumbnail ? `<img src="${escapeAttribute(stream.thumbnail)}" alt="" loading="lazy" />` : '<div class="skeleton-thumb"></div>'}
        <span class="duration live-duration-badge">● LIVE</span>
      </button>
      <div class="video-meta">
        <img class="channel-avatar" src="${escapeAttribute(avatarFor(stream.owner))}" alt="" />
        <div><h3>${escapeHTML(stream.title)}</h3><button class="channel-link" type="button" data-channel="${escapeAttribute(stream.owner?.username || "")}">${escapeHTML(stream.owner?.fullname || stream.owner?.username || "Deleted creator")}</button><p class="video-stats">${stream.peakViewers || 0} watching</p></div>
      </div>
    </article>`;
}

// ─── Go Live studio ──────────────────────────────────────────────────────────

async function openLiveStudio() {
  resetCreatorForms();
  setModal("live-studio-modal", true);
  const status = $("#live-status");
  const hint = $("#live-preview-hint");
  const empty = $("#live-preview-empty");
  const preview = $("#live-preview-video");
  status.hidden = true;
  empty.hidden = false;
  hint.textContent = "Requesting camera & microphone…";
  stopLivePreviewOnly();
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support camera access (getUserMedia). Try Chrome, Edge or Safari.");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.live.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    state.live.previewStream = stream;
    preview.srcObject = stream;
    empty.hidden = true;
    state.live.micOn = true;
    state.live.camOn = true;
    updateLiveToggles();
  } catch (error) {
    const name = error?.name || "";
    hint.textContent = name === "NotAllowedError"
      ? "Camera & microphone permission denied. Allow access in your browser settings, then press Try again."
      : name === "NotFoundError"
        ? "No camera or microphone found on this device."
        : (error.message || "Could not open the camera.");
  }
}

function stopLivePreviewOnly() {
  state.live.previewStream?.getTracks().forEach((track) => track.stop());
  state.live.previewStream = null;
  const preview = $("#live-preview-video");
  if (preview) preview.srcObject = null;
}

function updateLiveToggles() {
  const mic = $("#live-mic-toggle");
  const cam = $("#live-cam-toggle");
  if (mic) mic.textContent = state.live.micOn ? "🎙 Mic on" : "🎙 Mic off";
  if (cam) cam.textContent = state.live.camOn ? "🎥 Camera on" : "🎥 Camera off";
  const badge = $("#live-onair-badge");
  if (badge) badge.hidden = state.live.dbStream?.status !== "live";
}

async function startLiveBroadcast(form) {
  if (!requireAuth()) return;
  const goButton = $("#live-go-button");
  if (goButton?.dataset.busy === "1") return; // duplicate-tap guard
  const restore = setButtonLoading(goButton, "Going live…", { icon: "●" });
  const status = $("#live-status");
  const setStatus = (text) => { if (status) { status.hidden = !text; status.textContent = text; } };
  try {
    if (!window.LivekitClient && !window.livekit) throw new Error("LiveKit client failed to load — check your connection and reload.");
    const lk = window.LivekitClient || window.livekit;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    if (!title) throw new Error("Give your stream a title first.");
    if (!state.live.previewStream) throw new Error("Camera preview is not ready. Allow camera access and press Try again.");

    // 1. Create the stream record (thumbnail optional).
    setStatus("Creating stream…");
    let thumbnailUrl = "";
    const thumbFile = data.get("thumbnail");
    if (thumbFile instanceof File && thumbFile.size) {
      const sig = await request("/videos/upload-signature", { timeoutMs: 15000 });
      const uploaded = await uploadFileToCloudinary(thumbFile, sig, "image");
      thumbnailUrl = uploaded.secure_url;
    }
    const stream = await request("/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: String(data.get("description") || "").trim(),
        visibility: data.get("visibility") || "public",
        thumbnail: thumbnailUrl,
      }),
      timeoutMs: 20000,
    });
    state.live.dbStream = stream;

    // 2. Go live: host token + LiveKit publish.
    setStatus("Connecting to the live service…");
    const { wsUrl, token } = await request(`/live/${stream._id}/go-live`, { method: "POST", timeoutMs: 20000 });
    const room = new lk.Room({ adaptiveStream: true, dynacast: true });
    state.live.room = room;
    room.on(lk.RoomEvent.ParticipantConnected, () => refreshViewerCount());
    room.on(lk.RoomEvent.ParticipantDisconnected, () => refreshViewerCount());
    room.on(lk.RoomEvent.Disconnected, (reason) => {
      // Network drops: LiveKit auto-reconnects; only a deliberate end closes the UI.
      if (!state.live.dbStream || state.live.dbStream.status !== "live") cleanupLiveSession();
      else setStatus("Connection lost — reconnecting…");
    });
    await room.connect(wsUrl, token);
    // IMPORTANT: publish the EXACT preview tracks the user approved. Calling
    // setCameraEnabled(true) here would make the SDK request a SECOND
    // getUserMedia while our preview stream still holds the camera — on most
    // phones that fails (device busy) and the viewer stays on "Connecting…"
    // forever. Preview tracks become the broadcast tracks instead.
    const localTracks = [];
    for (const track of state.live.previewStream?.getTracks() || []) {
      try { localTracks.push(await room.localParticipant.publishTrack(track)); }
      catch (publishError) { console.error("Track publish failed:", publishError); }
    }
    if (!localTracks.length) throw new Error("Could not publish your camera/microphone. Check that no other app is using the camera, then try again.");
    state.live.publishedTracks = localTracks;
    bindLiveChatReceiver();
    room.on(lk.RoomEvent.DataReceived, (payload) => window.__livekitDataHandler && window.__livekitDataHandler(payload));
    // Moderation: refresh the host's participant panel as viewers come and go.
    room.on(lk.RoomEvent.ParticipantConnected, () => renderLiveParticipants());
    room.on(lk.RoomEvent.ParticipantDisconnected, () => renderLiveParticipants());

    // 3. Start the in-browser recording that becomes the saved video.
    state.live.isHost = true;
    startLiveRecording();
    state.live.startedAtMs = Date.now();

    // 4. UI: live mode.
    $("#live-go-button").hidden = true;
    $("#live-end-button").hidden = false;
    $("#live-viewer-row").hidden = false;
    $("#live-studio-chat").hidden = false;
    state.live.moderation = { chatLocked: false, isMuted: false, mutedIds: [] };
    applyLiveModerationUI();
    renderLiveParticipants();
    $("#live-studio-title").textContent = "You are live";
    $("#live-studio-subtitle").textContent = stream.title;
    setStatus("");
    toast("You are live! 🎉");
  } catch (error) {
    setStatus(error.message || "Could not go live.");
    toast(error.message || "Could not go live.", "error");
    // Partial-failure recovery: the stream record exists but we never reached
    // "publishing" (or publishing failed). End it on the server so no ghost
    // "live" entry stays in the dashboard / viewers never hang on Connecting….
    if (state.live.dbStream && !state.live.recorder) {
      const failedId = state.live.dbStream._id;
      request(`/live/${failedId}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hasRecording: false }) }).catch(() => {});
      state.live.dbStream = null;
      state.live.room?.disconnect?.().catch?.(() => {});
      state.live.room = null;
    }
  } finally { restore(); }
}

function startLiveRecording() {
  try {
    const previewStream = state.live.previewStream;
    if (!previewStream || typeof MediaRecorder === "undefined") {
      console.warn("MediaRecorder unavailable — the stream will not be saved as a video.");
      toast("Recording not supported on this browser — the live stream still works, but it will not be saved.", "error");
      return;
    }
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
    const recorder = new MediaRecorder(previewStream, mimeType ? { mimeType, videoBitsPerSecond: 2_500_000 } : {});
    state.live.chunks = [];
    recorder.ondataavailable = (event) => { if (event.data?.size) state.live.chunks.push(event.data); };
    recorder.onerror = (event) => console.error("Recorder error:", event.error);
    recorder.start(5000); // 5s chunks: network-safe, keeps memory bounded
    state.live.recorder = recorder;
  } catch (error) {
    console.error("Could not start recording:", error);
    toast("Recording could not start — the stream will not be saved. Others can still watch live.", "error");
  }
}

async function stopLiveRecording() {
  const recorder = state.live.recorder;
  if (!recorder) return null;
  state.live.recorder = null;
  if (recorder.state !== "inactive") {
    await new Promise((resolve) => {
      recorder.onstop = resolve;
      recorder.stop();
    });
  }
  if (!state.live.chunks.length) return null;
  const blob = new Blob(state.live.chunks, { type: recorder.mimeType || "video/webm" });
  state.live.chunks = [];
  // Junk guard: a "recording" under ~2s or ~20KB is an accidental tap, not a
  // broadcast. Uploading it would create a broken 0-2s video on the channel.
  const elapsedMs = state.live.startedAtMs ? Date.now() - state.live.startedAtMs : 0;
  if (elapsedMs < 2000 || blob.size < 20_000) {
    console.info(`Recording discarded (${Math.round(elapsedMs / 100) / 10}s, ${blob.size}B) — too short to keep.`);
    state.live.lastRecording = null;
    state.live.recordingFor = null;
    return null;
  }
  state.live.lastRecording = blob;
  state.live.recordingFor = state.live.dbStream?._id || null;
  return blob;
}

async function endLiveFromStudio() {
  const stream = state.live.dbStream;
  if (!stream) return;
  const endButton = $("#live-end-button");
  if (endButton?.dataset.busy === "1") return;
  const restore = endButton ? setButtonLoading(endButton, "Ending…", { icon: "" }) : () => {};
  const status = $("#live-status");
  const setStatus = (text) => { if (status) { status.hidden = !text; status.textContent = text; } };
  try {
    setStatus("Stopping the broadcast…");
    // 1. Tell the API the stream ended (flips to "processing" so viewers see the right state).
    await request(`/live/${stream._id}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hasRecording: Boolean(state.live.recorder) }), timeoutMs: 20000 });
    // 2. Stop LiveKit publishing.
    try { await state.live.room?.disconnect(); } catch { /* already gone */ }
    // 3. Stop the recorder and finalise the recording as a normal video.
    const blob = await stopLiveRecording();
    if (blob) {
      setStatus("Saving your recording… this can take a minute.");
      const result = await uploadRecordingBlob(stream._id, blob);
      toast("Stream ended. Recording saved as a video! 🎬");
      goto(`watch/${result.video._id}`);
    } else {
      setStatus("");
      toast("Stream ended. No recording was captured (recorder unavailable).", "error");
    }
  } catch (error) {
    // Upload failure keeps the blob in state.live.lastRecording for a retry.
    setStatus(`Recording could not be saved: ${error.message}. Your stream has ended; retry from the Live dashboard.`);
    request(`/live/${stream._id}/recording-failed`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: error.message }) }).catch(() => {});
    toast("Recording could not be saved. You can retry from the Live dashboard.", "error");
  } finally {
    cleanupLiveSession();
    restore();
  }
}

async function uploadRecordingBlob(streamId, blob) {
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const body = new FormData();
  body.append("recording", new File([blob], `live-recording.${ext}`, { type: blob.type }));
  const result = await request(`/live/${streamId}/recording`, { method: "POST", body, timeoutMs: 600000 }); // 10 min — big uploads
  state.live.lastRecording = null;
  state.live.recordingFor = null;
  return result;
}

function cleanupLiveSession() {
  state.live.room?.disconnect?.().catch?.(() => {});
  state.live.room = null;
  state.live.dbStream = null;
  state.live.recorder = null;
  state.live.chunks = [];
  state.live.moderation = null;
  state.live.publishedTracks = [];
  state.live.startedAtMs = null;
  state.live.isHost = false;
  clearInterval(state.live.viewerTimer);
  state.live.viewerTimer = null;
  stopLivePreviewOnly();
  // Reset the studio modal for the next session.
  const go = $("#live-go-button");
  const end = $("#live-end-button");
  const form = $("#live-setup-form");
  if (go) go.hidden = false;
  if (end) end.hidden = true;
  if (form) form.reset();
  if (go) { delete go.dataset.busy; go.disabled = false; go.innerHTML = 'Go live <span>●</span>'; }
  $("#live-viewer-row") && ($("#live-viewer-row").hidden = true);
  $("#live-studio-chat") && ($("#live-studio-chat").hidden = true);
  $("#live-studio-title") && ($("#live-studio-title").textContent = "Go live");
  $("#live-studio-subtitle") && ($("#live-studio-subtitle").textContent = "Your camera preview appears here.");
  $("#live-chat-list") && ($("#live-chat-list").innerHTML = "");
  $("#live-onair-badge") && ($("#live-onair-badge").hidden = true);
  const partWrap = $("#live-participants");
  if (partWrap) partWrap.innerHTML = '<p class="live-mod-hint">Viewers you can moderate appear here once they join.</p>';
}

// Closing the studio (× button, backdrop tap, or Esc) while live must END the
// stream properly — otherwise it stays "live" in the DB forever and viewers
// hang on "Connecting…". We stop the broadcast, keep the recorder running
// until the blob exists, then finalise the recording in the background.
let liveEndingPromise = null;
function endLiveOnStudioClose() {
  const stream = state.live.dbStream;
  if (!stream && !state.live.recorder) return;
  // Idempotent: only one end-flow at a time.
  if (liveEndingPromise) return liveEndingPromise;
  const wasLive = Boolean(stream);
  const streamId = stream?._id;
  toast("Stream ended — saving the recording…");
  liveEndingPromise = (async () => {
    try {
      if (wasLive) {
        await request(`/live/${streamId}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hasRecording: Boolean(state.live.recorder) }), timeoutMs: 20000 });
      }
    } catch { /* the auto-sweep below also fixes stuck streams */ }
    try { state.live.room?.disconnect?.(); } catch { /* already gone */ }
    const blob = await stopLiveRecording();
    cleanupLiveSession();
    if (blob && streamId) {
      try {
        await uploadRecordingBlob(streamId, blob);
        toast("Recording saved to your videos 🎬");
      } catch (error) {
        // Blob stays in state.live.lastRecording — dashboard retry handles it.
        request(`/live/${streamId}/recording-failed`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: error.message }) }).catch(() => {});
        toast(`Recording could not be saved (${error.message}). Retry from the Live dashboard.`, "error");
      }
    } else if (wasLive) {
      toast("Stream ended. No recording was captured.");
    }
    liveEndingPromise = null;
  })();
  return liveEndingPromise;
}

async function refreshViewerCount() {
  const stream = state.live.dbStream;
  if (!stream) return;
  try {
    const room = state.live.room;
    const count = room ? Math.max(0, room.remoteParticipants.size) : 0;
    await request(`/live/${stream._id}/viewers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count }), timeoutMs: 10000 });
    const label = $("#live-viewer-count");
    if (label) label.textContent = `👥 ${count} watching`;
    const peak = $("#live-peak-count");
    if (peak) peak.textContent = `Peak: ${stream.peakViewers || 0}`;
  } catch { /* viewer reporting is best-effort */ }
}

async function toggleLiveDevice(kind) {
  if (state.live.room) {
    const enabled = kind === "mic" ? await state.live.room.localParticipant.setMicrophoneEnabled(!state.live.micOn) : await state.live.room.localParticipant.setCameraEnabled(!state.live.camOn);
    if (kind === "mic") state.live.micOn = enabled;
    else state.live.camOn = enabled;
  } else if (state.live.previewStream) {
    state.live.previewStream.getAudioTracks().forEach((t) => (t.enabled = !state.live.micOn));
    state.live.previewStream.getVideoTracks().forEach((t) => (t.enabled = !state.live.camOn));
    if (kind === "mic") state.live.micOn = !state.live.micOn;
    else state.live.camOn = !state.live.camOn;
  }
  updateLiveToggles();
}

async function switchLiveCamera() {
  if (state.live.room) {
    // Switch while live: flip facingMode, acquire the NEW camera first, then
    // unpublish the old track and publish the new one (the supported API path —
    // LocalTrackPublication has no replaceTrack). Viewers see a brief flip.
    state.live.facingMode = state.live.facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: state.live.facingMode }, audio: false });
      const newTrack = newStream.getVideoTracks()[0];
      const old = state.live.previewStream?.getVideoTracks()[0];
      if (old) await state.live.room.localParticipant.unpublishTrack(old);
      await state.live.room.localParticipant.publishTrack(newTrack);
      old?.stop();
      state.live.previewStream?.removeTrack(old);
      state.live.previewStream?.addTrack(newTrack);
      $("#live-preview-video").srcObject = state.live.previewStream;
    } catch (error) {
      toast("Could not switch camera: " + (error.message || "not supported here"), "error");
    }
    return;
  }
  if (state.live.previewStream) {
    state.live.facingMode = state.live.facingMode === "user" ? "environment" : "user";
    await openLiveStudio(); // simplest correct path: re-request devices with the new facing mode
  }
}

// ─── Watch live (viewer side) ────────────────────────────────────────────────

async function renderWatchLive(streamId) {
  const renderId = ++state.renderId;
  if (!streamId) { main.innerHTML = '<div class="empty-state"><h2>Stream not found</h2><a href="#live" class="primary-button">Back to Live</a></div>'; return; }
  let data;
  try {
    data = await request(`/live/${streamId}`, { timeoutMs: 15000 });
  } catch {
    main.innerHTML = '<div class="empty-state"><span class="empty-icon">!</span><h2>Stream not found</h2><p>It may have been deleted or made private.</p><a href="#live" class="primary-button">Back to Live</a></div>';
    return;
  }
  if (renderId !== state.renderId) return;
  const { stream, isOwner } = data;
  const owner = stream.owner || {};
  if (stream.recording?.video && stream.status === "ended") {
    // Recording ready → straight to the saved video.
    goto(`watch/${stream.recording.video._id || stream.recording.video}`);
    return;
  }
  const processing = stream.status === "processing";
  main.innerHTML = `
    <div class="watch-layout">
      <section class="watch-primary">
        <div class="player-wrap live-player-wrap">
          <video id="live-watch-video" class="live-watch-video" autoplay playsinline ${isOwner ? "" : "muted"}></video>
          <div class="live-watch-overlay" id="live-watch-overlay"><div><h3>${stream.status === "live" ? "Connecting to the live stream…" : processing ? "⏳ Stream ended — recording is being finalised" : "This stream has ended"}</h3><p>${processing ? "The recording will appear here and on the channel when it is ready." : ""}</p></div></div>
        </div>
        <h1 class="watch-title">${escapeHTML(stream.title)}</h1>
        <div class="watch-info-row">
          <div class="channel-summary"><img src="${escapeAttribute(avatarFor(owner))}" alt="" /><div><strong>${escapeHTML(owner.fullname || owner.username || "Creator")}</strong><small>${owner.username ? "@" + escapeHTML(owner.username) : ""}</small></div></div>
          <div class="watch-actions"><span class="action-button static">${stream.status === "live" ? `● LIVE · <span id="live-watch-viewers">?</span> watching</span>` : ""}</div>
        </div>
        <div class="video-description"><small>${stream.startedAt ? "Started " + relativeDate(stream.startedAt) : ""}</small>${escapeHTML(stream.description || "")}</div>
        ${isOwner ? `<section class="glass live-owner-tools"><h3>Stream tools</h3><p>Status: <strong>${stream.status}</strong>${stream.recording?.status === "ready" ? " · recording saved" : ""}</p><button class="danger-button" type="button" data-action="live-end" data-stream-id="${escapeAttribute(stream._id)}">End live stream</button></section>` : ""}
      </section>
      <aside class="watch-aside">
        <h2 class="suggestions-title">Live chat</h2>
        <div class="live-chat-section live-chat-standalone">
          <div class="live-chat-list" id="live-chat-list"></div>
          ${state.user ? '<form class="live-chat-form" id="live-chat-form"><input name="content" maxlength="300" placeholder="Say something…" autocomplete="off" /><button class="primary-button" type="submit">Send</button></form>' : '<p class="live-chat-signin">Sign in to chat.</p>'}
        </div>
      </aside>
    </div>`;
  // Recording-ready poll while the recording finalises.
  if (processing) {
    const poll = setInterval(async () => {
      if (renderId !== state.renderId) return clearInterval(poll);
      try {
        const fresh = await request(`/live/${streamId}`, { dedupe: false, timeoutMs: 12000 });
        if (fresh.stream.status === "ended" && fresh.stream.recording?.video) {
          clearInterval(poll);
          toast("The recording is ready! 🎬");
          goto(`watch/${fresh.stream.recording.video._id || fresh.stream.recording.video}`);
        }
        if (fresh.stream.status === "failed") { clearInterval(poll); $("#live-watch-overlay h3").textContent = "Recording failed — the host can retry from their dashboard."; }
      } catch { /* keep polling through hiccups */ }
    }, 10000);
    return;
  }
  if (stream.status !== "live") return;
  // Live: connect as a subscriber.
  try {
    const { configured } = await request("/live/config", { timeoutMs: 10000 });
    if (!configured) throw new Error("not-configured");
    const lk = window.LivekitClient || window.livekit;
    if (!lk) throw new Error("LiveKit client failed to load.");
    const joinData = await request(`/live/${streamId}/join`, { method: "POST", timeoutMs: 15000 });
    state.live.moderation = joinData.moderation || { chatLocked: false, isMuted: false };
    applyLiveModerationUI();
    const { wsUrl, token } = joinData;
    const room = new lk.Room({ adaptiveStream: true });
    let gotVideo = false;
    room.on(lk.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "video") {
        gotVideo = true;
        track.attach($("#live-watch-video"));
      } else {
        track.attach(new Audio());
      }
      $("#live-watch-overlay").hidden = true;
    });
    room.on(lk.RoomEvent.ParticipantDisconnected, () => {
      $("#live-watch-overlay").hidden = false;
      $("#live-watch-overlay h3").textContent = "The host ended the stream — recording is being saved.";
    });
    await room.connect(wsUrl, token);
    state.live.viewerRoom = room;
    bindLiveChatReceiver();
    room.on(lk.RoomEvent.DataReceived, (payload) => window.__livekitDataHandler && window.__livekitDataHandler(payload));
    applyLiveModerationUI();
    // "Connecting…" must never hang forever: if the host's room has no video
    // track after 20s (host on a busy phone, or the broadcast died), tell the
    // viewer plainly instead of leaving them on an endless spinner.
    setTimeout(() => {
      const overlay = $("#live-watch-overlay");
      if (renderId !== state.renderId || !overlay || gotVideo) return;
      const hostHere = [...room.remoteParticipants.values()].some((p) =>
        [...p.trackPublications.values()].some((t) => t.kind === "video" && !t.isMuted)
      );
      if (!hostHere) {
        overlay.hidden = false;
        overlay.querySelector("h3").textContent = "The host's camera is not streaming right now — waiting for them to start video…";
      }
    }, 20000);
  } catch (error) {
    const overlay = $("#live-watch-overlay");
    if (overlay) {
      overlay.hidden = false;
      overlay.querySelector("h3").textContent = error.message === "not-configured"
        ? "Live streaming is not configured on this server yet."
        : "Could not connect to the live stream. Try refreshing.";
    }
  }
}

async function endLiveFromDashboard(streamId) {
  if (!requireAuth()) return;
  if (!window.confirm("End this live stream now? The recording will be saved to your videos.")) return;
  try {
    await request(`/live/${streamId}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hasRecording: false }), timeoutMs: 20000 });
    toast("Stream ended.");
    renderLive();
  } catch (error) { toast(error.message, "error"); }
}

async function editLiveStream(streamId) {
  if (!requireAuth()) return;
  let stream;
  try { stream = (await request(`/live/${streamId}`)).stream; } catch (error) { return toast(error.message, "error"); }
  const title = window.prompt("Stream title", stream.title);
  if (title === null) return;
  const description = window.prompt("Description", stream.description || "");
  if (description === null) return;
  const visibility = window.prompt("Visibility: public or unlisted", stream.visibility || "public");
  if (visibility === null) return;
  try {
    await request(`/live/${streamId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, visibility: visibility === "unlisted" ? "unlisted" : "public" }), timeoutMs: 20000 });
    toast("Stream updated.");
    renderLive();
  } catch (error) { toast(error.message, "error"); }
}

async function deleteLiveStream(streamId) {
  if (!requireAuth()) return;
  if (!window.confirm("Delete this stream permanently? (Recordings already saved as videos are not removed.)")) return;
  try {
    await request(`/live/${streamId}`, { method: "DELETE", timeoutMs: 20000 });
    toast("Stream deleted.");
    renderLive();
  } catch (error) { toast(error.message, "error"); }
}

// Live chat flows through LiveKit data channels — no chat server needed, works
// for host and viewers, and dies with the room when the stream ends.
// Moderation: the host can mute (temporarily block messages), block (eject +
// ban for the stream) or lock the whole chat. State travels over the same
// data channel (kind: "moderation") so viewers see it without polling.

function liveModerationState() {
  return state.live.moderation || { chatLocked: false, isMuted: false };
}

function liveCanChat() {
  if (!state.user && !state.live.viewerRoom && !state.live.room) return false;
  const mod = liveModerationState();
  const isHost = Boolean(state.live.isHost || state.live.dbStream);
  if (isHost) return true;
  if (mod.chatLocked) return false;
  if (mod.isMuted) return false;
  return true;
}

function setLiveChatBlocked(reason) {
  const form = $("#live-chat-form");
  if (!form) return;
  const input = form.querySelector("input[name=content]");
  const button = form.querySelector("button[type=submit]");
  if (reason) {
    input.disabled = true;
    button.disabled = true;
    input.placeholder = reason;
  } else {
    input.disabled = false;
    button.disabled = false;
    input.placeholder = "Say something…";
  }
}

function applyLiveModerationUI() {
  const mod = liveModerationState();
  if (!liveCanChat()) {
    setLiveChatBlocked(mod.isMuted ? "The host muted you for this stream" : mod.chatLocked ? "Chat is paused by the host" : "");
  } else {
    setLiveChatBlocked("");
  }
  // Host-only chat lock toggle in the studio.
  const lockBtn = $("#live-chat-lock");
  if (lockBtn) lockBtn.textContent = mod.chatLocked ? "💬 Chat locked" : "💬 Chat open";
}

function handleLiveModerationEvent(message) {
  const isHost = Boolean(state.live.isHost || state.live.dbStream);
  // The block event carries my user id → I was ejected.
  if (message.action === "block" && message.viewerId && state.user && message.viewerId === state.user._id) {
    toast("The host removed you from this stream.", "error");
    state.live.viewerRoom?.disconnect();
    state.live.viewerRoom = null;
    const overlay = $("#live-watch-overlay");
    if (overlay) {
      overlay.hidden = false;
      const h3 = overlay.querySelector("h3");
      if (h3) h3.textContent = "The host removed you from this stream.";
    }
    return;
  }
  // Viewers only care about actions targeting them or the whole room.
  if (message.action === "lock-chat") { state.live.moderation = { ...liveModerationState(), chatLocked: true }; if (!isHost) toast("Chat was paused by the host."); }
  if (message.action === "unlock-chat") { state.live.moderation = { ...liveModerationState(), chatLocked: false }; if (!isHost) toast("Chat is open again."); }
  if (message.action === "mute" && message.viewerId && state.user && message.viewerId === state.user._id) {
    state.live.moderation = { ...liveModerationState(), isMuted: true };
    if (!isHost) toast("The host muted you for this stream.", "error");
  }
  if (message.action === "unmute" && message.viewerId && state.user && message.viewerId === state.user._id) {
    state.live.moderation = { ...liveModerationState(), isMuted: false };
    if (!isHost) toast("You can chat again.");
  }
  applyLiveModerationUI();
}

async function moderateLiveChat(streamId, action, viewerId) {
  if (!requireAuth()) return;
  try {
    const result = await request(`/live/${streamId}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, viewerId }),
      timeoutMs: 15000,
    });
    // Keep the host's local copy of the mute list in sync with the server.
    if (result?.moderation) state.live.moderation = { ...liveModerationState(), ...result.moderation, mutedIds: result.moderation.mutedViewerIds || [] };
    // Tell every connected client so their UI updates instantly.
    const event = JSON.stringify({ kind: "moderation", action, viewerId, at: Date.now() });
    const room = state.live.room || state.live.viewerRoom;
    room?.localParticipant?.publishData(new TextEncoder().encode(event), { reliable: true });
    handleLiveModerationEvent(JSON.parse(event));
    // Refresh the participant list in the host studio.
    if (state.live.isHost) renderLiveParticipants();
  } catch (error) { toast(error.message, "error"); }
}

function renderLiveParticipants() {
  const wrap = $("#live-participants");
  if (!wrap) return;
  const room = state.live.room;
  const mod = liveModerationState();
  const streamId = state.live.dbStream?._id;
  const participants = room ? [...room.remoteParticipants.values()] : [];
  if (!participants.length) {
    wrap.innerHTML = '<p class="live-mod-hint">No viewers connected right now.</p>';
    return;
  }
  // Viewer identities look like "viewer-<userId>-<timestamp>" (see
  // createViewerToken). Guests have no userId segment we can act on.
  const userIdFromIdentity = (identity) => {
    const match = /^viewer-([a-f0-9]{24})-/.exec(String(identity || ""));
    return match ? match[1] : null;
  };
  wrap.innerHTML = participants.map((p) => {
    const userId = userIdFromIdentity(p.identity);
    const muted = userId && (mod.mutedIds || []).includes(userId);
    const buttons = userId && streamId
      ? '<button class="action-button ' + (muted ? "" : "danger") + '" type="button" data-action="live-mod" data-stream-id="' + escapeAttribute(streamId) + '" data-mod-action="' + (muted ? "unmute" : "mute") + '" data-viewer-id="' + escapeAttribute(userId) + '">' + (muted ? "Unmute" : "Mute") + '</button>' +
        '<button class="action-button danger" type="button" data-action="live-mod" data-stream-id="' + escapeAttribute(streamId) + '" data-mod-action="block" data-viewer-id="' + escapeAttribute(userId) + '">Block</button>'
      : '<span class="live-mod-hint">guest</span>';
    return '<div class="live-mod-row"><span class="live-mod-name">' + escapeHTML(p.name || p.identity) + '</span>' + buttons + '</div>';
  }).join("");
}

function sendLiveChat(form) {
  const content = String(new FormData(form).get("content") || "").trim();
  if (!content) return;
  if (!liveCanChat()) {
    const mod = liveModerationState();
    toast(mod.isMuted ? "The host muted you for this stream." : mod.chatLocked ? "Chat is paused by the host." : "Sign in to chat.", "error");
    return;
  }
  const lk = window.LivekitClient || window.livekit;
  const payload = JSON.stringify({
    kind: "chat",
    text: content.slice(0, 300),
    from: state.user ? { name: state.user.fullname || state.user.username, username: state.user.username } : { name: "Guest" },
    at: Date.now(),
  });
  try {
    if (state.live.room) state.live.room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
    else if (state.live.viewerRoom) state.live.viewerRoom.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
    else throw new Error("Chat is only available while connected to a live stream.");
    appendLiveChatMessage(JSON.parse(payload));
    form.reset();
  } catch (error) { toast(error.message, "error"); }
}

function appendLiveChatMessage(message) {
  const list = $("#live-chat-list");
  if (!list) return;
  const item = document.createElement("div");
  item.className = "live-chat-item";
  item.innerHTML = `<strong>${escapeHTML(message.from?.name || "Guest")}</strong><p>${escapeHTML(message.text || "")}</p>`;
  list.append(item);
  list.scrollTop = list.scrollHeight;
}

function bindLiveChatReceiver() {
  const lk = window.LivekitClient || window.livekit;
  if (!lk) return;
  const handler = (payload) => {
    try {
      const message = JSON.parse(new TextDecoder().decode(payload.data));
      if (message?.kind === "chat" && message.text) appendLiveChatMessage(message);
      if (message?.kind === "moderation" && message.action) handleLiveModerationEvent(message);
    } catch { /* ignore malformed packets */ }
  };
  // Called by both host and viewer rooms after connect.
  window.__livekitDataHandler = handler;
}

// ---------- You / Account page (mobile-first, YouTube-style) ----------

function youRow(icon, label, attrs = "") {
  // Rows with an href must be real anchors — buttons ignore href, so a tap
  // would otherwise do nothing. Action rows stay buttons, the rest are static.
  const isLink = attrs.includes("href=");
  const tag = isLink ? "a" : attrs.includes("data-action=") ? "button" : "div";
  const typeAttribute = tag === "button" ? ' type="button"' : "";
  return `<${tag} class="you-row"${typeAttribute} ${attrs}><span class="you-row-icon">${icon}</span><span class="you-row-label">${escapeHTML(label)}</span><span class="you-row-chevron">›</span></${tag}>`;
}

async function renderYou() {
  // Guests see a friendly sign-in prompt instead of the account page.
  if (!requireAuth(() => renderYou())) return;
  const user = state.user;
  const username = user?.username;
  main.innerHTML = `
    <section class="page-head you-head"><div><h1>You</h1></div></section>
    <section class="you-account glass">
      <a class="you-account-row" href="#channel/${escapeAttribute(username || "")}">
        <img class="you-account-avatar" src="${escapeAttribute(avatarFor(user))}" alt="" />
        <div class="you-account-info"><strong>${escapeHTML(user.fullname || user.username || "Your account")}</strong><small>@${escapeHTML(username || "you")} · View your channel</small></div>
        <span class="you-row-chevron">›</span>
      </a>
    </section>
    <section class="you-group">
      ${youRow("＋", "Create channel", 'data-action="open-channel"')}
      ${youRow("▶", "My channel", `href="#channel/${escapeAttribute(username || "")}"`)}
      ${youRow("❏", "My posts", 'href="#my-posts"')}
      ${youRow("▤", "Library", 'href="#library"')}
    </section>
    <section class="you-group">
      ${youRow("◷", "Watch history", 'href="#history"')}
      ${youRow("≡", "Playlists", 'href="#playlists"')}
      ${youRow("♥", "Liked videos", 'href="#liked"')}
    </section>
    <section class="you-group">
      ${youRow("⚙", "Password change", 'data-action="open-settings"')}
    </section>
    <section class="you-group">
      <button class="you-row you-row-danger" type="button" data-action="logout"><span class="you-row-icon">⏻</span><span class="you-row-label">Log out</span></button>
    </section>`;
}

// "My posts" — the signed-in user's own posts only. Reuses the existing
// GET /posts API (no new backend endpoint) and filters client-side.
async function renderMyPosts() {
  if (!requireAuth(() => renderMyPosts())) return;
  const renderId = ++state.renderId;
  setLoading("Loading your posts…");
  try {
    const posts = (await request(`/posts?owner=me`, { dedupe: false })).map((post) => ({ ...post, owner: post.owner || state.user }));
    if (renderId !== state.renderId) return;
    main.innerHTML = `<section class="page-head"><div><h1>My posts</h1><p>Only your own image posts, newest first.</p></div>${'<button class="primary-button" type="button" data-action="open-post-composer"><span>＋</span> New post</button>'}</section><div class="posts-list" id="posts-list"></div>`;
    const list = main.querySelector("#posts-list");
    if (!posts.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">❏</span><h2>You have not posted yet</h2><p>Share a moment with an image and an optional caption.</p><button class="primary-button" type="button" data-action="open-post-composer">Create your first post</button></div>`;
      return;
    }
    list.innerHTML = "";
    for (const post of posts) {
      const card = document.createElement("article");
      card.className = "post-card";
      card.dataset.postId = post._id;
      card.innerHTML = `
      <header class="post-head">
        <img class="channel-avatar" src="${escapeAttribute(avatarFor(post.owner || state.user))}" alt="" />
        <div class="post-owner"><strong>${escapeHTML(state.user.fullname || state.user.username || "You")}</strong><small>${escapeHTML(state.user.username ? `@${state.user.username}` : "")} · ${relativeDate(post.createdAt)}</small></div>
        <button class="more-button" type="button" data-action="delete-post" data-post-id="${escapeAttribute(post._id)}" aria-label="Delete post">🗑</button>
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
  } catch (error) { libraryEmpty("My posts", error.message, "home", "Explore videos"); }
}

async function renderLikedVideos() {
  if (!requireAuth(() => renderLikedVideos())) return;
  const renderId = ++state.renderId;
  setLoading("Loading liked videos…");
  try {
    const videos = (await request("/likes/videos")).map(normaliseVideo);
    if (renderId !== state.renderId) return;
    main.innerHTML = `<section class="page-head"><div><h1>Liked videos</h1><p>Everything you gave a ♥, newest first.</p></div></section>${videos.length ? '<div class="video-grid"></div>' : '<div class="empty-state"><span class="empty-icon">♥</span><h2>No liked videos yet</h2><p>Tap the like button on any video and it will appear here.</p><a class="primary-button" href="#home">Explore videos</a></div>'}`;
    if (videos.length) renderVideoGrid(videos);
  } catch (error) { libraryEmpty("Liked videos", error.message, "home", "Explore videos"); }
}

async function handleSettings(form) {
  const button = $("button[type=submit]", form);
  const status = $("#settings-status");
  const data = new FormData(form);
  const newPassword = String(data.get("newPassword") || "");
  if (newPassword.length < 6) {
    status.hidden = false;
    status.textContent = "New password must be at least 6 characters.";
    return;
  }
  button.disabled = true;
  status.hidden = false;
  status.textContent = "Updating your password…";
  try {
    await request("/users/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: data.get("oldPassword"), newPassword }),
    });
    form.reset();
    status.hidden = true;
    setModal("settings-modal", false);
    toast("Password updated successfully.");
  } catch (error) {
    status.textContent = error.message;
    toast(error.message, "error");
  } finally { button.disabled = false; }
}

async function renderShorts() {
  if (!state.videos.length) setLoading("Loading shorts…");
  const videos = state.videos.length ? state.videos : await getVideos();
  if (!main.querySelector(".video-grid")) main.innerHTML = `<section class="page-head"><div><h1>Shorts</h1><p>Quick ideas worth a pause.</p></div></section><div class="video-grid"></div>`;
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
    if (location.hash === "#my-posts") renderMyPosts(); else renderPosts();
  } catch (error) {
    toast(error.message || "Could not create post.", "error");
  } finally { button.disabled = false; }
}

async function deletePost(postId) {
  if (!confirm("Delete this post permanently? Its comments and likes will also be removed.")) return;
  try {
    await request(`/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
    toast("Post deleted.");
    if (location.hash === "#my-posts") renderMyPosts(); else renderPosts();
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
  if (route === "you") return renderYou();
  if (route === "live") return renderLive();
  if (route === "watch-live") return renderWatchLive(parts.join("/"));
  if (route === "liked") return renderLikedVideos();
  if (route === "my-posts") return renderMyPosts();
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

  const button = $("button[type=submit]", form);
  if (button?.dataset.busy === "1") return; // ignore double-clicks
  const body = { password };
  if (identity.includes("@")) body.email = identity; else body.username = identity;
  const restore = setButtonLoading(button, "Logging in...", { icon: "" });
  try {
    state.token = "";
    const data = await request("/users/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), timeoutMs: 20000 });
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
    state.afterLogin = null;
    toast(`Welcome back, ${state.user.fullname || state.user.username}!`);
    goto(state.afterLoginRoute || "home");
    state.afterLoginRoute = null;
  } catch (error) {
    // Specific, friendly reasons instead of a generic failure message.
    toast(error.status === 401 ? "Incorrect email/username or password." : error.message || "Login failed. Check your connection and try again.", "error");
  }
  finally { restore(); }
}

async function handleRegister(form) {
  const button = $("button[type=submit]", form);
  if (button?.dataset.busy === "1") return;
  const restore = setButtonLoading(button, "Creating account...", { icon: "" });
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
  finally { restore(); }
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
    // Keep the "N comments" heading in sync after adding one.
    const heading = $("#comments-heading");
    if (heading) {
      const match = /^\d+/.exec(heading.textContent);
      const current = match ? Number(match[0]) : 0;
      heading.textContent = `${current + 1} comment${current + 1 === 1 ? "" : "s"}`;
    }
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

function bindEvents() {
  bindUploadForm();
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
    if (action === "close-modal") {
      // Live studio close while broadcasting must end the stream properly.
      if (button.closest("#live-studio-modal") && (state.live.dbStream || state.live.recorder)) {
        button.closest("dialog").close();
        endLiveOnStudioClose();
        return;
      }
      button.closest("dialog")?.close();
      return;
    }
    if (action === "remove-video-file") {
      const form = $("#upload-form");
      if (form?.elements.videoFile) form.elements.videoFile.value = "";
      resetUploadPreviews();
      return;
    }
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
    if (action === "toggle-sidebar") { document.body.classList.toggle("sidebar-collapsed"); return; }
    if (action === "mobile-search") { $("#mobile-search-overlay")?.classList.add("open"); $("#mobile-search-input")?.focus(); return; }
    if (action === "close-mobile-search") { $("#mobile-search-overlay")?.classList.remove("open"); return; }
    if (action === "open-account") { state.user ? goto("you") : setModal("auth-modal", true); return; }
    if (action === "open-settings") { setModal("settings-modal", true); return; }
    if (action === "mobile-search-prompt") { const value = window.prompt("Search NovaPlay"); if (value?.trim()) goto(`search/${encodeURIComponent(value.trim())}`); return; }
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
    if (action === "open-live-studio") { if (requireAuth()) openLiveStudio(); return; }
    if (action === "live-retry-devices") { openLiveStudio(); return; }
    if (action === "live-toggle-mic") { toggleLiveDevice("mic"); return; }
    if (action === "live-toggle-cam") { toggleLiveDevice("cam"); return; }
    if (action === "live-switch-camera") { switchLiveCamera(); return; }
    if (action === "live-end") { if (state.live.dbStream) endLiveFromStudio(); else endLiveFromDashboard(button.dataset.streamId); return; }
    if (action === "live-end-from-dashboard") { endLiveFromDashboard(button.dataset.streamId); return; }
    if (action === "open-watch-live") { goto(`watch-live/${button.dataset.streamId}`); return; }
    if (action === "open-recording") { goto(`watch/${button.dataset.videoId}`); return; }
    if (action === "live-edit") { editLiveStream(button.dataset.streamId); return; }
    if (action === "live-delete") { deleteLiveStream(button.dataset.streamId); return; }
    if (action === "live-mod") { moderateLiveChat(button.dataset.streamId, button.dataset.modAction, button.dataset.viewerId); return; }
    if (action === "live-mod-lock") {
      const streamId = state.live.dbStream?._id;
      const locking = !liveModerationState().chatLocked;
      if (streamId) moderateLiveChat(streamId, locking ? "lock-chat" : "unlock-chat");
      return;
    }
    if (action === "home") { goto("home"); }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "search-form" || event.target.id === "mobile-search-form") {
      event.preventDefault();
      const query = new FormData(event.target).get("search") || $("input[type=search]", event.target).value;
      if (query.trim()) {
        $("#mobile-search-overlay")?.classList.remove("open");
        goto(`search/${encodeURIComponent(query.trim())}`);
      }
      return;
    }
    if (event.target.id === "login-form") { event.preventDefault(); handleLogin(event.target); return; }
    if (event.target.id === "register-form") { event.preventDefault(); handleRegister(event.target); return; }
    if (event.target.id === "channel-form") { event.preventDefault(); handleChannel(event.target); return; }
    if (event.target.id === "upload-form") { event.preventDefault(); handleUpload(event.target); return; }
    if (event.target.id === "playlist-form") { event.preventDefault(); handlePlaylist(event.target); return; }
    if (event.target.id === "settings-form") { event.preventDefault(); handleSettings(event.target); return; }
    if (event.target.id === "post-form") { event.preventDefault(); handleCreatePost(event.target); return; }
    if (event.target.id === "live-setup-form") { event.preventDefault(); startLiveBroadcast(event.target); return; }
    if (event.target.id === "live-chat-form") { event.preventDefault(); sendLiveChat(event.target); return; }
    if (event.target.classList?.contains("post-comment-form")) { event.preventDefault(); postComment(event.target); return; }
    if (event.target.id === "comment-form") { event.preventDefault(); handleComment(event.target); }
  });

  $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    if (dialog.id === "live-studio-modal" && (state.live.dbStream || state.live.recorder)) { dialog.close(); endLiveOnStudioClose(); return; }
    dialog.close();
  }));
  // Esc key / cancel event on the live studio also ends the stream.
  const liveModal = $("#live-studio-modal");
  if (liveModal) liveModal.addEventListener("cancel", (event) => {
    if (state.live.dbStream || state.live.recorder) { event.preventDefault(); liveModal.close(); endLiveOnStudioClose(); }
  });
}

async function restoreSession() {
  if (!state.token) return;
  try {
    state.user = await request("/users/current-user", { timeoutMs: 12000 });
    localStorage.setItem("streamly_user", JSON.stringify(state.user));
  } catch (error) {
    // Only a definitive 401 means the session is really dead. A network
    // hiccup or slow server must not log the user out on every refresh.
    if (error.status !== 401) return;
    state.token = ""; state.user = null;
    localStorage.removeItem("streamly_access_token");
    localStorage.removeItem("streamly_user");
  }
}

function boot() {
  // Bright buttery light theme is the one and only theme.
  document.documentElement.dataset.theme = "light";
  bindEvents();
  // Session restore must not block the first paint: the app renders
  // immediately; identity UI refreshes in the background once confirmed.
  (async () => {
    await restoreSession();
    // Always refresh identity UI: a still-valid session keeps the same token,
    // but cached user data (avatar, name) may have changed — and skip-guarded
    // DOM updates make the always-call cheap for guests and fresh visits.
    updateIdentityUI();
  })();
  window.addEventListener("hashchange", navigate);
  navigate();
}

boot();
