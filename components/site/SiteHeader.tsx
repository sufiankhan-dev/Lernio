import { SiteNav } from "@/components/ui/Nav";
import { navLinks } from "@/lib/home-content";
import { AuthControls } from "./AuthControls";
import { NotificationsMenu } from "./NotificationsMenu";

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
                <NotificationsMenu />
                <AuthControls />
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}