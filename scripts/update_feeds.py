#!/usr/bin/env python3
"""Refresh the static AI briefing data used by the desk page."""

from __future__ import annotations

import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "desk" / "data" / "feeds.json"
ITEMS_PER_SOURCE = 10
SOURCES = (
    ("新智元", "https://aiera.com.cn/feed/", "https://aiera.com.cn/"),
    ("量子位", "https://www.qbitai.com/feed/", "https://www.qbitai.com/"),
    (
        "机器之心",
        "https://wechat2rss.xlab.app/feed/51e92aad2728acdd1fda7314be32b16639353001.xml",
        "https://www.jiqizhixin.com/",
    ),
)


def read_existing() -> dict:
    try:
        return json.loads(OUTPUT.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {"items": []}


def item_text(item: ET.Element, tag: str) -> str:
    element = item.find(tag)
    return " ".join((element.text or "").split()) if element is not None else ""


def fetch_source(name: str, url: str) -> list[dict[str, str]]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; TerialionHomepage/1.0)",
            "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        root = ET.fromstring(response.read())

    articles = []
    for item in root.findall(".//item")[:ITEMS_PER_SOURCE]:
        title = item_text(item, "title")
        link = item_text(item, "link")
        published = item_text(item, "pubDate")
        if not title or not link.startswith("https://") or not published:
            continue
        published_at = parsedate_to_datetime(published)
        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)
        articles.append(
            {
                "source": name,
                "title": title,
                "url": link,
                "publishedAt": published_at.astimezone(timezone.utc)
                .isoformat(timespec="seconds")
                .replace("+00:00", "Z"),
            }
        )

    if not articles:
        raise ValueError("feed contained no usable articles")
    return articles


def main() -> None:
    existing = read_existing()
    previous = existing.get("items", [])
    articles = []
    failures = []

    for name, url, _ in SOURCES:
        try:
            articles.extend(fetch_source(name, url))
        except Exception as error:  # Preserve yesterday's data when a publisher is down.
            fallback = [item for item in previous if item.get("source") == name]
            articles.extend(fallback)
            failures.append(f"{name}: {error}")

    if not articles:
        raise RuntimeError("all feeds failed and no previous data is available")

    articles.sort(key=lambda item: item["publishedAt"], reverse=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
        "sources": [
            {"name": name, "feed": url, "homepage": homepage}
            for name, url, homepage in SOURCES
        ],
        "items": articles,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(OUTPUT)

    if failures:
        print("Some feeds used cached data:", *failures, sep="\n- ", file=sys.stderr)
    print(f"Wrote {len(articles)} articles to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
