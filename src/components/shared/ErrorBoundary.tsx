import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.fallbackLabel ?? "unknown"}]:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-text-secondary">
            {this.props.fallbackLabel ?? "Something went wrong"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded border border-border px-3 py-1 text-xs text-text-secondary hover:bg-surface-2"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
