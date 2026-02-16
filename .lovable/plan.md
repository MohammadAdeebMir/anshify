

# 🎵 Purple Haze — Premium Music Streaming App

## Overview
A premium, dark-themed music streaming web app powered by **Jamendo API** and **Supabase**, featuring a stunning purple gradient design with glassmorphism effects, smooth animations, and a polished Spotify/Apple Music-inspired UX.

---

## Phase 1: Design System & Layout Shell

### Purple Gradient Theme
- Dark-only theme with deep violet-to-magenta gradient backgrounds
- Glassmorphism panels with backdrop blur and 10–15% transparency
- Soft shadows, rounded corners (16–20px), no harsh borders
- Animated background gradient with subtle radial glow
- Inter/Poppins typography with generous spacing

### App Layout
- **Desktop**: Collapsible left sidebar + scrollable main content + sticky bottom player
- **Mobile**: Bottom tab navigation + floating mini-player
- Smooth page transitions between routes

---

## Phase 2: Skeleton Loading System

### Reusable shimmer-based skeletons matching the purple theme
- **Song Row Skeleton**: Circle + 2 text bars + duration placeholder
- **Album Grid Skeleton**: Square image + 2 text lines
- **Artist Skeleton**: Large circle + title + horizontal shimmer
- **Playlist Skeleton**: Header block + multiple row skeletons
- **Player Skeleton**: Mini cover + text bars + button placeholders
- Minimum 300ms display, smooth fade-out, zero layout shift

---

## Phase 3: Authentication (Supabase)

### Guest Mode
- Browse, search, and stream music freely
- Subtle upgrade prompts when trying to save/like/create playlists

### Login Mode
- Email + password signup/login
- Google OAuth
- Session persistence with JWT
- Password reset flow with dedicated `/reset-password` page

### User Profiles Table
- Display name, avatar, preferences
- Auto-created on signup via database trigger
- Profile page for logged-in users

---

## Phase 4: Music Browsing & Discovery (Jamendo API)

### Core Pages
- **Home**: Featured tracks, trending, recently played, personalized recommendations
- **Search**: Live search with debouncing for tracks, albums, artists
- **Browse by Genre**: Genre grid with filtered results
- **Album Page**: Album art, track list, artist info
- **Artist Page**: Bio, top tracks, albums, follow button

### Data Layer
- Jamendo API integration via Supabase Edge Function (API key stored as secret)
- React Query for caching and efficient data fetching
- Lazy-loaded album artwork with image optimization

---

## Phase 5: Music Player

### Sticky Bottom Player
- Album cover, song title, artist name
- Play/Pause, Next/Previous, Seek bar, Volume slider
- Shuffle & Repeat toggles
- Active track glow effect and smooth animations
- Keyboard shortcut: Space = Play/Pause
- Volume persistence across sessions
- Mobile: collapsible mini-player

---

## Phase 6: User Features (Authenticated)

### Playlists
- Create, rename, delete playlists
- Add/remove songs from playlists
- Playlist detail page with drag-friendly list

### Likes & Library
- Like/unlike songs (heart icon)
- Liked Songs page
- Recently played tracking

### Recommendations
- Based on liked genres and listening history

### Follow Artists
- Follow/unfollow artists
- Followed artists page

---

## Phase 7: Settings & Polish

### Settings Page
- Profile editing (name, avatar)
- Playback preferences
- Account management / logout

### Micro-Interactions
- Button hover glow effects
- Album card scale-on-hover
- Soft fade and blur transitions
- Elegant empty states with illustrations
- Toast notifications for actions (liked, added to playlist, etc.)

---

## Database Structure (Supabase)

- **profiles** — display_name, avatar_url, linked to auth.users
- **user_roles** — role-based access (admin, user)
- **playlists** — user-created playlists
- **playlist_songs** — songs in playlists
- **liked_songs** — user's liked tracks
- **recently_played** — listening history
- **followed_artists** — artist follow relationships

All tables with RLS policies scoped to authenticated users.

---

## Architecture

- **Edge Function**: Proxy layer for Jamendo API (keeps API key secure)
- **React Query**: Caching, pagination, and data management
- **Context/Hooks**: Player state, auth state, theme
- **Modular folder structure**: components, hooks, services, pages, utils, types

---

## Tech Stack
- React + TypeScript + Vite + Tailwind CSS
- Supabase (Auth, Database, Edge Functions, Storage)
- Jamendo API (via edge function proxy)
- React Query for data fetching
- Shadcn/ui components as foundation

