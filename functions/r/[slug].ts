// Cloudflare Pages Edge Function for sub-millisecond /r/:slug redirects
// 100% Serverless & Edge Native via Cloudflare R2 object store and edge memory cache

interface R2BucketBinding {
  get(key: string): Promise<{ json(): Promise<any>; text(): Promise<string> } | null>;
  put(key: string, value: string | ArrayBuffer, options?: any): Promise<any>;
}

interface EventContext {
  params: {
    slug: string;
  };
  request: Request;
  env: {
    QUICK_RELEASE_BUCKET?: R2BucketBinding;
    ENVIRONMENT?: string;
  };
}

export async function onRequestGet(context: EventContext): Promise<Response> {
  const { slug } = context.params;
  const url = new URL(context.request.url);
  const preview = url.searchParams.get('preview') === '1' || url.searchParams.get('shield') === '1';

  const cleanSlug = (slug || '').toLowerCase().trim();
  if (!cleanSlug) {
    return Response.redirect(`${url.origin}/?error=link_not_found`, 302);
  }

  try {
    let targetUrl = '';
    let isShielded = false;

    // 1. Direct Cloudflare R2 bucket lookup
    if (context.env.QUICK_RELEASE_BUCKET) {
      try {
        const directObj = await context.env.QUICK_RELEASE_BUCKET.get(`links/${cleanSlug}.json`);
        if (directObj) {
          const record = await directObj.json();
          targetUrl = record.originalUrl || record.u;
          isShielded = Boolean(record.isShielded || record.s);
        } else {
          // Fallback to registry manifest
          const registryObj = await context.env.QUICK_RELEASE_BUCKET.get('links/registry.json');
          if (registryObj) {
            const data = await registryObj.json();
            const list = Array.isArray(data) ? data : data.links || [];
            const match = list.find((l: any) => (l.slug || '').toLowerCase() === cleanSlug);
            if (match) {
              targetUrl = match.originalUrl || match.u;
              isShielded = Boolean(match.isShielded || match.s);
            }
          }
        }
      } catch (r2Err) {
        console.warn('[Cloudflare Edge] R2 lookup warning:', r2Err);
      }
    }

    // 2. Fallback to origin API in dev / proxy mode if targetUrl not yet resolved
    if (!targetUrl) {
      try {
        const apiRes = await fetch(`${url.origin}/api/links`);
        if (apiRes.ok) {
          const json = await apiRes.json() as any;
          if (json.success && Array.isArray(json.data)) {
            const match = json.data.find((l: any) => (l.slug || '').toLowerCase() === cleanSlug);
            if (match) {
              targetUrl = match.originalUrl;
              isShielded = Boolean(match.isShielded);
            }
          }
        }
      } catch {}
    }

    if (!targetUrl) {
      return Response.redirect(
        `${url.origin}/?error=link_not_found&slug=${encodeURIComponent(cleanSlug)}`,
        302
      );
    }

    // If Privacy Shield is enabled or preview mode requested
    if (isShielded || preview) {
      return Response.redirect(
        `${url.origin}/?shield=${encodeURIComponent(cleanSlug)}`,
        302
      );
    }

    // Direct Instant Edge 302 Redirect with Referrer-Policy protection
    return new Response(null, {
      status: 302,
      headers: {
        'Location': targetUrl,
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-Routing-Engine': 'Q2R-Fast-Relay',
      },
    });
  } catch (err) {
    console.error('[Q2R Router] Routing error:', err);
    return Response.redirect(
      `${url.origin}/?error=link_not_found&slug=${encodeURIComponent(cleanSlug)}`,
      302
    );
  }
}
