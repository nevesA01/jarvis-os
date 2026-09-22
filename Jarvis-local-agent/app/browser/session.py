from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

from app.config import AgentConfig
from app.policies.engine import LocalPolicy
from app.security.injection_guard import contains_prompt_injection
from app.security.url_policy import validate_redirect


@dataclass
class BrowserEvidence:
    urls_visited: list[str] = field(default_factory=list)
    steps: int = 0
    downloads: int = 0


class IsolatedBrowser:
    def __init__(self, config: AgentConfig, policy: LocalPolicy) -> None:
        self.config = config
        self.policy = policy
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.evidence = BrowserEvidence()

    async def start(self) -> None:
        if self.context is not None:
            return
        self.config.browser_profile_path.mkdir(parents=True, exist_ok=True)
        self.config.downloads_path.mkdir(parents=True, exist_ok=True)
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch_persistent_context(
            user_data_dir=str(self.config.browser_profile_path),
            headless=False,
            accept_downloads=True,
            downloads_path=str(self.config.downloads_path),
            viewport={"width": 1280, "height": 800},
            args=["--disable-extensions", "--disable-sync", "--disable-features=PasswordManagerOnboarding,AutofillServerCommunication"],
        )
        self.context = self._browser
        self.context.set_default_timeout(self.config.browser_timeout_ms)
        self.context.on("page", self._on_new_page)

    async def close(self) -> None:
        if self.context is not None:
            await self.context.close()
        if self._playwright is not None:
            await self._playwright.stop()
        self.context = None
        self._browser = None
        self._playwright = None

    async def open_url(self, url: str) -> dict[str, str]:
        self._require_context()
        validate_redirect(self.policy, url)
        if len(self.context.pages) >= self.config.max_tabs:
            raise ValueError("max_tabs_exceeded")
        page = await self.context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded")
            self._record_url(page)
        except Exception:
            await page.close()
            raise
        return {"url": page.url, "title": await page.title()}

    async def read_page(self, page: Page | None = None) -> dict[str, str | bool]:
        active = page or self._active_page()
        self._record_url(active)
        text = (await active.locator("body").inner_text())[: self.config.max_page_text_bytes]
        return {
            "url": active.url,
            "title": await active.title(),
            "text": text,
            "prompt_injection_suspected": contains_prompt_injection(text),
        }

    async def list_links(self, page: Page | None = None) -> list[dict[str, str]]:
        active = page or self._active_page()
        links = await active.locator("a[href]").evaluate_all(
            "elements => elements.map(element => ({text: (element.innerText || '').slice(0, 300), href: element.href})).slice(0, 100)"
        )
        safe_links = []
        for link in links:
            if isinstance(link, dict) and isinstance(link.get("href"), str):
                allowed, _ = self.policy.allows_url(link["href"])
                if allowed:
                    safe_links.append({"text": str(link.get("text", "")), "href": link["href"]})
        return safe_links

    async def search_page(self, query: str, page: Page | None = None) -> dict[str, object]:
        active = page or self._active_page()
        if not query.strip() or len(query) > 200:
            raise ValueError("invalid_search_query")
        count = await active.locator("body").get_by_text(query, exact=False).count()
        return {"query": query, "matches": count, "url": active.url}

    async def take_screenshot(self, page: Page | None = None) -> bytes:
        active = page or self._active_page()
        return await active.screenshot(type="png", full_page=False)

    async def fill_field(self, selector: str, value: str, page: Page | None = None) -> None:
        active = page or self._active_page()
        if not selector or len(selector) > 500 or len(value) > 10_000:
            raise ValueError("field_input_too_large")
        await active.locator(selector).fill(value)

    async def preview_form(self, page: Page | None = None) -> dict[str, object]:
        active = page or self._active_page()
        fields = await active.locator("input, textarea, select, button[type=submit]").evaluate_all(
            "elements => elements.map(element => ({tag: element.tagName, type: element.type || '', name: element.name || '', value: element.value || '', text: (element.innerText || '').slice(0, 200)}))"
        )
        return {"url": active.url, "fields": fields}

    async def request_submit(self, *, approval_hash: str, expected_hash: str, page: Page | None = None) -> dict[str, object]:
        if approval_hash != expected_hash:
            raise ValueError("action_hash_mismatch")
        raise ValueError("submit_requires_phase_e_domain_test_and_native_approval")

    def _active_page(self) -> Page:
        self._require_context()
        if not self.context.pages:
            raise ValueError("no_browser_page")
        return self.context.pages[-1]

    def _require_context(self) -> None:
        if self.context is None:
            raise RuntimeError("browser_not_started")

    def _record_url(self, page: Page) -> None:
        validate_redirect(self.policy, page.url)
        if page.url not in self.evidence.urls_visited:
            self.evidence.urls_visited.append(page.url)

    async def _on_new_page(self, page: Page) -> None:
        if len(self.context.pages) > self.config.max_tabs:
            await page.close()
            return
        page.on("framenavigated", lambda frame: validate_redirect(self.policy, frame.url) if frame == page.main_frame else None)
