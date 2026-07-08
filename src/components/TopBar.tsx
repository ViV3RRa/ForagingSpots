import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Search, Filter, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import type { ThemePreference } from '../contexts/ThemeContext';
import type { User } from '../lib/types';
import pb from '../lib/pocketbase';

interface TopBarProps {
  user: User;
  onSignOut: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
  hasActiveFilters: boolean;
}

/**
 * Floating top bar over the map/list: search field, square filter button and
 * brand avatar (user menu with theme toggle + logout), on a gradient scrim
 * that fades the content underneath.
 */
export default function TopBar({
  user,
  onSignOut,
  searchQuery,
  onSearchChange,
  onFilterClick,
  hasActiveFilters,
}: TopBarProps) {
  const { preference, setPreference } = useTheme();

  const avatarUrl = user.avatar
    ? `${pb.baseURL}/api/files/users/${user.id}/${user.avatar}?thumb=96x96`
    : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-bg to-transparent pb-[24px] pt-[max(14px,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex items-center gap-[10px] pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))]">
        {/* Search */}
        <div className="flex h-[48px] flex-1 items-center gap-[9px] rounded-[14px] border border-line bg-surface px-[15px] shadow-[0_3px_10px_var(--shadow)]">
          <Search className="size-[17px] shrink-0 text-mono" strokeWidth={1.8} />
          <input
            type="text"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Søg blandt fund…"
            aria-label="Søg blandt fund"
            className="h-full w-full min-w-0 bg-transparent font-serif text-[14.5px] text-ink outline-none placeholder:text-muted"
          />
        </div>

        {/* Filter */}
        <button
          type="button"
          onClick={onFilterClick}
          aria-label="Filtrér fund"
          className="relative flex size-[48px] shrink-0 items-center justify-center rounded-[14px] border border-line bg-surface text-brand shadow-[0_3px_10px_var(--shadow)]"
        >
          <Filter className="size-[18px]" strokeWidth={1.8} />
          {hasActiveFilters && (
            <span className="absolute -right-[3px] -top-[3px] size-[12px] rounded-full border-2 border-surface bg-accent" />
          )}
        </button>

        {/* Avatar + user menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Brugermenu"
              className="size-[48px] shrink-0 overflow-hidden rounded-full border-2 border-pin-ring shadow-[0_0_0_1px_var(--line)]"
            >
              <Avatar className="size-full">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt={user.name} className="object-cover" />
                )}
                <AvatarFallback className="bg-brand font-serif text-[18px] font-semibold text-brand-ink">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-ink">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="label-mono">Tema</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={preference}
              onValueChange={(value) => setPreference(value as ThemePreference)}
            >
              <DropdownMenuRadioItem value="light">
                <Sun className="mr-2 h-4 w-4" />
                Lyst
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="mr-2 h-4 w-4" />
                Mørkt
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor className="mr-2 h-4 w-4" />
                Følg system
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-accent focus:text-accent">
              <LogOut className="mr-2 h-4 w-4" />
              Log ud
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
