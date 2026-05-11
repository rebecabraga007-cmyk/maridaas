import { Link } from "react-router-dom";
import { Mail, Clock, HelpCircle, UserX, Shield, FileText, ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SUPPORT_EMAIL = "rebeca.braga007@gmail.com";

const faqs = [
  {
    q: "How do I reset my password?",
    a: 'On the login screen, tap "Forgot password" and follow the instructions sent to your registered email address.',
  },
  {
    q: "How do I cancel my subscription?",
    a: "Open the app, go to your Profile, then Subscription, and tap Cancel. If you subscribed via the App Store, you can also manage it in your Apple ID settings.",
  },
  {
    q: "How do I delete my account?",
    a: `Send an email to ${SUPPORT_EMAIL} with the subject "Account Deletion Request". Your account and personal data will be permanently removed within 48 business hours.`,
  },
  {
    q: "How do I report a bug?",
    a: `Email us at ${SUPPORT_EMAIL} describing the issue, your device model, and the app version. Screenshots are welcome.`,
  },
];

const Support = () => {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <SEOHead
        title="Maridaas Support — Help Center & Contact"
        description="Get help with Maridaas: contact support, FAQs, account deletion, subscriptions, and privacy requests. Response within 24–48 business hours."
        canonical="https://maridaas.lovable.app/support"
      />

      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold">Maridaas</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <section className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Maridaas Support
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Welcome to Maridaas Support. Our team is available to help with technical issues,
            account questions, subscriptions, feedback, and privacy-related requests.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Email support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">
                Send us a message and we will get back to you.
              </CardDescription>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary font-medium break-all hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Response time</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                We reply within <strong className="text-foreground">24–48 business hours</strong>,
                Monday to Friday.
              </CardDescription>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Frequently asked questions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-destructive" />
                </div>
                <CardTitle className="text-lg">Delete your account</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>
                You can request permanent deletion of your account and all associated personal
                data at any time. Send an email to{" "}
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`} className="text-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>{" "}
                with the subject <strong className="text-foreground">"Account Deletion Request"</strong>.
                We will process your request within 48 business hours.
              </CardDescription>
              <Button asChild variant="outline">
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`}>
                  Request account deletion
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 mb-12">
          <Button asChild variant="outline" size="lg" className="h-14">
            <Link to="/privacidade">
              <Shield className="h-5 w-5" />
              Privacy Policy
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-14">
            <Link to="/termos">
              <FileText className="h-5 w-5" />
              Terms of Service
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Maridaas. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Support;
