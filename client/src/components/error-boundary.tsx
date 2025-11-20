import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2 items-start">
                <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Er is iets misgegaan</h1>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-600">
                Er is een onverwachte fout opgetreden. Dit kan gebeuren door een tijdelijk probleem of een netwerk onderbreking.
              </p>

              {this.state.error && (
                <div className="mt-4 p-3 bg-gray-100 rounded-md">
                  <p className="text-xs font-mono text-gray-700 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-2">
                <Button 
                  onClick={this.handleReset}
                  className="w-full"
                >
                  Terug naar startpagina
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  Pagina opnieuw laden
                </Button>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                Als dit probleem blijft optreden, neem dan contact op met uw beheerder.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
