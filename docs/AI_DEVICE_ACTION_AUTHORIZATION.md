# AI device-action authorization

Reviewed 2026-09-07. This is an engineering safety control and legal-risk
record, not legal advice.

## Current finding

QC Remote's generated action contract includes boolean fields such as
`confirm_persistent_write`, `confirm_risky_operation`,
`confirm_tuner_activation`, and `confirm_overwrite`. The online model currently
constructs the tool call containing those fields. The shared executor verifies
that the booleans are true, but it cannot prove that a person—rather than the
model—authorized the particular action.

Prompt instructions tell the model to set confirmation fields only after an
explicit request. This is useful behavioral guidance, but it is not an
independent authorization boundary. Text found in conversation history, an
attachment, model output, or device/tool output must never gain authority merely
because the model repeats it into a confirmation field.

The existing expected-state guards reduce stale-write risk. They do not replace
authorization and do not protect an in-scope but unintended write.

## Release requirement

Before enabling model-driven sensitive actions in a public build, select and
verify one of these designs:

1. `host-confirmed-each-sensitive-action`: the host shows the exact action,
   target, material values, persistence, and overwrite/destructive effect, and
   executes it only after a contemporaneous user gesture;
2. `prompt-bound-authorization-with-ui-confirmation`: the host derives a narrow,
   single-request authorization from the current user submission, rejects
   authority from all other content, and requests a host UI confirmation when
   the generated action exceeds that scope; or
3. `sensitive-model-actions-disabled`: sensitive action tools are absent from
   every public model provider and prompt-only tool catalog. Manual app controls
   may remain available.

Whichever design is selected must:

- be enforced by trusted host code, not by a model-supplied boolean;
- bind authorization to the exact action and important arguments;
- expire after the action, request, cancellation, connection reset, or relevant
  device-state change;
- distinguish a save from an overwrite and a live edit from a persistent write;
- preserve confirmation for output volume, mute, tuner engagement, reconnect,
  session reset, raw screen interaction, reload/discard, deletion, and global or
  device settings;
- reject instructions originating in attachments, prior assistant text, device
  names, preset names, tool results, or other untrusted content; and
- produce an auditable local result without retaining unnecessary personal or
  device-identifying data.

Test the exact signed Windows and Android builds against benign, ambiguous,
injected, stale-state, cancellation, and repeated-tool-call cases. Preserve the
dated report or evidence bundle and record its SHA-256 digest in
`legal/public-release.json`.

Do not set `assistantSensitiveActionAuthorizationReviewed` to true while model
confirmation booleans are the only authorization mechanism.
