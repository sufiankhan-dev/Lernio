import { defineArrayMember, defineField, defineType } from 'sanity'
import { FolderIcon } from '@sanity/icons'

export const module = defineType({
  name: 'module',
  title: 'Module',
  type: 'object',
  icon: FolderIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: 'lessons',
      title: 'Lessons',
      type: 'array',
      description:
        'Order matters. The module number and the lesson numbers in the UI are derived from this order, and the module duration is the sum of its lesson durations.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'lesson' }] })],
      validation: (rule) => rule.required().min(1).unique(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      lessonCount: 'lessons',
    },
    prepare({ title, lessonCount }) {
      const count = Array.isArray(lessonCount) ? lessonCount.length : 0
      return {
        title,
        subtitle: count === 1 ? '1 lesson' : `${count} lessons`,
      }
    },
  },
})
