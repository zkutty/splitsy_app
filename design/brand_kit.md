Below is a **complete starter brand kit and product asset package** for your trip expense-sharing app (Expo + Supabase architecture described in your scaffold). 

Everything below can be **dropped directly into your repo**.

---

# 1. Brand System

## App Name

Recommended primary name:

**SplitTrip**

Alternative strong options:

| Name            | Reason            |
| --------------- | ----------------- |
| SplitTrip       | clear + memorable |
| TabVoyage       | travel oriented   |
| TripLedger      | financial clarity |
| GroupTab        | friendly          |
| SettleUp Travel | descriptive       |

Recommended for launch: **SplitTrip**

---

# Tagline

Primary

**“Split travel expenses without the math.”**

Alternatives

* “Smart expense sharing for group trips.”
* “Travel together. Settle instantly.”
* “No spreadsheets. Just settle.”

---

# Brand Personality

| Trait           | Description             |
| --------------- | ----------------------- |
| Trustworthy     | financial clarity       |
| Simple          | frictionless settlement |
| Travel friendly | designed for trips      |
| Collaborative   | group coordination      |

---

# Color System

Primary palette

```
Primary Blue     #2563EB
Settlement Green #10B981
Travel Purple    #7C3AED
Warning Amber    #F59E0B
Error Red        #EF4444
```

Neutral palette

```
Dark       #0F172A
Slate      #334155
Muted      #64748B
Border     #E2E8F0
Background #F8FAFC
Card       #FFFFFF
```

---

# Typography

Primary UI font

**Inter**

Fallback stack

```
Inter
system-ui
SF Pro
Roboto
```

Headline font (optional)

**Satoshi**

---

# Icon Style

Use **Lucide icons**

Core set

```
wallet
users
receipt
plane
utensils
hotel
taxi
beer
map
credit-card
```

---

# 2. Logo Assets

## Primary Logo (SVG)

Save as:

```
/assets/logo/splittrip-logo.svg
```

```svg
<svg width="420" height="120" viewBox="0 0 420 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="40" fill="#2563EB"/>
  
  <path d="M40 60 L60 40 L80 60" stroke="white" stroke-width="6" fill="none"/>
  <path d="M40 60 L60 80 L80 60" stroke="white" stroke-width="6" fill="none"/>
  
  <text x="120" y="72" font-family="Inter, sans-serif" font-size="44" fill="#0F172A">
    SplitTrip
  </text>
</svg>
```

Meaning

* circle = shared pool
* arrows = settlement

---

# Square Logo

```
/assets/logo/splittrip-icon.svg
```

```svg
<svg width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="120" fill="#2563EB"/>
  
  <path d="M160 256 L256 160 L352 256" stroke="white" stroke-width="28" fill="none"/>
  <path d="M160 256 L256 352 L352 256" stroke="white" stroke-width="28" fill="none"/>
</svg>
```

Works for

* favicon
* app icon
* social avatar

---

# Favicon

```
/assets/logo/favicon.svg
```

```svg
<svg width="64" height="64" viewBox="0 0 512 512">
<circle cx="256" cy="256" r="220" fill="#2563EB"/>
<path d="M180 256 L256 180 L332 256" stroke="white" stroke-width="28" fill="none"/>
<path d="M180 256 L256 332 L332 256" stroke="white" stroke-width="28" fill="none"/>
</svg>
```

---

# 3. App Icon (iOS + Android)

Expo config

```
/assets/app-icon.png
```

Design spec

```
Background: #2563EB
Symbol: white split arrows
Radius: 120px
```

Expo config snippet

```json
{
  "expo": {
    "icon": "./assets/app-icon.png",
    "adaptiveIcon": {
      "foregroundImage": "./assets/app-icon.png",
      "backgroundColor": "#2563EB"
    }
  }
}
```

---

# 4. Design System Tokens

Create file

```
/design/tokens.ts
```

```ts
export const colors = {
  primary: "#2563EB",
  success: "#10B981",
  purple: "#7C3AED",
  warning: "#F59E0B",
  danger: "#EF4444",

  background: "#F8FAFC",
  surface: "#FFFFFF",

  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0"
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};
```

---

# 5. UI Kit

## Expense Card

Design spec

```
Card
padding: 16
radius: 12
shadow: soft
```

Layout

```
[icon]  Dinner
        Paid by Zach

           $48.00
```

---

## Balance Summary

```
Zach        +$32
Emma        -$12
Adam        -$20
```

Color rules

```
positive = green
negative = red
neutral = gray
```

---

## Settlement List

```
Adam pays Zach $20
Emma pays Zach $12
```

This corresponds to the **settlement engine described in your scaffold**. 

---

# 6. Landing Page Content

Hero

```
SplitTrip
Split travel expenses without the math.
Track shared costs and settle instantly.
```

CTA

```
Start a Trip
```

---

# Sections

### Create a Trip

```
Invite friends
Add expenses
Track balances
```

---

### Automatic Settlement

```
SplitTrip calculates the minimum transfers
so everyone pays the least number of times.
```

---

### Multi-Currency

```
Enter expenses in any currency.
Trip balances stay consistent.
```

---

# 7. Marketing Graphics Ideas

Hero illustration concept

```
3 travelers
1 receipt
arrows balancing money
```

---

Social card

```
Plane icon
receipt icon
group icon
```

---

# 8. Repo Asset Structure

Recommended structure

```
/assets
   /logo
      logo.svg
      icon.svg
      favicon.svg
   /icons
   /illustrations

/design
   tokens.ts

/marketing
   landing
   social
```

---

# 9. Future Brand Extensions

Later you can add:

| Asset                  | Purpose       |
| ---------------------- | ------------- |
| Animated logo          | splash screen |
| Travel illustrations   | onboarding    |
| Expense category icons | UI clarity    |
| Settlement animation   | wow moment    |

---

# 10. One Thing That Will Make This App Look 10× Better

Add a **signature animation when settlement runs**

Example

```
balances → arrows move → transfers appear
```

Users love this.

---

If you'd like, I can also generate **the next level assets founders usually skip but investors love:**

• full **Figma design system**
• **complete Expo UI screens**
• **landing page (Next.js)**
• **App Store screenshots**
• **animated settlement interaction**
• **viral logo mascot**

I can also design **a dramatically better brand direction (like Stripe-level polish)** if you want the app to feel like a serious startup from day one.
