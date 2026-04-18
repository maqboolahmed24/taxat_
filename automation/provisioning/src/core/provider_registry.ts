import {
  detectBrittleFallbacks,
  validateSelectorManifest,
  type SelectorManifest,
} from "./selector_contract.js";
import type { ManualCheckpointReason } from "./manual_checkpoint.js";
import { assertLiveProviderGate, type RunContext } from "./run_context.js";

export interface ProviderFlowRecipe {
  flowId: string;
  label: string;
  description: string;
  allowedEnvironmentRefs: string[];
  supportedConnectionMethods: string[];
  selectorManifestId: string;
  requiresLiveProviderGate: boolean;
  manualCheckpointReasons: ManualCheckpointReason[];
}

export interface ProviderRecipe {
  providerId: string;
  displayName: string;
  providerMonogram: string;
  docsUrl: string;
  flows: ProviderFlowRecipe[];
  selectorManifests: SelectorManifest[];
  notes: string[];
}

export class ProviderRegistry {
  readonly #providers = new Map<string, ProviderRecipe>();

  register(provider: ProviderRecipe): void {
    for (const manifest of provider.selectorManifests) {
      validateSelectorManifest(manifest);
    }
    this.#providers.set(provider.providerId, provider);
  }

  list(): ProviderRecipe[] {
    return [...this.#providers.values()].sort((left, right) =>
      left.providerId.localeCompare(right.providerId),
    );
  }

  getRequired(providerId: string): ProviderRecipe {
    const provider = this.#providers.get(providerId);
    if (!provider) {
      throw new Error(`Unknown provider recipe ${providerId}`);
    }
    return provider;
  }
}

