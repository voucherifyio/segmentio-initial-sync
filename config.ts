import { config } from 'dotenv';
config();

export const SEGMENT_ACCESS_TOKEN = process.env.SEGMENT_ACCESS_TOKEN;
export const SEGMENT_SPACE_ID = process.env.SEGMENT_SPACE_ID;
export const SEGMENT_REQUEST_LIMIT = process.env.SEGMENT_REQUEST_LIMIT;
export const SEGMENT_TRAITS_LIMIT = process.env.SEGMENT_TRAITS_LIMIT;
export const VOUCHERIFY_APPLICATION_ID = process.env.VOUCHERIFY_APPLICATION_ID;
export const VOUCHERIFY_SECRET_KEY = process.env.VOUCHERIFY_SECRET_KEY;
