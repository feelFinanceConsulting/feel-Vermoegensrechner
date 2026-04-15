import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { trackLeadClick } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

const consultationSchema = z.object({
  name: z.string().min(2, "Name ist erforderlich"),
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  phone: z.string().optional(),
  consent: z.boolean().refine(val => val === true, "Zustimmung ist erforderlich"),
});

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof consultationSchema>>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      consent: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof consultationSchema>) => {
    setIsSubmitting(true);
    
    try {
      // In a real implementation, this would submit to your backend
      // For now, we'll simulate a delay and redirect to the booking link
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      trackLeadClick('consultation_modal');
      
      toast({
        title: "Anfrage gesendet!",
        description: "Sie werden zur Terminbuchung weitergeleitet.",
      });
      
      // Redirect to booking link
      window.open('https://beratung.feelfinance.at/meetings/anton-maresch', '_blank');
      
      onClose();
      form.reset();
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Es gab einen Fehler beim Senden Ihrer Anfrage.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900 font-gilroy">
            Kostenlose Beratung anfragen
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-gray-600 mb-6">
          Lassen Sie sich von unserem Expertenteam persönlich beraten und optimieren Sie Ihre Anlagestrategie.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      className="focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      {...field}
                      className="focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-ff-primary data-[state=checked]:border-ff-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm text-gray-600">
                      Ich stimme der Verarbeitung meiner Daten zu *
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-ff-primary hover:bg-orange-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Senden...
                  </div>
                ) : (
                  'Beratungstermin anfragen'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
