# Wildernotes Privacy Policy

<!-- For the team: this is the public policy, linked from Settings and the store listing. Keep it true: update it whenever the extension starts sending or storing anything new (see docs/PUBLISHING.md). -->

**Effective date:** 2026-10-15
**Contact:** wildernotes.app@gmail.com

Wildernotes is a Chrome extension for annotating web pages and PDFs and studying your notes. It is built so that your notes stay on your computer.

## What Wildernotes stores

When you plant a note, Wildernotes saves it in your browser's extension storage (`chrome.storage.local`) on this computer only:

- the text you highlighted and a few words around it, so it can find the spot again;
- the address and title of the page;
- notes you type, screenshots you take, your forests, folders, links and quiz results;
- your settings, including any AI API key you enter.

We do not run a server. We (the developers) never receive, see or store your notes, browsing history or keys. There are no accounts, analytics, ads or trackers.

Wildernotes runs on the pages you visit so it can show your notes there, but it saves nothing from a page unless you plant a note on it. To find PDFs and open them in its own viewer, it checks the type of each page you open (only the "Content-Type" header); this is not stored.

## Optional AI features

Quizzes, study guides and "Grow from link" use an AI provider. They only work if you enter your own API key, and only run when you press their button. When you do, Wildernotes sends straight from your browser to the provider you chose:

- **Google Gemini** (`generativelanguage.googleapis.com`), or
- **Cerebras** (`api.cerebras.ai`)

the following: the text of the notes involved (and their page titles and your typed notes), and for "Grow from link", the text of the page you pasted. Your API key is sent only to that provider, to sign the request.

That provider handles the data under its own terms and privacy policy, which you agree to when you create your key: Google's Gemini API terms (https://ai.google.dev/gemini-api/terms) and Google's privacy policy, or Cerebras' terms and privacy policy. Note that on Google's free tier, Google may use what you send to improve its products, and people may review it. Do not use the AI features on text you would not want the provider to see. AI answers can be wrong; check them.

Your API key is stored in this browser's extension storage, not encrypted (the same as any extension setting). Remove it any time on the Settings page.

## Fetching pages

"Grow from link" downloads the page you paste, without your cookies or logins. A screenshot note takes a picture of the visible tab only when you drag one, and keeps it on your computer.

## Sharing and selling

We do not sell or share your data. The only data that leaves your browser is what is described under "Optional AI features", and only when you ask. Data is used only to provide Wildernotes' annotation and study features, in line with the Chrome Web Store User Data Policy, including its Limited Use requirements.

## Deleting your data

Delete notes or forests in the extension, remove your key on the Settings page, or uninstall the extension to delete everything it stored. Data you already sent to an AI provider is governed by that provider's policy.

## Children

Wildernotes is not directed at children under 13, and we do not knowingly collect personal information from anyone. The AI providers set their own age rules for API keys (Google's Gemini API requires users to be 18 or older).

## Changes

If this policy changes, we will update the effective date above and describe the change in the extension's release notes.
