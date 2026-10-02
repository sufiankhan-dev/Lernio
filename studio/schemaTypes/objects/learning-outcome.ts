import { defineField, defineType } from 'sanity'
import { SparklesIcon } from '@sanity/icons'

export const learningOutcome = defineType({
  name: 'learningOutcome',
  title: 'Learning outcome',
  type: 'object',
  icon: SparklesIcon,
  fields: [
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'string',
      description: 'The UI maps this name to an icon. Keep the list closed so icons always resolve.',
      options: {
        list: [
          { title: 'Layers', value: 'layers' },
          { title: 'Database', value: 'database' },
          { title: 'Gauge', value: 'gauge' },
          { title: 'Cloud', value: 'cloud' },
          { title: 'Code', value: 'code' },
          { title: 'Rocket', value: 'rocket' },
          { title: 'Shield', value: 'shield' },
          { title: 'Bolt', value: 'zap' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required().max(200),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'icon',
    },
  },
})
