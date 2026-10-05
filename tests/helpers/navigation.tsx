/**
 * `next/navigation` et `next/link` simules (tests/setup.ts). Le routeur est un
 * objet de `vi.fn()` partage : `expect(router.replace).toHaveBeenCalledWith(...)`.
 */
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { vi } from "vitest";

export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

const state = { pathname: "/dashboard", search: "" };

export function setPathname(pathname: string) {
  state.pathname = pathname;
}

export function setSearchParams(search: string) {
  state.search = search;
}

export function resetNavigation() {
  state.pathname = "/dashboard";
  state.search = "";
  Object.values(router).forEach((fn) => fn.mockClear());
}

export const navigationModuleMock = {
  useRouter: () => router,
  usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams(state.search),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
};

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string };
  children?: ReactNode;
  prefetch?: boolean;
};

export const linkModuleMock = {
  default: ({ href, children, ...rest }: LinkProps) => {
    // `prefetch` est propre a next/link : on ne le pose pas sur le <a>.
    const anchorProps = { ...rest };
    delete anchorProps.prefetch;
    return (
      <a href={typeof href === "string" ? href : (href.pathname ?? "")} {...anchorProps}>
        {children}
      </a>
    );
  },
};
