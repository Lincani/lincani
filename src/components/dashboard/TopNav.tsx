import { Search, Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function TopNav() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-2xl"
    >
      <div className="flex h-14 items-center justify-between px-8 max-w-[1920px] mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-12">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
              <span className="text-sm font-bold text-black">L</span>
            </div>
            <span className="text-base font-semibold text-white tracking-tight">Lincani</span>
          </motion.div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            type="text"
            placeholder="Search breeders, breeds..."
            className="w-full bg-white/[0.03] border-white/[0.06] pl-10 pr-4 h-9 text-sm text-white placeholder:text-gray-500 focus:bg-white/[0.06] focus:border-white/10 transition-all"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-gray-400 hover:text-white hover:bg-white/[0.06]"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
          </Button>

          <motion.div whileHover={{ scale: 1.03 }} className="cursor-pointer">
            <Avatar className="h-8 w-8 ring-1 ring-white/10">
              <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" />
              <AvatarFallback className="bg-white text-black text-xs">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
}