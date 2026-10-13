import React from "react";

interface Props {
    children: React.ReactNode;
    /** What to render when a crash is caught. Defaults to `null` (silent). */
    fallback?: React.ReactNode;
    /** Optional label for console logs — helps you spot which boundary fired. */
    label?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Class-based error boundary. React error boundaries MUST be classes —
 * there is no hook equivalent as of React 18.
 *
 * Wrap a subsystem that has historically been risky (music player,
 * a heavy third-party widget, a route subtree) and give it a fallback.
 * The rest of the app keeps working if it throws.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Log once, quietly. Do NOT rethrow — that would defeat the boundary.
        console.error(
            `[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ""}]`,
            error,
            info.componentStack
        );
    }

    render() {
        if (this.state.hasError) {
            // Silent by default. Pass a fallback if you want visible UI.
            return this.props.fallback ?? null;
        }
        return this.props.children;
    }
}