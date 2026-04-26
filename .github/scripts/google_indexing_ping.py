#!/usr/bin/env python3
"""
Submit URLs to Google's Indexing API (urlNotifications:publish).

Reads:
  - GOOGLE_SERVICE_ACCOUNT_JSON  : service-account JSON key (full file contents)
  - URL_LIST_FILE                : path to a file with one URL per line

Behavior:
  - Mints a JWT from the service-account key, exchanges it for an OAuth token,
    then POSTs each URL with type=URL_UPDATED.
  - Treats per-URL failures as warnings, not workflow failures, unless ALL
    submissions fail.

Note: Google's Indexing API is officially only for JobPosting / BroadcastEvent.
Submitting general content URLs is unsupported by Google's terms.
"""
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
except ImportError:
    print("ERROR: cryptography package required. pip install cryptography", file=sys.stderr)
    sys.exit(2)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish"
SCOPE = "https://www.googleapis.com/auth/indexing"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def make_jwt(sa: dict) -> str:
    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT", "kid": sa.get("private_key_id", "")}
    claims = {
        "iss": sa["client_email"],
        "scope": SCOPE,
        "aud": GOOGLE_TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = (
        b64url(json.dumps(header, separators=(",", ":")).encode("utf-8")).encode("ascii")
        + b"."
        + b64url(json.dumps(claims, separators=(",", ":")).encode("utf-8")).encode("ascii")
    )
    private_key = serialization.load_pem_private_key(
        sa["private_key"].encode("utf-8"), password=None
    )
    sig = private_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    return signing_input.decode("ascii") + "." + b64url(sig)


def exchange_for_token(jwt_str: str) -> str:
    body = (
        "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + jwt_str
    ).encode("utf-8")
    req = urllib.request.Request(
        GOOGLE_TOKEN_URL,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if "access_token" not in payload:
        raise RuntimeError(f"Token exchange failed: {payload}")
    return payload["access_token"]


def publish_url(token: str, url: str) -> tuple[bool, str]:
    body = json.dumps({"url": url, "type": "URL_UPDATED"}).encode("utf-8")
    req = urllib.request.Request(
        INDEXING_API_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return True, f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8", errors="replace")[:300]
        except Exception:
            err_body = ""
        return False, f"HTTP {e.code}: {err_body}"
    except Exception as e:  # noqa: BLE001
        return False, f"Error: {e}"


def main() -> int:
    sa_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    url_file = os.environ.get("URL_LIST_FILE", "").strip()
    if not sa_json:
        print("ERROR: GOOGLE_SERVICE_ACCOUNT_JSON not set", file=sys.stderr)
        return 2
    if not url_file or not os.path.exists(url_file):
        print(f"ERROR: URL_LIST_FILE missing or not found: {url_file}", file=sys.stderr)
        return 2

    try:
        sa = json.loads(sa_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: {e}", file=sys.stderr)
        return 2

    with open(url_file, "r", encoding="utf-8") as f:
        urls = [line.strip() for line in f if line.strip()]

    if not urls:
        print("No URLs to submit. Skipping.")
        return 0

    print(f"Minting Google Indexing API token for {sa.get('client_email', '?')}")
    jwt_str = make_jwt(sa)
    token = exchange_for_token(jwt_str)
    print(f"Got token. Submitting {len(urls)} URL(s) to Google Indexing API...")

    successes = 0
    failures = 0
    for url in urls:
        ok, msg = publish_url(token, url)
        marker = "ok" if ok else "FAIL"
        print(f"  [{marker}] {url}  ({msg})")
        if ok:
            successes += 1
        else:
            failures += 1

    print(f"\nDone. {successes} succeeded, {failures} failed (out of {len(urls)}).")
    if successes == 0:
        return 1  # All failed -> mark workflow as failed
    return 0


if __name__ == "__main__":
    sys.exit(main())
