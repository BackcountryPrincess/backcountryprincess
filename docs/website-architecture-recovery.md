# MapleSAP Website Architecture Recovery

## Current Finding

`maplesap.app` and `www.maplesap.app` do not have authoritative DNS records in Cloudflare DNS, so those hostnames fail before they can reach the Worker.

`app.maplesap.app` and `lab.maplesap.app` resolve to Cloudflare and return HTTP 200.

## Intended Architecture

- `maplesap.app`: public marketing website
- `www.maplesap.app`: canonical redirect to `https://maplesap.app`
- `app.maplesap.app`: production application
- `lab.maplesap.app`: development / experimental application

## Required Cloudflare DNS Records

Create proxied records in the `maplesap.app` zone:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| A | `@` | `192.0.2.1` | Proxied |
| CNAME | `www` | `maplesap.app` | Proxied |

For a Worker route, the proxied target IP for `@` can be a placeholder because Cloudflare will intercept the request at the edge. The important requirement is that an orange-cloud DNS record exists for the hostname.

## Worker Routes

Expected routes:

- `maplesap.app/*`
- `www.maplesap.app/*`
- `app.maplesap.app/*`
- `lab.maplesap.app/*`

## Deployment Rule

The old GreenGeeks GitHub Action is disabled. Future website deployment should use Cloudflare Worker deployment only.
