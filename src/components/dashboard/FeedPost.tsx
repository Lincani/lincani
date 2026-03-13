import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

interface FeedPostProps {
  author: {
    name: string;
    username: string;
    avatar: string;
    verified?: boolean;
  };
  content: string;
  image?: string;
  timeAgo: string;
  likes: number;
  comments: number;
  breed?: string;
}

export function FeedPost({ author, content, image, timeAgo, likes, comments, breed }: FeedPostProps) {
  return (
    <motion.article
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-5 hover:border-white/10 transition-all"
    >
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-3">
          <Avatar className="h-9 w-9 ring-1 ring-white/10">
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="bg-white text-black text-xs">
              {author.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{author.name}</h3>
              {author.verified && (
                <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {breed && (
  <span className="inline-flex h-4 items-center rounded border border-white/10 px-1.5 text-[10px] text-gray-400">
    {breed}
  </span>
)}
            </div>
            <p className="text-xs text-gray-500">@{author.username} · {timeAgo}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/[0.06]"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Post Content */}
      <p className="text-sm text-gray-300 leading-relaxed mb-3">{content}</p>

      {/* Post Image */}
      {image && (
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="mb-3 rounded-lg overflow-hidden border border-white/[0.06]"
        >
          <img src={image} alt="Post content" className="w-full h-72 object-cover" />
        </motion.div>
      )}

      {/* Post Actions */}
      <div className="flex items-center gap-6 pt-3 border-t border-white/[0.06]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors"
        >
          <Heart className="h-4 w-4" />
          <span className="text-xs font-medium">{likes}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs font-medium">{comments}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
        >
          <Share2 className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.article>
  );
}