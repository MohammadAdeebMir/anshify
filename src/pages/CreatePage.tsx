import { motion } from 'framer-motion';
import { ListMusic, Users, Radio, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePlaylist } from '@/hooks/usePlaylist';
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
  const [jamCode, setJamCode] = useState('');
  const createPlaylist = useCreatePlaylist();

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
      await createPlaylist.mutateAsync({ name: playlistName.trim(), description: playlistDesc.trim() || undefined });
      toast.success('Playlist created!');
      setPlaylistName('');
      setPlaylistDesc('');
      setActiveFlow(null);
      navigate('/playlists');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create playlist');
    }
  };

  const handleStartJam = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setJamCode(code);
    toast.success(`Jam session started! Share code: ${code}`);
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
              <Input
                id="pl-name"
                value={playlistName}
                onChange={e => setPlaylistName(e.target.value)}
                placeholder="My awesome playlist"
                className="mt-1 bg-secondary/50 border-border/30 rounded-xl"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="pl-desc" className="text-xs text-muted-foreground">Description</Label>
              <Input
                id="pl-desc"
                value={playlistDesc}
                onChange={e => setPlaylistDesc(e.target.value)}
                placeholder="What's this playlist about?"
                className="mt-1 bg-secondary/50 border-border/30 rounded-xl"
                maxLength={500}
              />
            </div>
            <Button
              onClick={handleCreatePlaylist}
              disabled={!playlistName.trim() || createPlaylist.isPending}
              className="w-full rounded-xl bg-primary glow-primary"
            >
              {createPlaylist.isPending ? 'Creating...' : 'Create Playlist'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Start Jam Flow */}
      {activeFlow === 'jam' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Start a Jam</h2>
            <button onClick={() => { setActiveFlow(null); setJamCode(''); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          {!jamCode ? (
            <div className="space-y-3 text-center py-4">
              <Radio className="h-12 w-12 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Start a shared listening session. Friends can join with a code.</p>
              <Button onClick={handleStartJam} className="rounded-xl bg-primary glow-primary">Start Jam Session</Button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Share this code with friends:</p>
              <p className="text-4xl font-extrabold text-primary tracking-[0.2em]">{jamCode}</p>
              <Button
                onClick={() => { navigator.clipboard.writeText(jamCode); toast.success('Code copied!'); }}
                variant="outline"
                className="rounded-xl border-border/30"
              >
                Copy Code
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Collaborative Playlist Flow */}
      {activeFlow === 'collab' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Collaborative Playlist</h2>
            <button onClick={() => setActiveFlow(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="collab-name" className="text-xs text-muted-foreground">Playlist Name *</Label>
              <Input
                id="collab-name"
                value={playlistName}
                onChange={e => setPlaylistName(e.target.value)}
                placeholder="Collab playlist name"
                className="mt-1 bg-secondary/50 border-border/30 rounded-xl"
                maxLength={100}
              />
            </div>
            <Button
              onClick={async () => {
                if (!playlistName.trim()) { toast.error('Enter a name'); return; }
                try {
                  await createPlaylist.mutateAsync({ name: playlistName.trim(), description: 'Collaborative playlist' });
                  toast.success('Collaborative playlist created! Share the link to invite friends.');
                  setPlaylistName('');
                  setActiveFlow(null);
                  navigate('/playlists');
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
              disabled={!playlistName.trim() || createPlaylist.isPending}
              className="w-full rounded-xl bg-primary glow-primary"
            >
              {createPlaylist.isPending ? 'Creating...' : 'Create & Share'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CreatePage;
