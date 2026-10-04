import { defineField, defineType } from 'sanity'
import { BookmarkIcon } from '@sanity/icons'

/** One entry in a video's table of contents. */
export const videoChapter = defineType({
  name: 'videoChapter',
  title: 'Video chapter',
  type: 'object',
  icon: BookmarkIcon,
  fields: [
    defineField({
      name: 'startSeconds',
      title: 'Start (seconds)',
      type: 'number',
      description: 'Where this chapter begins. Ordered by this value, not by array position.',
      validation: (rule) => rule.required().min(0).integer(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'The chapter name, cleaned up from the source by the ingestion pipeline.',
      validation: (rule) => rule.required().max(120),
    }),
  ],
  preview: {
    select: {
      label: 'label',
      startSeconds: 'startSeconds',
    },
    prepare({ label, startSeconds }) {
      const seconds = typeof startSeconds === 'number' ? startSeconds : 0
      const minutes = Math.floor(seconds / 60)
      const remainder = String(seconds % 60).padStart(2, '0')

      return {
        title: label || 'Chapter',
        subtitle: `${minutes}:${remainder}`,
      }
    },
  },
})
