import {
  buildAuthorityResponseEnvelope as buildAuthorityResponseEnvelopeModel,
  type AuthorityResponseEnvelope,
  type AuthorityResponseEnvelopeBuildInput,
} from "../models/authority_response_envelope.ts";
import { AuthorityResponseEnvelopeRepository } from "../repositories/authority_response_envelope_repository.ts";
import { validateAuthorityTransportLineage } from "./validate_authority_transport_lineage.ts";

export type BuildAuthorityResponseEnvelopeInput = AuthorityResponseEnvelopeBuildInput & {
  repository?: AuthorityResponseEnvelopeRepository;
};

export async function materializeAuthorityResponseEnvelope(input: BuildAuthorityResponseEnvelopeInput): Promise<{
  repository: AuthorityResponseEnvelopeRepository;
  response: AuthorityResponseEnvelope;
  stored: Awaited<ReturnType<AuthorityResponseEnvelopeRepository["persistAuthorityResponseEnvelope"]>>;
}> {
  const repository = input.repository ?? new AuthorityResponseEnvelopeRepository();
  const response = buildAuthorityResponseEnvelopeModel(input);
  if (input.request !== undefined) {
    validateAuthorityTransportLineage({ request_envelope: input.request, response_envelope: response });
  }
  const stored = await repository.persistAuthorityResponseEnvelope({ response });
  return { repository, response, stored };
}
