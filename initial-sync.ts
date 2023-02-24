import axios from "axios";
import {
  APPLICATION_ID,
  SECRET_KEY,
  SEGMENT_ACCESS_TOKEN,
  SPACE_ID,
  REQUEST_LIMIT,
  TRAITS_LIMIT,
} from "./config";
import {
  ProfileAPIResponse,
  SegmentUserTraits,
  VoucherifyCustomer,
  AllSegmentIdsResponse,
} from "./types";

const AUTH_TOKEN = Buffer.from(`${SEGMENT_ACCESS_TOKEN}:`).toString("base64");

const baseUrl: string = `https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles`;
const headers = {
  Authorization: `Basic ${AUTH_TOKEN}`,
  "Accept-Encoding": "zlib",
};

async function runMigrationOfCustomers() {
  let hasMore: boolean = true;
  let next: string | undefined = "0";

  while (hasMore) {
    console.log(
      `Migrating customers. Limit: ${REQUEST_LIMIT}, Has more: ${hasMore}`
    );
    const response: ProfileAPIResponse =
      await migrateCustomersFromSegmentToVoucherify(REQUEST_LIMIT, next);
    hasMore = response.hasMore;
    next = response.next;
  }
  console.log("Migration completed.");
}

async function migrateCustomersFromSegmentToVoucherify(
  limit: string,
  takeNext: string
) {
  try {
    // Get all Segment Profiles and hasMore and next property
    const { allSegmentIds, hasMore, next } = await getAllSegmentIds(
      limit,
      takeNext
    );

    // Create Voucherify customers
    const voucherifyCustomers = await Promise.all(
      allSegmentIds.map(async (id) => {
        const userTraitsFromSegment = await getAllUsersTraitsFromSegment(id);
        if (!userTraitsFromSegment) {
          throw new Error(
            `User's traits from Segment.io are missing [segment_id: ${id}]`
          );
        }
        const userIdsFromSegment = await getAllUsersIdsFromSegment(id);
        if (!userIdsFromSegment) {
          throw new Error(
            `User's id from Segment.io is missing. [segment_id: ${id}]`
          );
        }
        return { ...userTraitsFromSegment, source_id: userIdsFromSegment };
      })
    );
    // Upsert Voucherify customers
    const upsertResponseStatus = await upsertCustomersInVoucherify(
      voucherifyCustomers
    );
    if (upsertResponseStatus === 202) {
      console.log("Upserting Voucherify customers completed.");
    }
    return { hasMore, next };
  } catch (error) {
    throw error;
  }
}

async function getAllSegmentIds(
  limit: string,
  next: string
): Promise<AllSegmentIdsResponse> {
  try {
    const response = await axios.get(`${baseUrl}?limit=${limit}&next=${next}`, {
      headers,
    });
    if (!response.data.data) {
      throw new Error("The response object doesn't contain required data.");
    }

    const allSegmentIds = response.data.data.map(
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
  id: string
): Promise<SegmentUserTraits> {
  try {
    const response = await axios.get(`${baseUrl}/segment_id:${id}/traits`, {
      headers,
      params: {
        limit: TRAITS_LIMIT,
      },
    });
    return response.data?.traits;
  } catch (error) {
    if (error.response) {
      console.error(`${error.response.status}: ${error.response.statusText}`);
    }
    throw new Error(
      "An error occurred while getting users' traits from Segment.io."
    );
  }
}
async function getAllUsersIdsFromSegment(id: string): Promise<string> {
  try {
    const response = await axios.get(
      `${baseUrl}/segment_id:${id}/external_ids`,
      {
        headers,
      }
    );
    const userWithExternalIds = response.data.data;

    return userWithExternalIds.find(
      (userIdentificator: { type: string; id: string }) =>
        userIdentificator.type === "user_id"
    ).id;
  } catch (error) {
    if (error.response) {
      console.error(`${error.response.status}: ${error.response.statusText}`);
    }
    throw new Error(
      "An error occured while getting users' ids from Segment.io."
    );
  }
}

async function upsertCustomersInVoucherify(
  voucherifyCustomers: VoucherifyCustomer[]
) {
  const voucherifyUrl = `https://api.voucherify.io/v1/customers/bulk/async`;

  try {
    const { status } = await axios.post(voucherifyUrl, voucherifyCustomers, {
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": APPLICATION_ID,
        "X-App-Token": SECRET_KEY,
      },
    });
    return status;
  } catch (error) {
    if (error.response) {
      console.error(`${error.response.status}: ${error.response.statusText}`);
    }
    throw new Error(
      "An error occured while upserting customers to Voucherify."
    );
  }
}
runMigrationOfCustomers();
