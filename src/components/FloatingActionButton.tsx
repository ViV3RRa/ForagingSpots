import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const isMobile = useIsMobile();
  
  return (
    <Button
      onClick={onClick}
      className={`fixed bottom-6 right-6 h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 shadow-xl hover:shadow-2xl transition-all duration-300 z-10 ${isMobile ? "left-1/2 transform -translate-x-1/2" : ""}`}
      size="icon"
    >
      <Plus className="text-white size-8" />
    </Button>
  );
}