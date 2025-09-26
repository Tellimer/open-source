/* Reusable guards for Workflows V2 (XState v5) */
import type { V2Buckets } from "./types.ts";

export type GuardFn<Ctx = unknown, Ev = unknown> = (
  args: { context: Ctx; event: Ev },
) => boolean;

// Truthiness helpers
export const truthy =
  <T = unknown>(): GuardFn<{ value?: T }> => ({ context }) =>
    Boolean(context.value);
export const falsy = <T = unknown>(): GuardFn<{ value?: T }> => ({ context }) =>
  !context.value;

// Config-derived guards (used in monetary/time-basis/targets)
export const autoTargetEnabled =
  <Ctx extends { config?: { autoTargetByIndicator?: boolean } }>(): GuardFn<
    Ctx
  > =>
  ({ context }) => context.config?.autoTargetByIndicator === true;

export const hasConfigTargetTime =
  <Ctx extends { config?: { targetTimeScale?: unknown } }>(): GuardFn<Ctx> =>
  ({ context }) => context.config?.targetTimeScale != null;

export const explainEnabled =
  <Ctx extends { config?: { explain?: boolean } }>(): GuardFn<Ctx> =>
  ({ context }) => context.config?.explain === true;

// Buckets guards
export const hasItems =
  <Ctx extends { buckets?: V2Buckets }>(key: keyof V2Buckets): GuardFn<Ctx> =>
  ({ context }) => {
    const b = context.buckets as V2Buckets | undefined;
    return Array.isArray(b?.[key]) && (b![key] as unknown[]).length > 0;
  };

export const noItems =
  <Ctx extends { buckets?: V2Buckets }>(key: keyof V2Buckets): GuardFn<Ctx> =>
  ({ context, event }) => !hasItems<Ctx>(key)({ context, event });

// Exemptions guards (for classify + router fan-in)
export const hasExempted =
  <Ctx extends { exempted?: unknown[] }>(): GuardFn<Ctx> => ({ context }) =>
    Array.isArray(context.exempted) && (context.exempted?.length ?? 0) > 0;

export const hasNonExempted =
  <Ctx extends { nonExempted?: unknown[] }>(): GuardFn<Ctx> => ({ context }) =>
    Array.isArray(context.nonExempted) &&
    (context.nonExempted?.length ?? 0) > 0;

// Logical combinators for local composition
export const and =
  <Ctx, Ev>(...guards: GuardFn<Ctx, Ev>[]): GuardFn<Ctx, Ev> =>
  ({ context, event }) => guards.every((g) => g({ context, event }));

export const or =
  <Ctx, Ev>(...guards: GuardFn<Ctx, Ev>[]): GuardFn<Ctx, Ev> =>
  ({ context, event }) => guards.some((g) => g({ context, event }));

export const not =
  <Ctx, Ev>(g: GuardFn<Ctx, Ev>): GuardFn<Ctx, Ev> => ({ context, event }) =>
    !g({ context, event });

// ============================================================================
// Additional Configuration Guards
// ============================================================================

export const hasConfigTargetCurrency =
  <Ctx extends { config?: { targetCurrency?: unknown } }>(): GuardFn<Ctx> =>
  ({ context }) => context.config?.targetCurrency != null;

export const hasConfigTargetScale =
  <Ctx extends { config?: { targetMagnitude?: unknown } }>(): GuardFn<Ctx> =>
  ({ context }) => context.config?.targetMagnitude != null;

export const useLiveFX =
  <Ctx extends { config?: { useLiveFX?: boolean } }>(): GuardFn<Ctx> =>
  ({ context }) => context.config?.useLiveFX === true;

// ============================================================================
// Processing State Guards
// ============================================================================

export const hasErrors =
  <Ctx extends { errors?: unknown[] }>(): GuardFn<Ctx> => ({ context }) =>
    Array.isArray(context.errors) && (context.errors?.length ?? 0) > 0;

export const hasFXRates =
  <Ctx extends { fxRates?: { rates?: Record<string, unknown> } }>(): GuardFn<
    Ctx
  > =>
  ({ context }) =>
    !!(context.fxRates?.rates && Object.keys(context.fxRates.rates).length > 0);

export const hasResults =
  <Ctx extends { results?: unknown[] }>(): GuardFn<Ctx> => ({ context }) =>
    Array.isArray(context.results) && (context.results?.length ?? 0) > 0;

export const needsConversion = <
  Ctx extends {
    config?: {
      targetCurrency?: unknown;
      targetTimeScale?: unknown;
      targetMagnitude?: unknown;
      autoTarget?: boolean;
    };
  },
>(): GuardFn<Ctx> =>
({ context }) =>
  Boolean(
    context.config?.targetCurrency ||
      context.config?.targetTimeScale ||
      context.config?.targetMagnitude ||
      context.config?.autoTarget,
  );

// ============================================================================
// Threshold Guards
// ============================================================================

export const exceedsThreshold =
  <Ctx extends { dominanceRatio?: number }>(threshold = 0.8): GuardFn<Ctx> =>
  ({ context }) =>
    context.dominanceRatio != null && context.dominanceRatio > threshold;

export const meetsMinimumItems =
  <Ctx extends { items?: unknown[] }>(minimum = 1): GuardFn<Ctx> =>
  ({ context }) =>
    Array.isArray(context.items) && (context.items?.length ?? 0) >= minimum;

// ============================================================================
// Bucket-Specific Convenience Guards
// ============================================================================

export const hasMonetaryStock = <
  Ctx extends { buckets?: V2Buckets },
>(): GuardFn<Ctx> => hasItems<Ctx>("monetaryStock");

export const hasMonetaryFlow = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("monetaryFlow");

export const hasCounts = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("counts");

export const hasPercentages = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("percentages");

export const hasIndices = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("indices");

export const hasRatios = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("ratios");

export const hasEnergy = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("energy");

export const hasCommodities = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("commodities");

export const hasAgriculture = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("agriculture");

export const hasMetals = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("metals");

export const hasCrypto = <Ctx extends { buckets?: V2Buckets }>(): GuardFn<
  Ctx
> => hasItems<Ctx>("crypto");

// ============================================================================
// Utility Guards
// ============================================================================

export const always = (): GuardFn => () => true;
export const never = (): GuardFn => () => false;

export const hasAnyBucketItems =
  <Ctx extends { buckets?: V2Buckets }>(): GuardFn<Ctx> => ({ context }) => {
    if (!context.buckets) return false;
    const buckets = context.buckets as V2Buckets;
    return Object.values(buckets).some((bucket) =>
      Array.isArray(bucket) && bucket.length > 0
    );
  };

export const allBucketsEmpty =
  <Ctx extends { buckets?: V2Buckets }>(): GuardFn<Ctx> =>
  ({ context, event }) => !hasAnyBucketItems<Ctx>()({ context, event });
