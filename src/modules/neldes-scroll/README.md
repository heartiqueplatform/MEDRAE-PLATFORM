# Neldes Scroll

TikTok-style vertical feed for medical memes, news, and jobs.

## Wire into App.tsx

```tsx
import { NeldesScrollScreen } from "@/modules/neldes-scroll";

// Inside <Routes>:
<Route path="/neldes" element={<PrivateRoute><NeldesScrollScreen /></PrivateRoute>} />