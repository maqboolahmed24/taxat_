import type { SchemaBundleRecord } from "../models/schema_bundle.ts";
import { normalizeSchemaBundleRecord } from "../models/schema_bundle.ts";
import type { SchemaBundleRepository } from "../repositories/schema_bundle_repository.ts";
import type { SchemaMigrationLedgerRepository } from "../repositories/schema_migration_ledger_repository.ts";

export type LoadedSchemaBundleContext = {
  schema_bundle: SchemaBundleRecord;
  schema_reader_window_contract: SchemaBundleRecord["schema_reader_window_contract"];
  migration_ledgers: Awaited<
    ReturnType<SchemaMigrationLedgerRepository["listLedgersByTargetBundleHash"]>
  >;
};

export class SchemaBundleLoader {
  private readonly schemaBundleRepository: SchemaBundleRepository;
  private readonly schemaMigrationLedgerRepository: SchemaMigrationLedgerRepository | undefined;

  constructor(input: {
    schemaBundleRepository: SchemaBundleRepository;
    schemaMigrationLedgerRepository?: SchemaMigrationLedgerRepository;
  }) {
    this.schemaBundleRepository = input.schemaBundleRepository;
    this.schemaMigrationLedgerRepository = input.schemaMigrationLedgerRepository;
  }

  async requireBundleContext(schemaBundleHash: string): Promise<LoadedSchemaBundleContext> {
    const stored = await this.schemaBundleRepository.requireBundleByHash(schemaBundleHash);
    const schemaBundle = normalizeSchemaBundleRecord(stored.schema_bundle);
    return {
      schema_bundle: schemaBundle,
      schema_reader_window_contract: schemaBundle.schema_reader_window_contract,
      migration_ledgers:
        (await this.schemaMigrationLedgerRepository?.listLedgersByTargetBundleHash(
          schemaBundleHash,
        )) ?? [],
    };
  }
}
