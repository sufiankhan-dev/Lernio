import { defineField, defineType } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons'

/**
 * A short timestamped piece of a video's transcript.
 *
 * Chunks are deliberately small so a query can return a handful of matches instead of the whole
 * transcript, which would overflow the search agent's context window.
 */
export const videoChunk = defineType({
  name: 'videoChunk',
  title: 'Video transcript chunk',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'startSeconds',
      title: 'Start (seconds)',
      type: 'number',
      description: 'Where this piece begins. The second a search result would seek to.',
      validation: (rule) => rule.required().min(0).integer(),
    }),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'text',
      rows: 3,
      description: 'Plain text. Portable Text is not used here; this is matched, not rendered.',
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {
      text: 'text',
      startSeconds: 'startSeconds',
    },
    prepare({ text, startSeconds }) {
      const seconds = typeof startSeconds === 'number' ? startSeconds : 0
      const minutes = Math.floor(seconds / 60)
      const remainder = String(seconds % 60).padStart(2, '0')

      return {
        title: `${minutes}:${remainder}`,
        subtitle: typeof text === 'string' ? text.slice(0, 120) : '',
      }
    },
  },
})
