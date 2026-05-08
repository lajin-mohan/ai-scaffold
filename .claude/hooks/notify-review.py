#!/usr/bin/env python3
"""
notify-review.py
Sends a notification when a code review is completed.
Adapt to your notification platform (Slack, Teams, email).

Usage (called from Claude Code hook or CI):
  python3 notify-review.py --result "APPROVED" --pr "123" --reviewer "Claude"
"""

import argparse
import json
import os
import sys
from datetime import datetime

# ── Configuration ─────────────────────────────────────────────────────────────
# Set these via environment variables or fill in directly for local use.

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
TEAMS_WEBHOOK_URL = os.getenv("TEAMS_WEBHOOK_URL", "")
PROJECT_NAME = os.getenv("PROJECT_NAME", "{{PROJECT_NAME}}")
REPO_URL = os.getenv("REPO_URL", "{{REPO_URL}}")

# ── Notification Functions ─────────────────────────────────────────────────────

def send_slack(message: dict) -> bool:
    """Send notification to Slack via incoming webhook."""
    if not SLACK_WEBHOOK_URL:
        print("INFO: SLACK_WEBHOOK_URL not set - skipping Slack notification")
        return False

    try:
        import urllib.request
        data = json.dumps(message).encode("utf-8")
        req = urllib.request.Request(
            SLACK_WEBHOOK_URL,
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"⚠ Slack notification failed: {e}", file=sys.stderr)
        return False


def build_slack_message(result: str, pr: str, reviewer: str, summary: str) -> dict:
    """Build a Slack Block Kit message for review completion."""
    emoji = {"APPROVED": "✅", "BLOCKED": "🔴", "APPROVED WITH WARNINGS": "🟡"}.get(result, "📋")
    color = {"APPROVED": "#22C55E", "BLOCKED": "#EF4444"}.get(result, "#F59E0B")

    return {
        "attachments": [{
            "color": color,
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"{emoji} *Code Review Complete* - {PROJECT_NAME}",
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Result:*\n{result}"},
                        {"type": "mrkdwn", "text": f"*PR:*\n<{REPO_URL}/pull/{pr}|#{pr}>"},
                        {"type": "mrkdwn", "text": f"*Reviewer:*\n{reviewer}"},
                        {"type": "mrkdwn", "text": f"*Time:*\n{datetime.now().strftime('%Y-%m-%d %H:%M')}"},
                    ],
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"*Summary:*\n{summary}"},
                },
            ],
        }]
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Send review completion notification")
    parser.add_argument("--result", required=True, help="APPROVED | BLOCKED | APPROVED WITH WARNINGS")
    parser.add_argument("--pr", required=True, help="PR number or identifier")
    parser.add_argument("--reviewer", default="Claude AI", help="Reviewer name")
    parser.add_argument("--summary", default="Review completed.", help="Brief summary of findings")
    args = parser.parse_args()

    print(f"📣 Sending review notification: {args.result} for PR #{args.pr}")

    # Slack
    slack_msg = build_slack_message(args.result, args.pr, args.reviewer, args.summary)
    if send_slack(slack_msg):
        print("  ✓ Slack notification sent")

    # Add other notification channels here
    # send_teams(build_teams_message(...))
    # send_email(...)

    print("Done.")


if __name__ == "__main__":
    main()
