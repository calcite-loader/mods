const atlasUtils = api.lib<typeof import("../atlasUtils")>("atlasUtils");

// Steal assets from Web Dashers :)
const sheetBaseUrl =
  "https://raw.githubusercontent.com/web-dashers/web-dashers.github.io/refs/heads/main/assets/sheets/";
atlasUtils.addCustomObjectAtlas(
  "WebDashers1",
  sheetBaseUrl + "GJ_GameSheet.png",
  sheetBaseUrl + "GJ_GameSheet.json",
);
atlasUtils.addCustomObjectAtlas(
  "WebDashers2",
  sheetBaseUrl + "GJ_GameSheet02.png",
  sheetBaseUrl + "GJ_GameSheet02.json",
);
atlasUtils.addCustomObjectAtlas(
  "WebDashersDart",
  sheetBaseUrl + "player_dart_00.png",
  sheetBaseUrl + "player_dart_00.json",
);
atlasUtils.addCustomObjectAtlas(
  "WebDashersBall",
  sheetBaseUrl + "player_ball_00.png",
  sheetBaseUrl + "player_ball_00.json",
);
