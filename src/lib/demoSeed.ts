// src/lib/demoSeed.ts
export const demoStats = {
  breedersOnline: 38,
  newThisWeek: 126,
  postsToday: 54,
};

export const demoBreeders = [
  {
    id: "b1",
    name: "Evergreen Goldens",
    handle: "@evergreengoldens",
    location: "Olympia, WA",
    verified: true,
    avatar: "/demo/avatars/breeder1.png",
    tagline: "Health-tested, family-raised Goldens • AKC",
  },
  {
    id: "b2",
    name: "Rainier Shepherds",
    handle: "@rainiershepherds",
    location: "Tacoma, WA",
    verified: false,
    avatar: "/demo/avatars/breeder2.png",
    tagline: "Working line GSDs • Structure + temperament first",
  },
  {
    id: "b3",
    name: "Blue Coast Frenchies",
    handle: "@bluecoastfrenchies",
    location: "Seattle, WA",
    verified: true,
    avatar: "/demo/avatars/breeder3.png",
    tagline: "DNA tested • Athletic builds • Ethical breeding",
  },
];

export const demoPosts = [
  {
    id: "p1",
    authorName: "Evergreen Goldens",
    authorHandle: "@evergreengoldens",
    location: "Olympia, WA",
    tag: "Litter Update",
    time: "2h",
    text: "Spring litter expected mid-March 🐾 Both parents fully health tested (OFA hips/elbows + genetic panel). DM if you want to be added to our waitlist.",
    media: [{ type: "image" as const, url: "/demo/posts/golden_litter.jpg" }],
  },
  {
    id: "p2",
    authorName: "Rainier Shepherds",
    authorHandle: "@rainiershepherds",
    location: "Tacoma, WA",
    tag: "Stud Available",
    time: "5h",
    text: "Stud available — proven sire, stable nerves, strong drive. Looking for titled or working homes only. Health testing documentation ready.",
    media: [{ type: "image" as const, url: "/demo/posts/gsd_stud.jpg" }],
  },
  {
    id: "p3",
    authorName: "Blue Coast Frenchies",
    authorHandle: "@bluecoastfrenchies",
    location: "Seattle, WA",
    tag: "Advice",
    time: "1d",
    text: "What’s your favorite way to screen potential homes? We’ve been using short video calls + a simple questionnaire and it’s helped a lot.",
    media: [],
  },
];

export const demoMarketplace = [
  {
    id: "m1",
    title: "Golden Retriever — Waitlist Open (March)",
    location: "Olympia, WA",
    priceLabel: "Waitlist",
    badge: "Health Tested",
    image: "/demo/market/golden.jpg",
  },
  {
    id: "m2",
    title: "GSD Stud Service — Proven Sire",
    location: "Tacoma, WA",
    priceLabel: "$1,200",
    badge: "Stud",
    image: "/demo/market/gsd.jpg",
  },
  {
    id: "m3",
    title: "French Bulldog — DNA Panel Complete",
    location: "Seattle, WA",
    priceLabel: "$3,500",
    badge: "Verified Breeder",
    image: "/demo/market/frenchie.jpg",
  },
];
