export const BELT_ORDER = ["white", "blue", "purple", "brown", "black"] as const;
export type BeltRank = (typeof BELT_ORDER)[number];

export function getNextBelt(current: string | null | undefined): BeltRank | null {
  const idx = BELT_ORDER.indexOf((current?.toLowerCase() ?? "white") as BeltRank);
  if (idx < 0 || idx >= BELT_ORDER.length - 1) return null;
  return BELT_ORDER[idx + 1];
}

export const BELT_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  white:  { bg: "bg-white",       text: "text-gray-900", dot: "bg-white border border-gray-400" },
  blue:   { bg: "bg-blue-600",    text: "text-white",    dot: "bg-blue-500" },
  purple: { bg: "bg-purple-700",  text: "text-white",    dot: "bg-purple-600" },
  brown:  { bg: "bg-amber-800",   text: "text-white",    dot: "bg-amber-700" },
  black:  { bg: "bg-gray-900 border border-gray-600", text: "text-white", dot: "bg-gray-900 border border-gray-500" },
};

// Techniques required for each target belt level
export const BELT_TECHNIQUES: Record<string, string[]> = {
  blue: [
    "Closed Guard", "Open Guard", "Butterfly Guard", "Half Guard",
    "Scissor Sweep", "Hip Bump Sweep", "Flower Sweep", "Pendulum Sweep",
    "Triangle Choke", "Armbar from Guard", "Guillotine", "Kimura",
    "Rear Naked Choke", "Cross Collar Choke",
    "Torreando Pass", "Over-Under Pass", "Knee Cut Pass",
    "Double Leg Takedown", "Single Leg Takedown",
    "Bridge and Roll", "Elbow-Knee Escape", "Guard Recovery",
  ],
  purple: [
    "De La Riva Guard", "Spider Guard", "X-Guard", "Lasso Guard",
    "Berimbolo", "X-Guard Sweep", "Kiss of the Dragon",
    "Back Take from Turtle", "Body Triangle", "Bow-and-Arrow Choke",
    "Straight Ankle Lock", "Kneebar",
    "Leg Drag Pass", "Smash Pass", "Toreando Combination",
    "Granby Roll", "Sit-Out",
    "Darce Choke", "Anaconda Choke",
  ],
  brown: [
    "Worm Guard", "Crab Ride", "Rubber Guard",
    "Inside Heel Hook", "Outside Heel Hook", "Ashi Garami entries",
    "Duck Under", "Arm Drag to Back", "Inside Trip",
    "Armbar to Triangle", "Triangle to Armbar", "Omoplata to Guillotine",
    "Heel Hook Defense", "Back Defense", "Leg Lock Defense",
    "Pressure Pass System",
  ],
  black: [
    "Guard Retention System", "Passing System", "Submission System",
    "Calf Slicer", "Twister", "Electric Chair Sweep",
    "Weight Distribution Mastery", "Timing and Sensitivity",
    "Foot Sweep (Ko-uchi)", "Foot Sweep (Ko-soto)",
    "Sprawl and Brawl", "Underhook Battle", "Teaching Fundamentals",
  ],
};
