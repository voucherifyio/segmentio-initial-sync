# Segment.io integration - initial data synchronization

This readme is about a Node.js application that does the initial synchronization of user data between Segment.io and
Voucherify (from Segment.io to Voucherify).

## Table of Contents

- [Segment.io integration - initial data synchronization](#segmentio-integration---initial-data-synchronization)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Installation, configuration,  and running the app](#installation-configuration--and-running-the-app)
    - [How do I get the credentials?](#how-do-i-get-the-credentials)
  - [How does it work?](#how-does-it-work)
  - [Error handling](#error-handling)
      - [How fast does the script work?](#how-fast-does-the-script-work)
  - [Data validation](#data-validation)

## Introduction

To be able to make the initial import of customers from Segment to Voucherify, we have an application that would
retrieve, process and transmit the data. The script used [Profile API](https://segment.com/docs/profiles/profile-api/)
and [Voucherify API](https://docs.voucherify.io/reference/introduction-1).

## Installation, configuration,  and running the app

To start the application:

1. Run `npm install` to install all the dependencies.
2. Create the `.env` file that will contain the keys needed to receive the data. You can also use the attached file named: `.env-example` and rename it to `.env`.

It should look like this:

```
SEGMENT_ACCESS_TOKEN=segment_access_token
SEGMENT_SPACE_ID=segment_space_id
SEGMENT_REQUEST_LIMIT=100
SEGMENT_TRAITS_LIMIT=15
VOUCHERIFY_APPLICATION_ID=application_id
VOUCHERIFY_SECRET_KEY=secret_key

```

### How do I get the credentials?

`Segment Access Token` and `Space ID`:

- Login to your Segment.io account.
- If you have access to Unify, select `Unify` from the sidebar on the left, then select `Unify settings`.
- Select the `API access` tab. From there, copy your `Space ID` and paste it in `.env` file.
- If you have previously generated a token, you can use it or generate a new one by clicking `Generate token`. 
- Paste the token into the `.env` file.

`Application ID` and `Secret Key` from Voucherify:

- Login to your Voucherify account.
- Go to `Project Settings` and scroll down to find the `Application Keys` header. From there, copy your `Application ID`
  and `Secret Key`, then paste them into the `.env` file.

Enter your keys to the right of the equals sign.

3. Run `npm start` to start the script's execution.

Note: If you wish to start the execution from a specific offset (number of Segment profiles being processed), you can also run `npm start <offset>`, for example: `npm start 400`.

## How does it work?

The application gets data from Segment.io using the Profile API, then creates Voucherify customers' objects and upserts them in bulk.
You can specify the [limit](https://segment.com/docs/profiles/profile-api/#pagination) (`REQUEST_LIMIT`) in `.env` file (the default
value for Segment request is 100). There's also another limit value, which indicates the number of traits downloaded for one
customer (`TRAITS_LIMIT`) - default value is 20.
In one request, it is possible to update a maximum of 100 records in Voucherify.

First of all, the script gets a specified number of Segment Profiles (`segment_ids` array). Then it creates Voucherify customers' objects based on information retrieved from the Profile API and upserts the specified number of customers in Voucherify.

## Error handling

The main function `runImport()` from which other functions are called, is responsible for catching errors. If the error occurs in any function, the error message coming from this function will appear in the console.

If any error occurs, the prompt asks, `Do you wish to resume the process from the offset: [offset]? Type "yes" or "no": ` will be displayed in the console. After typing `yes`, the script should resume its operation from where the error occurred.

If the error occurs more than once, the script execution stops and shows the offset information in the console. If you want to resume the script execution from the returned offset, you can run `npm start <returned_offset>`

#### How fast does the script work? 

This script on average imports 100 customers in 4 seconds, which means that 100,000 customers will be imported in about 1 hour and 6 minutes.
1,000,000 customers  will be imported in approximately 11 hours and 6 minutes.

The script will consume 201 API calls to Segment per 100 users. 

## Data validation

- source_id: To create a `source_id` field in Voucherify, the script expects that the `userId` field exists in Segment. If not, the customer's `source_id` will be set to null.
- birthdate: The birthdate passed to Voucherify should be in format ISO8601, which means that the only accepted format is `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss:sssZ`. If the passed birthdate string doesn't match the format, the `birthdate` field will be set to null, and the information about the user will be displayed in the console.
- metadata: In order for the import to perform correctly, it is required to check in the customer metadata schema in Voucherify:
  - If the option `Allow only defined properties` (https://app.voucherify.io/#/app/core/projects/current/metadata-schema -> Standard -> Customer) is enabled, the metadata schema defined in Voucherify should exactly match the metadata object coming from Unify.
  - The second option is to disable the `Allow only defined properties` option in the customer metadata schema settings. Then all user metadata from Unify will be passed to the customer metadata in Voucherify.
