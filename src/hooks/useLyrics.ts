import { useQuery } from '@tanstack/react-query';

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface LyricsResult {
  synced: boolean;
  lines: LyricLine[];
  plainText?: string;
}

function parseSyncedLyrics(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/g;
  let match;
  while ((match = regex.exec(lrc)) !== null) {
    const min = parseInt(match[1]);
    const sec = parseInt(match[2]);
    const ms = parseInt(match[3].padEnd(3, '0'));
    const time = min * 60 + sec + ms / 1000;
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

async function fetchLyrics(trackName: string, artistName: string): Promise<LyricsResult | null> {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });
    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'Anshify/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();

    // Prefer synced lyrics
    if (data.syncedLyrics) {
      const lines = parseSyncedLyrics(data.syncedLyrics);
      if (lines.length > 0) {
        return { synced: true, lines };
      }
    }

    // Fallback to plain lyrics
    if (data.plainLyrics) {
      const lines = data.plainLyrics
        .split('\n')
        .filter((l: string) => l.trim())
        .map((text: string, i: number) => ({ time: i, text: text.trim() }));
      return { synced: false, lines, plainText: data.plainLyrics };
    }

    return null;
  } catch {
    return null;
  }
}

export function useLyrics(trackName: string | undefined, artistName: string | undefined) {
  return useQuery({
    queryKey: ['lyrics', trackName, artistName],
    queryFn: () => fetchLyrics(trackName!, artistName!),
    enabled: !!trackName && !!artistName,
    staleTime: 30 * 60 * 1000, // 30 min cache
    retry: 1,
  });
}
