import {
  halfLifeScore,
  hoursBetween,
  roundScore,
  sigmoid,
  type CollaborationRoutingBasis,
  type CollaborationRoutingProfile,
  type SlaPressureResult,
} from "../models/collaboration_routing_contract.ts";

export function computeSlaPressureScore(input: {
  basis: CollaborationRoutingBasis;
  evaluated_at: string;
  profile: CollaborationRoutingProfile;
}): SlaPressureResult {
  const agePressure = halfLifeScore(input.basis.item_age_hours, input.profile.item_age_half_life_hours);
  if (input.basis.effective_due_at_or_null === null) {
    const raw = 0.25 * agePressure;
    return {
      age_pressure: agePressure,
      breach_signal: 0,
      due_soon_signal: 0,
      reason_codes: ["WORK_SLA_UNBOUND"],
      remaining_hours: null,
      sla_pressure_raw: raw,
      sla_pressure_score: roundScore(100 * raw),
    };
  }

  const remainingHours = hoursBetween(input.evaluated_at, input.basis.effective_due_at_or_null);
  const dueSoonSignal = sigmoid(
    (input.profile.due_soon_window_hours - remainingHours) /
      Math.max(1, input.profile.due_soon_smoothing_hours),
  );
  const breachSignal =
    1 - Math.exp(-Math.max(0, -remainingHours) / Math.max(1, input.profile.breach_half_life_hours));
  const raw = Math.min(1, Math.max(0, 0.65 * dueSoonSignal + 0.35 * breachSignal));
  return {
    age_pressure: agePressure,
    breach_signal: breachSignal,
    due_soon_signal: dueSoonSignal,
    reason_codes: raw > 0.7 ? ["WORK_SLA_PRESSURE_HIGH"] : ["WORK_SLA_BOUND"],
    remaining_hours: remainingHours,
    sla_pressure_raw: raw,
    sla_pressure_score: roundScore(100 * raw),
  };
}
