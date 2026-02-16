import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const genres = [
  { name: 'Pop', color: 'from-pink-500 to-rose-600' },
  { name: 'Rock', color: 'from-red-600 to-orange-500' },
  { name: 'Electronic', color: 'from-blue-500 to-cyan-400' },
  { name: 'Hip Hop', color: 'from-yellow-500 to-amber-600' },
  { name: 'Jazz', color: 'from-indigo-500 to-purple-600' },
  { name: 'Classical', color: 'from-emerald-500 to-teal-600' },
  { name: 'R&B', color: 'from-violet-500 to-fuchsia-500' },
  { name: 'Country', color: 'from-orange-500 to-yellow-500' },
  { name: 'Metal', color: 'from-gray-700 to-gray-900' },
  { name: 'Reggae', color: 'from-green-500 to-lime-500' },
  { name: 'Latin', color: 'from-red-500 to-pink-500' },
  { name: 'Ambient', color: 'from-sky-400 to-indigo-500' },
];

const SearchPage = () => {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <h1 className="text-3xl font-extrabold text-foreground">Search</h1>
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="What do you want to listen to?"
            className="pl-10 h-12 rounded-xl bg-muted/60 border-border/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h2 className="text-xl font-bold mb-4 text-foreground">Browse All</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {genres.map(genre => (
            <button
              key={genre.name}
              className={`relative overflow-hidden rounded-2xl p-5 h-28 bg-gradient-to-br ${genre.color} text-left transition-transform hover:scale-[1.03] active:scale-[0.98]`}
            >
              <span className="text-lg font-bold text-white drop-shadow-lg">{genre.name}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SearchPage;
