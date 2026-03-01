import { motion } from 'framer-motion';
import { ListMusic, Users, Radio, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePlaylist } from '@/hooks/usePlaylist';
import { useCreateJam, useJoinJam } from '@/hooks/useJam';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const createOptions = [
  {
    id: 'playlist',
    icon: ListMusic,
    title: 'Create Playlist',
    description: 'Curate your own collection of songs',
    gradient: 'linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(240 6% 14%) 100%)',
  },
  {
    id: 'jam',
    icon: Radio,
    title: 'Start a Jam',
    description: 'Listen together with friends in real-time',
    gradient: 'linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(240 6% 14%) 100%)',
  },
  {
    id: 'collab',
    icon: Users,
    title: 'Collaborative Playlist',
    description: 'Build a playlist together with others',
    gradient: 'linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(240 6% 14%) 100%)',
  },
];

const CreatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [jamName, setJamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const createPlaylist = useCreatePlaylist();
  const createJam = useCreateJam();
  const joinJam = useJoinJam();

  if (!user) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="glass rounded-3xl p-8 text-center space-y-4">
          <Plus className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Sign in to create</h2>
          <p className="text-muted-foreground text-sm">Create playlists, start jams, and collaborate with friends.</p>
          <Button onClick={() => navigate('/auth')} className="bg-primary rounded-xl glow-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    try {
      const data = await createPlaylist.mutateAsync({ name: playlistName.trim(), description: playlistDesc.trim() || undefined });
      setPlaylistName('');
      setPlaylistDesc('');
      setActiveFlow(null);
      if (data) navigate(`/playlist/${data.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create playlist');
    }
  };

  const handleStartJam = async () => {
    const name = jamName.trim() || 'Jam Session';
    try {
      const session = await createJam.mutateAsync(name);
      setJamName('');
      setActiveFlow(null);
      navigate(`/jam/${session.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to start jam');
    }
  };

  const handleJoinJam = async () => {
    if (!joinCode.trim()) {
      toast.error('Enter a jam code');
      return;
    }
    try {
      const session = await joinJam.mutateAsync(joinCode.trim());
      setJoinCode('');
      setActiveFlow(null);
      navigate(`/jam/${session.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to join jam');
    }
  };

  const handleCreateCollab = async () => {
    if (!playlistName.trim()) {
      toast.error('Enter a name');
      return;
    }
    try {
      const data = await createPlaylist.mutateAsync({ name: playlistName.trim(), description: 'Collaborative playlist' });
      setPlaylistName('');
      setActiveFlow(null);
      if (data) {
        const url = `${window.location.origin}/playlist/${data.id}`;
        navigator.clipboard.writeText(url);
        toast.success('Playlist created! Link copied to clipboard.');
        navigate(`/playlist/${data.id}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 pb-36">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Create</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Start something new</p>
      </motion.div>

      {!activeFlow && (
        <div className="space-y-3">
          {createOptions.map((option, i) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveFlow(option.id)}
              className="w-full rounded-2xl p-5 flex items-center gap-4 text-left transition-colors active:brightness-110"
              style={{ background: option.gradient }}
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <option.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground">{option.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      {/* Create Playlist Flow */}
      {activeFlow === 'playlist' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">New Playlist</h2>
            <button onClick={() => setActiveFlow(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="pl-name" className="text-xs text-muted-foreground">Name *</Label>
              <Input id="pl-name" value={playlistName} onChange={e => setPlaylistName(e.target.value)} placeholder="My awesome playlist" className="mt-1 bg-secondary/50 border-border/30 rounded-xl" maxLength={100} />
            </div>
            <div>
              <Label htmlFor="pl-desc" className="text-xs text-muted-foreground">Description</Label>
              <Input id="pl-desc" value={playlistDesc} onChange={e => setPlaylistDesc(e.target.value)} placeholder="What's this playlist about?" className="mt-1 bg-secondary/50 border-border/30 rounded-xl" maxLength={500} />
            </div>
            <Button onClick={handleCreatePlaylist} disabled={!playlistName.trim() || createPlaylist.isPending} className="w-full rounded-xl bg-primary glow-primary">
              {createPlaylist.isPending ? 'Creating...' : 'Create Playlist'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Start/Join Jam Flow */}
      {activeFlow === 'jam' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Jam Session</h2>
            <button onClick={() => setActiveFlow(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>

          {/* Start new jam */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Start a new jam</p>
            <Input
              value={jamName}
              onChange={e => setJamName(e.target.value)}
              placeholder="Jam name (optional)"
              className="bg-secondary/50 border-border/30 rounded-xl"
              maxLength={50}
            />
            <Button onClick={handleStartJam} disabled={createJam.isPending} className="w-full rounded-xl bg-primary glow-primary">
              <Radio className="h-4 w-4 mr-1.5" />
              {createJam.isPending ? 'Starting...' : 'Start Jam'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border/30" />
          </div>

          {/* Join existing jam */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Join with a code</p>
            <Input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              className="bg-secondary/50 border-border/30 rounded-xl text-center tracking-[0.2em] font-bold"
              maxLength={6}
            />
            <Button onClick={handleJoinJam} disabled={!joinCode.trim() || joinJam.isPending} variant="outline" className="w-full rounded-xl border-border/30">
              {joinJam.isPending ? 'Joining...' : 'Join Jam'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Collaborative Playlist Flow */}
      {activeFlow === 'collab' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Collaborative Playlist</h2>
            <button onClick={() => setActiveFlow(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <p className="text-xs text-muted-foreground">Create a playlist and share the link — anyone with the link can add songs.</p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="collab-name" className="text-xs text-muted-foreground">Playlist Name *</Label>
              <Input id="collab-name" value={playlistName} onChange={e => setPlaylistName(e.target.value)} placeholder="Collab playlist name" className="mt-1 bg-secondary/50 border-border/30 rounded-xl" maxLength={100} />
            </div>
            <Button onClick={handleCreateCollab} disabled={!playlistName.trim() || createPlaylist.isPending} className="w-full rounded-xl bg-primary glow-primary">
              {createPlaylist.isPending ? 'Creating...' : 'Create & Share Link'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CreatePage;
