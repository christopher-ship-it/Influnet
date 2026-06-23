import { useMessagingStore } from "../store/messagingStore";

type Props = {
  onStartConversation?: () => void;
};

export function EmptyConversationState({ onStartConversation }: Props) {
  const setListTab = useMessagingStore((s) => s.setListTab);

  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-0 flex-1 p-8 text-center infl-msgs-empty-state"
      aria-label="Messaging"
    >
      <div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-infl-primary to-infl-secondary text-white text-2xl flex items-center justify-center mb-4 shadow-lg"
        aria-hidden
      >
        ✉
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 m-0">
        Welcome to Influnet Messaging
      </h2>
      <p className="text-sm text-gray-500 mt-2 m-0 max-w-md leading-relaxed">
        Connect with businesses and influencers to manage collaborations professionally.
      </p>
      <button
        type="button"
        onClick={() => {
          setListTab("all");
          onStartConversation?.();
          window.dispatchEvent(new CustomEvent("influnet-open-new-conversation"));
        }}
        className="mt-6 h-10 px-5 rounded-xl border-0 text-sm font-bold text-white bg-gradient-to-r from-infl-primary to-infl-secondary cursor-pointer shadow-md"
      >
        Start Conversation
      </button>
    </div>
  );
}
