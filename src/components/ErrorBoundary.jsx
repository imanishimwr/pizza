import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, LogOut, Trash2 } from 'lucide-react';
import { session, cart, wishlist, trackedOrder, STORAGE_KEYS } from '../services/apiService';

/** Only ever reload the document this many times from one error screen. */
const MAX_RELOADS = 2;

/**
 * Catches render/lifecycle errors from the tree below it.
 *
 * The reset is deliberately two-tier: "Try again" bumps a `resetKey` that keys
 * the children, so React throws the whole subtree away and re-renders it from
 * scratch without touching the document. Only if the user insists does a
 * "Reload page" button reload the document, and that is hard-capped so a
 * failure that happens on every load cannot spin forever.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: 0,
      reloads: 0
    };
    this.alertRef = React.createRef();
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Logged once, with the component stack, so the cause is recoverable.
    console.error('[ErrorBoundary] render error caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.hasError && this.state.hasError && this.alertRef.current) {
      this.alertRef.current.focus();
    }
  }

  /** Re-mount the children without reloading: a genuine re-render first. */
  handleTryAgain = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: prev.resetKey + 1
    }));
  };

  handleReload = () => {
    this.setState(
      (prev) => ({ reloads: prev.reloads + 1 }),
      () => window.location.reload()
    );
  };

  /**
   * Drops this app's own stored keys through the service helpers — never a
   * blanket `localStorage.clear()`, which would nuke unrelated same-origin data.
   */
  handleResetStoredData = () => {
    session.clear();
    cart.clear();
    wishlist.set([]);
    trackedOrder.set(null);
    console.warn(
      `[ErrorBoundary] cleared local keys: ${Object.values(STORAGE_KEYS).join(', ')}`
    );
    this.handleTryAgain();
  };

  render() {
    const { hasError, error, errorInfo, reloads } = this.state;

    if (hasError) {
      const canReload = reloads < MAX_RELOADS;
      return (
        <div
          ref={this.alertRef}
          role="alert"
          aria-labelledby="error-boundary-title"
          aria-describedby="error-boundary-description"
          tabIndex={-1}
          className="min-h-screen bg-surface-dark text-text-main flex items-center justify-center p-6 outline-none"
        >
          <div className="bg-surface-card border border-rose-500/30 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" aria-hidden="true" focusable="false" />
            </div>

            <div className="space-y-2">
              <h1 id="error-boundary-title" className="text-xl font-bold text-text-main">
                Something went wrong
              </h1>
              <p id="error-boundary-description" className="text-xs text-text-muted leading-relaxed">
                This screen failed to render. Try again to re-render it — no data is lost. If it
                keeps failing, reload the page.
              </p>
              {error ? (
                <div className="p-3 bg-black/50 border border-white/5 rounded-xl text-left text-[11px] font-mono text-rose-300 overflow-x-auto max-h-24">
                  {String(error.message || error)}
                </div>
              ) : null}
              {errorInfo?.componentStack ? (
                <details className="text-left">
                  <summary className="text-[11px] text-text-subdued cursor-pointer">
                    Component stack
                  </summary>
                  <pre className="p-3 bg-black/50 border border-white/5 rounded-xl text-[10px] font-mono text-text-muted overflow-x-auto max-h-32 whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleTryAgain}
                className="btn-primary text-xs py-3 w-full flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" focusable="false" />
                Try again
              </button>

              {canReload ? (
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="btn-secondary text-xs py-2.5 w-full flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" focusable="false" />
                  Reload page
                  {reloads > 0 ? ` (${reloads}/${MAX_RELOADS})` : ''}
                </button>
              ) : null}

              <button
                type="button"
                onClick={this.handleResetStoredData}
                className="btn-secondary text-xs py-2.5 w-full flex items-center justify-center gap-2 text-rose-300 hover:text-rose-200"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" focusable="false" />
                Sign out and clear my local data
              </button>

              <a
                href="/"
                className="text-[11px] text-text-subdued hover:text-text-main flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                Back to the menu
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Keying the children by `resetKey` is what makes the reset a real re-render:
    // React unmounts every descendant and builds it again from scratch.
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

export default ErrorBoundary;
