export type ProfileResponse = {
    allSegmentIds: string[];
    hasMore?: boolean;
    next?: string;
};

export type AllSegmentIdsResponse = {
    allSegmentIds: string[];
    hasMore?: boolean;
    next?: string;
};

export interface SegmentUserTraits {
    name?: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    email?: string;
    description?: string;
    address?: {
        city?: string;
        state?: string;
        postalCode?: string;
        postal_code?: string;
        street?: string;
        line_1?: string;
        country?: string;
    };
    city?: string;
    state?: string;
    postalCode?: string;
    postal_code?: string;
    street?: string;
    line_1?: string;
    country?: string;
    phone?: string;
    birthdate?: string;
    metadata?: object;
}

export interface Address {
    city?: string;
    state?: string;
    postal_code?: string;
    line_1?: string;
    country?: string;
}

export interface VoucherifyCustomer {
    name?: string | undefined;
    source_id: string;
    email?: string | undefined;
    description?: string | undefined;
    address?: Address;
    phone?: string | undefined;
    birthdate?: string | null;
    metadata?: object;
    system_metadata?: object;
}


