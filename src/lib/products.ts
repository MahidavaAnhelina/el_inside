export const products = [
  {
    id: "frog",
    category: "toys",
    image: "frog.jpg",
    alt: "frogAlt",
    description: "frogDesc",
    technique: "crochet",
  },
  {
    id: "body",
    category: "clothes",
    image: "body.jpg",
    alt: "bodyAlt",
    description: "bodyDesc",
    technique: "knitting",
  },
  {
    id: "sea",
    category: "toys",
    image: "sea.jpg",
    alt: "seaAlt",
    description: "seaDesc",
    technique: "crochet",
  },
  {
    id: "giraffe",
    category: "toys",
    image: "giraffe.jpg",
    alt: "giraffeAlt",
    description: "giraffeDesc",
    technique: "crochet",
  },
] as const;
export type ProductId = (typeof products)[number]["id"];
