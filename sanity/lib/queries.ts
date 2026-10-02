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
