Econify XState Machines

This directory contains child state machines that compose the master pipeline
machine.

Planned structure:

- fx_rates.machine.ts — Live vs. fallback FX retrieval
- adjustment/
  - adjustment.machine.ts — Inflation and seasonality compound
  - inflation.machine.ts
  - seasonality.machine.ts
- normalization/
  - normalization.machine.ts — Parent compound for normalization stage
  - exemptions_router.machine.ts
  - domain_router.machine.ts
  - wages.machine.ts
  - counts.machine.ts
  - percentages.machine.ts
  - non_monetary_domain.machine.ts
  - default_monetary.machine.ts
  - auto_target_by_indicator.machine.ts
  - time_basis_selection.machine.ts
  - core_normalize.machine.ts
  - explain_metadata.machine.ts
- validation.machine.ts
- parsing.machine.ts
- quality.machine.ts
- finalize.machine.ts

Notes:

- Keep child machines pure and typed: accept input, return output via onDone.
- Parent pipeline retains accumulated context and wiring.
- Unit tests per machine ensure behavior parity with existing services.
