# Nginx hardening recommendations

These are deployment recommendations only. Apply them in the live Nginx server block or included hardening snippet after validating in staging.

## Compression

Enable gzip for text-based responses:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;
gzip_min_length 1024;
```

## Hide Nginx version

Do not expose the Nginx version in error pages or response headers:

```nginx
server_tokens off;
```

## HSTS

After confirming the site is served only over HTTPS, add HSTS:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Do not add `preload` until every subdomain is confirmed HTTPS-only and the preload submission requirements are intentionally accepted.

## Intentionally not included

Do not add a Content-Security-Policy yet. The current app still uses inline scripts and third-party CDN assets, so CSP should be planned and tested separately to avoid breaking frontend behavior.
