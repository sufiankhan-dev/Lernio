import { defineQuery } from 'next-sanity'

/**
 * Every GROQ string in the app lives here, assigned to a uniquely named
 * `defineQuery` const so TypeGen can generate result types for it.
 *
 * Rules that matter for these queries:
 * - Project explicitly at every level, including inside dereferenced references.
 * - Always include `_key` in array projections.
 * - Keep a lesson's parent course derived with a reverse reference; the lesson
 *   document does not store one.
 */

export const CATALOG_COURSES_QUERY = defineQuery(`
  *[_type == "course" && defined(slug.current)] | order(title asc) {
    _id,
    _type,
    title,
    "slug": slug.current,
    summary,
    level,
    studentCount,
    coverImage {
      ...,
      asset->{_id, url, metadata{dimensions, lqip}}
    },
    "category": category->{_id, title, "slug": slug.current},
    "instructor": instructor->{_id, name, "slug": slug.current},
    "moduleCount": count(modules),
    "lessonDurations": modules[].lessons[]->duration
  }
`)

export const COURSE_SLUGS_QUERY = defineQuery(`
  *[_type == "course" && defined(slug.current)][]{"slug": slug.current}
`)

export const COURSE_DETAIL_QUERY = defineQuery(`
  *[_type == "course" && slug.current == $slug][0] {
    _id,
    _type,
    title,
    "slug": slug.current,
    summary,
    level,
    price,
    isPopular,
    studentCount,
    coverImage {
      ...,
      asset->{_id, url, metadata{dimensions, lqip}}
    },
    learningOutcomes[]{"_key": _key, icon, title, description},
    "category": category->{_id, title, "slug": slug.current, description},
    "instructor": instructor->{_id, name, "slug": slug.current, expertise},
    modules[]{
      _key,
      title,
      summary,
      "lessons": lessons[]->{
        _id,
        title,
        "slug": slug.current,
        summary,
        duration,
        isFreePreview,
        studentCount
      }
    }
  }
`)

export const LESSON_DETAIL_QUERY = defineQuery(`
  *[_type == "lesson" && slug.current == $slug][0] {
    _id,
    _type,
    title,
    "slug": slug.current,
    summary,
    videoUrl,
    poster {
      ...,
      asset->{_id, url, metadata{dimensions, lqip}}
    },
    duration,
    isFreePreview,
    studentCount,
    keyPoints,
    notes,
    proTip,
    resources[]{"_key": _key, type, title, description, url},
    "course": *[_type == "course" && references(^._id)][0] {
      _id,
      title,
      "slug": slug.current,
      coverImage {
        ...,
        asset->{_id, url, metadata{dimensions, lqip}}
      },
      studentCount,
      level,
      "category": category->{_id, title, "slug": slug.current},
      "instructor": instructor->{_id, name, "slug": slug.current, photo},
      modules[]{
        _key,
        title,
        "lessons": lessons[]->{_id, title, "slug": slug.current, duration, isFreePreview}
      }
    }
  }
`)

export const INSTRUCTOR_DETAIL_QUERY = defineQuery(`
  *[_type == "instructor" && slug.current == $slug][0] {
    _id,
    _type,
    name,
    "slug": slug.current,
    expertise,
    bio,
    photo {
      ...,
      asset->{_id, url, metadata{dimensions, lqip}}
    },
    "courses": *[_type == "course" && references(^._id)] | order(title asc) {
      _id,
      title,
      "slug": slug.current,
      summary,
      level,
      coverImage {
        ...,
        asset->{_id, url, metadata{dimensions, lqip}}
      }
    }
  }
`)

export const CATEGORIES_QUERY = defineQuery(`
  *[_type == "category" && defined(slug.current)] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description
  }
`)

/**
 * The search agent reads the Context document that configures the MCP endpoint.
 * Returns nothing when no document matches the slug, which is the signal to fall
 * back to the base MCP URL and rely on the inline system prompt alone.
 */
export const AGENT_CONTEXT_QUERY = defineQuery(`
  *[_type == "sanity.agentContext" && slug.current == $slug][0]{
    _id,
    name,
    "slug": slug.current,
    groqFilter,
    instructions
  }
`)

/**
 * Resolves the lesson ids the search agent selected into fully projected cards.
 *
 * The agent returns ids only. Every string rendered on the results page comes from
 * here, so a hallucinated id resolves to nothing and is dropped rather than shown.
 *
 * Ordering is the agent's contribution, applied after hydration, not GROQ's
 * `order()`. The course arrives through a reverse reference because the lesson
 * document does not store its parent, and the nested `modules` array is what the
 * module and lesson numbers are derived from.
 */
export const SEARCH_HYDRATE_QUERY = defineQuery(`
  *[_type == "lesson" && _id in $ids]{
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    summary,
    duration,
    videoUrl,
    keyPoints,
    poster{
      ...,
      alt,
      asset->{_id, url, metadata{dimensions, lqip}}
    },
    "course": *[_type == "course" && references(^._id)][0]{
      _id,
      title,
      "slug": slug.current,
      "category": category->{_id, title, "slug": slug.current},
      modules[]{
        _key,
        title,
        "lessons": lessons[]->{_id}
      }
    }
  }
`)

/**
 * Resolves the video documents whose moments the search agent selected, so the
 * seconds it reported can be checked against real data.
 *
 * The agent contributes a video `_id` and the `startSeconds` it saw in a query
 * result. Everything that decides whether that second is real happens here, so the
 * projection is deliberately narrow:
 *
 * - `chapters[]{startSeconds, label}` is the full table of contents. It is small by
 *   construction and carries the clean labels the two-stage rule prefers.
 * - `chunkStarts` is the transcript reduced to its boundaries. The chunk *text* is
 *   deliberately not projected. Confirming a second needs only the boundaries, and
 *   AGENTS.md §12 warns that a transcript overflows a context window; keeping the text
 *   out of this response honours that for our own code and not only for the agent.
 *
 * `url` comes back so the owning lesson can be found by the next query.
 */
export const SEARCH_VIDEO_QUERY = defineQuery(`
  *[_type == "video" && _id in $ids]{
    _id,
    url,
    chapters[]{
      _key,
      startSeconds,
      label
    },
    "chunkStarts": chunks[].startSeconds
  }
`)

/**
 * The reverse half of the video join: the lessons that use one of these videos.
 *
 * A video document is an internal lookup and never a result on its own, so every
 * moment has to end up tied to a lesson. Matching on `videoUrl` covers the seeded
 * dataset, where a video's `url` and its lesson's `videoUrl` are the same canonical
 * watch URL. When they are not, `toVideoDocumentId` derives the document id from the
 * lesson's own URL instead, which is why `videoUrl` is projected above.
 */
export const SEARCH_VIDEO_LESSONS_QUERY = defineQuery(`
  *[_type == "lesson" && videoUrl in $urls]{
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    summary,
    duration,
    videoUrl,
    poster{
      ...,
      alt,
      asset->{_id, url, metadata{dimensions, lqip}}
    },
    "course": *[_type == "course" && references(^._id)][0]{
      _id,
      title,
      "slug": slug.current,
      "category": category->{_id, title, "slug": slug.current},
      modules[]{
        _key,
        title,
        "lessons": lessons[]->{_id}
      }
    }
  }
`)
