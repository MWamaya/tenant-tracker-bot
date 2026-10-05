import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { PageSeo } from '@/components/seo/PageSeo';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TOPICS = [
  { value: 'general', label: 'General support' },
  { value: 'billing', label: 'Billing & subscription' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'privacy', label: 'Privacy & data request' },
  { value: 'other', label: 'Other' },
];

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(200),
  email: z.string().trim().email('Enter a valid email address').max(320),
  topic: z.string().optional(),
  message: z.string().trim().min(1, 'Enter a message').max(5000, 'Message is too long'),
});

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = contactSchema.safeParse({ name, email, topic, message });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.functions.invoke('contact-submit', {
      body: { name, email, topic, message, website },
    });
    setIsSubmitting(false);

    if (error || (data && 'error' in data)) {
      toast.error((data as { error?: string })?.error || 'Could not send your message. Please try again.');
      return;
    }

    setSubmitted(true);
    toast.success("Message sent — we'll get back to you soon.");
  };

  return (
    <>
      <PageSeo
        title="Contact & Support — KODI PAP"
        description="Get help with your KODI PAP account, payments or subscription."
        path={ROUTES.CONTACT}
        noindex
      />
      <div className="min-h-screen px-4 sm:px-8 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <Link
            to={ROUTES.LANDING}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> KODI PAP
          </Link>

          <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Contact & Support
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Need help with your properties, payments, account or subscription? Send us a
            message and we'll get back to you.
          </p>

          {submitted ? (
            <div className="mt-8 rounded-xl border border-success/30 bg-success/10 px-5 py-4 text-sm text-foreground">
              Thanks, {name.split(' ')[0]} — your message has been sent. We'll reply to{' '}
              <strong>{email}</strong> soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Honeypot — hidden from real users, left empty by them */}
              <div className="hidden" aria-hidden="true">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Wanjiru"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={320}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic</Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger id="topic">
                    <SelectValue placeholder="What's this about? (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  rows={6}
                  maxLength={5000}
                  required
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Do not include passwords or full payment card numbers in your message.
              </p>

              <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          )}

          <div className="mt-12 pt-8 border-t grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h2 className="font-semibold text-foreground">General support</h2>
              <p className="mt-1 text-muted-foreground">[support email]</p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Privacy & data requests</h2>
              <p className="mt-1 text-muted-foreground">[privacy email]</p>
            </div>
            <div className="sm:col-span-2">
              <h2 className="font-semibold text-foreground">Business address</h2>
              <p className="mt-1 text-muted-foreground">[legal/business address]</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
