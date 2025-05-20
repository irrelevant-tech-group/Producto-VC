import { Menu, Bell, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganization } from '@clerk/clerk-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const isMobile = useIsMobile();
  const { organization } = useOrganization();
  
  // Obtener información de la organización
  const orgName = organization?.name || 'H20 Capital';
  const orgImageUrl = organization?.imageUrl;

  return (
    <header className="bg-white border-b border-gray-200 px-5 py-3 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Lado izquierdo: Botón de menú y logo */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Logo del fondo */}
          <div className="flex items-center">
            {orgImageUrl ? (
              <img 
                src={orgImageUrl} 
                alt={orgName} 
                className="h-9 w-9 object-contain rounded-md" 
              />
            ) : (
              <div className="h-9 w-9 bg-blue-600 rounded-md flex items-center justify-center text-white font-semibold">
                {orgName.substring(0, 2)}
              </div>
            )}
            <span className="ml-2.5 font-semibold text-gray-800 text-lg">
              {orgName}
            </span>
          </div>
        </div>
        
        {/* Espacio central intencionalmente vacío para balance visual */}
        <div className="flex-1"></div>
        
        {/* Lado derecho: Acciones y ayuda */}
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full w-10 h-10"
                  aria-label="Help"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs font-medium">Help & Resources</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full w-10 h-10 relative"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium border-2 border-white">
                    3
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs font-medium">Notifications</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full w-10 h-10"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs font-medium">Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Separador visual en desktop */}
          <div className="hidden md:block h-8 w-px bg-gray-200 mx-2"></div>
          
          {/* Perfil de usuario */}
          <button className="flex items-center ml-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full">
            <img 
              src="https://ui-avatars.com/api/?name=J+G&background=6366F1&color=fff" 
              alt="User Profile" 
              className="h-10 w-10 rounded-full border-2 border-white shadow-sm" 
            />
          </button>
          
          {/* Logo de Irrelevant discreto */}
          <a 
            href="https://stayirrelevant.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hidden md:block ml-4"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <img 
                    src="https://storage.googleapis.com/cluvi/logo.png" 
                    alt="Irrelevant" 
                    className="h-5 opacity-70 hover:opacity-100 transition-opacity" 
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs font-medium">Developed by Irrelevant</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;