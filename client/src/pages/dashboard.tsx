import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  SlidersHorizontal, 
  ChevronDown,
  Search,
  Filter,
  Calendar,
  Building2,
  RefreshCw,
  LayoutDashboard
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import KpiCards from "@/components/dashboard/KpiCards";
import ActiveStartups from "@/components/dashboard/ActiveStartups";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("30d");
  const [refreshing, setRefreshing] = useState(false);
  
  // Handle refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <LayoutDashboard className="h-6 w-6 text-blue-500 mr-2" />
            Dashboard
            <Badge variant="outline" className="ml-3 font-normal text-slate-600">
              Last updated: Today, 8:45 AM
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of your pipeline, portfolio performance, and recent activities
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* Time Range Selector */}
          <Select 
            value={timeRange} 
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="h-9 text-sm border-slate-200 w-[110px]">
              <Calendar className="h-4 w-4 mr-2 text-slate-500" />
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last quarter</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 text-slate-600 border-slate-200"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          {/* Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-slate-600 border-slate-200">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Building2 className="h-4 w-4 mr-2 text-slate-500" />
                <span>Startup Stage</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                <span>Date Range</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Search className="h-4 w-4 mr-2 text-slate-500" />
                <span>Search Startups</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button size="sm" className="w-full">Apply Filters</Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New Startup Button */}
          <Link href="/startups/new">
            <Button className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Startup
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Input for Mobile/Tablet */}
      <div className="mb-6 sm:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search startups..." 
            className="pl-10 border-slate-200"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards />

      {/* Content Grid Layout */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area - takes up 3/4 of the space on large screens */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Startups */}
          <ActiveStartups />
          
          {/* Recent Activity */}
          <RecentActivity />
        </div>

        {/* Sidebar - takes up 1/4 of the space on large screens */}
        <div className="space-y-6">
          <QuickActions />
          
          {/* Additional sidebar widget slot for future expansion */}
          
        </div>
      </div>
    </div>
  );
}