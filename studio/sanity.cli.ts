import { defineCliConfig } from 'sanity/cli'

import { dataset, projectId } from './env'

export default defineCliConfig({
  api: { projectId, dataset },
  typegen: {
    enabled: true,
    // All GROQ for the web app lives in the root workspace under sanity/.
    path: ['../sanity/**/*.ts'],
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    // Emits the `declare module '@sanity/client'` augmentation that
    // next-sanity's sanityFetch uses to infer query result types.
    overloadClientMethods: true,
  },
})
