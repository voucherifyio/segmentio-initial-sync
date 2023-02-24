export type SegmentUserTraits = {
  [key: string]: string;
};

export type SourceId = {
  source_id: string;
};

export type VoucherifyCustomer =
  | SegmentUserTraits
  | {
      source_id?: SourceId;
    };

export type ProfileResponse = {
  allSegmentIds: string[];
  hasMore: boolean;
  next?: string;
};

export type AllSegmentIdsResponse = {
  allSegmentIds: string[];
  hasMore: boolean;
  next: string;
};
