'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, ShieldAlert } from 'lucide-react';
import { Crest } from '@/components/crest';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <div className="relative w-full space-y-6">
      <div className="absolute right-0 -top-2">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center text-center space-y-2 pt-4">
        <Crest className="h-14 w-auto" />
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          PES ACADEMY
        </h1>
      </div>

      <Card className="border-border bg-surface shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary mb-1">
            <KeyRound className="h-5 w-5" />
            <CardTitle className="text-base font-bold">
              Reset your password
            </CardTitle>
          </div>
          <CardDescription>
            Academy accounts do not use email password resets
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border border-gold/30 bg-gold/10 p-3.5 text-xs text-foreground space-y-2 leading-relaxed">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-gold shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold">Contact an Academy Admin</p>
                <p className="text-muted">
                  Ask an academy admin to reset your password from their Profile
                  tab. They will give you a temporary password, and you will be
                  prompted to choose a new password on your next login.
                </p>
              </div>
            </div>
          </div>

          <Link href="/login" className="block">
            <Button variant="secondary" size="md" className="w-full font-semibold">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to login</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

