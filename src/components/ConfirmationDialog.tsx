import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Bekræft',
  cancelText = 'Annuller',
  variant = 'default',
  isLoading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border border-border/50 mushroom-shadow max-w-sm rounded-xl">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed px-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col pt-4">
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === 'destructive'
                ? 'w-full h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all duration-200'
                : 'w-full h-11 bg-forest-green hover:bg-forest-green/90 text-white transition-all duration-200'
            }
          >
            {isLoading ? 'Vent...' : confirmText}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isLoading}
            className="w-full h-11 border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
          >
            {cancelText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
