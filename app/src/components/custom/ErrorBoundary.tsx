import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert, RotateCw, House } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Application-wide error boundary. Catches rendering errors anywhere below it
 * and renders a full-screen fallback instead of a white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  private handleGoHome = () => {
    window.location.hash = '';
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#202020] rounded-2xl border border-white/10 p-8 text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <TriangleAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-display text-2xl text-white mb-2">Something went wrong</h1>
          <p className="text-white/50 text-sm mb-6 break-words">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#141414] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RotateCw className="w-4 h-4" />
              Reload
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
            >
              <House className="w-4 h-4" />
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
