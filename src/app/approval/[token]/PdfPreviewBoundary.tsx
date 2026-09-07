"use client";

import { Component, type ReactNode } from "react";

interface Props {
  onError: () => void;
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Isolates crashes from the PDF preview (react-pdf/pdfjs-dist) so they degrade to the page's own
 * "PDF konnte nicht geladen werden" fallback instead of taking down the whole approval/signing page —
 * signing must keep working even if the preview can't render for some reason.
 */
export default class PdfPreviewBoundary extends Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
