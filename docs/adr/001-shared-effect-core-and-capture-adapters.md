# ADR-001: Share the effect core across desktop and web

## Status

Accepted

## Context

Swyzzle began as an Electron app that captures the primary display and applies
interactive WebGL effects. The same melt effect should also be easy to embed in
ordinary web apps without weakening or replacing the desktop app.

Browsers cannot reliably capture every kind of page content. Cross-origin
images, iframes, video, and WebGL may be unavailable to DOM screenshot tools.
Electron, meanwhile, has a privileged desktop-capture API that must not leak
into browser-facing code.

## Decision

Maintain one browser-safe WebGL effect core with two capture boundaries:

- a web adapter that accepts an image, canvas, or video source and offers
  best-effort DOM capture as a convenience;
- an Electron adapter that captures the primary display through narrow,
  context-isolated IPC.

The existing Electron app and the browser package are equal consumers of the
shared core. The public effect lifecycle is `capture`, `start`, `reset`, and
`destroy`.

## Rationale

This preserves the existing desktop workflow while making the visual effect
reusable in framework-neutral web applications. Keeping privileged capture out
of the core also allows the package to run in a normal browser.

## Alternatives considered

- Keep the effect Electron-only. This does not satisfy the web reuse goal.
- Make DOM capture the only browser input. This would present unreliable
  browser capture as a guarantee.
- Require callers to always provide pixels. This is reliable but omits the
  requested one-call page capture experience.

## Consequences

- Shader and renderer fixes benefit both products.
- DOM capture is explicitly best effort; callers can fall back to a supported
  pixel source.
- Electron owns screen-recording permissions and desktop-source errors.
- Packaging must keep Electron modules out of the browser dependency graph.

## Follow-ups

- Add browser and Electron adapters around the shared renderer.
- Document capture limitations and source fallbacks.
- Test lifecycle cleanup, screen-source failure, and browser capture.
