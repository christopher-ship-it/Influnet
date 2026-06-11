import { displayName, gradientFor, initials } from "../utils/avatar";
import type { OtherUser } from "../types";

type Props = {
  user?: Partial<OtherUser> | null;
  size?: number;
  className?: string;
};

export function Avatar({ user, size = 40, className = "" }: Props) {
  const name = displayName(user || undefined);
  const px = size;
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={px}
        height={px}
        className={`rounded-full object-cover shrink-0 ${className}`}
        loading="lazy"
      />
    );
  }
  const [c1, c2] = gradientFor(user?.id || name);
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none ${className}`}
      style={{
        width: px,
        height: px,
        fontSize: Math.max(11, Math.round(px * 0.36)),
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
