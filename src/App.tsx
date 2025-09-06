import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthWrapper from './components/AuthWrapper';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import EventDetails from './pages/EventDetails';
import Scanner from './pages/Scanner';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthWrapper>
          {(user) => (
            <Routes>
              <Route path="/" element={<Index user={user} />} />
              <Route path="/dashboard" element={<Dashboard user={user} />} />
              <Route path="/event/:eventId" element={<EventDetails user={user} />} />
              <Route path="/scanner" element={<Scanner user={user} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </AuthWrapper>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;