export const PLUGIN_FRAMEWORK_MODULE = 'plugin-framework';

/** Roles permitted to manage a PRIVATE app's plugin manifests/extension points/subscriptions, and to activate/deactivate/reactivate plugins for their own tenant. Managing a FIRST_PARTY/PARTNER app's manifest additionally requires being the App Store listing owner (platform admin), same visibility/manage split App Store itself uses. */
export const PLUGIN_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** ATLAS's own platform version, compared against each manifest's `minAtlasVersion`/`maxAtlasVersion` at activation time. Hand-rolled major.minor.patch comparison only (same minimal approach already used by `marketplace-capability-compatibility.manager.ts`) — no external semver dependency. */
export const ATLAS_PLATFORM_VERSION = '1.0.0';

/** Consecutive hook-dispatch failures after which an activation is automatically quarantined, isolating a misbehaving plugin from further invocation until a manual reactivation. */
export const PLUGIN_QUARANTINE_FAILURE_THRESHOLD = 5;

export const PLUGIN_ACTIVATION_SORT_FIELDS = ['createdAt', 'updatedAt', 'lastInvokedAt'] as const;
