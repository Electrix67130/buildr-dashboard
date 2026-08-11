import { cn, initials } from "@/lib/utils";

interface Props {
  firstName?: string;
  lastName?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export default function Avatar({ firstName, lastName, src, size = "md", className }: Props) {
  const cls = cn(
    "inline-flex items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    sizes[size],
    className,
  );
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={cn(cls, "object-cover")} />
    );
  }
  return <span className={cls}>{initials(firstName, lastName)}</span>;
}
