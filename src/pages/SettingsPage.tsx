import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Lock, LogOut, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { user, signOut, updatePassword, loading } = useAuth();
  const navigate = useNavigate();
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
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    const { error } = await updatePassword(newPassword);
    if (error) toast.error(error.message);
    else {
      toast.success('Password updated');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm">Manage your account</p>
      </motion.div>

      {/* Profile Section */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Profile</h2>
        </div>
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
      </motion.section>

      {/* Password Section */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Change Password</h2>
        </div>
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
      </motion.section>

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
