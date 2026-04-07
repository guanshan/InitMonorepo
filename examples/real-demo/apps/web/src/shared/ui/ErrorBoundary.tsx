import type { ErrorInfo, PropsWithChildren, ReactNode } from "react";

import { Component } from "react";

import { i18n } from "../lib/i18n";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void error;
    void errorInfo;
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <section>
          <h1>{i18n.t("errorBoundary.title")}</h1>
          <p>{i18n.t("errorBoundary.description")}</p>
        </section>
      );
    }

    return this.props.children;
  }
}
