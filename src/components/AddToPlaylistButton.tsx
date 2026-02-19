import { useState } from 'react';
import { ListPlus, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePlaylists, useCreatePlaylist, useAddToPlaylist, usePlaylistSongs } from '@/hooks/usePlaylist';
import { useAuth } from '@/hooks/useAuth';
import { Track } from '@/types/music';

export const AddToPlaylistButton = ({ track }: { track: Track }) => {
  const { user } = useAuth();
  const { playlists } = usePlaylists();
  const addToPlaylist = useAddToPlaylist();
  const createPlaylist = useCreatePlaylist();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  if (!user) return null;

  const handleAdd = async (playlistId: string) => {
    // Get current song count for position
    addToPlaylist.mutate({ playlistId, track, position: 0 });
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return;
    const data = await createPlaylist.mutateAsync({ name: newName.trim() });
    if (data) {
      addToPlaylist.mutate({ playlistId: data.id, track, position: 0 });
    }
    setNewName('');
    setCreateOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <ListPlus className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-strong border-border/30 min-w-[180px]">
          {playlists.map(pl => (
            <DropdownMenuItem key={pl.id} onClick={() => handleAdd(pl.id)} className="cursor-pointer text-foreground">
              {pl.name}
            </DropdownMenuItem>
          ))}
          {playlists.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="cursor-pointer text-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Playlist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-strong border-border/30">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Playlist & Add Song</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Playlist name" value={newName} onChange={e => setNewName(e.target.value)} className="bg-secondary/50 border-border/30" />
            <Button onClick={handleCreateAndAdd} disabled={!newName.trim()} className="w-full rounded-xl bg-primary text-primary-foreground">
              Create & Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
