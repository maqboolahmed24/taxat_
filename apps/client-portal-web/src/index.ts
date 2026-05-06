export const clientPortalWebBootstrap = {
  workspace: "apps/client-portal-web",
  note: "Portal-specific composition stays separate from operator web even when both consume shared web-platform primitives.",
} as const;

export { clientPortalWebRoot } from "./app/root";
export { clientPortalHomeRoute } from "./routes/home/index";
