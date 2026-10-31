import asyncio
import ipaddress
import re
import socket
from html import unescape
from urllib.parse import urlparse

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
MAX_TEXT_LENGTH = 18000
MAX_RESOURCES = 40


class CrawlRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


async def validate_public_https_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Only public HTTPS source pages are allowed.")
    try:
        records = await asyncio.get_running_loop().getaddrinfo(
            parsed.hostname,
            443,
            type=socket.SOCK_STREAM,
        )
    except OSError as error:
        raise ValueError("The source hostname could not be resolved.") from error
    addresses = {record[4][0] for record in records}
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("Private and reserved source hosts are not allowed.")
    return value


def extract_text(value: str) -> str:
    value = re.sub(r"<(script|style|noscript|svg)\b[^>]*>[\s\S]*?</\1\s*>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<!--[\s\S]*?-->", " ", value)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", unescape(value)).strip()[:MAX_TEXT_LENGTH]


@app.get("/health")
async def health():
    return {"status": "ok", "crawler": "crawl4ai"}


@app.post("/crawl")
async def crawl(request: CrawlRequest):
    try:
        await validate_public_https_url(request.url)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    resource_count = 0
    source_hostname = urlparse(request.url).hostname

    async def on_page_context_created(page, context, **_kwargs):
        async def guard_request(route):
            nonlocal resource_count
            target = route.request.url
            parsed = urlparse(target)
            if parsed.scheme in ("data", "blob", "about"):
                await route.continue_()
                return
            if parsed.hostname != source_hostname:
                await route.abort()
                return
            if route.request.resource_type in ("image", "media", "font"):
                await route.abort()
                return
            resource_count += 1
            if resource_count > MAX_RESOURCES:
                await route.abort()
                return
            try:
                await validate_public_https_url(target)
            except ValueError:
                await route.abort()
                return
            await route.continue_()

        await context.route("**/*", guard_request)
        return page

    browser = BrowserConfig(headless=True, verbose=False)
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        page_timeout=20000,
        wait_until="domcontentloaded",
    )
    try:
        async with AsyncWebCrawler(config=browser) as crawler:
            crawler.crawler_strategy.set_hook("on_page_context_created", on_page_context_created)
            result = await crawler.arun(request.url, config=run_config)
    except Exception as error:
        raise HTTPException(status_code=502, detail="The Crawl4AI browser could not fetch this source.") from error

    if not result.success:
        raise HTTPException(status_code=502, detail=result.error_message or "The page could not be rendered.")
    try:
        final_url = await validate_public_https_url(result.url)
    except ValueError as error:
        raise HTTPException(status_code=502, detail="The page redirected to a disallowed source.") from error

    markdown = result.markdown
    if isinstance(markdown, dict):
        markdown = markdown.get("raw_markdown") or markdown.get("fit_markdown") or ""
    elif not isinstance(markdown, str):
        markdown = getattr(markdown, "raw_markdown", "") or ""
    rendered = markdown or result.cleaned_html or result.html or ""
    text = extract_text(rendered)
    if not text:
        raise HTTPException(status_code=422, detail="The rendered source contained no extractable text.")
    return {"url": final_url, "text": text[:MAX_TEXT_LENGTH]}
