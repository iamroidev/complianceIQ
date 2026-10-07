import { Suspense, type ReactNode } from "react";
import { Shell } from "@/components/workspace/Shell";

/**
 * Workspace layout (DESIGN §5). The shell owns the nav, top bar and the
 * records-verified check; screens render inside `main`.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
