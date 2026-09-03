import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonPublic } from "@/lib/cors";

export const Route = createFileRoute("/api/public/v1/venues")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { loadPublicVenues, parseLang } = await import("@/lib/public-venues.server");
        const lang = parseLang(request);
        const venues = await loadPublicVenues(lang);
        return jsonPublic(request, { venues });
      },
      OPTIONS: async ({ request }) => corsPreflight(request),
    },
  },
});
