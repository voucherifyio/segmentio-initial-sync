export type SegmentUserTraits = {
  [key: string]: string;
};

export type VoucherifyCustomer =
  | SegmentUserTraits
  | {
      source_id?: string;
    };

export type ProfileAPIResponse = {
  allSegmentIds: string[];
  hasMore: boolean;
  next?: string;
};

export type AllSegmentIdsResponse = {
  allSegmentIds: string[];
  hasMore: boolean;
  next: string;
};
