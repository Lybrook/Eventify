import type { EventItem } from "@/types";

const artworkNames = [
  "music",
  "food",
  "running",
  "technology",
  "art",
  "networking",
  "film",
  "wellness",
  "travel",
  "education",
  "fashion",
  "market",
  "comedy",
  "dance",
  "nature",
  "gaming",
  "coffee",
  "wedding",
  "community",
  "photography",
] as const;

const nameKeywords: Record<(typeof artworkNames)[number], string[]> = {
  music: ["music", "concert", "live", "jazz", "band", "festival", "dj"],
  food: ["food", "dinner", "brunch", "feast", "cook", "culinary", "taste"],
  running: ["run", "race", "marathon", "sport", "football", "fitness", "game"],
  technology: ["tech", "code", "digital", "ai ", "startup", "robot", "innovation"],
  art: ["art", "paint", "gallery", "craft", "culture", "design", "exhibit"],
  networking: ["business", "network", "career", "founder", "entrepreneur", "leadership"],
  film: ["film", "movie", "cinema", "screen", "documentary"],
  wellness: ["wellness", "yoga", "meditation", "health", "mindful", "retreat"],
  travel: ["travel", "tour", "safari", "adventure", "hike", "explore", "camp"],
  education: ["learn", "education", "workshop", "class", "lecture", "seminar", "book"],
  fashion: ["fashion", "style", "beauty", "makeup", "runway"],
  market: ["market", "fair", "bazaar", "swap", "maker", "pop-up"],
  comedy: ["comedy", "comedian", "laugh", "stand-up", "improv"],
  dance: ["dance", "ballroom", "salsa", "ballet", "movement"],
  nature: ["nature", "garden", "wildlife", "environment", "green", "earth"],
  gaming: ["gaming", "game jam", "esport", "esports", "board game", "arcade"],
  coffee: ["coffee", "tea", "cafe", "café", "barista"],
  wedding: ["wedding", "bridal", "engagement", "anniversary"],
  community: ["community", "charity", "volunteer", "fundraiser", "meetup"],
  photography: ["photo", "photography", "camera", "portrait"],
};

const categoryArtwork: Record<string, readonly (typeof artworkNames)[number][]> = {
  Music: ["music", "dance", "community", "comedy"],
  Technology: ["technology", "networking", "education", "gaming"],
  "Food & Drinks": ["food", "coffee", "market", "wedding"],
  "Art & Culture": ["art", "fashion", "photography", "film"],
  Sports: ["running", "travel", "nature", "gaming"],
  Business: ["networking", "education", "technology", "community"],
};

function stableArtworkIndex(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % artworkNames.length;
}

export function getEventArtwork(
  event: Pick<EventItem, "category" | "image_url" | "title">,
): string {
  if (event.image_url) return event.image_url;

  const title = ` ${event.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const namedArtwork = artworkNames.find((name) =>
    nameKeywords[name].some((keyword) => {
      const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      return title.includes(` ${normalizedKeyword} `);
    }),
  );
  const categoryOptions = categoryArtwork[event.category] ?? artworkNames;
  const artwork =
    namedArtwork ??
    categoryOptions[stableArtworkIndex(`${event.category}:${title}`) % categoryOptions.length];

  return `/images/event-${artwork}.svg`;
}