function hmrcProviderRecipe(): ProviderRecipe {
  return {
    providerId: "hmrc-developer-hub",
    displayName: "HMRC Developer Hub",
    providerMonogram: "HMRC",
    docsUrl: "https://developer.service.hmrc.gov.uk",
    flows: [
      {
        flowId: "developer-hub-workspace-setup",
        label: "Developer Hub workspace setup",
        description:
          "Create or verify the HMRC Developer Hub workspace used for sandbox automation.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
        ],
        supportedConnectionMethods: ["WEB_APP_VIA_SERVER"],
        selectorManifestId: "hmrc-developer-hub-workspace",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["EMAIL_VERIFICATION", "CAPTCHA", "MFA"],
      },
      {
        flowId: "sandbox-app-registration",
        label: "Sandbox application registration",
        description:
          "Register or verify the HMRC sandbox application, callback URIs, and scoped access settings.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
        ],
        selectorManifestId: "hmrc-sandbox-app-registration",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["MFA", "HUMAN_REVIEW"],
      },
      {
        flowId: "sandbox-fraud-prevention-validation",
        label: "Sandbox fraud-prevention validation",
        description:
          "Validate the executable HMRC fraud-prevention header profiles and bind them back to the active sandbox provider-profile set.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
        ],
        selectorManifestId: "hmrc-sandbox-fraud-prevention-validation",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: [],
      },
      {
        flowId: "sandbox-client-credential-export",
        label: "Sandbox client credential export",
        description:
          "Export HMRC sandbox client identifiers and client-secret lineage into governed vault-bound records without persisting raw values in repo artifacts.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
        ],
        selectorManifestId: "hmrc-sandbox-client-credential-export",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["POLICY_CONFIRMATION", "MFA", "HUMAN_REVIEW"],
      },
      {
        flowId: "production-app-registration",
        label: "Production application registration",
        description:
          "Verify production registration posture without automating product-runtime sign-in.",
        allowedEnvironmentRefs: [
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
          "BATCH_PROCESS_DIRECT",
        ],
        selectorManifestId: "hmrc-production-app-registration",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["MFA", "LEGAL_APPROVAL", "HUMAN_REVIEW"],
      },
    ],
    selectorManifests: [
      {
        manifestId: "hmrc-developer-hub-workspace",
        providerId: "hmrc-developer-hub",
        flowId: "developer-hub-workspace-setup",
        selectors: [
          {
            selectorId: "workspace-heading",
            description: "Workspace heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Developer Hub",
          },
          {
            selectorId: "email-field",
            description: "Email field",
            strategy: "LABEL",
            value: "Email address",
          },
          {
            selectorId: "continue-button",
            description: "Primary continue button",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Continue",
          },
        ],
      },
      {
        manifestId: "hmrc-sandbox-app-registration",
        providerId: "hmrc-developer-hub",
        flowId: "sandbox-app-registration",
        selectors: [
          {
            selectorId: "applications-heading",
            description: "Applications console heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Applications",
          },
          {
            selectorId: "add-application",
            description: "Add an application action",
            strategy: "ROLE",
            value: "link",
            accessibleName: "Add an application",
          },
          {
            selectorId: "application-name-field",
            description: "Application name field",
            strategy: "LABEL",
            value: "Application name",
          },
          {
            selectorId: "manage-api-subscriptions",
            description: "Manage API subscriptions entrypoint",
            strategy: "ROLE",
            value: "link",
            accessibleName: "Manage API subscriptions",
          },
          {
            selectorId: "save-subscriptions",
            description: "Save subscriptions button",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Save subscriptions",
          },
          {
            selectorId: "api-subscription-row-fallback",
            description: "Fallback subscription row selector when semantic API labels drift",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='api-subscription-row']",
            justification:
              "Used only when role and label selectors can no longer resolve API subscription controls but the structured row container still exists.",
            driftSignal:
              "Raise selector-drift warning if canonical API labels disappear and row-level alias matching is required.",
          },
        ],
      },
      {
        manifestId: "hmrc-production-app-registration",
        providerId: "hmrc-developer-hub",
        flowId: "production-app-registration",
        selectors: [
          {
            selectorId: "production-badge",
            description: "Production environment indicator",
            strategy: "TEXT",
            value: "Production",
          },
          {
            selectorId: "scope-panel",
            description: "Scopes panel",
            strategy: "TEXT",
            value: "Scopes",
          },
          {
            selectorId: "callback-table",
            description: "Callback URI table",
            strategy: "TEXT",
            value: "Redirect URIs",
          },
        ],
      },
      {
        manifestId: "hmrc-sandbox-fraud-prevention-validation",
        providerId: "hmrc-developer-hub",
        flowId: "sandbox-fraud-prevention-validation",
        selectors: [],
      },
      {
        manifestId: "hmrc-sandbox-client-credential-export",
        providerId: "hmrc-developer-hub",
        flowId: "sandbox-client-credential-export",
        selectors: [
          {
            selectorId: "manage-application-credentials",
            description: "Application credentials entrypoint",
            strategy: "ROLE",
            value: "link",
            accessibleName: "Manage application credentials",
          },
          {
            selectorId: "credentials-heading",
            description: "Application credentials heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Application credentials",
          },
          {
            selectorId: "client-id-field",
            description: "Client ID field",
            strategy: "LABEL",
            value: "Client ID",
          },
          {
            selectorId: "generate-client-secret",
            description: "Generate client secret button",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Generate client secret",
          },
          {
            selectorId: "client-secret-row-fallback",
            description: "Fallback credentials row selector when semantic row copy drifts",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='client-secret-row']",
            justification:
              "Used only when the credentials panel still exposes structured version rows but the row text changes enough that semantic lookup becomes unsafe.",
            driftSignal:
              "Raise selector-drift warning if the credentials page no longer exposes the expected client-secret row semantics.",
          },
        ],
      },
    ],
    notes: [
      "HMRC recipes are extension points only. Live execution must be explicitly enabled and must remain outside product-runtime OAuth sign-in automation.",
      "Manual checkpoint is mandatory for MFA, CAPTCHA, or human verification screens.",
    ],
  };
}

