import type { SchemaTypeDefinition } from 'sanity'

import { agentContext } from './documents/agent-context'
import { category } from './documents/category'
import { course } from './documents/course'
import { instructor } from './documents/instructor'
import { lesson } from './documents/lesson'
import { video } from './documents/video'
import { learningOutcome } from './objects/learning-outcome'
import { lessonResource } from './objects/lesson-resource'
import { module } from './objects/module'
import { videoChapter } from './objects/video-chapter'
import { videoChunk } from './objects/video-chunk'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    course,
    lesson,
    instructor,
    category,
    module,
    learningOutcome,
    lessonResource,
    video,
    videoChapter,
    videoChunk,
    agentContext,
  ],
}
