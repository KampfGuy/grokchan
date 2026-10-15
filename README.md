# Grok-Chan
Static chat UI on GitHub Pages. The OpenRouter API key is **not** in this repo: it lives only as a secret in a Cloudflare Worker (`grokchan-api`), which proxies requests to OpenRouter. The Worker requires an access password (`X-Access-Password`) and only allows the `https://kampfguy.github.io` origin.