function idpProviderRecipe(): ProviderRecipe {
  return {
    providerId: "oidc-external-idp-control-plane",
    displayName: "OIDC External Identity Control Plane",
    providerMonogram: "OIDC",
    docsUrl:
      "https://auth0.com/docs/get-started/auth0-overview/create-tenants/set-up-multiple-environments",
    flows: [
      {
        flowId: "idp-tenant-and-clients-bootstrap",
        label: "IdP tenant and client bootstrap",
        description:
          "Create or adopt the recommended external IdP tenants and the browser, native, and machine clients required by Taxat's control-plane topology.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
          "MACHINE_TO_MACHINE",
        ],
        selectorManifestId: "auth0-compatible-idp-topology",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["MFA", "POLICY_CONFIRMATION", "HUMAN_REVIEW"],
      },
      {
        flowId: "idp-role-scope-mfa-session-policy",
        label: "IdP role, scope, MFA, and session policy",
        description:
          "Configure the coarse IdP role, scope, MFA, step-up, and session-policy pack that supports Taxat sign-in posture without replacing Taxat authorization truth.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
          "MACHINE_TO_MACHINE",
        ],
        selectorManifestId: "auth0-compatible-idp-policy",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["MFA", "POLICY_CONFIRMATION", "HUMAN_REVIEW"],
      },
    ],
    selectorManifests: [
      {
        manifestId: "auth0-compatible-idp-topology",
        providerId: "oidc-external-idp-control-plane",
        flowId: "idp-tenant-and-clients-bootstrap",
        selectors: [
          {
            selectorId: "control-plane-heading",
            description: "Primary heading for the IdP control-plane workspace",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Identity control plane",
          },
          {
            selectorId: "tenants-heading",
            description: "Tenants section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Tenants",
          },
          {
            selectorId: "create-recommended-tenants",
            description: "Create or adopt the recommended tenant set",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Create recommended tenants",
          },
          {
            selectorId: "applications-heading",
            description: "Interactive application clients heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Application clients",
          },
          {
            selectorId: "machine-clients-heading",
            description: "Machine clients heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Machine clients",
          },
          {
            selectorId: "create-recommended-clients",
            description: "Create or adopt the recommended client set",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Create recommended clients",
          },
          {
            selectorId: "tenant-row-fallback",
            description: "Structured tenant row fallback when semantic row labels drift",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='tenant-row']",
            justification:
              "Used only when the control-plane table structure still exists but semantic tenant row labels drift enough to make exact row text unsafe.",
            driftSignal:
              "Raise selector-drift warning if tenant rows cannot be resolved by semantic labels.",
          },
          {
            selectorId: "client-row-fallback",
            description: "Structured client row fallback when semantic row labels drift",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='client-row']",
            justification:
              "Used only when the client table still exposes structured rows but application-family labels drift enough to make direct semantic lookup unsafe.",
            driftSignal:
              "Raise selector-drift warning if application or machine client rows no longer expose the expected semantic labels.",
          },
        ],
      },
      {
        manifestId: "auth0-compatible-idp-policy",
        providerId: "oidc-external-idp-control-plane",
        flowId: "idp-role-scope-mfa-session-policy",
        selectors: [
          {
            selectorId: "policy-heading",
            description: "Primary heading for the IdP access and session policy workspace",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Access and session policy",
          },
          {
            selectorId: "roles-and-scopes-heading",
            description: "Roles and scopes section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Roles and scopes",
          },
          {
            selectorId: "apply-roles-and-scopes",
            description: "Apply or adopt the recommended coarse role and scope pack",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Apply recommended roles and scopes",
          },
          {
            selectorId: "mfa-step-up-heading",
            description: "MFA and step-up section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "MFA and step-up",
          },
          {
            selectorId: "apply-mfa-and-step-up",
            description: "Apply or adopt the recommended MFA and step-up posture",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Apply MFA and step-up posture",
          },
          {
            selectorId: "session-policies-heading",
            description: "Session policies section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Session policies",
          },
          {
            selectorId: "apply-session-policies",
            description: "Apply or adopt the recommended session posture",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Apply session policies",
          },
          {
            selectorId: "policy-row-fallback",
            description: "Structured policy row fallback when semantic labels drift",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='policy-row']",
            justification:
              "Used only when the policy console still exposes structured rows but role, scope, or session labels drift enough that direct semantic lookup is unsafe.",
            driftSignal:
              "Raise selector-drift warning if the policy tables can no longer be resolved by their semantic labels.",
          },
        ],
      },
    ],
    notes: [
      "This provider models the coarse external identity boundary only. Final authorization truth remains Taxat-engine owned.",
      "Auth0-compatible is the default adapter until a later ADR freezes a concrete vendor contract.",
    ],
  };
}

