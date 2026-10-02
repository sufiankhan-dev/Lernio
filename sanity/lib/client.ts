import 'server-only'

import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

// The dataset is private, so every read carries the server-only token.
// This module must never be imported from a client component.
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_READ_TOKEN,
  useCdn: true,
  perspective: 'published',
  stega: false,
})
