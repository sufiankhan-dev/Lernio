import { Icon } from "@/components/ui/Icon";

type AvatarProps = {
  name?: string;
  size?: number;
};

export function Avatar({ name = "Learner", size = 44 }: AvatarProps) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-500 ring-1 ring-primary-200"
      style={{ width: size, height: size }}
    >
      <Icon name="user" variant="filled" size={Math.round(size * 0.5)} />
      <span className="sr-only">{name}</span>
    </span>
  );
}
