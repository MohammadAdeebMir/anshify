import { supabase } from '@/integrations/supabase/client';
import { Track, Album, Artist } from '@/types/music';

interface JamendoResponse<T> {
  headers: { status: string; code: number; results_count: number };
  results: T[];
}

async function jamendoCall<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const { data, error } = await supabase.functions.invoke('jamendo', {
    body: { endpoint, params },
  });

  if (error) throw new Error(error.message || 'Jamendo API call failed');
  if (data?.error) throw new Error(data.error);

  return (data as JamendoResponse<T>).results || [];
}

// Map Jamendo track to our Track type
function mapTrack(t: any): Track {
  return {
    id: String(t.id),
    name: t.name,
    artist_name: t.artist_name,
    artist_id: String(t.artist_id),
    album_name: t.album_name || '',
    album_id: String(t.album_id || ''),
    album_image: t.album_image || t.image || '',
    duration: t.duration || 0,
    audio: t.audio || '',
    position: t.position || 0,
  };
}

function mapAlbum(a: any): Album {
  return {
    id: String(a.id),
    name: a.name,
    artist_name: a.artist_name,
    artist_id: String(a.artist_id),
    image: a.image || '',
    releasedate: a.releasedate || '',
    tracks: (a.tracks || []).map(mapTrack),
  };
}

function mapArtist(a: any): Artist {
  return {
    id: String(a.id),
    name: a.name,
    image: a.image || '',
    joindate: a.joindate || '',
    website: a.website || '',
  };
}

// ---- Public API ----

export async function getTrendingTracks(limit = 10): Promise<Track[]> {
  const results = await jamendoCall<any>('tracks', {
    order: 'popularity_week',
    limit: String(limit),
    include: 'musicinfo',
    audioformat: 'mp32',
  });
  return results.map(mapTrack);
}

export async function getNewReleases(limit = 10): Promise<Album[]> {
  const results = await jamendoCall<any>('albums', {
    order: 'releasedate_desc',
    limit: String(limit),
    imagesize: '300',
  });
  return results.map(mapAlbum);
}

export async function getPopularArtists(limit = 6): Promise<Artist[]> {
  const results = await jamendoCall<any>('artists', {
    order: 'popularity_week',
    limit: String(limit),
    imagesize: '300',
  });
  return results.map(mapArtist);
}

export async function searchTracks(query: string, limit = 20): Promise<Track[]> {
  const results = await jamendoCall<any>('tracks', {
    search: query,
    limit: String(limit),
    audioformat: 'mp32',
  });
  return results.map(mapTrack);
}

export async function searchAlbums(query: string, limit = 10): Promise<Album[]> {
  const results = await jamendoCall<any>('albums', {
    search: query,
    limit: String(limit),
    imagesize: '300',
  });
  return results.map(mapAlbum);
}

export async function searchArtists(query: string, limit = 10): Promise<Artist[]> {
  const results = await jamendoCall<any>('artists', {
    search: query,
    limit: String(limit),
    imagesize: '300',
  });
  return results.map(mapArtist);
}

export async function getTracksByGenre(genre: string, limit = 20): Promise<Track[]> {
  const results = await jamendoCall<any>('tracks', {
    tags: genre.toLowerCase(),
    limit: String(limit),
    order: 'popularity_week',
    audioformat: 'mp32',
  });
  return results.map(mapTrack);
}

export async function getAlbumTracks(albumId: string): Promise<Track[]> {
  const results = await jamendoCall<any>('tracks', {
    album_id: albumId,
    audioformat: 'mp32',
    order: 'position_asc',
  });
  return results.map(mapTrack);
}

export async function getArtistDetails(artistId: string): Promise<Artist | null> {
  const results = await jamendoCall<any>('artists', {
    id: artistId,
    imagesize: '300',
  });
  return results.length > 0 ? mapArtist(results[0]) : null;
}

export async function getArtistTracks(artistId: string, limit = 20): Promise<Track[]> {
  const results = await jamendoCall<any>('tracks', {
    artist_id: artistId,
    limit: String(limit),
    order: 'popularity_total',
    audioformat: 'mp32',
  });
  return results.map(mapTrack);
}

export async function getArtistAlbums(artistId: string, limit = 10): Promise<Album[]> {
  const results = await jamendoCall<any>('albums', {
    artist_id: artistId,
    limit: String(limit),
    imagesize: '300',
    order: 'releasedate_desc',
  });
  return results.map(mapAlbum);
}
