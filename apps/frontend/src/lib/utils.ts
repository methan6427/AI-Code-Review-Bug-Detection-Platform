import { clsx, type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatDateTime = (value: string | null) => {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const truncate = (value: string, length = 80) =>
  value.length > length ? `${value.slice(0, length - 1)}...` : value;

