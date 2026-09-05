import type { RainfallReadingRecord } from "./repositories/rainfall-repository";

const MOCK_STATIONS: ReadonlyArray<
  Pick<
    RainfallReadingRecord,
    "stationId" | "stationName" | "latitude" | "longitude" | "value"
  >
> = [
  // Heavy rain in north
  {
    stationId: "S50",
    stationName: "Admiralty",
    latitude: 1.44387,
    longitude: 103.80101,
    value: 24.5,
  },
  {
    stationId: "S06",
    stationName: "Ang Mo Kio",
    latitude: 1.38,
    longitude: 103.8489,
    value: 18.2,
  },
  // Moderate rain in central
  {
    stationId: "S44",
    stationName: "Clementi",
    latitude: 1.3337,
    longitude: 103.7768,
    value: 12.8,
  },
  {
    stationId: "S107",
    stationName: "East Coast Parkway",
    latitude: 1.3135,
    longitude: 103.9625,
    value: 8.5,
  },
  // Light rain in south
  {
    stationId: "S24",
    stationName: "Changi",
    latitude: 1.36667,
    longitude: 103.98333,
    value: 4.2,
  },
  {
    stationId: "S104",
    stationName: "Jurong West",
    latitude: 1.33746,
    longitude: 103.69558,
    value: 3.1,
  },
  // No rain in some areas
  {
    stationId: "S109",
    stationName: "Marina Barrage",
    latitude: 1.28059,
    longitude: 103.87022,
    value: 0,
  },
  {
    stationId: "S60",
    stationName: "Sentosa Island",
    latitude: 1.25,
    longitude: 103.82833,
    value: 0,
  },
  // More varied readings
  {
    stationId: "S121",
    stationName: "Woodlands",
    latitude: 1.44387,
    longitude: 103.78538,
    value: 21.3,
  },
  {
    stationId: "S111",
    stationName: "Pasir Ris",
    latitude: 1.37199,
    longitude: 103.95168,
    value: 6.7,
  },
  {
    stationId: "S115",
    stationName: "Tuas South",
    latitude: 1.28218,
    longitude: 103.61843,
    value: 15.4,
  },
  {
    stationId: "S43",
    stationName: "Kim Chuan",
    latitude: 1.33746,
    longitude: 103.88924,
    value: 1.8,
  },
];

/**
 * Generates mock rainfall readings across Singapore for demos and tests.
 *
 * Pure function, safe on both server and client. Values span every colour
 * band of the heat map so visual checks exercise the whole gradient.
 */
export function getMockRainfallData(
  now: Date = new Date(),
): ReadonlyArray<RainfallReadingRecord> {
  const timestamp = now.toISOString();
  const fetchedAt = now.getTime();
  return MOCK_STATIONS.map((station) => ({ ...station, timestamp, fetchedAt }));
}
