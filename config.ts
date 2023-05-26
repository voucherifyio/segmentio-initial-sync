import {config} from 'dotenv';

config();

export const SEGMENT_ACCESS_TOKEN = process.env.SEGMENT_ACCESS_TOKEN ? process.env.SEGMENT_ACCESS_TOKEN : throwMissingVariableError('SEGMENT_ACCESS_TOKEN');
export const SEGMENT_SPACE_ID = process.env.SEGMENT_SPACE_ID ? process.env.SEGMENT_SPACE_ID : throwMissingVariableError('SEGMENT_SPACE_ID');
export const SEGMENT_REQUEST_LIMIT = process.env.SEGMENT_REQUEST_LIMIT ? parseInt(process.env.SEGMENT_REQUEST_LIMIT) : throwMissingVariableError('SEGMENT_REQUEST_LIMIT');
export const SEGMENT_TRAITS_LIMIT = process.env.SEGMENT_TRAITS_LIMIT ? parseInt(process.env.SEGMENT_TRAITS_LIMIT) : throwMissingVariableError('SEGMENT_TRAITS_LIMIT');
export const VOUCHERIFY_APPLICATION_ID = process.env.VOUCHERIFY_APPLICATION_ID ? process.env.VOUCHERIFY_APPLICATION_ID : throwMissingVariableError('VOUCHERIFY_APPLICATION_ID');
export const VOUCHERIFY_SECRET_KEY = process.env.VOUCHERIFY_SECRET_KEY ? process.env.VOUCHERIFY_SECRET_KEY : throwMissingVariableError('VOUCHERIFY_SECRET_KEY');
export const IDENTIFIER_SAVED_AS_SOURCE_ID = process.env.IDENTIFIER_SAVED_AS_SOURCE_ID ? process.env.IDENTIFIER_SAVED_AS_SOURCE_ID : throwMissingVariableError('IDENTIFIER_SAVED_AS_SOURCE_ID');
export const AUTH_TOKEN: string = Buffer.from(`${SEGMENT_ACCESS_TOKEN}:`).toString("base64");

function throwMissingVariableError(name: string): never {
    throw new Error(`Invalid value for environment variable: ${name}`);
}