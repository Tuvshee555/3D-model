export type Avatar = {
  id: string;
  label: string;
  emoji: string;
  // Fed to the image model to produce a neutral base photo to dress.
  description: string;
};

export const AVATARS: Avatar[] = [
  {
    id: "slim-light",
    label: "Slim · Light",
    emoji: "🧍",
    description:
      "a slim adult woman with light skin, standing straight facing the camera, neutral expression, wearing plain fitted grey basics, full body visible, plain light-grey studio background",
  },
  {
    id: "average-light",
    label: "Average · Light",
    emoji: "🧍",
    description:
      "an average-build adult man with light skin, standing straight facing the camera, neutral expression, wearing plain fitted grey basics, full body visible, plain light-grey studio background",
  },
  {
    id: "curvy-medium",
    label: "Curvy · Medium",
    emoji: "🧍",
    description:
      "a curvy adult woman with medium/olive skin, standing straight facing the camera, neutral expression, wearing plain fitted grey basics, full body visible, plain light-grey studio background",
  },
  {
    id: "athletic-medium",
    label: "Athletic · Medium",
    emoji: "🧍",
    description:
      "an athletic-build adult man with medium/olive skin, standing straight facing the camera, neutral expression, wearing plain fitted grey basics, full body visible, plain light-grey studio background",
  },
  {
    id: "plus-dark",
    label: "Plus · Dark",
    emoji: "🧍",
    description:
      "a plus-size adult woman with dark skin, standing straight facing the camera, neutral expression, wearing plain fitted grey basics, full body visible, plain light-grey studio background",
  },
  {
    id: "tall-dark",
    label: "Tall · Dark",
    emoji: "🧍",
    description:
      "a tall slim adult man with dark skin, standing straight facing the camera, neutral expression, wearing plain fitted grey basics, full body visible, plain light-grey studio background",
  },
];

export function getAvatar(id: string): Avatar | undefined {
  return AVATARS.find((a) => a.id === id);
}
