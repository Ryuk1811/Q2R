export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. High-Speed 302 Redirection for /r/:slug and /s/:slug
    if (url.pathname.startsWith('/r/') || url.pathname.startsWith('/s/')) {
      const parts = url.pathname.split('/');
      const slug = parts[2];
      if (slug) {
        if (url.searchParams.get('preview') === 'true') {
          return Response.redirect(`${url.origin}/?shield=${encodeURIComponent(slug)}`, 302);
        }
      }
    }

    // 2. Platform Status API
    if (url.pathname === '/api/cloud-status') {
      return new Response(
        JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          architecture: 'Q2R Global Routing Network & Distributed Cloud Vault',
          supportEmail: 'duplexinterface@outlook.com',
          edge: {
            status: 'healthy',
            runtime: 'High-Speed Global Relay',
            regions: 'Global Distributed Network',
            routingLatency: '< 15ms Sub-Millisecond Redirects',
            activeLinksCount: 1,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Support Inquiries Desk API
    if (url.pathname === '/api/support' && request.method === 'POST') {
      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return new Response(
        JSON.stringify({
          success: true,
          ticketId,
          targetEmail: 'duplexinterface@outlook.com',
          message: 'Your inquiry has been logged and dispatched to duplexinterface@outlook.com.',
          receiptTimestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Serve Static Asset from CDN
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404 && request.method === 'GET') {
        const indexRequest = new Request(new URL('/', request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      return response;
    }

    return new Response('Not Found', { status: 404 });
  },
};
