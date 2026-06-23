/** @deprecated Use CollaborateMenu + NewConversationDialog */
import { useState, useEffect } from "react";
import type { AuthUser } from "../types";
import { NewConversationDialog } from "./NewConversationDialog";

type Props = {
  currentUser: AuthUser | null;
  onOpenChat: (id: string) => void;
};

export function NewConversationModal({ currentUser, onOpenChat }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("influnet-open-new-conversation", onOpen);
    return () => window.removeEventListener("influnet-open-new-conversation", onOpen);
  }, []);

  return (
    <NewConversationDialog
      open={open}
      onClose={() => setOpen(false)}
      currentUser={currentUser}
      onOpenChat={onOpenChat}
    />
  );
}
