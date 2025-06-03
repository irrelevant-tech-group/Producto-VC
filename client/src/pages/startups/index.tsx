import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { fetchStartups } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Search,
  Building2,
  Calendar,
  FileText,
  MapPin,
  FilterX,
  ChevronRight,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Loader2,
  BarChart2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function StartupsList() {
  const { data: startups, isLoading } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");

  // Filter startups based on search and filters
  const filteredStartups = startups
    ? startups.filter((startup) => {
        // Search filter
        const matchesSearch =
          searchQuery === "" ||
          startup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          startup.location.toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        const matchesStatus =
          statusFilter === "all" || startup.status === statusFilter;

        // Vertical filter
        const matchesVertical =
          verticalFilter === "all" || startup.vertical === verticalFilter;

        return matchesSearch && matchesStatus && matchesVertical;
      })
    : [];

  // Sort filtered startups
  const sortedStartups = [...filteredStartups].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "amount":
        return (b.amountSought || 0) - (a.amountSought || 0);
      case "progress":
        return b.completionPercentage - a.completionPercentage;
      case "updated":
      default:
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    }
  });

  // Extract unique verticals for filter dropdown
  const verticals = startups
    ? Array.from(new Set(startups.map((s) => s.vertical)))
    : [];

  // Count active filters
  const activeFiltersCount = 
    (searchQuery ? 1 : 0) + 
    (statusFilter !== "all" ? 1 : 0) + 
    (verticalFilter !== "all" ? 1 : 0);
    
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setVerticalFilter("all");
  };

  // Get status badge configuration
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-blue-100 text-blue-800", label: "Active" },
      invested: { color: "bg-green-100 text-green-800", label: "Invested" },
      standby: { color: "bg-amber-100 text-amber-800", label: "Standby" },
      declined: { color: "bg-red-100 text-red-800", label: "Declined" },
      archived: { color: "bg-slate-100 text-slate-800", label: "Archived" },
    };
    return statusConfig[status] || statusConfig.active;
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            Startups
            {filteredStartups.length > 0 && (
              <Badge variant="outline" className="ml-3 font-normal text-slate-600">
                {filteredStartups.length} {filteredStartups.length === 1 ? "company" : "companies"}
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and track all startups in your investment pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowUpDown className="h-4 w-4" />
                <span>Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className={sortBy === "updated" ? "bg-blue-50 text-blue-700 font-medium" : ""}
                onClick={() => setSortBy("updated")}
              >
                Recently Updated
              </DropdownMenuItem>
              <DropdownMenuItem
                className={sortBy === "name" ? "bg-blue-50 text-blue-700 font-medium" : ""}
                onClick={() => setSortBy("name")}
              >
                Company Name
              </DropdownMenuItem>
              <DropdownMenuItem
                className={sortBy === "amount" ? "bg-blue-50 text-blue-700 font-medium" : ""}
                onClick={() => setSortBy("amount")}
              >
                Investment Amount
              </DropdownMenuItem>
              <DropdownMenuItem
                className={sortBy === "progress" ? "bg-blue-50 text-blue-700 font-medium" : ""}
                onClick={() => setSortBy("progress")}
              >
                Due Diligence Progress
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link href="/startups/new">
            <Button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-4 w-4" />
              Add Startup
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-medium text-slate-700">Filters</h2>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="font-normal">
              {activeFiltersCount} active
            </Badge>
          )}
          <div className="flex-grow"></div>
          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="h-8 text-slate-500 hover:text-slate-700 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Clear All
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search company name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
            {searchQuery && (
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invested">Invested</SelectItem>
              <SelectItem value="standby">Standby</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={verticalFilter} onValueChange={setVerticalFilter}>
            <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="All Verticals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              {verticals.map((vertical) => (
                <SelectItem key={vertical} value={vertical}>
                  {vertical.charAt(0).toUpperCase() + vertical.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Startups Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Loading startups...</h3>
          <p className="text-slate-500 mt-1">Please wait while we fetch your data</p>
        </div>
      ) : sortedStartups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <FilterX className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">No startups found</h3>
          <p className="text-slate-500 mt-1 max-w-md mx-auto">
            {activeFiltersCount > 0
              ? "No startups match your current filters. Try adjusting your search criteria."
              : "There are no startups in your pipeline yet. Add your first startup to get started."}
          </p>
          {activeFiltersCount > 0 ? (
            <Button
              variant="outline"
              className="mt-6"
              onClick={clearFilters}
            >
              Clear all filters
            </Button>
          ) : (
            <Link href="/startups/new">
              <Button className="mt-6 bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Your First Startup
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedStartups.map((startup) => {
            // Calculate initials for the avatar
            const initials = startup.name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            // Get status configuration
            const statusConfig = getStatusBadge(startup.status);

            return (
              <Link key={startup.id} href={`/startups/${startup.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-all border-slate-200 hover:border-blue-300 overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="p-5 border-b border-slate-100">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center font-bold 
                                         ${startup.vertical === 'ai' ? 'bg-indigo-100 text-indigo-700' : 
                                           startup.vertical === 'fintech' ? 'bg-emerald-100 text-emerald-700' : 
                                           startup.vertical === 'health' ? 'bg-rose-100 text-rose-700' : 
                                           'bg-blue-100 text-blue-700'}`}
                          >
                            {initials}
                          </div>
                          <div className="ml-3">
                            <h3 className="font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                              {startup.name}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {startup.vertical.charAt(0).toUpperCase() + startup.vertical.slice(1)} • {startup.stage}
                            </p>
                          </div>
                        </div>
                        <Badge className={`font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Due Diligence Progress</span>
                        <span className={`text-xs font-medium ${
                          startup.completionPercentage >= 75 ? "text-green-600" :
                          startup.completionPercentage >= 40 ? "text-amber-600" :
                          "text-blue-600"
                        }`}>
                          {startup.completionPercentage}%
                        </span>
                      </div>
                      <div className="mt-1.5 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            startup.completionPercentage >= 75
                              ? "bg-green-500"
                              : startup.completionPercentage >= 40
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${startup.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <p className="flex items-center text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{startup.location}</span>
                        </p>
                        <p className="flex items-center text-sm text-slate-600">
                          <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{startup.amountSought ? `$${startup.amountSought.toLocaleString()}` : 'Not specified'}</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <p className="flex items-center text-sm text-slate-600">
                          <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{startup.documentsCount} {startup.documentsCount === 1 ? 'doc' : 'docs'}</span>
                        </p>
                        {startup.alignmentScore !== undefined ? (
                          <p className="flex items-center text-sm text-slate-600">
                            <BarChart2 className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                            <div className="flex items-center">
                              <div className="w-12 h-1.5 bg-slate-200 rounded-full mr-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    startup.alignmentScore >= 0.7 ? "bg-green-500" :
                                    startup.alignmentScore >= 0.4 ? "bg-amber-500" :
                                    "bg-red-500"
                                  }`}
                                  style={{ width: `${startup.alignmentScore * 100}%` }}
                                ></div>
                              </div>
                              <span>{Math.round(startup.alignmentScore * 100)}%</span>
                            </div>
                          </p>
                        ) : (
                          <p className="flex items-center text-sm text-slate-600">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">
                              {new Date(startup.lastUpdated).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: new Date(startup.lastUpdated).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                              })}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-sm text-slate-500 hover:text-blue-600 p-0 h-auto"
                      >
                        View Details 
                        <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-70" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}