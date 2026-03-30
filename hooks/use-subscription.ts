"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api";

export type BillingCycle = "monthly" | "yearly";

export interface PricingPlan {
  plan: "pro" | "max";
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  name: string;
  description: string;
}

export interface Subscription {
  id: string;
  status:
    | "active"
    | "canceled"
    | "past_due"
    | "incomplete"
    | "trialing"
    | "unpaid";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  priceAmount: number;
  currency: string;
}

export interface SubscriptionState {
  plan: "free" | "pro" | "max";
  planStatus: "active" | "suspended";
  proExpiresAt?: string;
  billingCycle?: BillingCycle;
  subscription: Subscription | null;
}

export interface UseSubscriptionReturn {
  // State
  subscription: SubscriptionState | null;
  plans: PricingPlan[];
  isLoading: boolean;
  isCheckoutLoading: boolean;
  error: string | null;

  // Actions
  fetchSubscription: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  createCheckout: (
    plan: "pro" | "max",
    billingCycle: BillingCycle,
  ) => Promise<string | null>;
  cancelSubscription: (reason?: string) => Promise<boolean>;

  // Computed
  isPro: boolean;
  isMax: boolean;
  isActive: boolean;
  isCanceling: boolean;
}

function isSafeCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (process.env.NODE_ENV === "development" && parsed.protocol === "http:") {
      return true;
    }

    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function useSubscription(): UseSubscriptionReturn {
  const api = apiClient;

  const [subscription, setSubscription] = useState<SubscriptionState | null>(
    null,
  );
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current subscription status
   */
  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get("/subscription/current");
      setSubscription(response.data);
    } catch (err: any) {
      // Not having a subscription is normal for free users
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || "Failed to fetch subscription");
      }
      setSubscription({
        plan: "free",
        planStatus: "active",
        subscription: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch available pricing plans
   */
  const fetchPlans = useCallback(async () => {
    try {
      const response = await api.get("/checkout/plans");
      if (response.data?.plans) {
        setPlans(response.data.plans);
      }
    } catch (err: any) {
      console.error("Failed to fetch plans:", err);
    }
  }, []);

  /**
   * Create a checkout session and return the URL
   */
  const createCheckout = useCallback(
    async (
      plan: "pro" | "max",
      billingCycle: BillingCycle,
    ): Promise<string | null> => {
      setIsCheckoutLoading(true);
      setError(null);

      try {
        const response = await api.post("/checkout/create", {
          plan,
          billingCycle,
        });

        if (response.data?.checkoutUrl) {
          if (!isSafeCheckoutUrl(response.data.checkoutUrl)) {
            setError("Received an invalid checkout URL");
            return null;
          }
          return response.data.checkoutUrl;
        }

        setError("No checkout URL received");
        return null;
      } catch (err: any) {
        setError(
          err.response?.data?.error || "Failed to create checkout session",
        );
        return null;
      } finally {
        setIsCheckoutLoading(false);
      }
    },
    [],
  );

  /**
   * Cancel subscription at period end
   */
  const cancelSubscription = useCallback(
    async (reason?: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        await api.post("/subscription/cancel", { reason });
        // Refresh subscription state
        await fetchSubscription();
        return true;
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to cancel subscription");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSubscription],
  );

  // Computed values
  const isPro = subscription?.plan === "pro";
  const isMax = subscription?.plan === "max";
  const isActive = subscription?.planStatus === "active";
  const isCanceling = subscription?.subscription?.cancelAtPeriodEnd || false;

  return {
    subscription,
    plans,
    isLoading,
    isCheckoutLoading,
    error,
    fetchSubscription,
    fetchPlans,
    createCheckout,
    cancelSubscription,
    isPro,
    isMax,
    isActive,
    isCanceling,
  };
}

export default useSubscription;
