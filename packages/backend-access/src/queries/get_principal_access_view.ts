import type {
  QueryPrincipalAccessViewInput,
  QueryPrincipalAccessViewResult,
} from "../services/principal_access_view_query_service.ts";
import { PrincipalAccessViewQueryService } from "../services/principal_access_view_query_service.ts";

export async function getPrincipalAccessView(
  service: PrincipalAccessViewQueryService,
  input: QueryPrincipalAccessViewInput,
): Promise<QueryPrincipalAccessViewResult> {
  return service.getView(input);
}
