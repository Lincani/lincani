import { Search, Bell, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900 shadow-xl">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/30">
                <span className="text-xl font-bold text-white">L</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">
                  Lincani
                </span>
                <p className="text-[10px] text-amber-500 font-semibold tracking-wider">TRUSTED BREEDER NETWORK</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-[420px]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search breeders, posts, events..."
                className="w-full bg-neutral-800 border-neutral-700 pl-11 pr-4 h-11 text-sm text-white placeholder:text-neutral-500 focus:bg-neutral-750 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 rounded-xl"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-neutral-900" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-neutral-900" />
            </Button>

            <div className="ml-3 pl-3 border-l border-neutral-800">
              <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-neutral-700 hover:ring-amber-500 transition-all">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" />
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-bold">
                  JD
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}