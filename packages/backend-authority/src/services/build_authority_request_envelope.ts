import {
  buildAuthorityRequestEnvelope as buildAuthorityRequestEnvelopeModel,
  type AuthorityRequestEnvelope,
  type AuthorityRequestEnvelopeBuildInput,
} from "../models/authority_request_envelope.ts";
import { AuthorityRequestEnvelopeRepository } from "../repositories/authority_request_envelope_repository.ts";
import { validateAuthorityTransportLineage } from "./validate_authority_transport_lineage.ts";

export type BuildAuthorityRequestEnvelopeInput = AuthorityRequestEnvelopeBuildInput & {
  repository?: AuthorityRequestEnvelopeRepository;
};

export async function materializeAuthorityRequestEnvelope(input: BuildAuthorityRequestEnvelopeInput): Promise<{
  envelope: AuthorityRequestEnvelope;
  repository: AuthorityRequestEnvelopeRepository;
  stored: Awaited<ReturnType<AuthorityRequestEnvelopeRepository["persistAuthorityRequestEnvelope"]>>;
}> {
  const repository = input.repository ?? new AuthorityRequestEnvelopeRepository();
  const envelope = buildAuthorityRequestEnvelopeModel(input);
  if (input.operation !== undefined) {
    validateAuthorityTransportLineage({ operation: input.operation, request_envelope: envelope });
  }
  const stored = await repository.persistAuthorityRequestEnvelope({ envelope });
  return { envelope, repository, stored };
}