function emailProviderRecipe(): ProviderRecipe {
  return {
    providerId: "transactional-email-delivery-control-plane",
    displayName: "Transactional Email Delivery Control Plane",
    providerMonogram: "MAIL",
    docsUrl: "https://postmarkapp.com/developer/api/overview",
    flows: [
      {
        flowId: "email-workspace-and-sender-domain-bootstrap",
        label: "Email workspace and sender-domain bootstrap",
        description:
          "Create or adopt the transactional email control plane, sender domains, DNS inventory, and message-stream posture required for Taxat product notifications.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
          "MACHINE_TO_MACHINE",
        ],
        selectorManifestId: "postmark-compatible-email-control-plane",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["HUMAN_REVIEW", "POLICY_CONFIRMATION"],
      },
      {
        flowId: "email-templates-and-webhooks-configuration",
        label: "Email templates and webhook configuration",
        description:
          "Configure or adopt customer-safe transactional email templates, authenticated webhook endpoints, and delivery-event mapping rules without turning the provider into workflow truth.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
          "MACHINE_TO_MACHINE",
        ],
        selectorManifestId: "postmark-compatible-email-template-webhooks",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["HUMAN_REVIEW", "POLICY_CONFIRMATION"],
      },
    ],
    selectorManifests: [
      {
        manifestId: "postmark-compatible-email-control-plane",
        providerId: "transactional-email-delivery-control-plane",
        flowId: "email-workspace-and-sender-domain-bootstrap",
        selectors: [
          {
            selectorId: "workspace-heading",
            description: "Primary heading for the email control-plane workspace",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Transactional email control plane",
          },
          {
            selectorId: "workspace-action",
            description: "Create or adopt workspace action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Create or adopt email workspace",
          },
          {
            selectorId: "sender-domains-heading",
            description: "Sender domains section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Sender domains",
          },
          {
            selectorId: "sender-domain-action",
            description: "Create or adopt sender domains action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Create or adopt sender domains",
          },
          {
            selectorId: "dns-readiness-action",
            description: "Verify DNS readiness action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Verify DNS readiness",
          },
          {
            selectorId: "message-streams-heading",
            description: "Message streams section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Message streams",
          },
          {
            selectorId: "sender-domain-row-fallback",
            description: "Structured sender-domain row fallback when semantic labels drift",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='sender-domain-row']",
            justification:
              "Used only when the provider still exposes structured sender-domain rows but the row copy no longer resolves safely via semantic labels.",
            driftSignal:
              "Raise selector-drift warning if sender-domain rows can no longer be found semantically.",
          },
        ],
      },
      {
        manifestId: "postmark-compatible-email-template-webhooks",
        providerId: "transactional-email-delivery-control-plane",
        flowId: "email-templates-and-webhooks-configuration",
        selectors: [
          {
            selectorId: "workspace-heading",
            description: "Primary heading for the email control-plane workspace",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Transactional email control plane",
          },
          {
            selectorId: "templates-heading",
            description: "Templates section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Templates",
          },
          {
            selectorId: "template-action",
            description: "Configure or adopt templates action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Configure or adopt templates",
          },
          {
            selectorId: "webhooks-heading",
            description: "Webhooks section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Webhooks",
          },
          {
            selectorId: "webhook-action",
            description: "Configure webhook endpoints action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Configure webhook endpoints",
          },
          {
            selectorId: "event-mapping-heading",
            description: "Event mapping section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Event mapping",
          },
          {
            selectorId: "mapping-action",
            description: "Validate delivery event mapping action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate delivery event mapping",
          },
          {
            selectorId: "template-row-fallback",
            description: "Structured template row fallback when semantic labels drift",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='template-row']",
            justification:
              "Used only when the provider still exposes structured template rows but the family labels drift enough that semantic lookup is unsafe.",
            driftSignal:
              "Raise selector-drift warning if template families can no longer be resolved semantically.",
          },
        ],
      },
    ],
    notes: [
      "Persistence remains vendor-neutral even when the default adapter is Postmark-compatible.",
      "Delivery status and bounce posture are observability inputs only and never become workflow truth on their own.",
    ],
  };
}

