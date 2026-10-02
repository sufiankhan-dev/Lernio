// Querying with "sanityFetch" will keep content automatically updated.
// Before using it, render "<SanityLive />" in the root layout, see
// https://github.com/sanity-io/next-sanity#live-content-api for more information.
//
// `serverToken` is the read token for the private dataset.
// `browserToken: false` is deliberate: the browser never holds a Sanity token,
// so live draft previewing is not available. Published content still updates live.
import { defineLive } from 'next-sanity/live'

import { client } from './client'

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: false,
})
