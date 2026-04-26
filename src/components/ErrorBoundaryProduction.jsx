import React, { Component } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

/**
 * Production-grade Error Boundary
 * Catches React errors and displays user-friendly recovery options
 */
class ErrorBoundaryProduction extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Log to external service in production
    if (window.location.hostname !== 'localhost') {
      this.logErrorToService(error, errorInfo);
    }

    this.setState(prev => ({
      error,
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));
  }

  logErrorToService = (error, errorInfo) => {
    try {
      const payload = {
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
      
      // POST to error tracking service (Sentry, LogRocket, etc.)
      console.warn('Error logged:', payload);
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleNavigateHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      const isCritical = this.state.errorCount > 3;

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-destructive/20">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <CardTitle className="text-destructive">
                  {isCritical ? 'Critical Error' : 'Something Went Wrong'}
                </CardTitle>
              </div>
              <CardDescription>
                {isCritical 
                  ? 'The app encountered a serious issue. Please reload or contact support.'
                  : 'We encountered an unexpected error. Please try the options below.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Error Details (dev only) */}
              {isDev && this.state.error && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Error Details (Development)</p>
                  <pre className="text-xs text-slate-600 overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <p className="text-xs font-semibold text-slate-700 mt-3">Component Stack</p>
                      <pre className="text-xs text-slate-600 overflow-auto max-h-40 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              )}

              {/* User-Friendly Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  <strong>What happened?</strong> The app encountered an unexpected issue. 
                  {isCritical 
                    ? ' Multiple errors were detected.' 
                    : ' This shouldn\'t happen, and we\'ll investigate.'}
                </p>
              </div>

              {/* Recovery Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={this.handleReset}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                <Button 
                  onClick={this.handleReload}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>

                <Button 
                  onClick={this.handleNavigateHome}
                  className="w-full"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Home
                </Button>
              </div>

              {/* Support Info */}
              <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-700">Need Help?</p>
                <p>If this error persists, please contact support at <strong>support@datawinder.io</strong></p>
                <p>Include the error ID: <code className="bg-slate-200 px-1 rounded">{Date.now()}</code></p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryProduction;