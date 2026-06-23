import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  error: Error | null;
};

export class MessagingErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const full =
      error.message.includes("185") || error.message.includes("Maximum update depth")
        ? "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops."
        : error.message;
    console.error("[infl-messenger] Error boundary caught:", full, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6 text-center bg-white dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0">
            {this.props.fallbackTitle || "Could not load this view"}
          </p>
          <p className="text-xs text-gray-500 mt-2 mb-4 m-0 max-w-[240px]">
            {this.state.error.message || "Something went wrong in the messaging panel."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="text-xs font-bold text-infl-primary border-0 bg-transparent cursor-pointer"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
