import { textLength } from "@/lib/text";

export const statuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type Status = (typeof statuses)[number];
export const labels: Record<Status, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};
export type Task = {
  id: number;
  title: string;
  status: Status;
  created_at: string | null;
};
export const titleLength = textLength;
export const validTitle = (text: string) =>
  titleLength(text) >= 3 && titleLength(text) <= 100;
