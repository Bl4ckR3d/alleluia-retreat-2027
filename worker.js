export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/booking") {
      return Response.json({
        success: true,
        message: "Alleluia Retreat booking API is running."
      });
    }

    return new Response("Worker test passed.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};
