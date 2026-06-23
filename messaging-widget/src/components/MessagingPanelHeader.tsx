import type { AuthUser } from "../types";
import { Avatar } from "./Avatar";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { CollaborateMenu } from "./CollaborateMenu";
import { WorkspaceMenu } from "./WorkspaceMenu";

type Props = {
  currentUser: AuthUser | null;
  onOpenChat: (id: string) => void;
  compact?: boolean;
};

export function MessagingPanelHeader({ currentUser, onOpenChat, compact }: Props) {
  const actions = (
    <div className="flex items-center gap-0.5 shrink-0 infl-msgs-header-actions overflow-visible relative">
      <NotificationsDropdown
        currentUserId={currentUser?.id || null}
        onOpenChat={onOpenChat}
      />
      <CollaborateMenu currentUser={currentUser} onOpenChat={onOpenChat} />
      <WorkspaceMenu />
    </div>
  );

  if (compact) return actions;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar user={currentUser || undefined} size={32} />
        <span className="font-bold text-gray-900 dark:text-gray-100">Messaging</span>
      </div>
      {actions}
    </div>
  );
}
