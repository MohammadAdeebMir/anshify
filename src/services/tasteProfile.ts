import { Track } from '@/types/music';

export interface TasteEntry {
  artist: string;
  keywords: string[];
  videoId: string;
  playCount: number;
  skipCount: number;
  totalPlayDuration: number;
  lastPlayedAt: number;
}

export interface UserTasteProfile {
  entries: Record<string, TasteEntry>; // keyed by videoId
  topArtists: string[];
  topKeywords: string[];
  recentVideoIds: string[];
  updatedAt: number;
}

const TASTE_KEY = 'ph-taste-profile';
const MAX_ENTRIES = 200;

function extractKeywords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'you', 'are',
  'was', 'were', 'been', 'have', 'has', 'had', 'not', 'but', 'what',
  'all', 'can', 'her', 'his', 'its', 'our', 'they', 'who', 'will',
  'feat', 'official', 'video', 'audio', 'lyrics', 'lyric', 'music',
]);

export function loadTasteProfile(): UserTasteProfile {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted */ }
  return { entries: {}, topArtists: [], topKeywords: [], recentVideoIds: [], updatedAt: 0 };
}

function saveTasteProfile(profile: UserTasteProfile) {
  try {
    localStorage.setItem(TASTE_KEY, JSON.stringify(profile));
  } catch { /* quota */ }
}

export function recordPlay(track: Track, durationPlayed: number) {
  const profile = loadTasteProfile();
  const existing = profile.entries[track.id];
  const keywords = extractKeywords(track.name);
  const isSkip = durationPlayed < 30 && track.duration > 30;

  if (existing) {
    existing.playCount += 1;
    existing.skipCount += isSkip ? 1 : 0;
    existing.totalPlayDuration += durationPlayed;
    existing.lastPlayedAt = Date.now();
    existing.keywords = [...new Set([...existing.keywords, ...keywords])].slice(0, 10);
  } else {
    profile.entries[track.id] = {
      artist: track.artist_name,
      keywords,
      videoId: track.id,
      playCount: 1,
      skipCount: isSkip ? 1 : 0,
      totalPlayDuration: durationPlayed,
      lastPlayedAt: Date.now(),
    };
  }

  // Update recents
  profile.recentVideoIds = [track.id, ...profile.recentVideoIds.filter(id => id !== track.id)].slice(0, 50);

  // Trim old entries
  const entries = Object.values(profile.entries);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    profile.entries = {};
    entries.slice(0, MAX_ENTRIES).forEach(e => { profile.entries[e.videoId] = e; });
  }

  // Recompute top artists & keywords
  profile.topArtists = computeTopArtists(profile);
  profile.topKeywords = computeTopKeywords(profile);
  profile.updatedAt = Date.now();

  saveTasteProfile(profile);
  return profile;
}

function computeTopArtists(profile: UserTasteProfile): string[] {
  const scores: Record<string, number> = {};
  const now = Date.now();

  Object.values(profile.entries).forEach(entry => {
    const recency = Math.max(0.2, 1 - (now - entry.lastPlayedAt) / (7 * 86400000)); // decay over 7 days
    const playScore = entry.playCount * 2;
    const skipPenalty = entry.skipCount * -1;
    const repeatBonus = Math.min(entry.playCount, 5) * 1.5;
    const score = (playScore + repeatBonus + skipPenalty) * recency;

    scores[entry.artist] = (scores[entry.artist] || 0) + score;
  });

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([artist]) => artist);
}

function computeTopKeywords(profile: UserTasteProfile): string[] {
  const scores: Record<string, number> = {};
  const now = Date.now();

  Object.values(profile.entries).forEach(entry => {
    const recency = Math.max(0.2, 1 - (now - entry.lastPlayedAt) / (7 * 86400000));
    const weight = (entry.playCount - entry.skipCount * 0.5) * recency;
    entry.keywords.forEach(kw => {
      scores[kw] = (scores[kw] || 0) + weight;
    });
  });

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([kw]) => kw);
}

// Generate search queries for recommendations
export function generateRecommendationQueries(profile: UserTasteProfile): { query: string; reason: string }[] {
  const queries: { query: string; reason: string }[] = [];
  const hours = new Date().getHours();

  // "Because you played {Artist}"
  profile.topArtists.slice(0, 3).forEach(artist => {
    queries.push({ query: `${artist} similar artists music`, reason: `Because you played ${artist}` });
  });

  // "More like your recent listens"
  if (profile.topKeywords.length >= 3) {
    const kws = profile.topKeywords.slice(0, 4).join(' ');
    queries.push({ query: `${kws} songs`, reason: 'More like your recent listens' });
  }

  // Time-based
  if (hours >= 22 || hours < 5) {
    queries.push({ query: 'late night chill vibes music', reason: 'Your late night vibe' });
  } else if (hours >= 5 && hours < 9) {
    queries.push({ query: 'morning energy upbeat music', reason: 'Morning energy boost' });
  } else if (hours >= 12 && hours < 14) {
    queries.push({ query: 'midday focus background music', reason: 'Midday focus' });
  } else if (hours >= 17 && hours < 20) {
    queries.push({ query: 'evening chill relaxing music', reason: 'Evening wind down' });
  }

  // Artist mix 
  if (profile.topArtists.length >= 2) {
    queries.push({
      query: `${profile.topArtists[0]} ${profile.topArtists[1]} mix`,
      reason: 'Recommended for you',
    });
  }

  return queries;
}