function pushProviderRecipe(): ProviderRecipe {
  return {
    providerId: "device-messaging-control-plane",
    displayName: "Device Messaging Control Plane",
    providerMonogram: "PUSH",
    docsUrl: "https://firebase.google.com/docs/cloud-messaging",
    flows: [
      {
        flowId: "device-messaging-project-and-key-bootstrap",
        label: "Device messaging project and key bootstrap",
        description:
          "Create or adopt the FCM-compatible device messaging project, APNs binding, and safe key lineage required for native macOS operator notifications.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "DESKTOP_APP_VIA_SERVER",
          "MACHINE_TO_MACHINE",
        ],
        selectorManifestId: "firebase-compatible-device-messaging-control-plane",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["HUMAN_REVIEW", "POLICY_CONFIRMATION"],
      },
    ],
    selectorManifests: [
      {
        manifestId: "firebase-compatible-device-messaging-control-plane",
        providerId: "device-messaging-control-plane",
        flowId: "device-messaging-project-and-key-bootstrap",
        selectors: [
          {
            selectorId: "workspace-heading",
            description: "Primary heading for the device messaging control plane",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Device messaging control plane",
          },
          {
            selectorId: "project-action",
            description: "Create or adopt messaging project action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Create or adopt messaging project",
          },
          {
            selectorId: "credentials-heading",
            description: "Credentials section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Credentials",
          },
          {
            selectorId: "credential-action",
            description: "Bind APNs and vault-safe credentials action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Bind APNs and vault-safe credentials",
          },
          {
            selectorId: "channels-heading",
            description: "Channel catalog section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Channel catalog",
          },
          {
            selectorId: "channel-action",
            description: "Validate channel catalog action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate channel catalog",
          },
          {
            selectorId: "continuity-heading",
            description: "Continuity matrix section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Continuity matrix",
          },
          {
            selectorId: "continuity-action",
            description: "Validate continuity targets action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate continuity targets",
          },
          {
            selectorId: "project-row-fallback",
            description: "Structured push-project row fallback when semantic labels drift",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='push-project-row']",
            justification:
              "Used only when structured project rows still exist but semantic project labels drift enough that direct semantic lookup is unsafe.",
            driftSignal:
              "Raise selector-drift warning if device messaging project rows can no longer be resolved semantically.",
          },
        ],
      },
    ],
    notes: [
      "Push transport remains embodiment-conditional rather than universal.",
      "Customer-visible notifications stay browser and email scoped; the active remote delivery path is native macOS internal-only.",
    ],
  };
}

