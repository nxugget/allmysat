# Image Optimization Scripts

These scripts help you convert and optimize images without relying on Next.js Image cache optimization.

## Setup

First, install `sharp` (a fast image processing library):

```bash
npm install --save-dev sharp
```

## Step 1: Convert Images to WebP

```bash
node scripts/convert-to-webp.js
```

This script will:
- Convert all PNG/JPG images to WebP format
- Compress with quality 80 (optimized for web)
- Show you the size reduction percentage
- Keep original files intact

**Example output:**
```
✅ nasa.png
   145.32KB → 32.15KB (77.8% smaller)

✅ explainations.jpg
   256.78KB → 68.42KB (73.4% smaller)
```

## Step 2: Update Image References

Update your code to use .webp files:

**Before:**
```tsx
<Image src="/nasa.png" alt="NASA" width={128} height={128} />
<Image src="/carousel/satellite.jpg" alt="Satellite" width={400} height={300} />
```

**After:**
```tsx
<Image src="/nasa.webp" alt="NASA" width={128} height={128} />
<Image src="/carousel/satellite.webp" alt="Satellite" width={400} height={300} />
```

## Step 3: Cleanup Old Files (Optional)

Once you've verified everything works with WebP:

```bash
node scripts/cleanup-old-images.js
```

⚠️ **Only run this after updating ALL image references!**

## Performance Impact

WebP format provides:
- **30-40% smaller** than PNG on average
- **25-35% smaller** than JPEG on average
- **Full browser support** (can fallback with `<picture>` tag if needed)

## Automatic Optimization Script

For future images, you can add this to your `package.json`:

```json
{
  "scripts": {
    "images:optimize": "node scripts/convert-to-webp.js",
    "images:cleanup": "node scripts/cleanup-old-images.js"
  }
}
```

Then run:
```bash
npm run images:optimize
npm run images:cleanup  # After updating refs
```
