Card preview art (**1200×750 PNG**). Files are **stock photos** cropped for the hub, showcase, and play cards.

## Refresh from the internet

```bash
pip install pillow
python scripts/fetch_preview_images.py
```

## Sources & licenses

| File | Source | License |
|------|--------|---------|
| `deadtakeover.png` | [Pexels — zombies near an abandoned car](https://www.pexels.com/photo/zombies-near-an-abandoned-car-5435456/) | [Pexels License](https://www.pexels.com/license/) |
| `craftverse.png` | [Pexels — colorful building blocks](https://www.pexels.com/photo/163064/play-stone-network-networked-interactive/) | [Pexels License](https://www.pexels.com/license/) |
| `mindcraft.png` | [Unsplash — lines of HTML code on a screen](https://unsplash.com/photos/lines-of-html-codes-4hbJ-eymZ1o) | [Unsplash License](https://unsplash.com/license) |

URLs used by the script live in `scripts/fetch_preview_images.py`. If a CDN link breaks, update that file and run the script again.

## Offline generator (optional)

Procedural placeholders (no network):

```bash
pip install pillow
python scripts/generate_preview_images.py
```

Hub and Showcase load these files from `/ai-game-lab/showcase/previews/*.png`.
