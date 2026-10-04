import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Lernio')
    .items([
      S.documentTypeListItem('course').title('Courses'),
      S.documentTypeListItem('lesson').title('Lessons'),
      S.divider(),
      S.listItem()
        .title('Taxonomy')
        .child(
          S.list()
            .title('Taxonomy')
            .items([
              S.documentTypeListItem('category').title('Categories'),
              S.documentTypeListItem('instructor').title('Instructors'),
            ]),
        ),
      S.divider(),
      S.listItem()
        .title('Search')
        .child(
          S.list()
            .title('Search')
            .items([
              S.documentTypeListItem('sanity.agentContext').title('Agent Context'),
            ]),
        ),
      S.divider(),
      S.listItem()
        .title('Video data (generated)')
        .child(
          S.list()
            .title('Video data (generated)')
            .items([
              S.documentTypeListItem('video').title('Videos'),
            ]),
        ),
    ])
