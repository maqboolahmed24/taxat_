import { cloneRecord, stableEqual, TwinModelError } from "../models/twin_common.ts";
import {
  cloneTwinTimelineRecord,
  normalizeTwinTimelineRecord,
  twinTimelineRef,
  type TwinTimelineRecord,
} from "../models/twin_timeline.ts";
import {
  cloneTwinViewRecord,
  normalizeTwinViewRecord,
  twinViewRef,
  type TwinViewRecord,
} from "../models/twin_view.ts";

export type StoredTwinTimelineRecord = {
  record: TwinTimelineRecord;
  timeline_ref: string;
  timeline_row_version: 1;
  twin_id: string;
  twin_timeline_id: string;
};

export type StoredTwinViewRecord = {
  lifecycle_state: string;
  manifest_id: string;
  record: TwinViewRecord;
  twin_id: string;
  twin_ref: string;
  twin_row_version: 1;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class TwinViewRepository {
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly timelineIdsByTwin = new Map<string, string[]>();
  private readonly timelines = new Map<string, StoredTwinTimelineRecord>();
  private readonly views = new Map<string, StoredTwinViewRecord>();

  private rebuildIndexes() {
    this.idsByManifest.clear();
    this.timelineIdsByTwin.clear();
    for (const stored of this.views.values()) {
      pushIndex(this.idsByManifest, stored.manifest_id, stored.twin_id);
    }
    for (const stored of this.timelines.values()) {
      pushIndex(this.timelineIdsByTwin, stored.twin_id, stored.twin_timeline_id);
    }
  }

  async persistTwinTimeline(input: { timeline: TwinTimelineRecord }) {
    const timeline = normalizeTwinTimelineRecord(input.timeline);
    const stored: StoredTwinTimelineRecord = {
      record: cloneTwinTimelineRecord(timeline),
      timeline_ref: twinTimelineRef(timeline),
      timeline_row_version: 1,
      twin_id: timeline.twin_id,
      twin_timeline_id: timeline.twin_timeline_id,
    };
    const existing = this.timelines.get(stored.twin_timeline_id);
    if (existing) {
      if (!stableEqual(existing.record, timeline)) {
        throw new TwinModelError(
          "TWIN_REPOSITORY_INVALID",
          `timeline ${stored.twin_timeline_id} already exists with a different payload`,
        );
      }
      return cloneRecord(existing);
    }
    this.timelines.set(stored.twin_timeline_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async persistTwinView(input: { view: TwinViewRecord }) {
    const view = normalizeTwinViewRecord(input.view);
    const stored: StoredTwinViewRecord = {
      lifecycle_state: view.lifecycle_state,
      manifest_id: view.manifest_id,
      record: cloneTwinViewRecord(view),
      twin_id: view.twin_id,
      twin_ref: twinViewRef(view),
      twin_row_version: 1,
    };
    const existing = this.views.get(stored.twin_id);
    if (existing) {
      if (!stableEqual(existing.record, view)) {
        throw new TwinModelError(
          "TWIN_REPOSITORY_INVALID",
          `twin view ${stored.twin_id} already exists with a different payload`,
        );
      }
      return cloneRecord(existing);
    }
    this.views.set(stored.twin_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async getTwinViewById(twinId: string) {
    const stored = this.views.get(twinId);
    return stored ? cloneRecord(stored) : null;
  }

  async getTwinTimelineById(timelineId: string) {
    const stored = this.timelines.get(timelineId);
    return stored ? cloneRecord(stored) : null;
  }

  async listTwinViewsByManifestId(manifestId: string) {
    return (this.idsByManifest.get(manifestId) ?? [])
      .map((id) => this.views.get(id))
      .filter((record): record is StoredTwinViewRecord => record !== undefined)
      .sort((left, right) => left.twin_id.localeCompare(right.twin_id))
      .map((record) => cloneRecord(record));
  }

  async listTwinTimelinesByTwinId(twinId: string) {
    return (this.timelineIdsByTwin.get(twinId) ?? [])
      .map((id) => this.timelines.get(id))
      .filter((record): record is StoredTwinTimelineRecord => record !== undefined)
      .sort((left, right) => left.twin_timeline_id.localeCompare(right.twin_timeline_id))
      .map((record) => cloneRecord(record));
  }
}
