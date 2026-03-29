import type { PaymentMethodType } from "@splitsy/domain";

export type PaymentLinkResult = {
  url: string;
  label: string;
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  venmo: "Venmo",
  paypal: "PayPal",
  cashapp: "Cash App",
};

export function getPaymentMethodLabel(type: PaymentMethodType): string {
  return PAYMENT_METHOD_LABELS[type];
}

export function buildPaymentLink(
  type: PaymentMethodType,
  handle: string,
  amount: number,
  note?: string,
): PaymentLinkResult | null {
  const encodedNote = encodeURIComponent(note ?? "Splitsy settlement");
  const label = PAYMENT_METHOD_LABELS[type];

  switch (type) {
    case "venmo": {
      const cleanHandle = handle.replace(/^@/, "");
      return {
        url: `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(cleanHandle)}&amount=${amount.toFixed(2)}&note=${encodedNote}`,
        label: `Pay via ${label}`,
      };
    }
    case "paypal": {
      const cleanHandle = handle.replace(/\/$/, "");
      return {
        url: `https://paypal.me/${encodeURIComponent(cleanHandle)}/${amount.toFixed(2)}`,
        label: `Pay via ${label}`,
      };
    }
    case "cashapp": {
      const cleanHandle = handle.replace(/^\$/, "");
      return {
        url: `https://cash.app/$${encodeURIComponent(cleanHandle)}/${amount.toFixed(2)}`,
        label: `Pay via ${label}`,
      };
    }
    default:
      return null;
  }
}
