import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-950 text-white selection:bg-brand-500 selection:text-white px-6">
      {/* Decorative blurry glowing background circle */}
      <div className="absolute h-[300px] w-[300px] bg-brand-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="text-center max-w-md space-y-6 z-10">
        <div className="inline-flex bg-brand-600/10 p-4 rounded-2xl text-brand-400 border border-brand-500/20">
          <Film className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-dark-600">
            404
          </h1>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Scene Not Found
          </h2>
          <p className="text-sm text-dark-400 leading-relaxed">
            Oops! The page you are looking for has been cut from the final edit, or it was never filmed. Let's get you back to safety.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="md"
            className="w-full sm:w-auto border-dark-800 hover:bg-dark-900 text-dark-200"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => navigate('/')}
            leftIcon={<Home className="h-4 w-4" />}
          >
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};
