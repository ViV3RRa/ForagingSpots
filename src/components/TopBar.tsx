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
import { Search, Filter, LogOut, Sun, Moon, Monitor, ChevronRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import type { ThemePreference } from '../contexts/ThemeContext';
import type { User } from '../lib/types';
import { getAvatarUrl } from '../lib/pocketbase';

interface TopBarProps {
  user: User;
  onSignOut: () => void;
  onOpenProfile: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
  hasActiveFilters: boolean;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Lyst', Icon: Sun },
  { value: 'dark', label: 'Mørkt', Icon: Moon },
  { value: 'system', label: 'Følg system', Icon: Monitor },
];

/** Active-row tint shared by the menu rows (same pair as the list sort menu). */
const ROW_TINT = 'bg-[rgba(181,80,47,.07)] dark:bg-[rgba(201,162,75,.12)]';
const ROW_FOCUS_TINT = 'focus:bg-[rgba(181,80,47,.07)] dark:focus:bg-[rgba(201,162,75,.12)]';

/**
 * Floating top bar over the map/list: search field, square filter button and
 * brand avatar (user menu with theme toggle + logout), on a gradient scrim
 * that fades the content underneath.
 */
export default function TopBar({
  user,
  onSignOut,
  onOpenProfile,
  searchQuery,
  onSearchChange,
  onFilterClick,
  hasActiveFilters,
}: TopBarProps) {
  const { preference, setPreference } = useTheme();

  const avatarUrl = getAvatarUrl(user);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-bg to-transparent pb-[24px] pt-[max(14px,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex items-center gap-[10px] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]">
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
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[250px] animate-[ss-fade_.16s_ease] rounded-[18px] border-line bg-surface p-[6px] shadow-[0_16px_40px_-10px_rgba(0,0,0,.34)]"
          >
            {/* Profile row — entry point for the "Rediger profil" sheet */}
            <DropdownMenuItem
              onSelect={onOpenProfile}
              className={`cursor-pointer gap-[12px] rounded-[13px] px-[12px] pb-[13px] pt-[12px] ${ROW_FOCUS_TINT}`}
            >
              <Avatar className="size-[44px] shrink-0 border-2 border-pin-ring shadow-[0_0_0_1px_var(--line)]">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt={user.name} className="object-cover" />
                )}
                <AvatarFallback className="bg-brand font-serif text-[17px] font-semibold text-brand-ink">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-[16px] font-semibold text-ink">
                  {user.name}
                </p>
                <p className="truncate text-[13px] text-muted">{user.email}</p>
              </div>
              <ChevronRight className="size-[16px] shrink-0 text-mono" strokeWidth={1.9} />
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-[8px] my-[4px] bg-line2" />
            <DropdownMenuLabel className="px-[12px] pb-[6px] pt-[10px] font-mono text-[10.5px] font-normal uppercase tracking-[.16em] text-mono">
              Tema
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={preference}
              onValueChange={(value) => setPreference(value as ThemePreference)}
            >
              {THEME_OPTIONS.map(({ value, label, Icon }) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  className={`cursor-pointer gap-[11px] rounded-[12px] px-[12px] py-[10px] [&>span:first-child]:hidden ${ROW_FOCUS_TINT} ${
                    preference === value ? ROW_TINT : ''
                  }`}
                >
                  {/* Fixed dot column replaces Radix's default radio indicator */}
                  <span className="flex w-[8px] shrink-0 justify-center">
                    {preference === value && (
                      <span className="block size-[7px] rounded-full bg-accent" />
                    )}
                  </span>
                  <Icon className="size-[18px] shrink-0 text-ink2" strokeWidth={1.7} />
                  <span className="font-serif text-[15px] text-ink">{label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="mx-[8px] my-[4px] bg-line2" />
            <DropdownMenuItem
              onSelect={onSignOut}
              className={`cursor-pointer gap-[11px] rounded-[12px] p-[12px] font-serif text-[15px] font-medium text-accent focus:text-accent ${ROW_FOCUS_TINT}`}
            >
              <LogOut className="size-[18px] shrink-0 text-accent" strokeWidth={1.8} />
              Log ud
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
