import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Activity, Music, Heart, ListMusic, TrendingUp, UserPlus, BarChart3, Lock, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AdminStats {
  totalUsers: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  newToday: number;
  newMonth: number;
  totalPlays: number;
  totalLikes: number;
  totalPlaylists: number;
  topArtists: { artist_name: string; play_count: number }[];
  topTracks: { track_name: string; artist_name: string; play_count: number }[];
  recentUsers: { label: string; created_at: string; total_listens: number; streak_days: number }[];
  dailyPlays: Record<string, number>;
}

const SecretAdminPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [credentials, setCredentials] = useState({ u: '', p: '' });

  const handleLogin = async () => {
    if (!username || !password) { toast.error('Enter credentials'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { username, password },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setLoading(false); return; }
      setStats(data);
      setCredentials({ u: username, p: password });
      setAuthenticated(true);
      toast.success('Admin access granted');
    } catch (e: any) {
      toast.error(e.message || 'Authentication failed');
    }
    setLoading(false);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { username: credentials.u, password: credentials.p },
      });
      if (error) throw error;
      setStats(data);
      toast.success('Data refreshed');
    } catch { toast.error('Refresh failed'); }
    setLoading(false);
  };

  const logout = () => {
    setAuthenticated(false);
    setStats(null);
    setUsername('');
    setPassword('');
    setCredentials({ u: '', p: '' });
  };

  // Build chart data from dailyPlays
  const chartData = stats ? Object.entries(stats.dailyPlays)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: date.substring(5), // MM-DD
      plays: count,
    })) : [];

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
        <div className="absolute inset-0 gradient-radial pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-8 w-full max-w-sm space-y-6 relative z-10"
        >
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
            <p className="text-xs text-muted-foreground">Restricted area</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground/80 text-sm">Username</Label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                className="bg-secondary/50 border-border/30"
                autoComplete="off"
              />
            </div>
            <div>
              <Label className="text-foreground/80 text-sm">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary/50 border-border/30"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="off"
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full rounded-xl bg-primary text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {loading ? 'Verifying...' : 'Authenticate'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Active Today', value: stats?.activeToday ?? 0, icon: Activity, color: 'text-green-400' },
    { label: 'Active This Week', value: stats?.activeWeek ?? 0, icon: TrendingUp, color: 'text-cyan-400' },
    { label: 'Active This Month', value: stats?.activeMonth ?? 0, icon: BarChart3, color: 'text-purple-400' },
    { label: 'New Today', value: stats?.newToday ?? 0, icon: UserPlus, color: 'text-emerald-400' },
    { label: 'New This Month', value: stats?.newMonth ?? 0, icon: UserPlus, color: 'text-teal-400' },
    { label: 'Total Plays', value: stats?.totalPlays ?? 0, icon: Music, color: 'text-pink-400' },
    { label: 'Total Likes', value: stats?.totalLikes ?? 0, icon: Heart, color: 'text-red-400' },
    { label: 'Total Playlists', value: stats?.totalPlaylists ?? 0, icon: ListMusic, color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen gradient-bg relative">
      <div className="absolute inset-0 gradient-radial pointer-events-none" />
      <div className="relative z-10 p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Real-time platform analytics</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={refresh} disabled={loading} variant="outline" size="sm" className="rounded-xl border-border/30">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={logout} variant="outline" size="sm" className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass border-border/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Daily Plays Chart */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass border-border/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Daily Plays (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="plays" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* Top Tracks */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="glass border-border/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Music className="h-4 w-4 text-pink-400" /> Top Tracks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(stats?.topTracks || []).length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                {(stats?.topTracks || []).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.track_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.artist_name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-primary font-medium">{t.play_count} plays</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Artists */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass border-border/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-cyan-400" /> Top Artists
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(stats?.topArtists || []).length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                {(stats?.topArtists || []).map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                      <p className="text-sm font-medium text-foreground">{a.artist_name}</p>
                    </div>
                    <span className="text-xs text-primary font-medium">{a.play_count} plays</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Users */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="glass border-border/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-400" /> Recent Signups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.recentUsers || []).length === 0 && <p className="text-xs text-muted-foreground">No users yet</p>}
              <div className="space-y-2">
                {(stats?.recentUsers || []).map((u, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Joined {new Date(u.created_at).toLocaleDateString()} · {u.total_listens} listens · {u.streak_days}d streak
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SecretAdminPage;
