import { config } from 'dotenv';
config();

export const SEGMENT_ACCESS_TOKEN = process.env.SEGMENT_ACCESS_TOKEN;
export const SPACE_ID = process.env.SPACE_ID;
export const APPLICATION_ID = process.env.APPLICATION_ID;
export const SECRET_KEY = process.env.SECRET_KEY;
export const REQUEST_LIMIT = process.env.REQUEST_LIMIT;
export const TRAITS_LIMIT = process.env.TRAITS_LIMIT;