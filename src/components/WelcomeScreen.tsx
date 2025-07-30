import { Button } from './ui/button';
import { Leaf, TreePine } from 'lucide-react';

interface WelcomeScreenProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function WelcomeScreen({ onSignIn, onSignUp }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col">
      {/* Header with forest illustration */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        {/* Forest illustration */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="relative">
            <TreePine className="h-20 w-20 text-green-600 opacity-80" />
            <Leaf className="absolute -top-2 -right-2 h-8 w-8 text-green-500 rotate-12" />
            <Leaf className="absolute -bottom-1 -left-3 h-6 w-6 text-green-400 -rotate-45" />
          </div>
          <div className="ml-4">
            <TreePine className="h-16 w-16 text-green-700 opacity-60" />
            <Leaf className="absolute top-4 right-2 h-5 w-5 text-green-600 rotate-45" />
          </div>
        </div>

        {/* App title and description */}
        <div className="text-center mb-12 max-w-sm">
            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              Skovens Skatte
            </h1>
            <p className="text-gray-600 leading-relaxed">
            Opdag og registrer dine hemmelige samlersteder. Registrer kantareller, vilde bær og mere med GPS-position.
            </p>
        </div>

        {/* Action buttons */}
        <div className="w-full max-w-sm space-y-3">
          <Button 
            onClick={onSignIn}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg"
          >
            Log ind
          </Button>
          {/* <Button 
            onClick={onSignUp}
            variant="outline"
            className="w-full h-12 border-green-300 text-green-700 hover:bg-green-50 rounded-xl"
          >
            Create Account
          </Button> */}
        </div>

        {/* Demo credentials hint */}
        {/* <div className="mt-8 p-4 bg-white/60 backdrop-blur rounded-lg text-center text-sm text-gray-600 max-w-sm">
          <p className="font-medium mb-1">Try the demo:</p>
          <p>Email: demo@forager.com</p>
          <p>Password: demo123</p>
        </div> */}
      </div>

      {/* Footer */}
      {/* <div className="text-center py-6 text-xs text-gray-500">
        🍄 Happy foraging! Remember to follow local guidelines 🫐
      </div> */}
    </div>
  );
}