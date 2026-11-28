# PUBLISHING.md — titles, descriptions and tags (YouTube Shorts + Instagram Reels)

Read this before naming and posting an episode, and **update it after every episode** (channel results table + anything learned).
Every episode gets a `episodes/<ep>/publish.md` with the ready-to-paste YouTube and Instagram text (template at the bottom).

## Channel results (Tales of Bloxcity, public view counts)
| Episode | Title as posted | Views | Checked |
|---|---|---|---|
| EP01 | He touched the cake at 3 AM… 😳🍰 | 9.9K (3.4K the day before: still growing) | 2026-11-28 |
| — | There is a Ghost in Grandma's house! | 2.5K | 2026-11-28 |
| — | The ghost came back!!! | 1.3K | 2026-11-28 |
| EP03 | Breaking the window | 681 | 2026-11-28 |
| — | She said "don't open the box"… so the whole city chased me | 291 | 2026-11-28 |
| EP04 | *(not posted yet; see episodes/ep04/publish.md)* | | |

What the channel's own numbers say so far: the one-room night story with a clear forbidden thing + a fake-out (EP01) wins by a mile;
long and fast multi-location stories (EP03) and vague titles ("Breaking the window") do worst.

## What the niche data says (Nov 2026)
Data: 883 public Shorts from 39 searches in our niche (Roblox-style / blocky animated family stories, 3 AM stories, "in this town" stories),
scraped with `tools/research-titles.py`; raw rows in `research/2026-11-shorts-titles.csv`, searches in `research/queries.txt`.
Numbers are medians of public view counts. **Correlation from search results, not a controlled test**: search favours videos that already won,
and channel size matters more than wording. Treat it as direction, then check against our own results table above.

| Title format | n | Median views | Notes / biggest examples |
|---|---|---|---|
| All Roblox-style story Shorts (baseline) | 432 | 14K | |
| **"POV: you …"** | 12 | **~234K** | "POV: You Just Finished Playing a Roblox Horror Game" 7.8M, "POV: You're the Last Person on Roblox" 3.4M |
| **"When your …" / "Your …"** (relatable, 2nd person) | 17+ | 24K | the biggest hits of the whole set: "When Your Mom Forgets To Buy Something at Mall" 140M, "Your Big brother always stealing your food and this happened😭" 114M, "When your sibling makes the story sound way worse😭" 59M, "When siblings blaming each other😭" 27M |
| **"In this world / town …" + one strange rule** | 226 | 19K | steady (15 % pass 100K) but fewer mega-hits (7 % pass 1M vs 16 % for other niche titles). See next section |
| Third person story ("He…", "She…") | 50 | 27.5K | "She Got ARRESTED For Drawing On Her Desk… 😨✏️" 7.1M |
| First person story ("I…", "My…") | 157 | 14K | works when the claim is bold: "Nobody Came to My Lemonade Stand, So I Called the Army 🍋" 3.4M, "My Baby Sister Has A DIARY…" 8.7M |
| **"3 AM" / "midnight" hook** | 58 | **~2.4K** | over-used: 100+ near-identical titles. The one big hit adds a relatable situation: "Sneaking at 12am to play games with your siblings 😂😂" 84M |
| "… be like" meme format | 31 | 6.4K | |

The common thread in the 10M+ titles: **a situation almost every kid has lived** (sibling steals your food, mom catches you, blaming each other,
sneaking games/snacks), told so the viewer sees *themselves* in it. Family words alone don't help; the *relatable situation* does.

### "In this town / world" format
- Variants: **"In this world"** median 26K (8 of 59 passed 1M) > **"In this town"** 19K (8 of 129) > "In this city" 4.4K (0 of 9; our "…the whole city chased me" short also did poorly).
- The hits all name **one concrete, slightly absurd rule**, often with the key word in CAPS and a 😭/💀:
  "In This World… Everyone Is Born With One Word They Can't Say" 18M · "In This World, MOVING is deadly…😭" 11M ·
  "In This Town, A Game Of Tag Is Deadly💀" 5.4M · "In this world, everyone gets one superpower, but only once." 4.9M ·
  "In This Town, If You Lie, You Grow 🌿" 1.4M · "In This Town, You Can't Say No" 1.4M.
- It is a **story format, not just a title**: the whole short has to be built around the rule (rule → a kid breaks it → consequence → twist).
  Don't bolt "In this town" onto a story that has no rule.
- Fits our sets: the cozy room (EP01/EP04), the street with houses, the candy shop and the park (EP02/EP03). Ideas for a rule episode:
  - "In This Town, Every Lie Makes Your Hair Grow 💇" (Dottie's excuses get longer, so does her hair; Mom's one tiny lie at the end)
  - "In This World, Candy Is ILLEGAL… 😭🍬" (Bean and Dottie smuggle a lollipop past Mr. Pickle; twist: Mr. Pickle runs the secret candy shop)
  - "In This Town, You Can't Laugh After 9 PM 🤐" (a sibling tickle war in the dark room; Mom bursts out laughing at the end)

