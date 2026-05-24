# Presentation Timer

A ready-to-host GitHub Pages webpage for timing presentations.

## Features

- Add unlimited presenter stopwatches or timers
- Name each timer after the presenter
- Separate total presentation stopwatch or timer
- Total presentation time auto-starts when any presenter starts
- Pausing the total timer pauses all presenter timers
- Manual mode
- Semi-auto mode
- Sequence mode with repeated presenter names allowed
- Sequence mode stops the total timer when the sequence ends
- Sequence `Next Speaker` button appears above the presenter cards
- Optional tone when any countdown timer reaches zero
- Stopwatch target time controls the progress bar and summary saved/over calculation
- Time inputs support minutes and seconds
- Edit button on every presenter timer to manually change elapsed time and target/timer length
- Editing a presenter's elapsed time also adjusts the total timer by the same difference
- Color button on every presenter timer to customize its card/progress color
- Edit button for the total timer to manually change its displayed value
- Light mode / dark mode toggle
- Improved click responsiveness by preventing full card rebuilds every frame
- Summary pop-up showing:
  - how long each presenter talked
  - their target time
  - how much time they saved or went over by
- Local browser saving using `localStorage`
- No backend, no installation, no build step

## How to run locally

Open `index.html` in your browser.

## How to host on GitHub Pages

1. Create a new GitHub repository.
2. Upload these files:
   - `index.html`
   - `style.css`
   - `script.js`
   - `README.md`
3. Go to repository `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Press `Save`.
7. Wait a minute, then open the GitHub Pages link.

## Mobile optimization

- Desktop layout remains unchanged.
- On phones, the total timer becomes sticky at the top.
- A bottom live-control bar appears for Pause, Next, and Summary.
- Presenter cards become full-width with larger tap targets.
- Header, controls, and pop-ups are adjusted for smaller screens.

## Latest small update

- Renamed `Danger Zone` to `Reset Options` for clearer wording.

## Latest update

- Sequence mode now blocks duplicate presenter names to avoid ambiguity when selecting the next speaker.

## Latest update

- Fixed light mode contrast for Add Presenter and Next Speaker primary buttons.

## Latest update

- Rolled back the phone color picker to the earlier Safari-friendly version while keeping the desktop version unchanged.

## Latest update

- Selected timer colors are now visible at all times, even when the timer/stopwatch is paused.

## Latest update

- Added a sequence setup option to auto reset presenter timers when a new sequence starts.

## Latest update

- The sequence auto-reset option now resets the total timer as well as all presenter timers.

## Latest update

- Added footer collaboration credit for Ahmed El Dessouky and Jana Khaled.

## Latest fix

- Cache-busted the CSS link and added a small footer style fallback so GitHub Pages/Safari loads the correct footer styling.

## Latest update

- Added a custom timer/stopwatch favicon for the browser tab.