function monitoringProviderRecipe(): ProviderRecipe {
  return {
    providerId: "runtime-error-monitoring-control-plane",
    displayName: "Error Monitoring Control Plane",
    providerMonogram: "MON",
    docsUrl: "https://docs.sentry.io/api/",
    flows: [
      {
        flowId: "error-monitoring-workspace-bootstrap",
        label: "Error monitoring workspace bootstrap",
        description:
          "Create or adopt the Sentry-compatible monitoring workspace, environment-scoped projects, and vault-safe ingest-token lineage required for governed runtime diagnostics.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "DESKTOP_APP_VIA_SERVER",
          "MACHINE_TO_MACHINE",
        ],
        selectorManifestId: "sentry-compatible-monitoring-control-plane",
        requiresLiveProviderGate: true,
        manualCheckpointReasons: ["HUMAN_REVIEW", "POLICY_CONFIRMATION"],
      },
    ],
    selectorManifests: [
      {
        manifestId: "sentry-compatible-monitoring-control-plane",
        providerId: "runtime-error-monitoring-control-plane",
        flowId: "error-monitoring-workspace-bootstrap",
        selectors: [
          {
            selectorId: "workspace-heading",
            description: "Primary heading for the monitoring control plane",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Error monitoring control plane",
          },
          {
            selectorId: "workspace-action",
            description: "Create or adopt monitoring workspace action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Create or adopt monitoring workspace",
          },
          {
            selectorId: "projects-heading",
            description: "Projects section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Projects",
          },
          {
            selectorId: "project-action",
            description: "Create or adopt projects and token refs action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Create or adopt projects and token refs",
          },
          {
            selectorId: "scrubbing-heading",
            description: "Scrubbing section heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Scrubbing",
          },
          {
            selectorId: "scrubbing-action",
            description: "Validate scrubbing and inbound filters action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate scrubbing and inbound filters",
          },
          {
            selectorId: "alerts-heading",
            description: "Alerts and release mapping heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Alerts and release mapping",
          },
          {
            selectorId: "alerts-action",
            description: "Validate alerts and release mapping action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate alerts and release mapping",
          },
          {
            selectorId: "project-row-fallback",
            description: "Structured monitoring-project row fallback when semantic labels drift",
            strategy: "CSS_FALLBACK",
            value: "[data-testid='monitoring-project-row']",
            justification:
              "Used only when structured monitoring project rows still exist but semantic labels drift enough that direct lookup is unsafe.",
            driftSignal:
              "Raise selector-drift warning if monitoring project rows can no longer be resolved semantically.",
          },
        ],
      },
    ],
    notes: [
      "Monitoring remains an optional overlay and never substitutes for first-party audit, privacy, or release evidence.",
      "Vendor persistence remains vault-ref and alias only; raw DSNs, auth tokens, and sensitive payloads stay outside repo artifacts.",
    ],
  };
}

function ocrProviderRecipe(): ProviderRecipe {
  return {
    providerId: "document-extraction-control-plane",
    displayName: "Document Extraction Control Plane",
    providerMonogram: "OCR",
    docsUrl: "docs/provisioning/document_extraction_bootstrap_runbook.md",
    flows: [
      {
        flowId: "managed-document-extraction-project-selection",
        label: "Document extraction selection and readiness",
        description:
          "Record the OCR/document-extraction option matrix, self-host decision posture, profile catalog, and candidate-fact boundary without silently selecting a managed provider.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "MACHINE_TO_MACHINE",
        ],
        selectorManifestId: "document-extraction-selection-control-plane",
        requiresLiveProviderGate: false,
        manualCheckpointReasons: [
          "POLICY_CONFIRMATION",
          "LEGAL_APPROVAL",
          "HUMAN_REVIEW",
        ],
      },
    ],
    selectorManifests: [
      {
        manifestId: "document-extraction-selection-control-plane",
        providerId: "document-extraction-control-plane",
        flowId: "managed-document-extraction-project-selection",
        selectors: [
          {
            selectorId: "decision-heading",
            description: "Primary heading for document extraction selection",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Document extraction decision",
          },
          {
            selectorId: "selection-action",
            description: "Selection recording action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Record self-host decision",
          },
          {
            selectorId: "profiles-heading",
            description: "Document profile heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Supported document profiles",
          },
          {
            selectorId: "profiles-action",
            description: "Profile validation action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate document profiles",
          },
          {
            selectorId: "thresholds-heading",
            description: "Threshold policy heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Review threshold policy",
          },
          {
            selectorId: "thresholds-action",
            description: "Threshold validation action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate review thresholds",
          },
          {
            selectorId: "boundary-heading",
            description: "Candidate-fact boundary heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Candidate-fact boundary",
          },
          {
            selectorId: "boundary-action",
            description: "Candidate-fact boundary action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate candidate-fact boundary",
          },
          {
            selectorId: "lineage-heading",
            description: "Lineage and retention heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Lineage and retention",
          },
        ],
      },
    ],
    notes: [
      "OCR remains broader-product infrastructure and must never collapse provider output into canonical truth.",
      "The current posture records a self-host decision requirement explicitly instead of silently selecting a managed cloud provider.",
    ],
  };
}

