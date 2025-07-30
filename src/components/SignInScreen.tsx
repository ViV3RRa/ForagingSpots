import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, TreePine, Leaf } from 'lucide-react';

interface SignInScreenProps {
  onSignIn: (email: string, password: string) => boolean;
  onBack: () => void;
  onSignUp: () => void;
}

export default function SignInScreen({ onSignIn, onBack, onSignUp }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = onSignIn(email, password);
    if (!success) {
      setError('Invalid email or password');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbage
        </Button>
        <div className="flex items-center text-green-700">
          <TreePine className="h-5 w-5 mr-1" />
          <Leaf className="h-4 w-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Velkommen tilbage
            </h1>
            <p className="text-gray-600">
              Log ind for at få adgang til dine samlesteder
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg bg-white/80 border-green-200 focus:border-green-400"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-lg bg-white/80 border-green-200 focus:border-green-400"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg disabled:opacity-50"
            >
              {isLoading ? 'Logger ind...' : 'Log ind'}
            </Button>
          </form>

          {/* <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <button 
                onClick={onSignUp}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Sign up
              </button>
            </p>
          </div> */}

          {/* Demo hint */}
          <div className="mt-8 p-4 bg-white/60 backdrop-blur rounded-lg text-center text-sm text-gray-600">
            <p className="font-medium mb-1">Demo credentials:</p>
            <p>demo@forager.com / demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
}