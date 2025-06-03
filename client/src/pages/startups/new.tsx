import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStartup } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";

// Create a schema that matches what's required by the backend
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  vertical: z.string(),
  stage: z.string(),
  location: z.string().min(2, "Location is required"),
  amountSought: z.number().optional(),
  valuation: z.number().optional(),
  currency: z.string(),
  status: z.string().default("active"),
  description: z.string().optional(),
  
  // Required fields from the error message
  firstContactDate: z.string().min(1, "First contact date is required"),
  
  // Primary contact fields
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPosition: z.string().min(1, "Position is required")
});

type FormValues = z.infer<typeof formSchema>;

export default function StartupNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equityPercentage, setEquityPercentage] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      vertical: "fintech",
      stage: "seed",
      location: "",
      currency: "USD",
      status: "active",
      description: "",
      firstContactDate: new Date().toISOString().split('T')[0],
      contactName: "",
      contactEmail: "",
      contactPosition: ""
    },
  });

  // Watch for changes in amountSought and valuation to calculate equity
  const amountSought = watch("amountSought");
  const valuation = watch("valuation");

  useEffect(() => {
    if (amountSought && valuation && amountSought > 0 && valuation > 0) {
      const equity = (amountSought / valuation) * 100;
      setEquityPercentage(Math.round(equity * 100) / 100); // Round to 2 decimal places
    } else {
      setEquityPercentage(null);
    }
  }, [amountSought, valuation]);

  const createStartupMutation = useMutation({
    mutationFn: createStartup,
    onSuccess: () => {
      // Invalidate the startups query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/startups'] });
      
      toast({
        title: "Startup created",
        description: "The startup has been successfully added to your portfolio.",
      });
      
      // Redirect to the startups page
      navigate("/startups");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create startup: ${error.message}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    // Format the data to match the expected schema
    const formattedData = {
      ...data,
      amountSought: data.amountSought ? Number(data.amountSought) : undefined,
      valuation: data.valuation ? Number(data.valuation) : undefined,
      // Create the primaryContact object from the individual fields
      primaryContact: {
        name: data.contactName,
        email: data.contactEmail,
        position: data.contactPosition
      }
    };

    // Remove the individual contact fields as they're now in the primaryContact object
    delete formattedData.contactName;
    delete formattedData.contactEmail;
    delete formattedData.contactPosition;

    console.log("Submitting startup data:", formattedData);
    
    try {
      await createStartupMutation.mutateAsync(formattedData);
    } catch (error) {
      console.error("Error creating startup:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/startups">
          <Button variant="ghost" size="sm" className="flex items-center text-sm text-slate-600 hover:text-primary-600 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to startups
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add New Startup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a new startup to your investment pipeline
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-900">
            Startup Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>
                  Startup Name*
                </Label>
                <Input
                  id="name"
                  placeholder="Enter startup name"
                  {...register("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vertical">Vertical*</Label>
                  <Select
                    value={watch("vertical")}
                    onValueChange={(value) => setValue("vertical", value)}
                  >
                    <SelectTrigger id="vertical">
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fintech">Fintech</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="marketplace">Marketplace</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="ai">AI</SelectItem>
                      <SelectItem value="cleantech">CleanTech</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="stage">Stage*</Label>
                  <Select
                    value={watch("stage")}
                    onValueChange={(value) => setValue("stage", value)}
                  >
                    <SelectTrigger id="stage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="location" className={errors.location ? "text-destructive" : ""}>
                  Location*
                </Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  {...register("location")}
                  className={errors.location ? "border-destructive" : ""}
                />
                {errors.location && (
                  <p className="text-destructive text-xs mt-1">{errors.location.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="firstContactDate" className={errors.firstContactDate ? "text-destructive" : ""}>
                  First Contact Date*
                </Label>
                <div className="relative">
                  <Input
                    id="firstContactDate"
                    type="date"
                    {...register("firstContactDate")}
                    className={errors.firstContactDate ? "border-destructive pl-10" : "pl-10"}
                  />
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {errors.firstContactDate && (
                  <p className="text-destructive text-xs mt-1">{errors.firstContactDate.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="amountSought">Amount Sought</Label>
                  <Input
                    id="amountSought"
                    placeholder="e.g. 1000000"
                    type="number"
                    {...register("amountSought", { 
                      setValueAs: value => value === "" ? undefined : Number(value)
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="valuation">Valuation</Label>
                  <Input
                    id="valuation"
                    placeholder="e.g. 10000000"
                    type="number"
                    {...register("valuation", { 
                      setValueAs: value => value === "" ? undefined : Number(value)
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={watch("currency")}
                    onValueChange={(value) => setValue("currency", value)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Equity Calculation Display */}
              {equityPercentage !== null && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Estimated Equity</h4>
                      <p className="text-xs text-blue-700 mt-1">Based on amount sought and valuation</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-800">{equityPercentage}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Contact Information */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-sm font-medium text-blue-900 mb-3">Primary Contact Information*</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="contactName" className={errors.contactName ? "text-destructive" : ""}>
                      Contact Name*
                    </Label>
                    <Input
                      id="contactName"
                      placeholder="Full name"
                      {...register("contactName")}
                      className={errors.contactName ? "border-destructive" : ""}
                    />
                    {errors.contactName && (
                      <p className="text-destructive text-xs mt-1">{errors.contactName.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="contactEmail" className={errors.contactEmail ? "text-destructive" : ""}>
                      Contact Email*
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="email@example.com"
                      {...register("contactEmail")}
                      className={errors.contactEmail ? "border-destructive" : ""}
                    />
                    {errors.contactEmail && (
                      <p className="text-destructive text-xs mt-1">{errors.contactEmail.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="contactPosition" className={errors.contactPosition ? "text-destructive" : ""}>
                      Position/Role*
                    </Label>
                    <Input
                      id="contactPosition"
                      placeholder="e.g. CEO, Founder"
                      {...register("contactPosition")}
                      className={errors.contactPosition ? "border-destructive" : ""}
                    />
                    {errors.contactPosition && (
                      <p className="text-destructive text-xs mt-1">{errors.contactPosition.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the startup..."
                  className="resize-none"
                  {...register("description")}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/startups")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Creating..." : "Create Startup"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}