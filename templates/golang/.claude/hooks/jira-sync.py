#!/usr/bin/env python3
"""
jira-sync.py
EXAMPLE FILE -- Adapt to your project management platform before use.
Syncs Claude Code workflow events to Jira or Linear.

Note: GitHub Projects integration is not implemented. Use Jira or Linear.

Usage:
  python3 jira-sync.py --ticket PROJ-123 --status "In Review" --comment "AI review completed: APPROVED"
  python3 jira-sync.py --ticket PROJ-123 --transition "QA" --comment "Code review passed"

Environment Variables:
  JIRA_BASE_URL    -- e.g., https://yourorg.atlassian.net
  JIRA_EMAIL       -- your Jira email
  JIRA_API_TOKEN   -- Jira API token (from Atlassian account settings)
  JIRA_PROJECT_KEY -- e.g., PROJ, HIRE, APP

For Linear: set LINEAR_API_KEY instead
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.parse
from base64 import b64encode

# -- Configuration ---------------------------------------------------------------

JIRA_BASE_URL = os.getenv("JIRA_BASE_URL", "")
JIRA_EMAIL = os.getenv("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")

LINEAR_API_KEY = os.getenv("LINEAR_API_KEY", "")

# -- Jira Client -----------------------------------------------------------------

class JiraClient:
    def __init__(self, base_url: str, email: str, token: str):
        self.base_url = base_url.rstrip("/")
        credentials = b64encode(f"{email}:{token}".encode()).decode()
        self.headers = {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _request(self, method: str, path: str, body: dict | None = None):
        url = f"{self.base_url}/rest/api/3{path}"
        data = json.dumps(body).encode("utf-8") if body else None
        req = urllib.request.Request(url, data=data, headers=self.headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            print(f"Jira API error {e.code}: {e.read().decode()}", file=sys.stderr)
            return None

    def add_comment(self, ticket_id: str, comment: str) -> bool:
        result = self._request("POST", f"/issue/{ticket_id}/comment", {
            "body": {
                "type": "doc",
                "version": 1,
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": comment}]}],
            }
        })
        return result is not None

    def transition_issue(self, ticket_id: str, status_name: str) -> bool:
        """Transition issue to a named status."""
        transitions = self._request("GET", f"/issue/{ticket_id}/transitions")
        if not transitions:
            return False
        match = next(
            (t for t in transitions.get("transitions", [])
             if t["name"].lower() == status_name.lower()),
            None
        )
        if not match:
            available = [t["name"] for t in transitions.get("transitions", [])]
            print(f"Status '{status_name}' not found. Available: {available}")
            return False
        result = self._request("POST", f"/issue/{ticket_id}/transitions", {"transition": {"id": match["id"]}})
        return result is not None


# -- Linear Client ---------------------------------------------------------------

class LinearClient:
    GRAPHQL_URL = "https://api.linear.app/graphql"

    def __init__(self, api_key: str):
        self.headers = {
            "Authorization": api_key,
            "Content-Type": "application/json",
        }

    def _graphql(self, query: str, variables: dict) -> dict | None:
        data = json.dumps({"query": query, "variables": variables}).encode()
        req = urllib.request.Request(self.GRAPHQL_URL, data=data, headers=self.headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except Exception as e:
            print(f"Linear API error: {e}", file=sys.stderr)
            return None

    def add_comment(self, issue_id: str, comment: str) -> bool:
        result = self._graphql(
            "mutation CreateComment($issueId: String!, $body: String!) { commentCreate(input: {issueId: $issueId, body: $body}) { success } }",
            {"issueId": issue_id, "body": comment},
        )
        return result and result.get("data", {}).get("commentCreate", {}).get("success", False)


# -- Main ------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Sync workflow events to project management tool")
    parser.add_argument("--ticket", required=True, help="Ticket/issue ID (e.g., PROJ-123)")
    parser.add_argument("--status", help="New status to transition to")
    parser.add_argument("--comment", help="Comment to add to the ticket")
    parser.add_argument("--platform", default="auto", choices=["jira", "linear", "auto"],
                        help="PM platform (auto-detects from env vars)")
    args = parser.parse_args()

    platform = args.platform
    if platform == "auto":
        platform = "jira" if JIRA_API_TOKEN else "linear" if LINEAR_API_KEY else None

    if not platform:
        print("INFO: No PM platform configured -- set JIRA_API_TOKEN or LINEAR_API_KEY")
        sys.exit(0)

    print(f"Syncing to {platform.upper()}: ticket={args.ticket}")

    if platform == "jira":
        if not all([JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN]):
            print("WARNING: JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN must all be set", file=sys.stderr)
            sys.exit(1)
        client = JiraClient(JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)
        if args.comment:
            ok = client.add_comment(args.ticket, args.comment)
            print(f"  {'OK' if ok else 'FAIL'}: Comment {'added' if ok else 'FAILED'}")
        if args.status:
            ok = client.transition_issue(args.ticket, args.status)
            print(f"  {'OK' if ok else 'FAIL'}: Status transition to '{args.status}' {'succeeded' if ok else 'FAILED'}")

    elif platform == "linear":
        if not LINEAR_API_KEY:
            print("WARNING: LINEAR_API_KEY must be set", file=sys.stderr)
            sys.exit(1)
        client = LinearClient(LINEAR_API_KEY)
        if args.comment:
            ok = client.add_comment(args.ticket, args.comment)
            print(f"  {'OK' if ok else 'FAIL'}: Comment {'added' if ok else 'FAILED'}")
        if args.status:
            print("  INFO: Status transitions for Linear require the issue UUID -- update this script with your workflow state IDs")

    print("Done.")


if __name__ == "__main__":
    main()