function malwareProviderRecipe(): ProviderRecipe {
  return {
    providerId: "upload-intake-safety-control-plane",
    displayName: "Upload Intake Safety Control Plane",
    providerMonogram: "SCAN",
    docsUrl: "docs/provisioning/malware_scanning_and_quarantine_runbook.md",
    flows: [
      {
        flowId: "managed-malware-scanning-selection",
        label: "Malware scanning selection and quarantine policy",
        description:
          "Record the mandatory malware-scanning option matrix, scan-result taxonomy, quarantine lifecycle, and release-evidence rules without silently choosing a managed provider.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: [
          "WEB_APP_VIA_SERVER",
          "MACHINE_TO_MACHINE",
        ],
        selectorManifestId: "upload-intake-safety-selection-control-plane",
        requiresLiveProviderGate: false,
        manualCheckpointReasons: [
          "POLICY_CONFIRMATION",
          "LEGAL_APPROVAL",
          "HUMAN_REVIEW",
        ],
      },
    ],
    selectorManifests: [
      {
        manifestId: "upload-intake-safety-selection-control-plane",
        providerId: "upload-intake-safety-control-plane",
        flowId: "managed-malware-scanning-selection",
        selectors: [
          {
            selectorId: "decision-heading",
            description: "Primary heading for upload-intake safety selection",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Upload intake safety decision",
          },
          {
            selectorId: "selection-action",
            description: "Selection recording action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Record self-host decision",
          },
          {
            selectorId: "outcome-mapping-heading",
            description: "Outcome mapping heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Outcome mapping",
          },
          {
            selectorId: "outcome-mapping-action",
            description: "Outcome mapping validation action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate outcome mapping",
          },
          {
            selectorId: "coverage-heading",
            description: "Coverage and rescan policy heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Coverage and rescan policy",
          },
          {
            selectorId: "coverage-action",
            description: "Coverage policy validation action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate coverage and rescan policy",
          },
          {
            selectorId: "quarantine-heading",
            description: "Quarantine lifecycle heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Quarantine lifecycle",
          },
          {
            selectorId: "quarantine-action",
            description: "Quarantine lifecycle validation action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate quarantine lifecycle",
          },
          {
            selectorId: "release-heading",
            description: "Release evidence heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Release authority and evidence",
          },
        ],
      },
    ],
    notes: [
      "Malware scanning is mandatory for governed uploads even while the platform/runtime decision remains unresolved.",
      "The current posture freezes the option matrix, quarantine topology, and release evidence rules without silently selecting a cloud vendor.",
    ],
  };
}

function supportProviderRecipe(): ProviderRecipe {
  return {
    providerId: "support-operations-control-plane",
    displayName: "Support Integration Control Plane",
    providerMonogram: "SUP",
    docsUrl: "https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/",
    flows: [
      {
        flowId: "support-workspace-selection",
        label: "Support workspace selection and mapping",
        description:
          "Record the current support integration decision, contextual help mapping, and bounded webhook posture without treating external support as product truth.",
        allowedEnvironmentRefs: [
          "env_local_provisioning_workstation",
          "env_shared_sandbox_integration",
          "env_preproduction_verification",
          "env_production",
        ],
        supportedConnectionMethods: ["WEB_APP_VIA_SERVER"],
        selectorManifestId: "support-integration-selection-control-plane",
        requiresLiveProviderGate: false,
        manualCheckpointReasons: [
          "POLICY_CONFIRMATION",
          "LEGAL_APPROVAL",
          "HUMAN_REVIEW",
        ],
      },
    ],
    selectorManifests: [
      {
        manifestId: "support-integration-selection-control-plane",
        providerId: "support-operations-control-plane",
        flowId: "support-workspace-selection",
        selectors: [
          {
            selectorId: "decision-heading",
            description: "Primary heading for support-integration selection",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Support integration decision",
          },
          {
            selectorId: "selection-action",
            description: "Selection recording action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Record support selection",
          },
          {
            selectorId: "channel-policy-heading",
            description: "Support channel policy heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Support channel policy",
          },
          {
            selectorId: "channel-policy-action",
            description: "Support channel policy action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate support channel policy",
          },
          {
            selectorId: "context-mapping-heading",
            description: "Context mapping heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Context mapping",
          },
          {
            selectorId: "context-mapping-action",
            description: "Context mapping action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate contextual help mapping",
          },
          {
            selectorId: "mirror-rules-heading",
            description: "Mirror rules heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "Mirror rules",
          },
          {
            selectorId: "mirror-rules-action",
            description: "Mirror rules action",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Validate mirror rules",
          },
        ],
      },
    ],
    notes: [
      "External support remains optional and must never become the source of help or workflow truth.",
      "Contextual help, general help, and product-owned acknowledgement stay distinct even if a vendor is selected later.",
    ],
  };
}

