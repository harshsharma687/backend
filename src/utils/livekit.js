import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

// LiveKit Cloud credentials come from the environment. When they are missing
// the app must fail with a clear, actionable error — never a broken stream.
const LIVEKIT_URL = process.env.LIVEKIT_URL || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

export const isLivekitConfigured = () =>
  Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);

export const livekitMissingMessage =
  "Live streaming is not configured on this server. Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET (free tier at cloud.livekit.io), then redeploy.";

const normaliseUrl = (url) => url.replace(/\/+$/, "");

// Host can publish camera/mic + screen and manage the room; viewers can only
// subscribe. Identities are stable so reconnects resume the same participant.
// NOTE: toJwt() returns a Promise in livekit-server-sdk v2 — await it, or the
// token serialises to {} and the browser can never join the room.
const mintToken = async ({ identity, roomName, name, canPublish, ttlSeconds = 60 * 60 * 6 }) => {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name,
    ttl: ttlSeconds,
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
};

export const createHostToken = ({ userId, username, roomName }) =>
  mintToken({
    identity: `host-${userId}`,
    roomName,
    name: username || "Host",
    canPublish: true,
  });

export const createViewerToken = ({ userId, username, roomName }) =>
  mintToken({
    identity: userId ? `viewer-${userId}-${Date.now()}` : `guest-${Math.random().toString(36).slice(2)}`,
    roomName,
    name: username || "Guest",
    canPublish: false,
  });

// RoomServiceClient is only usable when credentials exist; callers must check
// isLivekitConfigured() first.
export const getRoomService = () =>
  new RoomServiceClient(`${normaliseUrl(LIVEKIT_URL).replace(/^ws/, "http")}`, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// Best-effort room teardown when a stream ends — an orphaned LiveKit room
// would keep accepting publishes. Failures are logged, not thrown, because
// rooms also auto-close when the last participant leaves.
export const deleteRoom = async (roomName) => {
  try {
    await getRoomService().deleteRoom(roomName);
  } catch (error) {
    console.error(`LiveKit room delete failed for ${roomName}:`, error?.message || error);
  }
};

// Remove a participant from a running LiveKit room (host "block" action).
// Best-effort: if the room already closed or the viewer left, this is a no-op.
export const removeParticipant = async (roomName, identity) => {
  try {
    await getRoomService().removeParticipant(roomName, identity);
    return true;
  } catch (error) {
    // LiveKit answers 409/404 when the participant/room is already gone.
    console.error(`LiveKit removeParticipant failed for ${identity} in ${roomName}:`, error?.message || error);
    return false;
  }
};

export const livekitUrlForClient = () => normaliseUrl(LIVEKIT_URL);
