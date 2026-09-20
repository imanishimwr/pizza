---
name: debugging-validation
description: "Use when debugging a bug, reproducing a failure, tracing an issue to its root cause, or validating a fix in code. Covers targeted investigation, minimal patching, and evidence-based verification before completion."
---

# Debugging and Fix Validation

Use this skill when a feature is broken, a regression appears, or a fix needs to be checked against real behavior.

## Workflow

1. Reproduce the issue
   - Capture the exact symptom, stack trace, error, or UI state.
   - Confirm whether the problem is in frontend logic, backend logic, config, database, environment, or dependency behavior.
   - Narrow the problem to the smallest relevant area before changing code.

2. Trace the execution path
   - Read the entry point, data flow, and failure point in the relevant module.
   - Check assumptions about inputs, state, API contracts, and environment values.
   - Prefer a precise read of the actual failing path rather than broad code inspection.

3. Form one root-cause hypothesis
   - State the likely cause in one sentence.
   - Validate the hypothesis against observed behavior and evidence.
   - If multiple causes are possible, choose the one most directly supported by the failing path.

4. Apply the smallest possible fix
   - Keep the change narrow and targeted.
   - Avoid unrelated refactors or cleanup that hides the real fix.
   - Preserve the current architecture unless the root cause requires a structural change.

5. Verify before completion
   - Run the smallest relevant test, build, lint, or runtime validation.
   - Confirm the original symptom is gone.
   - Check the nearest adjacent behavior to detect regression.
   - Do not claim success without fresh evidence.

6. Summarize the result
   - State the root cause.
   - Explain what changed.
   - Cite the validation that confirms the fix.

## Decision points

- If the issue cannot be reproduced, verify the environment, data, and inputs before editing code.
- If there are multiple plausible causes, prioritize the one backed by the failing execution path.
- If the fix requires schema, API, or config changes, include compatibility and migration considerations.
- If tests are missing, validate with the closest real runtime behavior, such as a manual repro, local script, or integration check.

## Completion criteria

A task is complete only when all of these are true:

- The root cause has been identified and explained.
- The fix matches the actual failure path.
- The relevant validation step passes.
- The patch is narrow and understandable.
- No obvious adjacent regressions were introduced.

## Anti-patterns to avoid

- Guessing without reproducing the bug.
- Broad refactor work during a targeted fix.
- Claiming a fix without running a relevant verification step.
- Relying only on mocked behavior when real runtime behavior is available.
- Editing dependencies or config without checking the environment impact.

## Example prompts

- Reproduce this bug and identify the root cause before changing code.
- Trace why the checkout flow is returning the wrong total.
- Fix the API error and validate it with the smallest relevant command.
- Investigate the regression and confirm the fix with evidence.

## Related customizations

- Create a more specialized bug-fix skill for frontend issues, backend APIs, or database migrations.
- Pair this with project-specific instructions that define testing commands, coding style, and validation gates.
