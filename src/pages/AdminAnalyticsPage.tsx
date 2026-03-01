import { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Activity, Music, Heart, ListMusic, TrendingUp,
  UserPlus, BarChart3, Lock, LogOut, Loader2, Clock, Eye, EyeOff,
  Zap, Calendar, Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from 'recharts';

interface AnalyticsData {
  totalUsers: number;
  dau: number;
  mau: number;
  newUsersMonth: number;
  totalPlays: number;
  totalLikes: number;
  totalPlaylists: number;
  playsToday: number;
  totalListeningMinutes: number;
  monthlyListeningMinutes: number;
  weeklyListeningMinutes: number;
  monthlyGrowth: Record<string, number>;
  dailyPlays: Record<string, number>;
  hourlyDist: number[];
  avgSongsPerSession: number;
  avgSessionDuration: number;
  topArtists: { artist_name: string; play_count: number }[];
  topTracks: { track_name: string; artist_name: string; play_count: number }[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AdminAnalyticsPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<number>(0);

  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  const fetchAnalytics = useCallback(async () => {
    const { data: result, error } = await supabase.functions.invoke('admin-auth', {
      body: { action: 'analytics' },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result as AnalyticsData;
  }, []);

  const handleLogin = async () => {
    if (!username || !password) { toast.error('Enter credentials'); return; }
    setLoading(true);
    try {
      const { data: loginData, error: loginErr } = await supabase.functions.invoke('admin-auth', {
        body: { username, password, action: 'login' },
      });
      if (loginErr) throw loginErr;
      if (loginData?.error) { toast.error(loginData.error); setLoading(false); return; }

      // Clear credentials immediately
      setUsername('');
      setPassword('');

      const analytics = await fetchAnalytics();
      setData(analytics);
      setAuthenticated(true);
      setSessionExpiry(Date.now() + SESSION_DURATION);
      toast.success('Admin access granted');

      // Auto-logout timer
      setTimeout(() => {
        setAuthenticated(false);
        setData(null);
        toast.info('Session expired. Please log in again.');
      }, SESSION_DURATION);
    } catch (e: any) {
      toast.error(e.message || 'Authentication failed');
    }
    setLoading(false);
  };

  const refresh = async () => {
    if (Date.now() > sessionExpiry) {
      setAuthenticated(false);
      setData(null);
      toast.info('Session expired');
      return;
    }
    setLoading(true);
    try {
      const analytics = await fetchAnalytics();
      setData(analytics);
      toast.success('Data refreshed');
    } catch { toast.error('Refresh failed'); }
    setLoading(false);
  };

  const logout = () => {
    setAuthenticated(false);
    setData(null);
    setUsername('');
    setPassword('');
  };

  // ── LOGIN SCREEN ──
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
            <h1 className="text-xl font-bold text-foreground">Admin Console</h1>
            <p className="text-xs text-muted-foreground">Analytics Dashboard · Restricted Access</p>
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
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary/50 border-border/30 pr-10"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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

  // ── DASHBOARD ──
  const chartData = data ? Object.entries(data.dailyPlays)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.substring(5), plays: count })) : [];

  const growthData = data ? Object.entries(data.monthlyGrowth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: MONTH_NAMES[parseInt(month.substring(5)) - 1] || month,
      users: count,
    })) : [];

  const hourlyData = data ? data.hourlyDist.map((count, hour) => ({
    hour: `${hour}:00`,
    plays: count,
  })) : [];

  const formatMinutes = (mins: number) => {
    if (mins >= 60) return `${(mins / 60).toFixed(1)}h`;
    return `${mins}m`;
  };

  const statCards = [
    { label: 'Total Users', value: data?.totalUsers ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Daily Active', value: data?.dau ?? 0, icon: Activity, color: 'text-green-400' },
    { label: 'Monthly Active', value: data?.mau ?? 0, icon: TrendingUp, color: 'text-purple-400' },
    { label: 'New This Month', value: data?.newUsersMonth ?? 0, icon: UserPlus, color: 'text-emerald-400' },
    { label: 'Total Plays', value: data?.totalPlays ?? 0, icon: Music, color: 'text-pink-400' },
    { label: 'Plays Today', value: data?.playsToday ?? 0, icon: Zap, color: 'text-amber-400' },
    { label: 'Total Likes', value: data?.totalLikes ?? 0, icon: Heart, color: 'text-red-400' },
    { label: 'Total Playlists', value: data?.totalPlaylists ?? 0, icon: ListMusic, color: 'text-cyan-400' },
    { label: 'Listening Time', value: formatMinutes(data?.totalListeningMinutes ?? 0), icon: Clock, color: 'text-orange-400' },
  ];

  const engagementCards = [
    { label: 'Avg Songs/Session', value: data?.avgSongsPerSession ?? 0, icon: Music },
    { label: 'Avg Session Duration', value: formatMinutes(data?.avgSessionDuration ?? 0), icon: Timer },
    { label: 'Weekly Listening', value: formatMinutes(data?.weeklyListeningMinutes ?? 0), icon: Calendar },
    { label: 'Monthly Listening', value: formatMinutes(data?.monthlyListeningMinutes ?? 0), icon: Clock },
  ];

  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
  };

  return (
    <div className="min-h-screen gradient-bg relative">
      <div className="absolute inset-0 gradient-radial pointer-events-none" />
      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">Admin Analytics Console</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Aggregate metrics · No personal data exposed</p>
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

        {/* Core Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass border-border/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Engagement Cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Engagement Metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {engagementCards.map((e) => (
              <Card key={e.label} className="glass border-border/20">
                <CardContent className="p-4">
                  <e.icon className="h-4 w-4 text-primary mb-1" />
                  <p className="text-xl font-bold text-foreground">{typeof e.value === 'number' ? e.value : e.value}</p>
                  <p className="text-[10px] text-muted-foreground">{e.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Daily Plays Chart */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass border-border/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Daily Plays (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="playsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="plays" stroke="hsl(var(--primary))" fill="url(#playsGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* User Growth */}
          {growthData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="glass border-border/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-400" /> User Growth (This Year)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="users" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ fill: 'hsl(142 71% 45%)' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Peak Hours Heatmap */}
          {hourlyData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="glass border-border/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" /> Peak Usage Hours (This Week)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} interval={2} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="plays" fill="hsl(25 95% 53%)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Top Tracks */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="glass border-border/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Music className="h-4 w-4 text-pink-400" /> Top Tracks (Aggregated)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.topTracks || []).length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                {(data?.topTracks || []).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-5 font-mono">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.track_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.artist_name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-primary font-medium flex-shrink-0">{t.play_count} plays</span>
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
                  <TrendingUp className="h-4 w-4 text-cyan-400" /> Top Artists (Aggregated)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.topArtists || []).length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                {(data?.topArtists || []).map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 font-mono">{i + 1}</span>
                      <p className="text-sm font-medium text-foreground">{a.artist_name}</p>
                    </div>
                    <span className="text-xs text-primary font-medium">{a.play_count} plays</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Privacy Notice */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="glass rounded-xl p-4 border border-border/20">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-green-400" />
              <span className="text-xs font-semibold text-foreground">Privacy Safeguard Active</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              This dashboard shows only aggregated, anonymized metrics. No individual user listening history,
              song lists, playback timelines, or email addresses are exposed. User-side "Your Music Insights"
              remains private and local.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
