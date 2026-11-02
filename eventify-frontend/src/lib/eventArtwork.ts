import type { EventItem } from "@/types";

const artworkByCategory: Record<string, string> = {
  Music: "/images/eventify-hero.svg",
  Technology: "/images/eventify-tech.svg",
  "Food & Drinks": "/images/eventify-food.svg",
  "Art & Culture": "/images/eventify-art.svg",
  Sports: "/images/eventify-sports.svg",
  Business: "/images/eventify-tech.svg",
};

export function getEventArtwork(event: Pick<EventItem, "category" | "image_url">): string {
  return event.image_url || artworkByCategory[event.category] || "/images/eventify-community.svg";
}
