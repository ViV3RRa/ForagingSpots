import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { TreePine, LogOut, Map, List } from 'lucide-react';
import type { User } from '../lib/types';
import pb from '../lib/pocketbase';

interface TopBarProps {
  user: User;
  onSignOut: () => void;
  viewMode: 'map' | 'list';
  onViewModeChange: (mode: 'map' | 'list') => void;
}

export default function TopBar({ user, onSignOut, viewMode, onViewModeChange }: TopBarProps) {
  // Helper function to get avatar URL from Pocketbase
  const getAvatarUrl = (user: User) => {
    if (user.avatar) {
      const baseUrl = pb.baseUrl;
      return `${baseUrl}/api/files/users/${user.id}/${user.avatar}?thumb=60x60`;
    }
    return null;
  };

  const avatarUrl = getAvatarUrl(user);
  console.log('Avatar URL:', avatarUrl);
  console.log('User.avatar:', user.avatar);

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center">
          <div className="flex items-center text-green-700 mr-3">
            <TreePine className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-gray-800">Mine Skatte</h1>
        </div>

        {/* View Toggle and User menu */}
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('map')}
              className={`h-8 px-3 ${viewMode === 'map' 
                ? 'bg-forest-green text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Map className="h-4 w-4 mr-1" />
              Kort
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={`h-8 px-3 ${viewMode === 'list' 
                ? 'bg-forest-green text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <List className="h-4 w-4 mr-1" />
              Liste
            </Button>
          </div>
        </div>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Avatar className="h-10 w-10">
                {avatarUrl && (
                  <AvatarImage 
                    src={avatarUrl} 
                    alt={user.name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-green-100 text-green-700">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <DropdownMenuItem onClick={onSignOut} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Log ud
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
