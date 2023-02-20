const axios = require("axios");
require("dotenv").config();

const SEGMENT_ACCESS_TOKEN = process.env.SEGMENT_ACCESS_TOKEN;
const SPACE_ID = process.env.SPACE_ID;
const APPLICATION_ID = process.env.APPLICATION_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const AUTH_TOKEN = Buffer.from(`${SEGMENT_ACCESS_TOKEN}:`).toString("base64");

async function migrateCustomersFromSegmentToVoucherify() {
  try {
    const allSegmentProfiles = await getSegmentProfiles();
    const allSegmentIds = allSegmentProfiles.map(
      (segmentProfile) => segmentProfile.segment_id
    );
    const voucherifyCustomers = await Promise.all(
      allSegmentIds.map(async (id) => {
        const userTraitsFromSegment = await getAllUsersTraitsFromSegment(id);
        if (!userTraitsFromSegment) {
          throw new Error(
            ` User's traits from Segment.io are missing [segment_id: ${id}]`
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

    await upsertCustomersInVoucherify(voucherifyCustomers);
  } catch (error) {
    console.error(error);
    throw new Error(
      "An error occurred while getting users' data from Segment profiles or while upserting the customers' data to Voucherify."
    );
  }
}

async function getSegmentProfiles() {
  const profilesUrl = `https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles`;
  try {
    const response = await axios.get(profilesUrl, {
      headers: {
        Authorization: `Basic ${AUTH_TOKEN}`,
        "Accept-Encoding": "zlib",
      },
    });
    return response.data.data;
  } catch (error) {
    if (error.response) {
      console.error(`${error.response.status}: ${error.response.statusText}`);
    }
    throw new Error(
      "An error occured while getting user profiles from Segment.io."
    );
  }
}

async function getAllUsersTraitsFromSegment(id) {
  try {
    const response = await axios.get(
      `https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles/segment_id:${id}/traits`,
      {
        headers: {
          Authorization: `Basic ${AUTH_TOKEN}`,
          "Accept-Encoding": "zlib",
        },
        params: {
          limit: 15,
        },
      }
    );
    return response.data.traits;
  } catch (error) {
    if (error.response) {
      console.error(`${error.response.status}: ${error.response.statusText}`);
    }
    throw new Error(
      "An error occured while getting users' traits from Segment.io."
    );
  }
}

async function getAllUsersIdsFromSegment(id) {
  try {
    const response = await axios.get(
      `https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles/segment_id:${id}/external_ids`,
      {
        headers: {
          Authorization: `Basic ${AUTH_TOKEN}`,
          "Accept-Encoding": "zlib",
        },
      }
    );
    const userWithExternalIds = response.data.data;
    return userWithExternalIds.find(userIdentificator => userIdentificator.type ==="user_id").id
  } catch (error) {
    if (error.response) {
      console.error(`${error.response.status}: ${error.response.statusText}`);
    }
    throw new Error(
      "An error occured while getting users' ids from Segment.io."
    );
  }
}

async function upsertCustomersInVoucherify(voucherifyCustomers) {
  const voucherifyUrl = `https://api.voucherify.io/v1/customers/bulk/async`;

  try {
    await axios({
      method: "post",
      url: voucherifyUrl,
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": APPLICATION_ID,
        "X-App-Token": SECRET_KEY,
      },
      data: voucherifyCustomers,
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

migrateCustomersFromSegmentToVoucherify();
