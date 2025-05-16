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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StartupsList() {
  const { data: startups, isLoading } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verticalFilter, setVerticalFilter] = useState("all");

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

  // Extract unique verticals for filter dropdown
  const verticals = startups
    ? Array.from(new Set(startups.map((s) => s.vertical)))
    : [];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Startups</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Manage and track all startups in your pipeline
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link href="/startups/new">
            <Button className="flex items-center">
              <PlusCircle className="h-5 w-5 mr-2" />
              Add New Startup
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <Input
            placeholder="Search startups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invested">Invested</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Vertical" />
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

      {/* Startups Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading startups...</div>
      ) : filteredStartups.length === 0 ? (
        <div className="text-center py-8 flex flex-col items-center">
          <FilterX className="h-12 w-12 text-secondary-400 mb-2" />
          <h3 className="text-lg font-medium text-secondary-900">No startups found</h3>
          <p className="text-secondary-500 mt-1">
            Try adjusting your search or filters
          </p>
          {(searchQuery || statusFilter !== "all" || verticalFilter !== "all") && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setVerticalFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStartups.map((startup) => {
            // Calculate initials for the avatar
            const initials = startup.name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            // Determine status badge color
            const statusColor = {
              active: "primary",
              invested: "success",
              declined: "destructive",
              archived: "secondary",
            }[startup.status] || "secondary";

            return (
              <Link key={startup.id} href={`/startups/${startup.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-primary-100 text-primary-800 rounded-md flex items-center justify-center font-bold">
                          {initials}
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-secondary-900">
                            {startup.name}
                          </h3>
                          <p className="text-sm text-secondary-500">
                            {startup.vertical.charAt(0).toUpperCase() + startup.vertical.slice(1)} • {startup.stage}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusColor as any}>
                        {startup.status.charAt(0).toUpperCase() + startup.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="flex items-center text-sm text-secondary-600">
                        <MapPin className="h-4 w-4 mr-2 text-secondary-400" />
                        {startup.location}
                      </p>
                      <p className="flex items-center text-sm text-secondary-600">
                        <Building2 className="h-4 w-4 mr-2 text-secondary-400" />
                        {startup.amountSought ? `$${startup.amountSought.toLocaleString()}` : 'Amount not specified'}
                      </p>
                      <p className="flex items-center text-sm text-secondary-600">
                        <FileText className="h-4 w-4 mr-2 text-secondary-400" />
                        {startup.documentsCount} documents
                      </p>
                      <p className="flex items-center text-sm text-secondary-600">
                        <Calendar className="h-4 w-4 mr-2 text-secondary-400" />
                        Updated {new Date(startup.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center text-xs text-secondary-500 mb-1">
                        <span>Due Diligence Progress</span>
                        <span>{startup.completionPercentage}%</span>
                      </div>
                      <div className="bg-secondary-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            startup.completionPercentage >= 75
                              ? "bg-success-500"
                              : startup.completionPercentage >= 40
                              ? "bg-warning-500"
                              : "bg-primary-500"
                          }`}
                          style={{ width: `${startup.completionPercentage}%` }}
                        ></div>
                      </div>
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
