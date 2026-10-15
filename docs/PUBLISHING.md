# Publishing Wildernotes on the Chrome Web Store

What we must do so the extension passes review and so we do not take on legal risk. Written 2026-10-15 after reading the code. This is a checklist from the published Chrome Web Store policies, not legal advice. If we ever charge money, add a server or collect accounts, get a real lawyer to read it.

The draft privacy policy is `docs/PRIVACY_POLICY.md`. Keep both files true: **any change that adds a permission, a network request, or a new kind of data leaving the browser must update both files in the same commit.**

---

## 1. What the extension does with data today (checked in the code)

| Data | Where it lives | Leaves the browser? |
|---|---|---|
| Seeds (highlighted text, page URL and title, notes, anchors), forests, roots, fruits | `chrome.storage.local`, this browser only | Only the parts listed below, only when the user presses an AI button |
| Screenshots (media seeds) | `chrome.storage.local` | Never |
| Gemini / Cerebras API keys | `chrome.storage.local`, not encrypted | Sent only to that provider's own address, as the key header of a request |
| Quiz request | | Up to 10 seeds' text (1,500 chars each) and page titles, to Google Gemini or Cerebras |
| Study guide (export) | | Up to 100 seeds' text, page titles and notes, to the chosen provider |
| Grow from link | | The extension fetches the pasted page (cookies off, `credentials: 'omit'`), then sends its text plus up to 150 seed snippets and notes to the chosen provider |
| Every web page the user visits | Nothing saved unless the user plants a seed | Never. (The font used to come from Google Fonts on every page; it is now bundled, M1.) |
| Tab screenshot (`captureVisibleTab`) | Cropped and saved locally | Never |
| PDF detection (`webRequest`) | Reads only the Content-Type header of top-level pages, in memory | Never |

There is no server, no account, no analytics, no ads, no selling of data. Uninstalling the extension deletes everything.

## 2. Must fix before submitting

- [x] **M1. Bundle the font.** Done 2026-10-15: `public/fonts/crafty-girls.woff2`, registered by `loadAppFont()` (`lib/theme/font.ts`) on web pages, the PDF page and the viewer. Google Fonts used to be loaded on every web page, which told Google every site the user visited.
- [x] **M2. Privacy policy contact and link.** Done 2026-10-15: contact is the shared team inbox **wildernotes.app@gmail.com**, which is also the developer dashboard's contact email (keep the two the same). The policy's public link is `https://github.com/dVillarosa287/RUHack2026/blob/main/docs/PRIVACY_POLICY.md` (also linked from Settings); paste it into the dashboard with section 5. The repo must stay public, or move the policy (GitHub Pages) and change `PRIVACY_POLICY_URL` in `SettingsPage.tsx`.
- [x] **M3. AI disclosure next to each key field.** Done 2026-10-15: `AiDisclosure` in `SettingsPage.tsx`, under both keys. It says which address the key and text go to, that the provider's terms apply (and Google's free-tier data use), that "Grow from link" sends the linked page, that AI can be wrong, and links the privacy policy.
- [ ] **M4. Permission justifications** in the dashboard (text in section 4 below). Reviewers reject vague ones.
- [ ] **M5. Fill in the Privacy practices tab** (section 5 below) so it matches the policy exactly. A mismatch is the most common rejection.
- [x] **M6. Licences and art.** Done 2026-10-15: the team confirmed all art is its own; `THIRD_PARTY_NOTICES.md` lists the bundled libraries and font; `lib/engine/lineBoil.ts` no longer copies the unlicensed tomcreighton/boil code. Never add art or code from somewhere without a licence that allows it.
- [x] **M7. Team agreement.** Done 2026-10-15: all four agreed in the team chat that David Villarosa publishes from his developer account (2-step verification on) and that the code is "All rights reserved" (`LICENSE`): public so anyone can check it, but nobody may copy or republish it.
- [x] **M8. Name check.** Done 2026-10-15: the user searched the USPTO trademark database. The web search found nothing called Wildernotes; a similar name, Wildnote (an environmental field-data app), is in a different market. Do not use Google's or Gemini's logos; saying "works with Google Gemini" in text is fine.

## 3. The API key: can we get in trouble, and how do we prove we do not misuse it?

Asking users for their own key ("bring your own key") is allowed and common on the store. The rules that matter:

