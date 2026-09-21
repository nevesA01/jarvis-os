export interface CurrentWeather {
  city: string;
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  weatherCode: number;
}

const weatherDescriptions: Record<number, string> = {
  0: "céu limpo",
  1: "principalmente limpo",
  2: "parcialmente nublado",
  3: "nublado",
  45: "neblina",
  48: "neblina congelante",
  51: "garoa leve",
  53: "garoa moderada",
  55: "garoa intensa",
  61: "chuva leve",
  63: "chuva moderada",
  65: "chuva forte",
  71: "neve leve",
  73: "neve moderada",
  75: "neve forte",
  80: "pancadas de chuva leves",
  81: "pancadas de chuva moderadas",
  82: "pancadas de chuva fortes",
  95: "trovoada",
  96: "trovoada com granizo leve",
  99: "trovoada com granizo forte",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const isWeatherQuestion = (text: string) => {
  const value = normalize(text);
  return /(temperatura|clima|tempo|previs[aã]o|chuva|chovendo|graus)/.test(value);
};

export const extractWeatherCity = (text: string) => {
  const match = text.match(/(?:em|de|hoje)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]{1,40}?)(?:\?|$|,)/i);
  return match?.[1]?.trim().replace(/\s+/g, " ") || null;
};

export const fetchCurrentWeather = async (city: string): Promise<CurrentWeather> => {
  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", city);
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "pt");
  geocodeUrl.searchParams.set("format", "json");

  const geocodeResponse = await fetch(geocodeUrl);
  if (!geocodeResponse.ok) throw new Error("geocoding_failed");
  const geocodeData = (await geocodeResponse.json()) as {
    results?: Array<{ name: string; latitude: number; longitude: number }>;
  };
  const location = geocodeData.results?.[0];
  if (!location) throw new Error("city_not_found");

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(location.latitude));
  weatherUrl.searchParams.set("longitude", String(location.longitude));
  weatherUrl.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
  weatherUrl.searchParams.set("timezone", "auto");

  const weatherResponse = await fetch(weatherUrl);
  if (!weatherResponse.ok) throw new Error("weather_failed");
  const weatherData = (await weatherResponse.json()) as {
    current?: {
      temperature_2m: number;
      apparent_temperature: number;
      weather_code: number;
      wind_speed_10m: number;
    };
  };
  if (!weatherData.current) throw new Error("weather_missing");

  return {
    city: location.name,
    temperature: weatherData.current.temperature_2m,
    feelsLike: weatherData.current.apparent_temperature,
    windSpeed: weatherData.current.wind_speed_10m,
    weatherCode: weatherData.current.weather_code,
  };
};

export const describeWeather = (code: number) => weatherDescriptions[code] || "condição não identificada";
