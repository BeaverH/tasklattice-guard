/** Provenance of a bundled platform release, independent of installation test results. */
export type PlatformRelease = { source: "bundled"; contentDigest: string; testSuiteDigest: string };

export function matchesPlatformRelease(id: string, release: PlatformRelease | null | undefined, contentDigest: string | null, suiteDigest: string | null): boolean {
  return id === "guardrail-default" && release?.source === "bundled"
    && release.contentDigest === contentDigest && release.testSuiteDigest === suiteDigest;
}
