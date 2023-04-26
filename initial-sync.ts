import axios from "axios";
import ProgressBar = require('progress');
import Bottleneck from 'bottleneck';
const limiter = new Bottleneck({
    minTime: 10
});

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

const getOnePageOfProfilesFromSegment = async (limit: number, next: string): Promise<AllSegmentIdsResponse> => {
    try {
        const response = await axios.get(`${baseUrl}?limit=${limit}&next=${next}`, {
            headers,
        });
        if (!response.data.data) {
            throw new Error("The response object doesn't contain required data.");
        }

        const onePageOfSegmentProfiles: string[] = response.data.data.map(
            (segmentProfile: { segment_id: string }) => segmentProfile.segment_id
        );

        return {
            onePageOfSegmentProfiles,
            hasMore: response.data.cursor.has_more,
            offset: response.data.cursor.next,
        };
    } catch (error) {
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occurred while getting users' profiles from Segment.io."
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
        console.error(error);
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occurred while getting user's traits from Segment.io."
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
                    userIdentifier.type === "user_id"
            )?.id;
            return sourceId ?? null;
       
    } catch (error) {
        console.error(error);
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occurred while getting user's ids from Segment.io."
        );
    }
}

const upsertCustomersInVoucherify = async (voucherifyCustomers: VoucherifyCustomer[]) => {
    const voucherifyUrl = `https://api.voucherify.io/v1/customers/bulk/async`;
    try {
        await axios.post(voucherifyUrl, voucherifyCustomers, {
            headers: {
                "Content-Type": "application/json",
                "X-App-Id": VOUCHERIFY_APPLICATION_ID,
                "X-App-Token": VOUCHERIFY_SECRET_KEY,
            },
        });
    } catch (error) {
        if (error.response) {
            console.error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(
            "An error occured while upserting customers to Voucherify."
        );
    }
}

const runImport = async (next: string, numberOfUpsertedCustomers: number) => {
    try {
        console.time("Overall script execution time")
        let errorcounter = 0;
        while (next) {
                if (errorcounter > 2) {
                    errorcounter = 0;
                    throw new Error("blad")
                }    
            console.info("Current offset: " + next);
            const {onePageOfSegmentProfiles, offset} = await limiter.schedule(() => getOnePageOfProfilesFromSegment(SEGMENT_REQUEST_LIMIT, next));
            console.log(`Downloaded ${onePageOfSegmentProfiles.length} Segment profiles...`)
            
            const progressBar = new ProgressBar(':bar :percent', {total: onePageOfSegmentProfiles.length});
            const segmentResponseForSingleChunk: Promise<VoucherifyCustomer>[] = onePageOfSegmentProfiles.map(async id => {
                const traits = await limiter.schedule(() => getAllUserTraitsFromSegment(id));
                const sourceId = await limiter.schedule(() => getUserSourceIdFromSegment(id));
                if (!sourceId) {
                    console.warn(`No user_id found for segment_id: ${id}. The source_id will be a null.`)
                }
                progressBar.tick();
                return mapSegmentResponseIntoVoucherifyRequest(traits, sourceId);
            })
            errorcounter++;
            console.info("Creating Voucherify customers' objects...")
            const voucherifyCustomers = await Promise.all(segmentResponseForSingleChunk);
            console.info(`Created ${voucherifyCustomers.length} Voucherify customers' objects.`)
            await upsertCustomersInVoucherify(voucherifyCustomers);
            console.info(`Upserted ${voucherifyCustomers.length} customers.`);
            numberOfUpsertedCustomers += voucherifyCustomers.length;
            console.info(`Total number of customers upserted so far: ${numberOfUpsertedCustomers}\n`)
            next = offset;
        }
        console.info(`Upserting of ${numberOfUpsertedCustomers} Voucherify customers completed.`);
        console.timeEnd("Overall script execution time")
    } catch (error) {
        console.error(error);
        console.error(`An error occured. Offset: ${next}`);
        console.info(`Trying to resume the process from the offset: ${next}\n`);

        try {
        runImport(next, numberOfUpsertedCustomers);
        } catch (error) {
            throw new Error("Cannot resume the execution. Please run the script again.")
        }
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

let numberOfUpsertedCustomers: number = 0;
let next: string = "0";
runImport(next, numberOfUpsertedCustomers);