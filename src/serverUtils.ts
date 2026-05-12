/*
 * @name Server Utils
 * @type library
 */

export const baseUrl = "https://www.boomlings.com/database/";

export const commonSecret = "Wmfd2893gb7";

export const makeRequest = async (
  endpoint: string,
  data?: Record<string, string>,
) => {
  const buffer = await api.privilegedFetch(baseUrl + endpoint, {
    headers: {
      "User-Agent": "",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(data).toString(),
    method: data ? "POST" : "GET",
  });
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
};

// TODO: Add more fields
export interface LevelObject {
  id: number;
  name: string;
  description: string;
  levelstring: string;
  customSong?: number;
  officialSong?: number;
}

const parseLevelObject = (data: string): LevelObject | null => {
  if (data == "-1") return null;

  const parts = data.split(":");
  const map: Record<string, string> = {};

  for (let i = 0; i < parts.length; i += 2) {
    const key = parts[i];
    const value = parts[i + 1];
    if (key && value !== undefined) {
      map[key] = value;
    }
  }

  return {
    id: parseInt(map["1"]!),
    name: map["2"]!,
    description: atob(map["3"]!),
    levelstring: map["4"]!,
    customSong: map["35"] ? parseInt(map["35"]) : undefined,
    officialSong: map["12"] ? parseInt(map["12"]) : undefined,
  };
};

export const fetchLevel = async (levelId: number) => {
  return parseLevelObject(
    await makeRequest("downloadGJLevel22.php", {
      levelID: levelId.toString(),
      secret: commonSecret,
    }),
  );
};
