import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";

export function canonicalForecastProfileHash(profile: unknown) {
  return `forecast-profile-hash://${stableJsonHash(profile)}`;
}

export function deriveForecastSeed(input: {
  deterministic_seed: string;
  forecast_profile: unknown;
  scenario_id: string;
}) {
  const forecastProfileHash = canonicalForecastProfileHash(input.forecast_profile);
  return `forecast-seed://${stableJsonHash({
    deterministic_seed: input.deterministic_seed,
    forecast_profile_hash: forecastProfileHash,
    scenario_id: input.scenario_id,
  })}`;
}

export function forecastSeedRef(seed: string) {
  return `forecast-seed-ref://${seed.replace(/^forecast-seed:\/\//, "")}`;
}
