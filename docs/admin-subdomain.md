# Admin subdomain deployment (Phase 1)

Phase 1 keeps the existing BestHome.az application architecture intact: `index.html` remains the single shell, `public/js/app.js` remains the browser-global integration layer, and the admin UI still lives in the current page. The only runtime separation added in this phase is host-based routing for `admin.besthome.az`.

## Current coupling summary

The public site and admin panel currently share the same HTML shell, script bundle order, API wrapper, authentication token storage, Socket.IO connection, uploads paths, and backend routes. Because of that coupling, `admin.besthome.az` should initially proxy to the same Node.js app as `besthome.az`; the frontend detects the admin host and opens the existing admin login/dashboard flow instead of the public homepage.

## Required DNS and proxy behavior

- Point `admin.besthome.az` to the same server as `besthome.az`.
- Proxy `admin.besthome.az` to the same Node.js app port used by the existing site.
- Keep the same backend, database, upload directory, API routes, authentication system, and Socket.IO endpoint.
- Use the same SSL/certificate renewal approach already used for `test.besthome.az`.

## Example Nginx server block

Adjust `server_name`, certificate paths, and `127.0.0.1:3000` to match the current production deployment.

```nginx
server {
    listen 80;
    server_name admin.besthome.az;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.besthome.az;

    # Use the same SSL provisioning pattern as test.besthome.az.
    ssl_certificate /etc/letsencrypt/live/admin.besthome.az/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.besthome.az/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Manual browser checklist

1. `besthome.az` still opens the public homepage.
2. `besthome.az` public login still works.
3. `admin.besthome.az` opens the admin login/admin panel flow.
4. A non-admin user cannot access the admin dashboard.
5. An admin user can log in and see the dashboard.
6. Admin CRUD still works.
7. Browser console has no `ReferenceError`.
8. JS/CSS assets have no 404 responses.
