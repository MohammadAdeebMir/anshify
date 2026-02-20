import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Send, Trash2, Lock, LogOut, Loader2, Image, Bell, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  created_at: string;
}

const AdminNotifyPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ u: '', p: '' });
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sending, setSending] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { toast.error('Enter credentials'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { username, password, action: 'list_notifications' },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setLoading(false); return; }
      setNotifications(data.notifications || []);
      setCredentials({ u: username, p: password });
      setAuthenticated(true);
      toast.success('Admin access granted');
    } catch (e: any) {
      toast.error(e.message || 'Authentication failed');
    }
    setLoading(false);
  };

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Title and body are required'); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: {
          username: credentials.u,
          password: credentials.p,
          action: 'send_notification',
          notificationTitle: title,
          notificationBody: body,
          notificationImage: imageUrl || null,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setSending(false); return; }
      toast.success('Notification sent to all users!');
      if (data.notification) setNotifications(prev => [data.notification, ...prev]);
      setTitle('');
      setBody('');
      setImageUrl('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    }
    setSending(false);
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase.functions.invoke('admin-auth', {
        body: { username: credentials.u, password: credentials.p, action: 'delete_notification', notificationId: id },
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

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
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Notification Admin</h1>
            <p className="text-xs text-muted-foreground">Send broadcasts to users</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground/80 text-sm">Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="bg-secondary/50 border-border/30" autoComplete="off" />
            </div>
            <div>
              <Label className="text-foreground/80 text-sm">Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="bg-secondary/50 border-border/30" onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="off" />
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

  return (
    <div className="min-h-screen gradient-bg relative">
      <div className="absolute inset-0 gradient-radial pointer-events-none" />
      <div className="relative z-10 p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Send Notification</h1>
              <p className="text-xs text-muted-foreground">Broadcast to all users</p>
            </div>
          </div>
          <Button onClick={() => { setAuthenticated(false); setCredentials({ u: '', p: '' }); }} variant="outline" size="sm" className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Compose */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-border/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> New Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-foreground/70 text-xs">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title..." className="bg-secondary/50 border-border/30 mt-1" />
              </div>
              <div>
                <Label className="text-foreground/70 text-xs">Body</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." className="bg-secondary/50 border-border/30 mt-1 min-h-[80px]" />
              </div>
              <div>
                <Label className="text-foreground/70 text-xs flex items-center gap-1"><Image className="h-3 w-3" /> Image URL (optional)</Label>
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="bg-secondary/50 border-border/30 mt-1" />
              </div>
              {imageUrl && (
                <div className="rounded-xl overflow-hidden border border-border/20 max-h-40">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <Button onClick={sendNotification} disabled={sending} className="w-full rounded-xl">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {sending ? 'Sending...' : 'Send to All Users'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Past Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass border-border/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" /> Sent ({notifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 && <p className="text-xs text-muted-foreground">No notifications sent yet</p>}
              {notifications.map(n => (
                <div key={n.id} className="flex gap-3 p-3 rounded-xl bg-secondary/30 border border-border/10">
                  {n.image_url && (
                    <img src={n.image_url} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => deleteNotification(n.id)} className="p-1.5 text-destructive/60 hover:text-destructive transition-colors flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminNotifyPage;