## Title rules
1. **Lead with a relatable situation**, in this order of preference: `POV: you …` → `When your sister/brother/mom …` → `In this world/town, <one rule>` → `He/She …` story line.
2. Keep it short: ≤ 8 words before the emoji is the sweet spot (≤ 6 words: median 25K vs 15K for longer titles).
3. One CAPS word for the key idea, 1–2 emoji at the end (😭 💀 😳 + one topic emoji). Ellipsis `…` is fine but not magic.
4. "3 AM" is not a reach booster by itself. Use it only when it *is* the story, and pair it with the relatable part ("…with your sister").
5. Don't spoil the reveal *image*, but it's fine to name the situation: the top titles describe the setup and let the animation deliver the joke.
6. No third-party names, logos or brands (QUALITY.md). **Do not use #roblox / #robloxanimation / "Roblox" in titles or tags.**
   They are everywhere in the top results, but our characters are original, and YouTube's spam policy counts tags that don't match the video as misleading metadata.

## Descriptions and tags
Most Shorts views come from the feed, so the first 2 seconds and the title matter far more than the description. Keep the description small and accurate.

**YouTube Shorts**
- Description: 1–2 sentences that say what happens, with the searchable words (tooth fairy, sister, sneaking snacks, mom…) in the first line.
- Hashtags: `#shorts` + 3–4 specific ones, **in the description** (the first three show above the title). Title: 0–1 hashtag, at the end, if any.
- Keep it under ~5 hashtags total; no tag walls.
- Shared pool (pick the ones that fit): `#shorts #animation #3danimation #funny #siblings #sister #brother #mom #story #storytime #comedy #cartoon`
  + 1–2 story-specific (`#toothfairy`, `#3am`, `#candy`, `#lemonade`, `#ghost`…).

**Instagram Reels**
- **Hard limit: 5 hashtags per Reel** (Instagram cut it from 30 to 5 in Dec 2025; it counts caption + comments together).
- Instagram search reads the **caption keywords** more than hashtags: write one natural sentence with the topic words, then the 5 tags.
- Use the same title as the on-screen hook / cover text. Pick 5: 2 broad (`#animation #funny`), 2 topic, 1 format (`#siblings` / `#storytime`).
- No `#shorts` on Instagram; use `#reels` only if a slot is free.

## Per-episode checklist
1. Before writing the script: pick the title format first (relatable POV/When-your, or an "In this world" rule) and make sure the story delivers it.
2. Write `episodes/<ep>/publish.md` from the template below: 2–3 title options (best first), YouTube description + tags, Instagram caption + 5 tags.
3. After posting: add the episode to the results table above; after ~3 days update the views and note which title was used.
4. Every few episodes: re-run the research (`python3 -I tools/research-titles.py research/queries.txt research/out.json`) and refresh the tables.

## publish.md template
```
# EPxx — <working title>
## Titles (best first)
1. …
2. …
3. …
## YouTube
Title: …
Description:
<one sentence with the searchable words>
#shorts #… #… #…
## Instagram
Caption:
<one sentence with the searchable words>
#… #… #… #… #…   (max 5)
Cover text: …
```

## Sources
Niche data: our own scrape (above). Platform rules and practice (third-party guides unless noted; they disagree on details, YouTube publishes no official Shorts title/hashtag rules):
- Instagram 5-hashtag limit: [Social Media Today](https://www.socialmediatoday.com/news/instagrams-implementing-new-limits-on-hashtag-use/808309/) (quotes Instagram's statement),
  [Business Today](https://www.businesstoday.in/technology/news/story/no-more-hashtag-stuffing-instagram-limits-hashtag-usage-to-just-5-per-reel-and-post-507444-2025-12-19),
  [Social Media Examiner](https://www.socialmediaexaminer.com/what-clickable-reels-links-and-hashtag-limits-mean-for-your-2026-instagram-strategy/),
  [Metricool](https://metricool.com/instagram-limits/), [Digital Applied](https://www.digitalapplied.com/blog/instagram-limits-hashtags-5-organic-reach-strategy-2026)
- YouTube Shorts hashtags / descriptions: [hashtagtools.io placement guide](https://hashtagtools.io/blog/youtube-shorts-hashtags-title-vs-description-2026),
  [hashtagtools.io limits](https://hashtagtools.io/blog/youtube-shorts-character-limits-title-description-hashtags-2026),
  [Search Engine Land](https://searchengineland.com/guide/youtube-hashtags), [vidIQ descriptions](https://vidiq.com/vi/blog/post/youtube-video-descriptions/),
  [Metadata Reactor Shorts SEO](https://metadatareactor.com/blog/youtube-shorts-seo-guide/), [Schedulala](https://schedulala.com/blog/youtube-shorts-seo-optimize-for-discovery),
  [Miraflow](https://miraflow.ai/blog/youtube-shorts-hashtags-2026-do-they-still-matter), [postlinkapp](https://postlinkapp.com/blog/youtube-shorts-hashtags)
