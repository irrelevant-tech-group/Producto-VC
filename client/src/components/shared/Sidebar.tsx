import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Home,
  Building2,
  FileText,
  FileArchive,
  MessageCircle,
  TrendingUp,
  Settings,
  X,
  ChevronRight,
  LogOut,
  BookOpen,
  ChevronLeft,
  Bell,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useOrganization } from '@clerk/clerk-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const { user: authUser, logout } = useAuth();
  
  const { user: clerkUser } = useUser();
  const { organization } = useOrganization();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Obtener el correo completo
  const fullEmail = clerkUser?.primaryEmailAddress?.emailAddress || 
                   authUser?.email || 
                   'user@example.com';
  
  // Extraer solo la parte del nombre de usuario (antes del @)
  const username = fullEmail.split('@')[0];
  
  // Obtener el nombre de la organización directamente de Clerk
  const orgName = organization?.name || 'H20 Capital';
  
  // Obtener URLs de imágenes de perfil
  const userImageUrl = clerkUser?.imageUrl;
  const orgImageUrl = organization?.imageUrl;
  
  // Obtener rol del usuario
  const userRole = authUser?.role || 'user';

  // Función para manejar el cierre de sesión
  const handleSignOut = async () => {
    try {
      await logout();
      // No necesitamos navegar manualmente ya que AuthContext y la configuración de rutas
      // redirigirán automáticamente al usuario a la pantalla de inicio de sesión
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string, exact = false) => {
    if (exact) return location === path;
    return location === path || location.startsWith(`${path}/`);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // Función para obtener las iniciales
  const getInitials = (name: string) => {
    if (!name) return "HC";
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Iniciales para el avatar - usar iniciales del nombre de usuario
  const getUsernameInitials = (username: string) => {
    if (!username) return "HC";
    return username.substring(0, 2).toUpperCase();
  };

  // Formatear el rol para mostrar
  const formatRole = (role: string) => {
    if (!role) return 'User';
    if (role === 'admin') return 'Administrator';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const mainNavItems = [
    { path: '/', exact: true, icon: Home, label: 'Dashboard' },
    { path: '/startups', icon: Building2, label: 'Startups' },
    { path: '/memos', icon: BookOpen, label: 'Memos' },
    { path: '/documents', icon: FileArchive, label: 'Documents' }
  ];

  // Añadir opción de administración si el usuario es admin
  if (userRole === 'admin') {
    if (!mainNavItems.some(item => item.path === '/admin')) {
      mainNavItems.push({ path: '/admin', icon: Users, label: 'Admin' });
    }
  }

  const toolsNavItems = [
    { 
      path: '/ai-assistant', 
      icon: MessageCircle, 
      label: 'Ask AI',
      badge: { text: 'AI', color: 'primary' } 
    },
    { 
      path: '/analytics', 
      icon: TrendingUp, 
      label: 'Analytics',
      badge: { text: 'New', color: 'success' }
    }
  ];

  const renderNavItem = (item: any) => {
    const active = isActive(item.path, item?.exact);
    
    return (
      <Link href={item.path} key={item.path}>
        <a className={cn(
          "flex items-center px-3 py-2.5 text-sm rounded-lg transition-all group relative mt-1",
          active
            ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium shadow-md"
            : "text-blue-50 hover:bg-white/10 hover:text-white"
        )}>
          <div className={cn(
            "flex items-center justify-center",
            collapsed ? "w-full" : "mr-3"
          )}>
            <item.icon className={cn(
              "h-5 w-5", 
              active ? "text-white" : "text-blue-200 group-hover:text-white"
            )} />
          </div>
          
          {!collapsed && (
            <>
              <span className="truncate font-medium">{item.label}</span>
              
              {active && (
                <ChevronRight className="h-4 w-4 ml-auto text-white/90" />
              )}
              
              {!active && item.badge && (
                <span className={cn(
                  "ml-auto px-1.5 py-0.5 rounded text-xs font-medium",
                  item.badge.color === 'primary' ? "bg-indigo-100 text-indigo-800" : 
                  item.badge.color === 'success' ? "bg-green-100 text-green-800" : ""
                )}>
                  {item.badge.text}
                </span>
              )}
            </>
          )}
        </a>
      </Link>
    );
  };

  return (
    <aside className={cn(
      "flex flex-col bg-gradient-to-b from-blue-800 via-blue-900 to-indigo-900 border-r border-blue-700/50 z-20 shadow-xl",
      "fixed md:relative inset-y-0 left-0 transform transition-all duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      collapsed ? "w-16" : "w-64",
      mounted ? "transition-all" : "",
      // CAMBIO PRINCIPAL: Usar min-h-screen en lugar de h-screen para permitir scroll
      "min-h-screen h-full",
      { "hidden": !isOpen && !mounted }
    )}>
      {/* Collapse Toggle Button (Desktop only) */}
      {!isMobile && mounted && (
        <button 
          onClick={toggleCollapse}
          className="absolute -right-3 top-16 w-6 h-6 bg-white rounded-full border border-blue-200 
                   flex items-center justify-center shadow-md text-blue-700 z-10 hover:text-blue-600
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-transform"
        >
          {collapsed ? 
            <ChevronRight size={14} /> : 
            <ChevronLeft size={14} />
          }
        </button>
      )}

      {/* Sidebar Header - Nombre e imagen de la organización */}
      <div className="p-4 border-b border-blue-700/40 flex items-center justify-between bg-blue-900/50 flex-shrink-0">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {orgImageUrl ? (
              <img 
                src={orgImageUrl} 
                alt={orgName} 
                className="h-10 w-10 object-contain rounded-md shadow-md" 
              />
            ) : (
              <div className="h-10 w-10 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold shadow-md">
                {getInitials(orgName)}
              </div>
            )}
          </div>
          {!collapsed && (
            <span className="ml-2 font-semibold text-white truncate">
              {orgName}
            </span>
          )}
        </div>
        <button 
          onClick={onClose} 
          className="md:hidden text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-full p-1"
        >
          <X size={18} />
        </button>
      </div>

      {/* User Profile - Imagen de perfil e información del usuario */}
      <div className={cn(
        "px-4 py-4 border-b border-blue-700/40 mb-3 flex-shrink-0",
        collapsed ? "flex justify-center" : ""
      )}>
        {collapsed ? (
          <div className="relative">
            <Avatar className="w-9 h-9 bg-gradient-to-br from-sky-400 to-indigo-400 text-white">
              {userImageUrl ? (
                <AvatarImage src={userImageUrl} alt={username} />
              ) : (
                <AvatarFallback>{getUsernameInitials(username)}</AvatarFallback>
              )}
            </Avatar>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <Avatar className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-400 text-white">
              {userImageUrl ? (
                <AvatarImage src={userImageUrl} alt={username} />
              ) : (
                <AvatarFallback>{getUsernameInitials(username)}</AvatarFallback>
              )}
            </Avatar>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {username}
              </p>
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse"></span>
                <p className="text-xs text-blue-200 truncate">
                  {formatRole(userRole)}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <div className="relative">
                <Bell className="h-5 w-5 text-blue-200 hover:text-white cursor-pointer" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation - CAMBIO PRINCIPAL: Añadir flex-1 y overflow-y-auto para permitir scroll */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-transparent">
        {/* Main Navigation */}
        <div className={cn("mb-6", collapsed ? "text-center" : "")}>
          {!collapsed && (
            <p className="px-2 text-xs font-bold text-sky-300 uppercase tracking-wider mb-2">
              Main
            </p>
          )}
          
          {mainNavItems.map(renderNavItem)}
        </div>
        
        {/* Tools Section */}
        <div className={cn("mt-6 mb-6", collapsed ? "text-center" : "")}>
          {!collapsed && (
            <p className="px-2 text-xs font-bold text-sky-300 uppercase tracking-wider mb-2">
              Tools
            </p>
          )}
          
          {toolsNavItems.map(renderNavItem)}
        </div>
        
        {/* Settings Section */}
        <div className={cn("mt-6", collapsed ? "text-center" : "")}>
          {!collapsed && (
            <p className="px-2 text-xs font-bold text-sky-300 uppercase tracking-wider mb-2">
              Settings
            </p>
          )}
          
          {renderNavItem({ path: '/settings', icon: Settings, label: 'Settings' })}
        </div>
      </nav>
      
      {/* Sidebar Footer - CAMBIO: Añadir flex-shrink-0 para evitar que se comprima */}
      <div className={cn(
        "p-4 mt-auto border-t border-blue-700/40 flex-shrink-0",
        collapsed ? "flex justify-center" : ""
      )}>
        {collapsed ? (
          <div 
            className="p-2 rounded-full hover:bg-white/10 cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 text-blue-200 hover:text-white" />
          </div>
        ) : (
          <>
            <div className="p-3 bg-blue-800/60 rounded-lg border border-blue-600/30 mb-3 hover:bg-blue-700/50 transition-colors">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-200 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-white">Need help?</p>
                  <p className="text-xs text-blue-200 mt-0.5">Check our documentation</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3 text-xs bg-transparent border-blue-500 text-blue-100 hover:bg-blue-700 hover:text-white transition-colors"
              >
                View Docs
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-sm text-blue-200 hover:text-white hover:bg-blue-700/50 flex items-center justify-center transition-colors"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
            
            {/* Logo de la empresa - mantener el estilo que ya funciona */}
            <div className="flex flex-col items-center mt-6 pt-4 border-t border-blue-700/30">
              <p className="text-xs text-blue-200 uppercase tracking-wide font-medium mb-2">
                Developed by
              </p>
              <div className="flex items-center justify-center bg-white rounded-md px-3 py-1.5 shadow-md">
                <span className="font-medium text-base tracking-wider" style={{ fontFamily: 'sans-serif' }}>
                  <span className="text-indigo-500">irre</span>
                  <span className="text-gray-800">levant</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;