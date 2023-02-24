# Segment.io integration - initial data synchronization

 This readme is about a Node.js application that does the initial synchronization of user data between Segment.io and Voucherify (from Segment.io to Voucherify).

 ## Table of Contents

- [Segment.io integration - initial data synchronization](#segmentio-integration---initial-data-synchronization)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Installation, configuration and running the app](#installation-configuration-and-running-the-app)
    - [How to get the keys?](#how-to-get-the-keys)
  - [How does it work?](#how-does-it-work)
  - [Error handling](#error-handling)

## Introduction

To be able to synchronize the data that is contained in Segment's [Profiles](https://segment.com/docs/profiles/)
with customers' data in Voucherify, we have an application that would retrieve, process and transmit the data. The script used [Profile API](https://segment.com/docs/profiles/profile-api/) and [Voucherify API](https://docs.voucherify.io/reference/introduction-1).

## Installation, configuration and running the app

To start the application:
1. Run `npm install` to install all the dependencies.
2. Create the `.env` file that will contain keys needed to receive the data. 

It should look like this:

```
SEGMENT_ACCESS_TOKEN=segment_access_token
SPACE_ID=space_id
APPLICATION_ID=application_id
SECRET_KEY=secret_key
REQUEST_LIMIT=request_limit
TRAITS_LIMIT=traits_limit
```



### How to get the keys?
`Segment Access Token` and `Space ID`:
- Login to your Segment.io account. 
- If you have access to Profiles, select `Profiles` from the sidebar on the left, then `Profiles settings`.
- Go to `API access` tab. From there, copy your `Space ID` and paste in `.env` file.
- If you have previously generated a token, you can use it, or generate a new one by clicking: `Generate token`. Paste the token into the `.env` file.

`Application ID` and `Secret Key`:
- Login to your Voucherify account. 
- Go to `Project Settings` and scroll down to find the `Application Keys` header. From there, copy your `Application ID` and `Secret Key`, then paste them in `.env` file.

Enter your keys to the right of the equals sign.

3. Run `npm start` to start the script execution.


## How does it work?

The application gets data from Segment.io using Profile API, then creates Voucherify customers and upserts them in bulk. The top-level function indicates the limit of profiles per request. You can specify the [limit](https://segment.com/docs/profiles/profile-api/#pagination) (`REQUEST_LIMIT`) in `.env` file (the default value for Segment request is 10). There's also another limit value, which indicates number of traits downloaded for one customer (`TRAITS_LIMIT`) - default value is 20.
## Error handling

The main function `migrateCustomersFromSegmentToVoucherify()` from which other functions are called is responsible for catching errors. If the error occurs in any function, the error message coming from this function will appear in the console.