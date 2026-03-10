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

export const truncateMiddle = (value: string, leading = 8, trailing = 6) => {
  if (value.length <= leading + trailing + 3) {
    return value;
  }

  return `${value.slice(0, leading)}...${value.slice(-trailing)}`;
};

export const humanizeToken = (value: string) =>
  value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

export const formatRelativeTime = (value: string | null) => {
  if (!value) {
    return "Not available";
  }

  const timestamp = new Date(value);
  const diff = timestamp.getTime() - Date.now();
  const minutes = Math.round(diff / 60_000);

  if (Math.abs(minutes) < 1) {
    return "Just now";
  }

  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day");
};
