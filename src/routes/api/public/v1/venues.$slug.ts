import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonPublic } from "@/lib/cors";

export const Route = createFileRoute("/api/public/v1/venues/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { loadPublicVenue, parseLang } = await import("@/lib/public-venues.server");
        const lang = parseLang(request);
        const venue = await loadPublicVenue(params.slug, lang);
        if (!venue) {
          return jsonPublic(request, { error: "not_found" }, 404);
        }
        return jsonPublic(request, { venue });
      },
      OPTIONS: async ({ request }) => corsPreflight(request),
    },
  },
});
