# ASL Camera Trainer

Vue 3 + TypeScript app that fills the screen with the browser camera, tracks both hands, and trains American Sign Language recognition from your samples.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and allow camera access.

## Train ASL

1. Select a letter or phrase.
2. Hold **Hold to record** while you make the sign. Motion signs such as J, Z, HELLO, and THANK YOU should be performed through the movement.
3. Record several takes per sign, from slightly different angles and distances. Aim for about 24 frames shown on the counter; more is better.
4. Train at least two signs, then switch to **Practice**.

The classifier is a k-nearest-neighbors model over normalized MediaPipe hand landmarks. Training samples and the model are stored in the browser's `localStorage`, so they remain after a refresh or later visit on the same device and browser.

## GitHub Pages

A workflow in `.github/workflows/deploy-github-pages.yml` builds the Vue app and pushes `dist` to the `gh-pages` branch on every push to `main` or `master`, and when you run it from **Actions → Deploy GitHub Pages → Run workflow**.

1. Push this repo to GitHub.
2. In the repo, open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Set the branch to **gh-pages** and the folder to **/ (root)**.
5. Push to `main` or run the workflow.

The site will be at `https://<user>.github.io/<repo>/`. Camera access works there because GitHub Pages is HTTPS.

If the repository is a user site named `<user>.github.io`, set `BASE_PATH` to `/` in the workflow build step.
