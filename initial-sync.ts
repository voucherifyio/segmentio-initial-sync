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
    SegmentUserTraits,
    VoucherifyCustomer,
    AllSegmentIdsResponse
} from "./types";

const baseUrl: string = `https://profiles.segment.com/v1/spaces/${SEGMENT_SPACE_ID}/collections/users/profiles`;
const headers: { [key: string]: string } = {
    Authorization: `Basic ${AUTH_TOKEN}`,
    "Accept-Encoding": "zlib",
};

const getAllSegmentIds = async (limit: number, next: string): Promise<AllSegmentIdsResponse> => {
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
            offset: response.data.cursor.next,
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

const getAllUserTraitsFromSegment = async (segmentId: string): Promise<SegmentUserTraits | null> => {
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

const getUserSourceIdFromSegment = async (segmentId: string): Promise<string | null> => {
    try {
        const response = await axios.get(
            `${baseUrl}/segment_id:${segmentId}/external_ids`,
            {
                headers,
            }
        );
        const userWithExternalIds = response?.data?.data;

        const sourceId = userWithExternalIds.find(
            (userIdentifier: { type: string; id: string }) =>
                userIdentifier.type === "user_id" ||
                userIdentifier.type === "anonymous_id"
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

const upsertCustomersInVoucherify = async (voucherifyCustomers: VoucherifyCustomer[]) => {
    const voucherifyUrl = `https://api.voucherify.io/v1/customers/bulk/async`;
    console.log(voucherifyCustomers)
    try {
        const res  = await axios.post(voucherifyUrl, voucherifyCustomers, {
            headers: {
                "Content-Type": "application/json",
                "X-App-Id": VOUCHERIFY_APPLICATION_ID,
                "X-App-Token": VOUCHERIFY_SECRET_KEY,
            },
        });
        console.log("rees")
        console.log(res)
    } catch (error) {
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occured while upserting customers to Voucherify."
        );
    }
}

const getTraitsForSegmentId = async (segmentId: string): Promise<SegmentUserTraits> => {
    const userTraits: SegmentUserTraits | null = await getAllUserTraitsFromSegment(segmentId);
    if (!userTraits) {
        throw new Error(
            `User's traits from Segment.io are missing. [segment_id: ${segmentId}]`
        );
    }

    return userTraits;
}

const getSourceIdForSegmentId = async (segmentId: string): Promise<string> => {
    const sourceId: string | null = await getUserSourceIdFromSegment(segmentId);
    if (!sourceId) {
        throw new Error(
            `User's id from Segment.io is missing. [segment_id: ${segmentId}]`
        );
    }
    return sourceId;
}

const runImport = async () => {
    try {
        let next = "0";
        while (next) {
            const {allSegmentIds, offset} = await getAllSegmentIds(6, next);
            const segmentResponseForSingleChunk: Promise<VoucherifyCustomer>[] = allSegmentIds.map(async segmentId => {
                const traits = await getTraitsForSegmentId(segmentId);
                const sourceId = await getSourceIdForSegmentId(segmentId);
                return mapSegmentResponseIntoVoucherifyRequest(traits, sourceId);
            })
            const voucherifyCustomer = await Promise.all(segmentResponseForSingleChunk);
            await upsertCustomersInVoucherify(voucherifyCustomer);
            next = offset;
        }
        console.log(`Upserting all Voucherify customers completed.`);
    } catch (error) {
        console.log(error);
    }
}

const mapSegmentResponseIntoVoucherifyRequest = (userTraits: SegmentUserTraits, sourceId: string): VoucherifyCustomer => {
    return {
        name: userTraits?.name ?? ([userTraits?.firstName ?? userTraits?.first_name, userTraits?.lastName ?? userTraits?.last_name].filter(i => i).join(" ") || null),
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
    }
}

runImport();