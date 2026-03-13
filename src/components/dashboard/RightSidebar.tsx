import { TrendingUp, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

const suggestedBreeders = [
  {
    name: 'Sarah Johnson',
    username: 'goldenvalley',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    breed: 'Golden Retriever',
    verified: true,
  },
  {
    name: 'Michael Chen',
    username: 'premierLabs',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    breed: 'Labrador',
    verified: true,
  },
  {
    name: 'Emma Wilson',
    username: 'shepherdranch',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    breed: 'German Shepherd',
    verified: false,
  },
];

const trendingBreeds = [
  { name: 'Golden Retriever', count: 234, change: '+12%' },
  { name: 'French Bulldog', count: 198, change: '+8%' },
  { name: 'Labrador', count: 176, change: '+15%' },
  { name: 'German Shepherd', count: 142, change: '+5%' },
];

export function RightSidebar() {
  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="fixed right-0 top-14 bottom-0 w-72 border-l border-white/5 bg-black/40 backdrop-blur-2xl px-4 py-6 overflow-y-auto"
    >
      <div className="space-y-5">
        {/* Verification Progress */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Verification</h3>
            <span className="text-xs text-gray-400">65%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full mb-3 overflow-hidden">
  <div className="h-full bg-white rounded-full" style={{ width: "65%" }} />
</div>
          <p className="text-xs text-gray-400 mb-3">Complete verification to unlock premium features</p>
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-white text-black hover:bg-white/90"
          >
            Continue
          </Button>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
        >
          <h3 className="text-sm font-semibold text-white mb-3">Activity</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xl font-semibold text-white">847</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Views</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-white">23</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Connections</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-white">12</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Litters</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-white">4.9</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Rating</p>
            </div>
          </div>
        </motion.div>

        {/* Trending Breeds */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Trending</h3>
            <TrendingUp className="h-3.5 w-3.5 text-green-400" />
          </div>
          <div className="space-y-2.5">
            {trendingBreeds.map((breed, index) => (
              <motion.div
                key={breed.name}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.35 + index * 0.03 }}
                className="flex items-center justify-between py-1.5"
              >
                <div>
                  <p className="text-xs font-medium text-white">{breed.name}</p>
                  <p className="text-[10px] text-gray-500">{breed.count} active</p>
                </div>
                <span className="text-[10px] font-medium text-green-400">{breed.change}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Suggested Breeders */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
        >
          <h3 className="text-sm font-semibold text-white mb-3">Suggested</h3>
          <div className="space-y-3">
            {suggestedBreeders.map((breeder, index) => (
              <motion.div
                key={breeder.username}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.03 }}
                className="flex items-center gap-2.5"
              >
                <Avatar className="h-8 w-8 ring-1 ring-white/10">
                  <AvatarImage src={breeder.avatar} />
                  <AvatarFallback className="bg-white text-black text-xs">
                    {breeder.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-white truncate">{breeder.name}</p>
                    {breeder.verified && (
                      <div className="h-3 w-3 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <svg className="h-2 w-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">{breeder.breed}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2.5 text-[10px] border-white/10 text-gray-300 hover:bg-white/[0.06] hover:text-white"
                >
                  Follow
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.aside>
  );
}