import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertStartupSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStartup } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2 } from "lucide-react";
import { Link } from "wouter";

// Add validation to the insert schema
const formSchema = insertStartupSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function StartupNew() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
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
      amountSought: undefined,
      currency: "USD",
      status: "active",
    },
  });

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
    createStartupMutation.mutate(data);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/startups">
          <a className="flex items-center text-sm text-secondary-600 hover:text-primary-600 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to startups
          </a>
        </Link>
        <h1 className="text-2xl font-bold text-secondary-900">Add New Startup</h1>
        <p className="mt-1 text-sm text-secondary-500">
          Add a new startup to your investment pipeline
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-secondary-900">
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
                    onValueChange={(value) => setValue("vertical", value as any)}
                  >
                    <SelectTrigger>
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
                    onValueChange={(value) => setValue("stage", value as any)}
                  >
                    <SelectTrigger>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amountSought">Amount Sought</Label>
                  <Input
                    id="amountSought"
                    placeholder="e.g. 1000000"
                    type="number"
                    {...register("amountSought", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={watch("currency")}
                    onValueChange={(value) => setValue("currency", value as any)}
                  >
                    <SelectTrigger>
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