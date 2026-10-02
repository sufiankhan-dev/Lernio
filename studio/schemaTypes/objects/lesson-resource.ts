import { defineField, defineType } from 'sanity'
import { LinkIcon } from '@sanity/icons'

export const lessonResource = defineType({
  name: 'lessonResource',
  title: 'Lesson resource',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Documentation', value: 'documentation' },
          { title: 'Guide', value: 'guide' },
          { title: 'Repository', value: 'repository' },
          { title: 'Article', value: 'article' },
          { title: 'Video', value: 'video' },
          { title: 'Tool', value: 'tool' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (rule) =>
        rule.required().uri({ scheme: ['http', 'https'] }).error('Must be an http or https URL'),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'type',
    },
  },
})
