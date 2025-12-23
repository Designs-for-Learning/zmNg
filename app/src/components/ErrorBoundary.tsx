/**
 * Error Boundary Component
 *
 * A top-level error boundary that catches errors anywhere in the component tree.
 * It displays a user-friendly error UI and logs the error details.
 * In development mode, it also shows the component stack trace.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { log, LogLevel } from '../lib/logger';
import { withTranslation } from 'react-i18next';
import type { WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors
 * Provides a fallback UI and error logging
 */
class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    log.errorBoundary('React Error Boundary caught an error', LogLevel.ERROR, error);
    log.errorBoundary('Component stack', LogLevel.ERROR, errorInfo.componentStack);

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    const { t } = this.props;
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <Card className="max-w-2xl w-full p-8 space-y-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <h1 className="text-2xl font-bold">{t('error.something_went_wrong')}</h1>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground">
                {t('error.unexpected_error_message')}
              </p>

              {this.state.error && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-mono text-sm text-destructive break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    {t('error.component_stack')}
                  </summary>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.try_again')}
              </Button>
              <Button onClick={this.handleReload} className="flex-1">
                {t('error.reload_application')}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryClass);
