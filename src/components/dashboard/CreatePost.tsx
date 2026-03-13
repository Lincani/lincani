import { Image, Video, Smile, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

export function CreatePost() {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-lg">
      <div className="flex gap-4">
        <Avatar className="h-12 w-12 ring-2 ring-neutral-600">
          <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" />
          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-bold">
            JD
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <textarea
            placeholder="Share your breeding journey, milestones, or questions..."
            className="w-full bg-transparent border-0 pb-4 text-[15px] text-white placeholder:text-neutral-500 focus:outline-none resize-none min-h-[70px] leading-relaxed"
          />
          
          <div className="flex items-center justify-between pt-4 border-t border-neutral-700">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-neutral-400 hover:text-amber-400 hover:bg-neutral-700 gap-2 rounded-lg"
              >
                <Image className="h-[18px] w-[18px]" />
                <span className="text-sm font-medium">Photo</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-neutral-400 hover:text-amber-400 hover:bg-neutral-700 gap-2 rounded-lg"
              >
                <Video className="h-[18px] w-[18px]" />
                <span className="text-sm font-medium">Video</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-neutral-400 hover:text-amber-400 hover:bg-neutral-700 gap-2 rounded-lg"
              >
                <Calendar className="h-[18px] w-[18px]" />
                <span className="text-sm font-medium">Event</span>
              </Button>
            </div>

            <Button className="h-9 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 font-semibold px-8 text-sm rounded-lg shadow-lg shadow-amber-500/30">
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}