function fixtureProviderRecipe(): ProviderRecipe {
  return {
    providerId: "fixture-sandbox-console",
    displayName: "Fixture Sandbox Console",
    providerMonogram: "FX",
    docsUrl: "tests/fixtures/mock_provider_portal.html",
    flows: [
      {
        flowId: "fixture-existing-resource-check",
        label: "Fixture existing resource check",
        description:
          "Synthetic flow used by smoke tests to prove selector ranking, evidence capture, and checkpoint persistence.",
        allowedEnvironmentRefs: ["env_local_provisioning_workstation"],
        supportedConnectionMethods: ["WEB_APP_VIA_SERVER"],
        selectorManifestId: "fixture-existing-resource-check",
        requiresLiveProviderGate: false,
        manualCheckpointReasons: ["MFA"],
      },
    ],
    selectorManifests: [
      {
        manifestId: "fixture-existing-resource-check",
        providerId: "fixture-sandbox-console",
        flowId: "fixture-existing-resource-check",
        selectors: [
          {
            selectorId: "fixture-heading",
            description: "Fixture page heading",
            strategy: "ROLE",
            value: "heading",
            accessibleName: "HMRC Developer Hub Sandbox",
          },
          {
            selectorId: "existing-resource-button",
            description: "Check for existing resource button",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Check for existing sandbox application",
          },
          {
            selectorId: "checkpoint-button",
            description: "Pause for checkpoint button",
            strategy: "ROLE",
            value: "button",
            accessibleName: "Pause for MFA review",
          },
        ],
      },
    ],
    notes: ["Used only by the local smoke suite."],
  };
}

export function createDefaultProviderRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(hmrcProviderRecipe());
  registry.register(idpProviderRecipe());
  registry.register(emailProviderRecipe());
  registry.register(monitoringProviderRecipe());
  registry.register(ocrProviderRecipe());
  registry.register(malwareProviderRecipe());
  registry.register(pushProviderRecipe());
  registry.register(supportProviderRecipe());
  registry.register(fixtureProviderRecipe());
  return registry;
}

export function assertProviderFlowAllowed(
  context: RunContext,
  provider: ProviderRecipe,
  flowId: string,
): void {
  const flow = provider.flows.find((candidate) => candidate.flowId === flowId);
  if (!flow) {
    throw new Error(`Provider ${provider.providerId} does not expose flow ${flowId}`);
  }
  if (!flow.allowedEnvironmentRefs.includes(context.productEnvironmentId)) {
    throw new Error(
      `Flow ${flowId} is not allowed in environment ${context.productEnvironmentId}`,
    );
  }
  if (flow.requiresLiveProviderGate) {
    assertLiveProviderGate(context);
  }
}

export function summarizeSelectorRisk(provider: ProviderRecipe): Record<string, number> {
  return Object.fromEntries(
    provider.selectorManifests.map((manifest) => [
      manifest.manifestId,
      detectBrittleFallbacks(manifest.selectors).length,
    ]),
  );
}
