import type { SVGProps } from "react";
import { cn } from "../../lib/utils";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ className, children, viewBox = "0 0 24 24", ...props }: IconProps & { viewBox?: string }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox={viewBox}
      className={cn("h-4 w-4 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function GithubIcon(props: IconProps) {
  return (
    <BaseIcon viewBox="0 0 24 24" {...props}>
      <path d="M9 19c-4 1.2-4-2-6-2" />
      <path d="M15 22v-3.1a3.3 3.3 0 0 0-.9-2.6c3 0 6-1.8 6-6.5A5 5 0 0 0 19 6.4 4.7 4.7 0 0 0 18.9 3S17.7 2.7 15 4.5a13.2 13.2 0 0 0-6 0C6.3 2.7 5.1 3 5.1 3A4.7 4.7 0 0 0 5 6.4 5 5 0 0 0 4 9.8c0 4.7 3 6.5 6 6.5a3.3 3.3 0 0 0-.9 2.6V22" />
    </BaseIcon>
  );
}

export function GoogleIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("h-4 w-4 shrink-0", props.className)} {...props}>
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.7l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.3 13.5a6 6 0 0 1 0-3V8H3a10 10 0 0 0 0 8l3.3-2.5Z" />
      <path fill="#EA4335" d="M12 6.3c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.9 9.9 0 0 0 3 8l3.3 2.5c.8-2.4 3-4.2 5.7-4.2Z" />
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="4" rx="1.5" />
      <rect x="14" y="10" width="7" height="11" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </BaseIcon>
  );
}

export function RepositoryIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 23Z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
    </BaseIcon>
  );
}

export function ScanIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7V5a1 1 0 0 1 1-1h2" />
      <path d="M17 4h2a1 1 0 0 1 1 1v2" />
      <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
      <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M7 12h10" />
      <path d="M12 7v10" />
    </BaseIcon>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.2 2.2 4.8-5" />
    </BaseIcon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
    </BaseIcon>
  );
}

export function BranchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 3v8" />
      <path d="M18 13v8" />
      <path d="M6 11a4 4 0 0 0 4 4h4" />
      <circle cx="6" cy="3" r="2.5" />
      <circle cx="6" cy="11" r="2.5" />
      <circle cx="18" cy="13" r="2.5" />
    </BaseIcon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3Z" />
      <path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z" />
      <path d="m6 14 .8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8Z" />
    </BaseIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </BaseIcon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </BaseIcon>
  );
}

export function FileCodeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="m10 13-2 2 2 2" />
      <path d="m14 13 2 2-2 2" />
    </BaseIcon>
  );
}

export function BugIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 9h6" />
      <path d="M10 4h4" />
      <path d="M12 4v2" />
      <rect x="7" y="7" width="10" height="11" rx="5" />
      <path d="M4 13h3" />
      <path d="M17 13h3" />
      <path d="M5 8.5 7.5 10" />
      <path d="M19 8.5 16.5 10" />
      <path d="M5 17.5 7.5 16" />
      <path d="M19 17.5 16.5 16" />
    </BaseIcon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 5 6v5c0 4.5 2.8 8.1 7 10 4.2-1.9 7-5.5 7-10V6Z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.3" />
    </BaseIcon>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </BaseIcon>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17v3h3l5.2-5.2a4 4 0 0 0 5.3-5.3l-2.3 2.3-2.7-2.7Z" />
    </BaseIcon>
  );
}

export function QueueIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 7h14" />
      <path d="M5 12h10" />
      <path d="M5 17h8" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="16" cy="17" r="2" />
    </BaseIcon>
  );
}

export function ArrowPathIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 11a8 8 0 0 1 13.7-5.7L19 7" />
      <path d="M21 13a8 8 0 0 1-13.7 5.7L5 17" />
      <path d="M19 3v4h-4" />
      <path d="M5 21v-4h4" />
    </BaseIcon>
  );
}

export function GitPullRequestIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="6" cy="5" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M6 7.5v9a2.5 2.5 0 0 0 2.5 2.5H15.5" />
      <path d="M18 7.5v4" />
    </BaseIcon>
  );
}
