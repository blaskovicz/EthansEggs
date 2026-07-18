export type Role = "CHILD" | "PARENT";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  color: string;
}

export interface EggCollectionEntry {
  id: string;
  userId: string;
  date: string;
  eggCount: number | null;
  isHelper: boolean;
  note: string | null;
  createdAt: string;
}

export interface TodayEntry {
  id: string;
  userId: string;
  date: string;
  eggCount: number | null;
  isHelper: boolean;
  createdAt: string;
  user: { name: string; role: Role; color: string };
}

export interface ChildBalance {
  userId: string;
  name: string;
  color: string;
  collectionsCount: number;
  rateCents: number;
  totalOwedCents: number;
  totalPaidCents: number;
  balanceCents: number;
}

export interface PaymentEntry {
  id: string;
  childId: string;
  amountCents: number;
  note: string | null;
  recordedById: string;
  recordedBy: { name: string };
  createdAt: string;
}

export interface ChildOverview {
  balance: ChildBalance;
  entries: EggCollectionEntry[];
  markedToday: boolean;
}

export interface ParentSummary {
  userId: string;
  name: string;
  color: string;
  collectionsCount: number;
}
