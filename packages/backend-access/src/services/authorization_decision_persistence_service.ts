import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import type {
  PrincipalContextRepository,
  StoredAuthorizationDecisionRecord,
} from "../repositories/principal_context_repository.ts";

export class AuthorizationDecisionPersistenceService {
  constructor(
    private readonly dependencies: {
      principalContextRepository: PrincipalContextRepository;
    },
  ) {}

  async persist(input: {
    authorization_decision: AuthorizationDecisionRecord;
    principal_context: PrincipalContextRecord;
  }): Promise<StoredAuthorizationDecisionRecord> {
    return this.dependencies.principalContextRepository.storeAuthorizationDecision(input);
  }
}
