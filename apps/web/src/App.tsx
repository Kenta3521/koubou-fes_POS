import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto py-8">
            <h1 className="text-4xl font-bold text-center text-primary">
              光芒祭POSシステム
            </h1>
            <p className="text-center text-muted-foreground mt-4">
              Phase1: 基盤構築中
            </p>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
