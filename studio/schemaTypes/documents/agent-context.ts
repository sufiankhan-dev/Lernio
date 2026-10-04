import { defineField, defineType } from 'sanity'
import { SparklesIcon } from '@sanity/icons'

/**
 * Hand-authored stand-in for the `@sanity/context` Studio plugin.
 *
 * The plugin registers this exact document type, but `@sanity/context@2.2.0`
 * declares `sanity: '^6'` as a peer dependency and this Studio runs `sanity@5.31.2`,
 * so it cannot be installed. Declaring the type ourselves is enough for the Sanity
 * Context MCP server to find and read the document, which is all the agent needs.
 *
 * What is lost without the plugin is the Conversation Insights dashboard, which
 * depends on the plugin's companion schema. Insights stays unavailable until the
 * plugin supports this Studio's Sanity major version.
 *
 * The MCP URL for a document with the slug `default` is:
 * `https://api.sanity.io/v2026-03-03/context/mcp/:projectId/:dataset/default`
 */
export const agentContext = defineType({
  name: 'sanity.agentContext',
  title: 'Agent Context',
  type: 'document',
  icon: SparklesIcon,
  description:
    'Configures the Sanity Context MCP endpoint that powers Lernio search. The content filter scopes what the agent can read, and the instructions teach it how your dataset is shaped.',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Display name for this agent configuration.',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Becomes the last path segment of the MCP URL. The web app reads SANITY_CONTEXT_SLUG to match it.',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'groqFilter',
      title: 'Content Filter',
      type: 'text',
      rows: 4,
      description:
        'A GROQ expression scoping which documents the agent can access. Keep the internal types out, for example: _type in ["course", "lesson", "category", "instructor"] && !(_id in path("drafts.**"))',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'text',
      rows: 12,
      description:
        'Domain-specific query guidance injected into the agent tool descriptions. Write only what the generated schema does not make obvious: reference chains, derived fields, data quirks, required filters. Leave out GROQ syntax and field lists.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'slug.current' },
  },
})