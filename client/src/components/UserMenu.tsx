// client/src/components/UserMenu.tsx
import { useUser, useClerk } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";

export function UserMenu() {
  const { user: clerkUser, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  if (!isSignedIn) return null;
  
  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!clerkUser?.firstName && !clerkUser?.lastName) {
      return user?.email?.substring(0, 2).toUpperCase() || "??";
    }
    
    const first = clerkUser.firstName?.[0] || "";
    const last = clerkUser.lastName?.[0] || "";
    return (first + last).toUpperCase();
  };
  
  const handleSignOut = async () => {
    try {
      // Call the logout function from auth context
      await logout();
      
      // Clerk signout
      await signOut();
      
      // Redirect to sign-in page
      setLocation('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const navigateTo = (path: string) => {
    setLocation(path);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar>
            <AvatarImage src={clerkUser?.imageUrl} />
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {clerkUser?.firstName} {clerkUser?.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            {user?.role && (
              <p className="text-xs text-muted-foreground mt-1">
                Role: {user.role}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigateTo("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigateTo("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}