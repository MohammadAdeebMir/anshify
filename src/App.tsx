import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import BrowsePage from "./pages/BrowsePage";
import LibraryPage from "./pages/LibraryPage";
import LikedSongsPage from "./pages/LikedSongsPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import PlaylistDetailPage from "./pages/PlaylistDetailPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ArtistPage from "./pages/ArtistPage";
import AlbumPage from "./pages/AlbumPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import StoragePage from "./pages/StoragePage";
import QueuePage from "./pages/QueuePage";
import SecretAdminPage from "./pages/SecretAdminPage";
import AdminNotifyPage from "./pages/AdminNotifyPage";
import NotFound from "./pages/NotFound";
import InstallPage from "./pages/InstallPage";
import InsightsPage from "./pages/InsightsPage";
import CreatePage from "./pages/CreatePage";
import RecentsPage from "./pages/RecentsPage";
import JamPage from "./pages/JamPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
        <PlayerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/liked" element={<LikedSongsPage />} />
                <Route path="/playlists" element={<PlaylistsPage />} />
                <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/artist/:id" element={<ArtistPage />} />
                <Route path="/album/:id" element={<AlbumPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/storage" element={<StoragePage />} />
                <Route path="/queue" element={<QueuePage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/create" element={<CreatePage />} />
                <Route path="/jam/:id" element={<JamPage />} />
                <Route path="/recents" element={<RecentsPage />} />
              </Route>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin-x9k2m" element={<SecretAdminPage />} />
              <Route path="/admin-notify-x9k2m" element={<AdminNotifyPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </PlayerProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
