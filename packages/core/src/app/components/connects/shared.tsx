import { Eye, EyeOff } from 'lucide-react';

export type InstagramTokenSource = 'instagram_login' | 'business_system_user';

export type InstagramStatus = {
  tokenMasked: string | null;
  userId: string | null;
  username: string | null;
  tokenSource: InstagramTokenSource;
  needsReauth: boolean;
  expiresAt: number | null;
};

export type FacebookStatus = {
  tokenMasked: string | null;
  pageId: string | null;
  pageName: string | null;
};

export type ThreadsStatus = {
  tokenMasked: string | null;
  userId: string | null;
  username: string | null;
  needsReauth: boolean;
  expiresAt: number | null;
};

export type ImgbbStatus = {
  keyMasked: string | null;
};

export type ConnectionError = {
  error?: string;
};

export function ConnectionDetail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-semibold text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function SecretValue({
  visible,
  value,
  onToggle,
  showLabel,
  hideLabel,
}: {
  visible: boolean;
  value: string;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <span className="flex items-center gap-1.5 font-mono font-medium">
      {visible ? value : '••••••••••••'}
      <button
        type="button"
        onClick={onToggle}
        className="text-muted-foreground hover:text-foreground"
        title={visible ? hideLabel : showLabel}
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </span>
  );
}
