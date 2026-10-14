
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/booking") {
      if (request.method !== "POST") {
        return Response.json(
          { success: false, error: "Method not allowed." },
          {
            status: 405,
            headers: { Allow: "POST" }
          }
        );
      }

      return Response.json(
        {
          success: false,
          error: "Booking API is not connected yet."
        },
        { status: 503 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
