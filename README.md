# ViceCityHub.eu 🌴🎮
### The Premier Community Hub for Grand Theft Auto VI (Vice City & State of Leonida)

ViceCityHub is a modern, sleek, and high-performance gaming community platform built with vanilla HTML, CSS variables, and modular JavaScript, ready for instant edge deployment on **Cloudflare Pages**.

---

## 🎨 Design & Aesthetic Highlights
- **Clean Gaming Dark Theme**: Deep slate/black `#0d1117`, card surfaces `#161b22`, subtle 1px borders `#30363d`.
- **Vice City Neon Accents**: Vibrant neon pink/magenta `#ff2a85` and electric cyan `#00d2ff`.
- **Strict Zero-Emoji Policy**: 100% clean vector icons via **FontAwesome 6+**. Zero Unicode emojis used in UI elements, buttons, or badges.
- **Typography**: Google Fonts (*Plus Jakarta Sans* for clean modern UI and *Teko* for bold GTA-style display headings).

---

## ⚡ Core Features
1. **Interactive Community Feed**: Real-time filtering by category (*All Posts, Discussions, Official News, Map & Guides, Clips & Media, Clans & Crews*).
2. **Instant Search**: Live search bar that filters topics by title, body, or author without page reload.
3. **Interactive Post Cards**: Upvotes counter (+1/-1 toggle), expandable comment section with live client-side posting, and share button with toast feedback.
4. **Interactive Create Post Modal**: Clean popup allowing users to draft new discussions with titles, categories, text, and media preview URLs.
5. **Sidebar Live Widgets**:
   - Server & Network health monitoring (Vice City Online, Social Club with simulated live ping).
   - Trending discussions in Leonida.
   - Featured Crew recruitment spotlight.
   - Discord community invite banner.
   - Community conduct guidelines.
6. **Mobile First & Responsive**: Touch targets $\ge$ 44px, mobile drawer navigation, and fixed bottom tab bar for smartphones.
7. **Cloudflare Pages Ready**: Includes pre-configured `_headers` (Content Security Policy, HSTS, X-Frame-Options) and `_redirects`.

---

## 📁 Project Structure
```text
vicecityhub/
├── assets/
│   ├── brand/               # Official brand assets (logo, favicons, app icons)
│   │   ├── logo.png         # Scaled & optimized vector-sharp navbar/footer logo
│   │   ├── LOGOvihub.png    # Original high-res logo with text
│   │   ├── favicon-32x32.png# Standard web browser tab icon
│   │   ├── favicon-192x192.png # High-DPI Android/PWA app icon
│   │   ├── apple-touch-icon.png # iOS home screen icon
│   │   └── favicon.png      # Original 2000x2000 brand asset
│   ├── css/
│   │   └── style.css        # Clean dark theme & Vice City neon CSS
│   └── js/
│       └── app.js           # Modular vanilla JavaScript feed controller
├── brand/                   # Dedicated brand folder (source assets mirror)
├── docs/                    # Design guides & documentation
│   └── COMMUNITY_HUB_STYLE_GUIDE.txt
├── index.html               # Main Community Hub HTML5 entry
├── _headers                 # Cloudflare Pages strict security headers & cache policies
├── _redirects               # Cloudflare Pages routing rules
├── favicon.ico              # Root favicon fallback
├── robots.txt               # SEO & web crawler configuration
├── .gitignore
└── README.md
```

## 🚀 Deployment to Cloudflare Pages
1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: initial release of ViceCityHub frontend"
   git push -u origin main
   ```
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com):
   - Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
   - Select `calinaboss/vicecityhub`.
   - Build settings:
     - Framework preset: **None**
     - Build command: *(leave empty)*
     - Build output directory: `.` *(root)*
3. Link custom domain: **`vicecityhub.eu`**.
