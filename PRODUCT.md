# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Magic: The Gathering collectors and players in Brazil — not limited to the author. Primary audience is PT-BR-first, so language and market fit (not just feature parity with English-language tools) is part of who this serves.

## Product Purpose

Grimorio is a free personal MTG collection/deck manager. Its job is to track what cards someone owns, exactly where each physical card is stored, and to manage decks built from that collection (or from cards not yet owned). Planned future features: card scanning (OCR-assisted entry, already partially built via tesseract.js) and deck analysis.

## Positioning

Two combined differentiators versus generic collection/deck tools (Moxfield, Deckbox, spreadsheets):

- **Physical storage location tracking** — cards are tracked down to exactly where they physically live (box/binder/shelf via a nested `StorageLocation` tree), not just "owned/not owned."
- **PT-BR-first** — built for the Brazilian MTG audience specifically, not a translated afterthought. Future features are expected to make this positioning more apparent.

## Operating Context

Two distinct real usage scenes, both mattering equally:

- **Phone (installable PWA and/or the Android Capacitor build)**: quick, in-hand use while physically sorting or adding to a paper collection — scan a card, confirm/correct the match, assign or update its storage location, move to the next card. Speed and thumb-reachable controls matter most here.
- **PC (desktop browser or installed PWA)**: deckbuilding and collection management at larger scale — browsing/filtering a bigger collection, building and editing decks, more screen real estate for comparison and detail.

Android has a real native build (Capacitor + `android/`) because that's the author's own device; this is a responsive-web product with an Android wrapper, not an OS-specific design language — no iOS-native affordances are a goal, and no Android-Material-specific visual language is required either, since the same responsive UI serves phone (PWA or wrapped) and desktop alike.

## Capabilities and Constraints

- Card and deck data persists locally (localStorage-backed signal services) with a Supabase-hosted card catalog for lookups; no live Scryfall integration and no price data.
- Auth (Supabase) is entirely optional — sign-in is not required to use the app, no route guards.
- Must remain free with no ads or monetization plan.
- PT-BR only for now — no i18n/multi-language support planned.
- Must stay reasonably usable offline (PWA installable, service worker active in production builds).

## Brand Commitments

Name: **Grimorio** ("grimoire" in Portuguese) — reinforces the MTG/spellbook theme.

## Product Principles

- Physical-world fidelity: the app should always be able to answer "where is this card, right now" — that's the core value, not just cataloging ownership.
- PT-BR-first, not PT-BR-translated: language and audience fit for Brazilian collectors is a primary design input, not a localization layer bolted onto an English product.
- Free and accessible: no monetization pressure should shape feature or UX decisions.
- Works with what you have: offline-capable, no forced account, usable mid-collection-sorting session.
