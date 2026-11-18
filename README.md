# SimplyBudgetPro: getting it onto your iPhone

SimplyBudgetPro is your budget sheet rebuilt as an iPhone app. This guide assumes you're on a **Windows PC** and have never made an app before. There are three stages, and you only move on when you're ready:

> SimplyBudgetPro is the upgraded edition of SimplyBudget. It started as an exact copy and gets the extra features from here on. It can restore backups made in the original SimplyBudget.

| Stage | What you get | Cost | Time |
|---|---|---|---|
| 1. Try it in Expo Go | The app running on your phone inside a free "viewer" app | Free | ~20 min |
| 2. Real app via TestFlight | Its own icon on your home screen; works without your PC | $99/yr Apple fee | 1–2 days (mostly waiting for Apple) |
| 3. Sell on the App Store | Anyone can buy it | Same $99/yr; Apple keeps 15% of sales | 1–3 weeks of prep + review |

---

## Stage 1: Try it on your phone (free)

**Words you'll see:** *Node.js* is a free program that runs the tools that build the app. *Expo Go* is a free iPhone app that can run apps that are still in development.

1. **Install Node.js** on your PC from https://nodejs.org. Choose the "LTS" version and click Next through the installer.
2. **Unzip** `simplybudgetpro.zip` somewhere easy to find, such as `Documents\simplybudgetpro`.
3. **Open a command window in that folder.** Open the folder in File Explorer, click the address bar at the top, type `cmd` and press Enter. A black window opens.
4. **Download the app's building blocks** (first time only, takes a few minutes):
   ```
   npm install
   ```
5. **Start the app:**
   ```
   npx expo start
   ```
   A QR code appears in the window. Leave the window open while you use the app.
6. **On your iPhone**, install **Expo Go** from the App Store. Then open the **Camera**, point it at the QR code and tap the banner that appears. SimplyBudgetPro opens.

**If it won't connect:** your phone and PC need to be on the same Wi-Fi. If they are and it still fails (some home and work networks block this), press `Ctrl+C` and run `npx expo start --tunnel` instead.

> Data you enter in Expo Go is for testing. Don't rely on it long-term. That's what Stage 2 is for.

**Making changes:** when I send you updated files, replace the old ones and the app on your phone refreshes on its own while `npx expo start` is running.

---

## Stage 2: A real app on your home screen (TestFlight)

**Words you'll see:** *EAS* is Expo's cloud service. It builds the iPhone app on Apple computers in the cloud, so you don't need a Mac. *TestFlight* is Apple's app for installing apps that aren't on the App Store yet.

1. **Join the Apple Developer Program** at https://developer.apple.com/programs ($99/year). Use your normal Apple ID. Approval usually takes a day or two.
2. **Create a free Expo account** at https://expo.dev.
3. In the command window (inside the simplybudgetpro folder):
   ```
   npm install -g eas-cli
   eas login
   eas build --platform ios
   ```
   It asks for your Apple ID and offers to handle the "certificates" (Apple's security paperwork) for you. Say **yes** to everything. The build runs in the cloud and takes about 15–30 minutes.
4. **Send it to TestFlight:**
   ```
   eas submit --platform ios
   ```
5. On your iPhone, install **TestFlight** from the App Store and sign in with the same Apple ID. SimplyBudgetPro shows up there. Tap **Install** and it lands on your home screen like any other app.

Updates later: run `eas build` and `eas submit` again, then update the app in TestFlight.

---

## Stage 3: Selling it on the App Store

You do this in **App Store Connect** (https://appstoreconnect.apple.com), Apple's dashboard for your apps. Apple needs:

- **A unique name.** "SimplyBudgetPro" may already be taken, so check early and keep a backup name.
- **Screenshots** of the app on a large iPhone, plus a short description and keywords.
- **A privacy policy web page.** It can be simple, because SimplyBudgetPro keeps all data on the phone and collects nothing.
- **Privacy answers.** Apple asks what data you collect. For this app the answer is "Data not collected."
- **A price.** Either a one-time price, or free with a paid subscription (this needs a little extra code; RevenueCat is the usual tool).
- **Apple's review.** Apple tests every app, usually within 1–3 days. If they reject it, they tell you why, and you fix it and resubmit.

Sign up for Apple's **Small Business Program**. It drops Apple's cut from 30% to 15% if you earn under $1M a year.

### Things to add before selling (on our to-do list)
1. **A first-run setup screen.** Right now the app starts with *your* categories, accounts and sample transactions. New users need to start blank and pick their own.
2. **Backup / export**, so nobody loses their data when they switch phones.
3. **Dark mode**, plus the features we held back: bills with reminders, savings goals and the debt payoff plan.

---

## What's inside (for the curious)

- `src/app/`: the screens. Each file is one screen (`(tabs)/index.tsx` is Home, `add.tsx` is the quick-add screen).
- `src/lib/calc.ts`: the budget math, matching the formulas in your Google Sheet.
- `src/lib/seed.ts`: your categories, budgets, cards and transactions, imported from the sheet.
- `app.json`: the app's name, icon and iPhone settings.

---

## How the website version is published

This repository is connected to **Cloudflare Workers**. Every change pushed to the `main` branch is rebuilt and published automatically:

- Build command: `npm run build` (exports the web app into `dist/` and adds the iPhone home-screen settings)
- Deploy command: `npx wrangler deploy` (settings in `wrangler.jsonc`)

Your budget data is never stored here. It lives only on your phone. Use **You → Backup & restore** to move it or keep a copy.

## Accounts & sync (server)

SimplyBudgetPro has email + password accounts. The budget is saved to Cloudflare and syncs across devices.

- `worker/index.ts`: the API under `/api/*` (sign up, sign in, sign out, load/save budget, change password, delete account). Everything else is served from `dist/`.
- Database: Cloudflare D1 `simplybudgetpro` (bound as `DB`). Tables are in `worker/migrations/`. To apply a new migration: `npx wrangler d1 migrations apply simplybudgetpro --remote`.
- Passwords are hashed with PBKDF2-SHA256; sessions are random tokens stored only as hashes.
- Sync (`src/lib/sync.ts` + `src/lib/merge.ts`): each change saves about a second later; other devices pick it up when opened or within a minute. Edits from two devices are merged (three-way merge), so nothing is overwritten.
- Local testing: `npm run build && npx wrangler d1 migrations apply simplybudgetpro --local && npx wrangler dev`.
