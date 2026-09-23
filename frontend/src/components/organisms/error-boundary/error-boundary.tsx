import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, Copy, Check, ChevronDown } from "lucide-react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  detailsOpen: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      detailsOpen: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught UI error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      detailsOpen: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      this.handleReset();
    }
  };

  handleGoHome = (): void => {
    if (typeof window !== "undefined") {
      window.location.hash = "#/home";
    }
    this.handleReset();
  };

  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const text = [
      "=== WeekBox Error Report ===",
      `Date: ${new Date().toISOString()}`,
      `Error: ${error?.message || "Unknown error"}`,
      "",
      "Stack Trace:",
      error?.stack || "No stack trace available",
      "",
      "Component Stack:",
      errorInfo?.componentStack || "No component stack available",
    ].join("\n");

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch (e) {
      console.warn("Failed to copy error details:", e);
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, copied, detailsOpen } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback && error) {
      return fallback(error, this.handleReset);
    }

    return (
      <div
        className="flex min-h-screen w-full flex-col items-center justify-center p-6 select-none"
        style={{
          backgroundColor: "var(--wb-bg, #0e1415)",
          color: "var(--wb-text-main, #dee3e5)",
          fontFamily: "var(--wb-font-primary, sans-serif)",
        }}
      >
        <div
          className="w-full max-w-xl rounded-2xl p-8 border shadow-2xl backdrop-blur-md"
          style={{
            backgroundColor: "var(--wb-surface-container, #1b2122)",
            borderColor: "var(--wb-outline-variant, #3f484a)",
          }}
        >
          {/* Icon & Title */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "var(--wb-error-container, #93000a)",
                color: "var(--wb-on-error-container, #ffdad6)",
              }}
            >
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Algo salió mal en la interfaz
              </h1>
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--wb-text-muted, #bfc8ca)" }}
              >
                Se produjo un error inesperado al renderizar la vista.
              </p>
            </div>
          </div>

          {/* Quick error description */}
          {error && (
            <div
              className="mb-6 rounded-lg p-3 text-xs font-mono break-words border overflow-x-auto max-h-28"
              style={{
                backgroundColor: "var(--wb-surface-container-lowest, #090f10)",
                borderColor: "var(--wb-outline-variant, #3f484a)",
                color: "var(--wb-on-error-container, #ffb4ab)",
              }}
            >
              {error.name}: {error.message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--wb-primary, #82d3e0)",
                color: "var(--wb-on-primary, #00363d)",
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Recargar Interfaz
            </button>

            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer border hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--wb-surface-container-high, #252b2c)",
                borderColor: "var(--wb-outline, #899294)",
                color: "var(--wb-text-main, #dee3e5)",
              }}
            >
              <Home className="h-4 w-4" />
              Ir al Inicio
            </button>

            <button
              onClick={this.handleCopyError}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer border ml-auto hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: copied
                  ? "var(--wb-secondary-container, #334b4f)"
                  : "var(--wb-surface-container-high, #252b2c)",
                borderColor: "var(--wb-outline-variant, #3f484a)",
                color: "var(--wb-text-main, #dee3e5)",
              }}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-400" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar detalles
                </>
              )}
            </button>
          </div>

          {/* Collapsible Error Details */}
          <div
            className="border-t pt-4"
            style={{ borderColor: "var(--wb-outline-variant, #3f484a)" }}
          >
            <button
              onClick={() => this.setState({ detailsOpen: !detailsOpen })}
              className="flex items-center justify-between w-full text-xs font-semibold cursor-pointer py-1"
              style={{ color: "var(--wb-text-muted, #bfc8ca)" }}
            >
              <span>Detalles técnicos del error</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  detailsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {detailsOpen && (
              <div
                className="mt-3 p-3 rounded-lg text-xs font-mono select-text overflow-x-auto max-h-48 border leading-relaxed"
                style={{
                  backgroundColor: "var(--wb-surface-container-lowest, #090f10)",
                  borderColor: "var(--wb-outline-variant, #3f484a)",
                  color: "var(--wb-text-muted, #bfc8ca)",
                }}
              >
                {error?.stack && (
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                )}
                {errorInfo?.componentStack && (
                  <pre className="whitespace-pre-wrap mt-3 pt-3 border-t border-[var(--wb-outline-variant,#3f484a)]">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
