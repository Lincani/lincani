import { motion } from "framer-motion";
import { CreatePost } from './CreatePost';
import { FeedPost } from './FeedPost';

const mockPosts = [
  {
    author: {
      name: 'Jennifer Martinez',
      username: 'goldenpawsranch',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
      verified: true,
    },
    content: 'Excited to announce our new Golden Retriever litter! 6 healthy puppies born this morning. All parents are health tested and OFA certified. Available for loving homes in 8 weeks. 🐕',
    image: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800&h=600&fit=crop',
    timeAgo: '2h ago',
    likes: 124,
    comments: 18,
    breed: 'Golden Retriever',
  },
  {
    author: {
      name: 'David Thompson',
      username: 'eliteshepherds',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      verified: true,
    },
    content: 'Just completed our annual health screening for all breeding dogs. Proud to report 100% clear results across the board. Transparency and health are our top priorities! 🏆',
    timeAgo: '5h ago',
    likes: 89,
    comments: 12,
    breed: 'German Shepherd',
  },
  {
    author: {
      name: 'Lisa Anderson',
      username: 'frenchiedreams',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      verified: false,
    },
    content: 'Meet our newest addition to the breeding program - Champion bloodline French Bulldog with exceptional temperament and conformation. Can\'t wait to see what the future holds!',
    image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&h=600&fit=crop',
    timeAgo: '1d ago',
    likes: 156,
    comments: 24,
    breed: 'French Bulldog',
  },
  {
    author: {
      name: 'Robert Williams',
      username: 'labradorlegacy',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
      verified: true,
    },
    content: 'Reminder: Responsible breeding isn\'t just about producing puppies - it\'s about improving the breed, ensuring health, and finding the perfect families. Quality over quantity, always.',
    timeAgo: '1d ago',
    likes: 203,
    comments: 31,
    breed: 'Labrador',
  },
];

export function CenterFeed() {
  return (
    <motion.main
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="ml-56 mr-72 mt-14 min-h-screen p-8"
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Create Post */}
        <CreatePost />

        {/* Feed Posts */}
        <div className="space-y-3">
          {mockPosts.map((post, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
            >
              <FeedPost {...post} />
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-6"
        >
          <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Load more posts
          </button>
        </motion.div>
      </div>
    </motion.main>
  );
}