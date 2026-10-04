import { defineCliConfig } from 'sanity/cli'

import { dataset, projectId } from './env'

export default defineCliConfig({
  api: { projectId, dataset },
  deployment: {
    // Assigned when the Studio was first deployed to https://lernio.sanity.studio.
    // Pinning it keeps future deploys from prompting for an application id.
    appId: 'elzeeer5i2dl7bmhd5lbyldg',
  },
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
