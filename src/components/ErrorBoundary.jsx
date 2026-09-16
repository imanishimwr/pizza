import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('HotPot App Error Boundary Caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleClearData = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-dark text-text-main flex items-center justify-center p-6">
          <div className="bg-surface-card border border-rose-500/30 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-text-main">Something went wrong</h1>
              <p className="text-xs text-text-muted leading-relaxed">
                An unexpected UI rendering issue occurred. You can safely refresh the application or reset stored demo data.
              </p>
              {this.state.error && (
                <div className="p-3 bg-black/50 border border-white/5 rounded-xl text-left text-[11px] font-mono text-rose-300 overflow-x-auto max-h-24">
                  {this.state.error.toString()}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="btn-primary text-xs py-3 w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                onClick={this.handleClearData}
                className="btn-secondary text-xs py-2.5 w-full flex items-center justify-center gap-2 text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="w-4 h-4" />
                Reset App Local Storage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
