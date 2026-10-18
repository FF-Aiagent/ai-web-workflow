import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets + image optimizer. Keep API + pages for session refresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|placeholders/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
