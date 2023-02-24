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

const AUTH_TOKEN: string = Buffer.from(`${SEGMENT_ACCESS_TOKEN}:`).toString(
  "base64"
);

const baseUrl: string = `https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles`;
const headers: { [key: string]: string } = {
  Authorization: `Basic ${AUTH_TOKEN}`,
  "Accept-Encoding": "zlib",
};

async function migrateCustomersFromSegmentToVoucherify(
  limit: string = REQUEST_LIMIT,
  nextPage: string = "0"
): Promise<void> {
  try {
    // Get all Segment Profiles and hasMore and next property
    const { allSegmentIds, hasMore, next }: ProfileAPIResponse =
      await getAllSegmentIds(limit, nextPage);

    // Create Voucherify customers
    const voucherifyCustomers = await Promise.all(
      allSegmentIds.map(async (id: string) => {
        const userTraits: SegmentUserTraits | null =
          await getAllUsersTraitsFromSegment(id);
        if (!userTraits) {
          throw new Error(
            `User's traits from Segment.io are missing [segment_id: ${id}]`
          );
        }
        const userIds: string | null = await getAllUsersIdsFromSegment(id);
        if (!userIds) {
          throw new Error(
            `User's id from Segment.io is missing. [segment_id: ${id}]`
          );
        }
        return { ...userTraits, source_id: userIds };
      })
    );
    // Upsert Voucherify customers
    const upsertResponseStatus: number = await upsertCustomersInVoucherify(
      voucherifyCustomers
    );
    if (upsertResponseStatus === 202) {
      console.log(
        `Upserting Voucherify customers completed. Limit: ${limit}, next: ${next}`
      );
    }
    if (hasMore && next) {
      await migrateCustomersFromSegmentToVoucherify(limit, next);
    }
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
        userIdentificator.type === "user_id" ||
        userIdentificator.type === "anonymous_id"
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
migrateCustomersFromSegmentToVoucherify();
