import { Icon } from "@/components/ui/Icon";
import { SiteNav } from "@/components/ui/Nav";
import { navLinks } from "@/lib/home-content";
import { AuthControls } from "./AuthControls";

type SiteHeaderProps = {
  links?: { label: string; href?: string; active?: boolean }[];
};

export function SiteHeader({ links = navLinks }: SiteHeaderProps) {
  return (
    <header className="border-b border-neutral-200">
      <div className="px-5 sm:px-8 lg:px-12">
        <div className="flex h-[72px] items-center lg:h-[104px]">
          <SiteNav
            links={links}
            actions={
              <>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="flex size-10 items-center justify-center rounded-full text-neutral-900 transition-colors hover:bg-neutral-100"
                >
                  <Icon name="bell" size={24} />
                </button>
                <AuthControls />
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}
