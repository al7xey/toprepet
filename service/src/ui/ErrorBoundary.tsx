import { Component, type ErrorInfo, type ReactNode } from 'react';
import { LoadError } from './LoadError';

interface Props {
  /** a new key (e.g. the path) clears the error */
  resetKey: string;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    return this.state.error ? <LoadError /> : this.props.children;
  }
}
