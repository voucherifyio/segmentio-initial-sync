import axios from "axios";
import {
    VOUCHERIFY_APPLICATION_ID,
    VOUCHERIFY_SECRET_KEY,
    SEGMENT_SPACE_ID,
    SEGMENT_REQUEST_LIMIT,
    SEGMENT_TRAITS_LIMIT,
    AUTH_TOKEN,
} from "./config";
import {
    ProfileResponse,
    SegmentUserTraits,
    VoucherifyCustomer,
    AllSegmentIdsResponse,
    SourceId,
} from "./types";

const baseUrl: string = `https://profiles.segment.com/v1/spaces/${SEGMENT_SPACE_ID}/collections/users/profiles`;
const headers: { [key: string]: string } = {
    Authorization: `Basic ${AUTH_TOKEN}`,
    "Accept-Encoding": "zlib",
};

async function migrateCustomersFromSegmentToVoucherify(
    limit: number = SEGMENT_REQUEST_LIMIT,
    nextPage: string = "0"
): Promise<void> {
    try {
        // Get all Segment Profiles, hasMore and next property
        const {allSegmentIds, hasMore, next}: ProfileResponse =
            await getAllSegmentIds(limit, nextPage);

        // Create Voucherify customers
        const voucherifyCustomers = await Promise.all(
            allSegmentIds.map(async (id: string) => {
                const userTraits: SegmentUserTraits | null =
                    await getAllUsersTraitsFromSegment(id);
                if (!userTraits) {
                    throw new Error(
                        `User's traits from Segment.io are missing. [segment_id: ${id}]`
                    );
                }
                const sourceId: SourceId | null = await getSourceIdFromSegment(id);
                if (!sourceId) {
                    throw new Error(
                        `User's id from Segment.io is missing. [segment_id: ${id}]`
                    );
                }
                return {
                    name: userTraits?.name ?? ([userTraits?.firstName ?? userTraits?.first_name, userTraits?.lastName ?? userTraits?.last_name,].filter(i => i).join(" ") || null),
                    source_id: sourceId,
                    email: userTraits?.email ?? null,
                    description: userTraits?.description ?? null,
                    address: userTraits?.address
                        ? {
                            city: userTraits.address?.city ?? null,
                            state: userTraits.address?.state ?? null,
                            postal_code: userTraits.address?.postalCode ?? userTraits.address?.postal_code ?? null,
                            line_1: userTraits.address?.street ?? userTraits.address?.line_1 ?? null,
                            country: userTraits.address?.country ?? null,
                        }
                        : {
                            city: userTraits?.city ?? null,
                            state: userTraits?.state ?? null,
                            postal_code: userTraits?.postalCode ?? userTraits?.postal_code ?? null,
                            line_1: userTraits?.street ?? userTraits.line_1 ?? null,
                            country: userTraits?.country ?? null,
                        },
                    phone: userTraits?.phone ?? null,
                    birthdate: (userTraits?.birthdate?.includes("T") ? userTraits?.birthdate.split("T")[0] : userTraits?.birthdate) ?? null,
                    metadata: userTraits?.metadata ?? null,
                    system_metadata: {source: "segmentio"},
                };
            })
        );
        // Upsert Voucherify customers
        await upsertCustomersInVoucherify(voucherifyCustomers);

        // Repeat until there are no users left to send
        if (hasMore && next) {
            await migrateCustomersFromSegmentToVoucherify(limit, next);
        }
    } catch (error) {
        throw error;
    }
}

async function getAllSegmentIds(
    limit: number,
    next: string
): Promise<AllSegmentIdsResponse> {
    try {
        const response = await axios.get(`${baseUrl}?limit=${limit}&next=${next}`, {
            headers,
        });
        if (!response.data.data) {
            throw new Error("The response object doesn't contain required data.");
        }

        const allSegmentIds: string[] = response.data.data.map(
            (segmentProfile: { segment_id: string }) => segmentProfile.segment_id
        );

        return {
            allSegmentIds,
            hasMore: response.data.cursor.has_more,
            next: response.data.cursor.next,
        };
    } catch (error) {
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occurred while getting user profiles from Segment.io."
        );
    }
}

async function getAllUsersTraitsFromSegment(
    segmentId: string
): Promise<SegmentUserTraits | null> {
    try {
        const response = await axios.get(
            `${baseUrl}/segment_id:${segmentId}/traits`,
            {
                headers,
                params: {
                    limit: SEGMENT_TRAITS_LIMIT,
                },
            }
        );
        return response.data?.traits ?? null;
    } catch (error) {
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occurred while getting users' traits from Segment.io."
        );
    }
}

async function getSourceIdFromSegment(
    segmentId: string
): Promise<SourceId | null> {
    try {
        const response = await axios.get(
            `${baseUrl}/segment_id:${segmentId}/external_ids`,
            {
                headers,
            }
        );
        const userWithExternalIds = response?.data?.data;

        //TODO return email
        const sourceId = userWithExternalIds.find(
            (userIdentificator: { type: string; id: string }) =>
                userIdentificator.type === "user_id" ||
                userIdentificator.type === "anonymous_id"
        ).id;
        return sourceId ?? null;
    } catch (error) {
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occurred while getting users' ids from Segment.io."
        );
    }
}

async function upsertCustomersInVoucherify(
    voucherifyCustomers: VoucherifyCustomer[]
): Promise<void> {
    const voucherifyUrl = `https://api.voucherify.io/v1/customers/bulk/async`;

    try {
        const {status} = await axios.post(voucherifyUrl, voucherifyCustomers, {
            headers: {
                "Content-Type": "application/json",
                "X-App-Id": VOUCHERIFY_APPLICATION_ID,
                "X-App-Token": VOUCHERIFY_SECRET_KEY,
            },
        });
        if (status === 202) {
            console.log(`Upserting Voucherify customers completed.`);
        }
    } catch (error) {
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occured while upserting customers to Voucherify."
        );
    }
}

migrateCustomersFromSegmentToVoucherify();
