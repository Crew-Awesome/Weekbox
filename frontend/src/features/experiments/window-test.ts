import Core from "@core";

/**
 * Executes a "Lemniscate of Bernoulli" (Infinity Figure 8) animation using the Window API.
 * Resizes the window to a small size and continuously moves it.
 */
export async function runInfinityWindowTest() {
  // 1. Get current display so we know the boundaries
  const displays = await Core.window.getDisplays();
  const mainDisplay = displays[0];
  
  const screenW = mainDisplay.resolution.width;
  const screenH = mainDisplay.resolution.height;

  // 2. Set small window size
  const winW = 400;
  const winH = 300;
  await Core.window.setSize(winW, winH);

  // 3. Calculate center of the screen
  const boundsX = mainDisplay.bounds?.x || 0;
  const boundsY = mainDisplay.bounds?.y || 0;
  const centerX = boundsX + (screenW - winW) / 2;
  const centerY = boundsY + (screenH - winH) / 2;

  // Scale of the infinity symbol (amplitude)
  const a = Math.min(screenW, screenH) / 3;

  let t = 0;
  
  // 4. Animate the window
  return new Promise<void>((resolve) => {
    const animate = async () => {
      // Lemniscate of Bernoulli parametric equations
      const x = centerX + (a * Math.cos(t)) / (1 + Math.pow(Math.sin(t), 2));
      const y = centerY + (a * Math.sin(t) * Math.cos(t)) / (1 + Math.pow(Math.sin(t), 2));

      await Core.window.move(Math.round(x), Math.round(y));

      t += 0.05; // Speed of animation
      
      // Stop after one full loop (approx 2 * PI)
      if (t < Math.PI * 2) {
        requestAnimationFrame(animate);
      } else {
        // Return to center when done
        await Core.window.center();
        await Core.window.setSize(1280, 720); // Restore normal size
        resolve();
      }
    };

    animate();
  });
}
