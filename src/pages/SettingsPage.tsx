import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Lock, LogOut, Save, Palette, Music, Timer, Waves } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { usePlayer, CrossfadeMode } from '@/contexts/PlayerContext';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const themes: { id: ThemeMode; name: string; desc: string; preview: string }[] = [
  { id: 'default', name: 'Purple Haze', desc: 'Deep violet with purple accents', preview: 'bg-gradient-to-br from-purple-900 to-violet-800' },
  { id: 'amoled', name: 'AMOLED Black', desc: 'Pure black for OLED screens', preview: 'bg-black border border-border/30' },
  { id: 'midnight', name: 'Midnight Blue', desc: 'Deep navy with blue accents', preview: 'bg-gradient-to-br from-blue-950 to-slate-900' },
];

const crossfadeOptions: { label: string; value: CrossfadeMode }[] = [
  { label: 'Off', value: 0 },
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: '8s', value: 8 },
  { label: '12s', value: 12 },
];

const SettingsPage = () => {
  const { user, signOut, updatePassword, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { crossfadeDuration, setCrossfadeDuration, volumeNormalization, setVolumeNormalization } = usePlayer();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || '');
          setAvatarUrl(data.avatar_url || '');
        }
      });
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-8 text-center space-y-4">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Sign in to access settings</h2>
          <Button onClick={() => navigate('/auth')} className="bg-primary rounded-xl glow-primary">Sign In</Button>
        </motion.div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null, avatar_url: avatarUrl.trim() || null })
      .eq('user_id', user.id);
    if (error) toast.error(error.message);
    else toast.success('Profile updated');
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    const { error } = await updatePassword(newPassword);
    if (error) toast.error(error.message);
    else { toast.success('Password updated'); setNewPassword(''); setConfirmPassword(''); }
    setSaving(false);
  };

  const SectionCard = ({ children, icon: Icon, title, delay = 0 }: { children: React.ReactNode; icon: any; title: string; delay?: number }) => (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.section>
  );

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
      </motion.div>

      {/* Theme */}
      <SectionCard icon={Palette} title="Appearance">
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                'rounded-xl p-3 text-left transition-all border-2',
                theme === t.id ? 'border-primary' : 'border-transparent hover:border-border/50'
              )}
            >
              <div className={cn('h-12 rounded-lg mb-2', t.preview)} />
              <p className="text-xs font-semibold text-foreground">{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Playback */}
      <SectionCard icon={Music} title="Playback" delay={0.05}>
        <div className="space-y-4">
          <div>
            <Label className="text-foreground/80 text-sm mb-2 block">Crossfade</Label>
            <div className="flex gap-2">
              {crossfadeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCrossfadeDuration(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    crossfadeDuration === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Volume Normalization</p>
              <p className="text-xs text-muted-foreground">Balance volume across tracks</p>
            </div>
            <Switch checked={volumeNormalization} onCheckedChange={setVolumeNormalization} />
          </div>
        </div>
      </SectionCard>

      {/* Profile */}
      <SectionCard icon={User} title="Profile" delay={0.1}>
        <div className="space-y-3">
          <div>
            <Label className="text-foreground/80 text-sm">Email</Label>
            <Input value={user.email || ''} disabled className="bg-secondary/30 border-border/20 text-muted-foreground" />
          </div>
          <div>
            <Label className="text-foreground/80 text-sm">Display Name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" className="bg-secondary/50 border-border/30" />
          </div>
          <div>
            <Label className="text-foreground/80 text-sm">Avatar URL</Label>
            <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="bg-secondary/50 border-border/30" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="rounded-xl bg-primary text-primary-foreground">
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </SectionCard>

      {/* Password */}
      <SectionCard icon={Lock} title="Change Password" delay={0.15}>
        <div className="space-y-3">
          <div>
            <Label className="text-foreground/80 text-sm">New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-secondary/50 border-border/30" minLength={6} />
          </div>
          <div>
            <Label className="text-foreground/80 text-sm">Confirm Password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="bg-secondary/50 border-border/30" />
          </div>
          <Button onClick={handleChangePassword} disabled={saving || !newPassword} variant="outline" className="rounded-xl border-border/30">
            <Lock className="h-4 w-4 mr-1" /> Update Password
          </Button>
        </div>
      </SectionCard>

      {/* Sign Out */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
        <Button
          variant="outline"
          onClick={async () => { await signOut(); navigate('/'); }}
          className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </motion.section>
    </div>
  );
};

export default SettingsPage;
