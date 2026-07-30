## Goal
Clear the critical `html2pdf.js` / `jspdf` advisory (GHSA-wfv2-pwc8-crg5).

## What's actually going on
- `html2pdf.js@0.14.0` depends on `jspdf: ^4.0.0`.
- The advisory affects `jspdf <= 4.2.0`, patched in **4.2.1**.
- `package-lock.json` pins `jspdf 4.2.0` (vulnerable), while the installed `node_modules` already has 4.2.1. So this is purely a lockfile issue — no app code change needed.
- The repo also has a binary `bun.lockb`, which the security scanner cannot read.

Also worth noting: the app only calls `html2pdf().save()` (download path), never the vulnerable "open in new window" path, so real-world exposure is minimal — but the pin should still be bumped.

## Plan
1. Force-resolve `jspdf` to `>=4.2.1` (add a lockfile-level override / resolution so the transitive dep can't fall back to 4.2.0).
2. Reinstall dependencies so both lockfiles record `jspdf 4.2.1`.
3. Convert the binary lockfile to text (`bun install --save-text-lockfile`) so the scanner can verify it.
4. Verify the PDF download in the Generator tab still works after the bump.
5. Re-run the dependency scan and mark the finding fixed once the vulnerable version is gone from the lockfile.

## Technical details
- `package.json`: add `"overrides": { "jspdf": "^4.2.1" }` (npm) and matching `"resolutions"` for bun.
- Regenerate `package-lock.json` and produce `bun.lock` (text) replacing `bun.lockb`.
- No changes to `GeneratorTab.tsx` or any other source file.
