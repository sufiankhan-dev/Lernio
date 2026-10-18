export function WeeklyNote() {
  return (
    <div className="flex items-center gap-6 px-6 py-14 sm:px-8 lg:px-14">
      <span aria-hidden="true" className="hidden h-px flex-1 bg-neutral-200 sm:block" />
      <p className="text-center text-body-large text-neutral-600">
        New courses and lessons added every week.
      </p>
      <span aria-hidden="true" className="hidden h-px flex-1 bg-neutral-200 sm:block" />
    </div>
  );
}