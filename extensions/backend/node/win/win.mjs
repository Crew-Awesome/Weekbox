export const winApi = {
  minimize: async (callApi) => callApi("window", "minimize"),
  maximize: async (callApi) => callApi("window", "maximize"),
  unmaximize: async (callApi) => callApi("window", "unmaximize"),
  isMaximized: async (callApi) => callApi("window", "isMaximized"),
  setFullScreen: async (callApi) => callApi("window", "setFullScreen"),
  exitFullScreen: async (callApi) => callApi("window", "exitFullScreen"),
  show: async (callApi) => callApi("window", "show"),
  hide: async (callApi) => callApi("window", "hide"),
  focus: async (callApi) => callApi("window", "focus"),
  move: async (callApi, { x, y }) => callApi("window", "move", { x, y }),
  setSize: async (callApi, { width, height }) => callApi("window", "setSize", { width, height }),
  getSize: async (callApi) => callApi("window", "getSize"),
  getPosition: async (callApi) => callApi("window", "getPosition"),
  getDisplays: async (callApi) => callApi("computer", "getDisplays"),
  close: async (callApi) => callApi("app", "exit"),
  center: async (callApi) => {
     // Center manually
     const size = await callApi("window", "getSize");
     const displays = await callApi("computer", "getDisplays");
     const pos = await callApi("window", "getPosition");
     
     // Find the display the window is currently on
     let currentDisplay = displays[0];
     for (const display of displays) {
       const bx = display.bounds?.x || 0;
       const by = display.bounds?.y || 0;
       const bw = display.resolution.width;
       const bh = display.resolution.height;
       // Check if window is within this display's bounds
       if (
         pos.x >= bx &&
         pos.x < bx + bw &&
         pos.y >= by &&
         pos.y < by + bw
       ) {
         currentDisplay = display;
         break;
       }
     }

     const bx = currentDisplay.bounds?.x || 0;
     const by = currentDisplay.bounds?.y || 0;
     const centerX = bx + Math.floor((currentDisplay.resolution.width - size.width) / 2);
     const centerY = by + Math.floor((currentDisplay.resolution.height - size.height) / 2);
     await callApi("window", "move", { x: centerX, y: centerY });
  }
};
