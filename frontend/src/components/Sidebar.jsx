import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  FileDown, 
  FileUp, 
  ArrowLeftRight, 
  SlidersHorizontal, 
  History, 
  Settings, 
  UserCircle 
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Products', path: '/app/products', icon: Package },
  { name: 'Receipts', path: '/app/receipts', icon: FileDown },
  { name: 'Deliveries', path: '/app/deliveries', icon: FileUp },
  { name: 'Internal Transfers', path: '/app/transfers', icon: ArrowLeftRight },
  { name: 'Stock Adjustments', path: '/app/adjustments', icon: SlidersHorizontal },
  { name: 'Move History', path: '/app/history', icon: History },
];

const bottomNavItems = [
  { name: 'Settings', path: '/app/settings', icon: Settings },
  { name: 'Profile', path: '/app/profile', icon: UserCircle },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-gray-300 flex flex-col h-full shadow-xl">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <Package className="w-8 h-8 text-blue-500 mr-3" />
        <span className="text-xl font-bold text-white tracking-wide">StockSense</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Main</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center px-3 py-2.5 rounded-lg transition-colors group",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 font-medium" 
                  : "hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-800 flex flex-col gap-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center px-3 py-2.5 rounded-lg transition-colors",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 font-medium" 
                  : "hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
