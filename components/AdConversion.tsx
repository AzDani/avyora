"use client";

import { useEffect, useRef } from "react";
import { adConversion } from "@/lib/gtag";

/**
 * Déclenche une conversion Google Ads une seule fois au montage.
 * `transactionId` (ex. l'id de session Stripe) sert à Google pour dédupliquer
 * si la page est rechargée — la conversion n'est comptée qu'une fois.
 */
export default function AdConversion({
  sendTo,
  value,
  currency = "EUR",
  transactionId,
}: {
  sendTo: string;
  value?: number;
  currency?: string;
  transactionId?: string;
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const params: Record<string, unknown> = {};
    if (value != null) {
      params.value = value;
      params.currency = currency;
    }
    if (transactionId) params.transaction_id = transactionId;
    adConversion(sendTo, params);
  }, [sendTo, value, currency, transactionId]);
  return null;
}
