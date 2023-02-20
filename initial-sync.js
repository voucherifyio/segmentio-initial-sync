const axios = require("axios");
require("dotenv").config();

const SEGMENT_ACCESS_TOKEN = process.env.SEGMENT_ACCESS_TOKEN;
const SPACE_ID = process.env.SPACE_ID;
const APPLICATION_ID = process.env.APPLICATION_ID;
const SECRET_KEY = process.env.SECRET_KEY;

async function getSegmentProfiles() {
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
    return response.data.data;
  } catch (error) {
    console.error(`${error.response.status}: ${error.response.statusText}`);
    throw new Error(
      "An error occured while getting user profiles from Segment.io."
    );
  }
}

async function getAllUsersTraitsFromSegment(userIds) {
  const promisesToGetUsersTraits = userIds.map((id) =>
    axios.get(`https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles/segment_id:${id}/traits`, {
      auth: {
        username: SEGMENT_ACCESS_TOKEN,
        password: "",
      },
      headers: {
        "Accept-Encoding": "zlib",
      },
      params: {
        limit: 15,
      },
    })
  );


  try {
    const responses = await Promise.all(promisesToGetUsersTraits);
    const usersWithTraits = responses.map((response) => response.data);
    const extractedUsers = usersWithTraits.map((user) => user.traits);
    return extractedUsers;
  } catch (error) {
    console.error(`${error.response.status}: ${error.response.statusText}`);
    throw new Error(
      "An error occured while getting users' traits from Segment.io."
    );
  }
}

async function getAllUsersIdsFromSegment(userIds) {
  const promisesToGetUsersIds = userIds.map((id) =>
      axios.get(`https://profiles.segment.com/v1/spaces/${SPACE_ID}/collections/users/profiles/segment_id:${id}/external_ids`, {
        auth: {
          username: SEGMENT_ACCESS_TOKEN,
          password: "",
        },
        headers: {
          "Accept-Encoding": "zlib",
        },
      }));

  try {
    const responses = await Promise.all(promisesToGetUsersIds);
    const usersWithIds = responses.map((response) => response.data.data);
    const extractedUserIds = usersWithIds.flatMap((userData) =>
      userData.filter((prop) => prop.type === "user_id").map((prop) => prop.id)
    );
    return extractedUserIds;
  } catch (error) {
    console.error(`${error.response.status}: ${error.response.statusText}`);
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
    console.error(`${error.response.status}: ${error.response.statusText}`);
    throw new Error(
      "An error occured while upserting customers to Voucherify."
    );
  }
}

async function migrateCustomersFromSegmentToVoucherify() {
  try {
    const allSegmentProfiles = await getSegmentProfiles();
    const segmentIds = allSegmentProfiles.map(
      (segmentProfile) => segmentProfile.segment_id
    );
    const usersTraitsFromSegment = await getAllUsersTraitsFromSegment(segmentIds);
    if (!usersTraitsFromSegment) {
      throw new Error("Users traits from Segment.io are missing.");
    }
    const usersIdsFromSegment = await getAllUsersIdsFromSegment(segmentIds);
    if (!usersIdsFromSegment) {
      throw new Error("Users ids from Segment.io are missing.");
    }
    const voucherifyCustomers = usersTraitsFromSegment.map((item, i) => ({
      ...item,
      source_id: usersIdsFromSegment[i],
    }));
    await upsertCustomersInVoucherify(voucherifyCustomers);
  } catch (error) {
    console.error(error);
    throw new Error(
      "An error occurred while getting users' data from Segment profiles or while upserting the customers' data to Voucherify."
    );
  }
}

migrateCustomersFromSegmentToVoucherify();
