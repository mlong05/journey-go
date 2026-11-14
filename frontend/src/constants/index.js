export * from "./routes";
export * from "./banks";

export const APP_CONFIG = {
  APP_NAME: "JourneyGo",
  API_TIMEOUT: 15000,
  DEFAULT_PAGE_SIZE: 10,
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "jg_access_token",
  REFRESH_TOKEN: "jg_refresh_token",
  USER_INFO: "jg_user_info",
  THEME: "jg_theme",
};
