import 'server-only'

import { sanityFetch } from './live'
import {
  CATALOG_COURSES_QUERY,
  CATEGORIES_QUERY,
  COURSE_DETAIL_QUERY,
  COURSE_SLUGS_QUERY,
  INSTRUCTOR_DETAIL_QUERY,
  LESSON_DETAIL_QUERY,
} from './queries'

/**
 * Read-only access to Lernio content.
 *
 * Every function here is server-only and resolves to `null` or an empty list
 * when nothing matches; the calling page decides whether that is a `notFound()`.
 * Nothing in this module writes to Sanity.
 */

export async function getCatalogCourses() {
  const { data } = await sanityFetch({ query: CATALOG_COURSES_QUERY, stega: false })

  return (data ?? []).map(({ lessonDurations, ...course }) => ({
    ...course,
    totalDuration: (lessonDurations ?? []).reduce<number>(
      (total, duration) => total + (duration ?? 0),
      0,
    ),
  }))
}

export type CatalogCourse = Awaited<ReturnType<typeof getCatalogCourses>>[number]

export async function getCourseSlugs() {
  const { data } = await sanityFetch({ query: COURSE_SLUGS_QUERY, stega: false })

  return (data ?? []).map(({ slug }) => slug)
}

export async function getCourseBySlug(slug: string) {
  const { data } = await sanityFetch({
    query: COURSE_DETAIL_QUERY,
    params: { slug },
    stega: false,
  })

  return data ?? null
}

export type CourseDetail = NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>

export async function getLessonBySlug(slug: string) {
  const { data } = await sanityFetch({
    query: LESSON_DETAIL_QUERY,
    params: { slug },
    stega: false,
  })

  return data ?? null
}

export type LessonDetail = NonNullable<Awaited<ReturnType<typeof getLessonBySlug>>>
export type LessonOutline = NonNullable<LessonDetail['course']>

export async function getInstructorBySlug(slug: string) {
  const { data } = await sanityFetch({
    query: INSTRUCTOR_DETAIL_QUERY,
    params: { slug },
    stega: false,
  })

  return data ?? null
}

export type InstructorDetail = NonNullable<Awaited<ReturnType<typeof getInstructorBySlug>>>

export async function getCategories() {
  const { data } = await sanityFetch({ query: CATEGORIES_QUERY, stega: false })

  return data ?? []
}

export type Category = Awaited<ReturnType<typeof getCategories>>[number]
