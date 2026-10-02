import { defineArrayMember, defineField, defineType } from 'sanity'
import { PlayIcon } from '@sanity/icons'

export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  icon: PlayIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'video', title: 'Video' },
    { name: 'details', title: 'Details' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One line. Shown under the lesson title and in search results.',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      group: 'video',
      description: 'A YouTube, Vimeo, or Bunny watch URL. The player is an embed on the lesson page.',
      validation: (rule) =>
        rule.required().uri({ scheme: ['http', 'https'] }).error('Must be an http or https URL'),
    }),
    defineField({
      name: 'poster',
      title: 'Poster image',
      type: 'image',
      group: 'video',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'duration',
      title: 'Duration (minutes)',
      type: 'number',
      group: 'details',
      description: 'Whole minutes. Formatting happens in the UI.',
      validation: (rule) => rule.required().min(1).integer(),
    }),
    defineField({
      name: 'keyPoints',
      title: 'Key points',
      type: 'array',
      group: 'content',
      description: 'The "In this lesson you will" list.',
      of: [defineArrayMember({ type: 'string' })],
      validation: (rule) => rule.min(1).max(10).unique(),
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'array',
      group: 'content',
      description: 'Lesson overview. Portable Text, not markdown.',
      of: [defineArrayMember({ type: 'block' })],
    }),
    defineField({
      name: 'proTip',
      title: 'Pro tip',
      type: 'text',
      rows: 2,
      group: 'content',
      validation: (rule) => rule.max(400),
    }),
    defineField({
      name: 'resources',
      title: 'Resources',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'lessonResource' })],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'isFreePreview',
      title: 'Free preview',
      type: 'boolean',
      group: 'details',
      description: 'Label only. This is not access control.',
      initialValue: false,
    }),
    defineField({
      name: 'studentCount',
      title: 'Student count',
      type: 'number',
      group: 'details',
      description: 'Display only. Not derived from progress.',
      validation: (rule) => rule.min(0).integer(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      duration: 'duration',
      media: 'poster',
    },
    prepare({ title, duration, media }) {
      return {
        title,
        subtitle: typeof duration === 'number' ? `${duration} min` : undefined,
        media,
      }
    },
  },
})
