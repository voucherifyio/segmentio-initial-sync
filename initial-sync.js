const axios = require("axios");

const SEGMENT_ACCESS_TOKEN = "SEGMENT_ACCESS_TOKEN"
const SPACE_ID = "SPACE_ID";
const APPLICATION_ID = "APPLICATION_ID";
const SECRET_KEY = "SECRET_KEY";


async function getAllUsersTraitsFromSegment(userIds) {
  const promisesToGetUsersTraits = [];

  for (const id of userIds) {
    const profilesUrl = `https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles/segment_id:${id}/traits`;
    promisesToGetUsersTraits.push(
      axios.get(profilesUrl, {
        auth: {
          username: SEGMENT_ACCESS_TOKEN,
          password: "",
        },
        headers: {
          "Accept-Encoding": "zlib",
        },
        params: {
          limit: 15
        }
      })
    );
  }

  try {
    const responses = await Promise.all(promisesToGetUsersTraits);
    const usersWithTraits = responses.map((response) => response.data);
    const extractedUsers = usersWithTraits.map((user) => user.traits);
    return extractedUsers;
  } catch (error) {
    console.log(
      "An error occured while getting users' traits from Segment.io."
    );
    console.error(error);
  }
}

async function getAllUsersIdsFromSegment(userIds) {
  const promisesToGetUsersIds = [];

  for (const id of userIds) {
    const profilesUrl = `https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles/segment_id:${id}/external_ids`;
    promisesToGetUsersIds.push(
      axios.get(profilesUrl, {
        auth: {
          username: SEGMENT_ACCESS_TOKEN,
          password: "",
        },
        headers: {
          "Accept-Encoding": "zlib",
        },
      })
    );
  }

  try {
    const responses = await Promise.all(promisesToGetUsersIds);
    const usersWithIds = responses.map((response) => response.data.data);
    const extractedUserIds = usersWithIds.flatMap((userData) =>
      userData.filter((prop) => prop.type === "user_id").map((prop) => prop.id)
    );
    return extractedUserIds;
  } catch (error) {
    console.log("An error occured while getting users' ids from Segment.io.");
    console.error(error);
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
    console.log("An error occured while upserting customers to Voucherify.");
    console.error(error);
  }
}

async function getAllUsersDataFromSegmentProfilesAndUpsertCustomersInVoucherify() {
  const profilesUrl = `https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles`;
  try {
    const response = await axios.get(profilesUrl, {
      auth: {
        username: SEGMENT_ACCESS_TOKEN,
        password: "",
      },
      headers: {
        "Accept-Encoding": "zlib",
      },
    });
    const allSegmentProfiles = response.data.data;
    const segmentIds = allSegmentProfiles.map((segmentProfile) => segmentProfile.segment_id);
    const usersTraits = await getAllUsersTraitsFromSegment(segmentIds);
    const usersIds = await getAllUsersIdsFromSegment(segmentIds);
    const voucherifyCustomers = usersTraits.map((item, i) => ({ ...item, source_id: usersIds[i] }));
    await upsertCustomersInVoucherify(voucherifyCustomers);
  } catch (error) {
    console.error("An error occurred while getting users' data from Segment profiles or while upserting the customers' data to Voucherify: ", error);
  }
}

getAllUsersDataFromSegmentProfilesAndUpsertCustomersInVoucherify();