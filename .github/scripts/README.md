# GitHub Actions: search-engine pings

This repo automatically pings two search engines after every push to `main`:

| Workflow | Search engines | Status |
|----------|---------------|--------|
| `.github/workflows/indexnow.yml` | Bing, Yandex, Seznam, Naver | Active |
| `.github/workflows/google-indexing.yml` | Google | **Requires one-time GCP setup (below)** |

Both workflows wait 75s for Vercel to deploy, then submit only the HTML pages
that actually changed in that push (using `git diff`). They skip silently if
nothing relevant changed.

---

## Google Indexing API: one-time setup

> **Important caveat:** Google's Indexing API is officially restricted to
> `JobPosting` and live `BroadcastEvent` content. Submitting general blog/tool
> URLs works in practice but is unsupported. Google can ignore submissions or
> revoke API access at their discretion. The workflow is built so it can be
> safely disabled by removing the `GOOGLE_SERVICE_ACCOUNT_JSON` secret — without
> that secret, it short-circuits and stays green.

### 1. Create a Google Cloud project

1. Go to <https://console.cloud.google.com/projectcreate>
2. Project name: `vti-and-chill-indexing` (or whatever you like)
3. Click **Create**, then make sure that project is selected at the top of the
   console.

### 2. Enable the Indexing API

1. Visit <https://console.cloud.google.com/apis/library/indexing.googleapis.com>
2. Click **Enable**.

### 3. Create a service account

1. Go to <https://console.cloud.google.com/iam-admin/serviceaccounts>
2. Click **Create Service Account**.
   - Name: `indexnow-bot`
   - Skip the "grant access" steps; the API permission is granted in Search
     Console, not in IAM.
3. Click **Create and continue → Done**.
4. Open the new service account → **Keys** tab → **Add key → Create new key →
   JSON**. A `*.json` file downloads. Treat this like a password.

### 4. Add the service account as an OWNER of your Search Console property

This is the part everyone forgets and is what most "401 / not authorized"
errors come from.

1. Open <https://search.google.com/search-console>
2. Pick the property `https://www.vtiandchill.com/` (or `vtiandchill.com`).
   - **It must be the exact same property** Google has verified for you. If you
     only have a Domain property, that's fine — use it.
3. ⚙️ **Settings → Users and permissions → Add user**.
4. Email = the service account's `client_email` from the JSON file (looks like
   `indexnow-bot@vti-and-chill-indexing.iam.gserviceaccount.com`).
5. Permission level: **Owner** (Indexing API requires Owner, not just Full).
6. **Add**.

### 5. Add the JSON key as a GitHub secret

1. <https://github.com/joelpolanco/vti-and-chill/settings/secrets/actions>
2. **New repository secret**.
   - Name: `GOOGLE_SERVICE_ACCOUNT_JSON`
   - Value: paste the **entire JSON file contents** (open it in a text editor,
     copy everything from `{` to `}`).
3. **Add secret**.

That's it. The next push to `main` that touches an `.html` file will fire the
workflow, mint a token from the JSON key, and POST each changed URL to
`https://indexing.googleapis.com/v3/urlNotifications:publish` with
`type=URL_UPDATED`.

### Verifying it worked

Open the latest run of **Google Indexing API ping** under
<https://github.com/joelpolanco/vti-and-chill/actions>. Look for lines like:

```
[ok] https://www.vtiandchill.com/pages/blog/your-new-post.html  (HTTP 200)
```

If you see `HTTP 403` with `Permission denied. Failed to verify the URL
ownership.`, the service account hasn't been added as an Owner in Search
Console yet (step 4).

If you see `HTTP 429`, you've hit the daily quota (default 200 URL submissions
per day, which is plenty for this site).

### Disabling Google indexing pings

Either:
- Delete the `GOOGLE_SERVICE_ACCOUNT_JSON` secret (workflow short-circuits and
  stays green), **or**
- Delete `.github/workflows/google-indexing.yml`.

IndexNow (Bing/Yandex) is unaffected either way.
