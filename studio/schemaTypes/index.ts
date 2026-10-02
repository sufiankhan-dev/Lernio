import type { SchemaTypeDefinition } from 'sanity'

import { category } from './documents/category'
import { course } from './documents/course'
import { instructor } from './documents/instructor'
import { lesson } from './documents/lesson'
import { learningOutcome } from './objects/learning-outcome'
import { lessonResource } from './objects/lesson-resource'
import { module } from './objects/module'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [course, lesson, instructor, category, module, learningOutcome, lessonResource],
}
