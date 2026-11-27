/**
 * Real-Time Spectator Presence Tracker for Battle Rooms.
 *
 * Tracks unique authenticated spectators watching a battle room (Lobby or Live Quiz)
 * using a sliding TTL heartbeat window so spectator counts update accurately in real time.
 */

const SPECTATOR_TTL_MS = 12_000;

interface GlobalSpectatorStore {
  __netmifiSpectatorPresence?: Map<string, Map<string, number>>;
}

function getPresenceMap(): Map<string, Map<string, number>> {
  const g = globalThis as unknown as GlobalSpectatorStore;
  if (!g.__netmifiSpectatorPresence) {
    g.__netmifiSpectatorPresence = new Map<string, Map<string, number>>();
  }
  return g.__netmifiSpectatorPresence;
}

function pruneExpiredSpectators(battleId: string, nowMs: number): Map<string, number> {
  const store = getPresenceMap();
  const roomMap = store.get(battleId);
  if (!roomMap) {
    return new Map<string, number>();
  }

  for (const [viewerId, lastSeenMs] of roomMap.entries()) {
    if (nowMs - lastSeenMs > SPECTATOR_TTL_MS) {
      roomMap.delete(viewerId);
    }
  }

  if (roomMap.size === 0) {
    store.delete(battleId);
  }

  return roomMap;
}

/**
 * Records a spectator heartbeat for `userId` in `battleId` and returns the active spectator count.
 */
export function recordSpectatorHeartbeat(
  battleId: string,
  userId: string
): number {
  const nowMs = Date.now();
  const store = getPresenceMap();
  let roomMap = store.get(battleId);
  if (!roomMap) {
    roomMap = new Map<string, number>();
    store.set(battleId, roomMap);
  }

  roomMap.set(userId, nowMs);
  return pruneExpiredSpectators(battleId, nowMs).size;
}

/**
 * Removes a spectator from `battleId` immediately when they leave or join as a participant.
 */
export function removeSpectatorHeartbeat(
  battleId: string,
  userId: string
): number {
  const nowMs = Date.now();
  const store = getPresenceMap();
  const roomMap = store.get(battleId);
  if (roomMap) {
    roomMap.delete(userId);
  }
  return pruneExpiredSpectators(battleId, nowMs).size;
}

/**
 * Returns the number of active spectators currently watching `battleId`.
 */
export function getActiveSpectatorCount(battleId: string): number {
  return pruneExpiredSpectators(battleId, Date.now()).size;
}
