export interface ICard {
  identifier: string;
  value: number | string | null;
}

export enum CardSetType {
  Numeric,
  Ordinal,
}

export interface ICardSet {
  id: string;

  type: CardSetType;

  name: string;

  cards: ICard[];
}

export const defaultCardSets: ICardSet[] = [
  {
    id: "default",
    type: CardSetType.Numeric,
    name: "Default",
    cards: [
      {
        identifier: "0.5",
        value: 0.5,
      },
      {
        identifier: "1",
        value: 1,
      },
      {
        identifier: "2",
        value: 2,
      },
      {
        identifier: "3",
        value: 3,
      },
      {
        identifier: "5",
        value: 5,
      },
      {
        identifier: "8",
        value: 8,
      },
      {
        identifier: "13",
        value: 13,
      },
      {
        identifier: "20",
        value: 20,
      },
      {
        identifier: "40",
        value: 40,
      },
      {
        identifier: "100",
        value: 100,
      },
      {
        identifier: "?",
        value: null,
      },
      {
        identifier: "∞",
        value: null,
      },
      {
        identifier: "☕",
        value: null,
      },
    ],
  },
  {
    id: "kevin",
    type: CardSetType.Numeric,
    name: "Default with 4 (The Kevin)",
    cards: [
      {
        identifier: "1",
        value: 1,
      },
      {
        identifier: "2",
        value: 2,
      },
      {
        identifier: "3",
        value: 3,
      },
      {
        identifier: "4",
        value: 4,
      },
      {
        identifier: "5",
        value: 5,
      },
      {
        identifier: "8",
        value: 8,
      },
      {
        identifier: "13",
        value: 13,
      },
      {
        identifier: "20",
        value: 20,
      },
      {
        identifier: "40",
        value: 40,
      },
      {
        identifier: "100",
        value: 100,
      },
      {
        identifier: "?",
        value: null,
      },
      {
        identifier: "∞",
        value: null,
      },
      {
        identifier: "☕",
        value: null,
      },
    ],
  },
  {
    id: "reese",
    type: CardSetType.Numeric,
    name: "Default without 3 (The Reese)",
    cards: [
      {
        identifier: "1",
        value: 1,
      },
      {
        identifier: "3",
        value: 3,
      },
      {
        identifier: "5",
        value: 5,
      },
      {
        identifier: "8",
        value: 8,
      },
      {
        identifier: "13",
        value: 13,
      },
      {
        identifier: "20",
        value: 20,
      },
      {
        identifier: "40",
        value: 40,
      },
      {
        identifier: "100",
        value: 100,
      },
      {
        identifier: "?",
        value: null,
      },
      {
        identifier: "∞",
        value: null,
      },
      {
        identifier: "🥨",
        value: null,
      },
    ],
  },
  {
    id: "tshirts",
    type: CardSetType.Ordinal,
    name: "T-Shirts",
    cards: [
      {
        identifier: "XS",
        value: "XS",
      },
      {
        identifier: "S",
        value: "S",
      },
      {
        identifier: "M",
        value: "M",
      },
      {
        identifier: "L",
        value: "L",
      },
      {
        identifier: "XL",
        value: "XL",
      },
    ],
  },
  {
    id: "fibonacci",
    type: CardSetType.Numeric,
    name: "Fibonacci",
    cards: [
      {
        identifier: "0",
        value: 0,
      },
      {
        identifier: "1",
        value: 1,
      },
      {
        identifier: "2",
        value: 2,
      },
      {
        identifier: "3",
        value: 3,
      },
      {
        identifier: "5",
        value: 5,
      },
      {
        identifier: "8",
        value: 8,
      },
      {
        identifier: "13",
        value: 13,
      },
      {
        identifier: "21",
        value: 21,
      },
      {
        identifier: "34",
        value: 34,
      },
      {
        identifier: "55",
        value: 55,
      },
      {
        identifier: "89",
        value: 89,
      },
      {
        identifier: "?",
        value: null,
      },
      {
        identifier: "☕",
        value: null,
      },
    ],
  },
  {
    id: "confidence",
    type: CardSetType.Numeric,
    name: "Confidence",
    cards: [
      {
        identifier: "1",
        value: 1,
      },
      {
        identifier: "2",
        value: 2,
      },
      {
        identifier: "3",
        value: 3,
      },
      {
        identifier: "4",
        value: 4,
      },
      {
        identifier: "5",
        value: 5,
      },
    ],
  },
  {
    id: "weeks",
    type: CardSetType.Numeric,
    name: "Weeks",
    cards: [
      {
        identifier: "0.5",
        value: 0.5,
      },
      {
        identifier: "1",
        value: 1,
      },
      {
        identifier: "1.5",
        value: 1.5,
      },
      {
        identifier: "2",
        value: 2,
      },
      {
        identifier: "2.5",
        value: 2.5,
      },
      {
        identifier: "3",
        value: 3,
      },
      {
        identifier: "3.5",
        value: 3.5,
      },
      {
        identifier: "4",
        value: 4,
      },
    ],
  },
  {
    id: "doubling",
    type: CardSetType.Numeric,
    name: "Doubling",
    cards: [
      {
        identifier: "1",
        value: 1,
      },
      {
        identifier: "2",
        value: 2,
      },
      {
        identifier: "4",
        value: 4,
      },
      {
        identifier: "8",
        value: 8,
      },
      {
        identifier: "16",
        value: 16,
      },
      {
        identifier: "32",
        value: 32,
      },
      {
        identifier: "64",
        value: 64,
      },
      {
        identifier: "128",
        value: 128,
      },
      {
        identifier: "☕",
        value: null,
      },
    ],
  },
  {
    id: "ten",
    type: CardSetType.Numeric,
    name: "0-10",
    cards: [
      {
        identifier: "0",
        value: 0,
      },
      {
        identifier: "1",
        value: 1,
      },
      {
        identifier: "2",
        value: 2,
      },
      {
        identifier: "3",
        value: 3,
      },
      {
        identifier: "4",
        value: 4,
      },
      {
        identifier: "5",
        value: 5,
      },
      {
        identifier: "6",
        value: 6,
      },
      {
        identifier: "7",
        value: 7,
      },
      {
        identifier: "8",
        value: 8,
      },
      {
        identifier: "9",
        value: 9,
      },
      {
        identifier: "10",
        value: 10,
      },
    ],
  },
];
