import { useState } from 'react';
import { motion } from 'framer-motion';
import { ListMusic, Plus, Trash2, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlaylists, useCreatePlaylist, useDeletePlaylist, useUpdatePlaylist } from '@/hooks/usePlaylist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PlaylistsPage = () => {
  const { user } = useAuth();
  const { playlists, isLoading } = usePlaylists();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  if (!user) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <ListMusic className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-extrabold text-foreground">Playlists</h1>
          </div>
        </motion.div>
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3">
          <ListMusic className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">Sign in to create playlists</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Create and manage your personal playlists.</p>
          <Link to="/auth" className="mt-2 px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:scale-105 transition-transform">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPlaylist.mutateAsync({ name: newName.trim(), description: newDesc.trim() });
    setNewName('');
    setNewDesc('');
    setCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    await updatePlaylist.mutateAsync({ id: editId, name: editName.trim(), description: editDesc.trim() });
    setEditId(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-extrabold text-foreground">Playlists</h1>
            <span className="text-xs text-muted-foreground ml-1">({playlists.length})</span>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-primary text-primary-foreground glow-primary">
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-border/30">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input placeholder="Playlist name" value={newName} onChange={e => setNewName(e.target.value)} className="bg-secondary/50 border-border/30" />
                <Input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="bg-secondary/50 border-border/30" />
                <Button onClick={handleCreate} disabled={!newName.trim() || createPlaylist.isPending} className="w-full rounded-xl bg-primary text-primary-foreground">
                  {createPlaylist.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground text-sm">Your personal playlists</p>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={open => !open && setEditId(null)}>
        <DialogContent className="glass-strong border-border/30">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Playlist name" value={editName} onChange={e => setEditName(e.target.value)} className="bg-secondary/50 border-border/30" />
            <Input placeholder="Description (optional)" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="bg-secondary/50 border-border/30" />
            <Button onClick={handleUpdate} disabled={!editName.trim() || updatePlaylist.isPending} className="w-full rounded-xl bg-primary text-primary-foreground">
              {updatePlaylist.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading playlists...</p>
        </div>
      ) : playlists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(pl => (
            <motion.div key={pl.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 space-y-3 group">
              <Link to={`/playlist/${pl.id}`} className="block">
                <div className="h-32 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center mb-3">
                  <ListMusic className="h-10 w-10 text-primary/60" />
                </div>
                <h3 className="text-base font-semibold text-foreground truncate">{pl.name}</h3>
                {pl.description && <p className="text-xs text-muted-foreground truncate">{pl.description}</p>}
              </Link>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditId(pl.id); setEditName(pl.name); setEditDesc(pl.description || ''); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deletePlaylist.mutate(pl.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center space-y-3">
          <ListMusic className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-semibold text-foreground">No playlists yet</h3>
          <p className="text-sm text-muted-foreground">Create your first playlist to start organizing your music.</p>
        </div>
      )}
    </div>
  );
};

export default PlaylistsPage;
