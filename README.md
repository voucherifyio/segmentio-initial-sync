# Segment.io integration - initial data synchronization

 This readme is about a Node.js application that does the initial synchronization of user data between Segment.io and Voucherify.

 ## Table of Contents

- [Segment.io integration - initial data synchronization](#segmentio-integration---initial-data-synchronization)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Installation](#installation)
    - [How to get the keys?](#how-to-get-the-keys)
  - [How does it work?](#how-does-it-work)
  - [Error handling](#error-handling)

## Introduction

To be able to synchronize the data that is contained in Segment's [Profiles](https://segment.com/docs/profiles/)
with customers' data in Voucherify, we needed to create an open-source application that would retrieve, process and transmit the data. The script used [Profile API](https://segment.com/docs/profiles/profile-api/) and [Voucherify API](https://docs.voucherify.io/reference/introduction-1).

## Installation

To start the application:
1. Run `npm install` to install all the dependencies.
2. Create the `.env` file that will contain keys needed to receive the data. 

It should look like this:

```
SEGMENT_ACCESS_TOKEN=segment_access_token
SPACE_ID=space_id
APPLICATION_ID=application_id
SECRET_KEY=secret_key
```

Enter your keys to the right of the equals sign.

### How to get the keys?
`Segment Access Token` and `Space ID`:
- Login to your Segment.io account. 
- If you have access to Profiles, select `Profiles` from the sidebar on the left, then `Profiles settings`.
- Go to `API access` tab. From there, copy your `Space ID` and paste in `.env` file.
- If you have previously generated a token, you can use it, or generate a new one by clicking: `Generate token`. Paste the token into the `.env` file.

`Application ID` and `Secret Key`:
- Login to your Voucherify account. 
- Go to `Project Settings` and scroll down to find the `Application Keys` header. From there, copy your `Application ID` and `Secret Key`, then paste them in `.env` file.

3. Run `npm start` to start the script execution.


## How does it work?

The main function `migrateCustomersFromSegmentToVoucherify()`:
1. Calls `getAllSegmentIds()` function,s which obtains all the Segment profiles (they include `segment_id` and `metadata`)
   
For example:

```
[
  {
    segment_id: 'use_xxx',
    metadata: {
      created_at: '2023-01-19T21:06:19.745Z',
      updated_at: '2023-01-26T14:35:52.944Z'
    }
  },
  {
    segment_id: 'use_yyy',
    metadata: {
      created_at: '2023-01-19T16:15:58.865Z',
      updated_at: '2023-01-19T20:06:40.877Z'
    }
  }
]
```

2. For each of the `segment_id` the main function calls `getAllUsersTraitsFromSegment()` and `getAllUsersIdsFromSegment()` and then creates the `voucherifyCustomers` array.

For example:

```
[
  {
    first_name: 'Jack',
    last_name: 'McGinnis',
    phone: '34324234',
    source_id: 'id1'
  },
  {
    first_name: 'Stephen',
    last_name: 'Tyler',
    phone: '454354352',
    source_id: 'id2'
  },
]
```

3. Then it calls `upsertCustomersInVoucherify()`. The function uses [bulk upsert](https://docs.voucherify.io/reference/post-customers-in-bulk) to upsert all the customers in one request.

## Error handling

The main function `migrateCustomersFromSegmentToVoucherify()` from which other functions are called is responsible for catching errors. If the error occurs in any function, the error message coming from this function will appear in the console.