- **The user is Google's (or Cerebras') customer, not us.** They make the key, accept the provider's terms themselves, and the usage is billed or counted against their own account. That means we are not reselling the API and we are not responsible for their account. The Gemini API terms say users must be 18 or older; the user agrees to that when they make the key. Our Settings page should say "your key, your account, the provider's terms apply".
- **We must not send the key anywhere else**, and we do not: it only goes into the `x-goog-api-key` header to `generativelanguage.googleapis.com` or the `Authorization` header to `api.cerebras.ai` (`lib/ai/gemini.ts`).

How a user (or a reviewer) can check that for themselves:

1. **Open source.** Make the GitHub repo public and link it from the store listing. Anyone can read `lib/ai/gemini.ts` and see every request. This is the strongest proof.
2. **No obfuscation.** The store forbids obfuscated code anyway, and reviewers read the built code. WXT's minified output is allowed. Do not add any code loaded from a server: all code must ship inside the extension (Manifest V3 rule).
3. **The provider's dashboard.** Every request shows up in the user's Google AI Studio / Cerebras usage page. They can compare it with the number of times they pressed an AI button.
4. **Chrome's own tools.** `chrome://extensions` → Wildernotes → "Inspect views: service worker" → Network tab shows every request the extension makes.
5. **Tell users to protect themselves:** in Google Cloud they can restrict the key to "Generative Language API" only, and they can delete it any time. Our Remove button deletes it from the extension.

What to put in the docs and Settings: "Your key is stored only in this browser (not encrypted, like any extension setting) and is sent only to [provider address] when you press an AI button. We have no server and never see your key or your notes."

Things that would get us in trouble, so never do them: send keys or notes to our own server, log them, put a default key of ours in the code (it would be stolen and abused, and someone's usage would be on our bill), or call the AI in the background without the user pressing a button.

## 4. Permission justifications (paste into the dashboard)

David pastes sections 4 and 5 into the Chrome Web Store developer dashboard, on the extension's **Privacy** tab: the single purpose statement into "Single purpose", each permission's line into that permission's justification box, "No" for remote code, then the data boxes, the three certifications and the privacy policy link.

- **storage:** Saves the user's notes, forests and settings in this browser.
- **unlimitedStorage:** Screenshots the user saves as notes are larger than the default 10 MB limit.
- **alarms:** The "active recall" feature reminds the user to review a note after a delay they choose (5 minutes by default).
- **webRequest:** Reads only the Content-Type header of pages the user opens, to open PDFs in the extension's own PDF viewer so they can be annotated. Nothing is changed, blocked or stored.
- **Host permission `<all_urls>`:** The extension's purpose is annotating any web page the user reads, so its toolbar and highlights run on every site. It is also needed to take a screenshot of the visible tab when the user drags a screenshot area, and to fetch a page the user pastes into "Grow from link". The extension reads page text only where the user highlights it.
- **Remote code:** No, the extension does not use remote code.

Broad host permissions mean an in-depth review that can take longer (days to a few weeks). Submit early.

**Single purpose statement:** "Wildernotes lets students annotate web pages and PDFs and study their notes later, with optional AI quizzes using their own API key."

## 5. Privacy practices tab (developer dashboard)

Answer these the same way as `docs/PRIVACY_POLICY.md`:

- Data the extension handles: **Website content** (highlighted text and the text of a page used in "Grow from link", sent to the user's chosen AI provider when asked). Also tick **Web history** (the addresses of annotated pages are stored with notes); it is stored only locally, but declaring it is the safe choice.
- Not collected: personally identifiable info, health, financial, authentication info, personal communications, location, user activity.
- Tick all three certifications: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used for creditworthiness or lending.
- Developer account: $5 fee, 2-step verification on, verified contact email. Declare "non-trader" under the EU rules as long as the extension is free and not a business; if we ever charge, we must become a trader and show a contact address.

## 6. Store listing

- [ ] 128×128 icon (`public/icon/`), at least one 1280×800 screenshot, a 440×280 small promo tile.
- [ ] Description that matches what it really does. No promises like "AI-powered" without saying a key is needed.
- [ ] `package.json` and manifest version bumped for every upload (store rejects the same version twice).
- [ ] Build with `npm run zip` and upload the zip from `.output/`.

## 7. Laws, briefly (why the risk is low)

- **GDPR (EU) / CCPA (California):** these apply to data a business collects. We collect nothing on our own servers, so most duties do not apply. The policy still says what goes to Google/Cerebras, and that users delete their data by removing notes or uninstalling.
- **Children (COPPA, US under 13):** the extension is for students. Say in the policy that it is not directed at children under 13 and that we collect no personal data from anyone. If we ever add accounts or a server, this needs a fresh look, especially for school use.
- **No warranty:** the AI can write wrong quiz answers. The policy and listing say AI output may be wrong; add the same line under quizzes in the app.
