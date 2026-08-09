// src/lib/app-data.ts

import { slugifySegment } from "./site";
import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
  RoomData,
} from "$lib/types";

export type SearchCategory =
  | "building"
  | "division"
  | "college"
  | "room"
  | "dorm"
  | "organization"
  | "place"
  | "event";

export type InitialSearchState = {
  category: SearchCategory;
  value: string;
  eventSlug?: string;
};

export function getRoomSlug(room: Pick<RoomData, "code">) {
  return slugifySegment(room.code);
}

export { getRoomRouteSlug } from "./route-slugs";

export function getBuildingSlug(building: Pick<BuildingData, "buildingName">) {
  return slugifySegment(building.buildingName);
}

export function getDivisionSlug(division: Pick<DivisionData, "divisionName">) {
  return slugifySegment(division.divisionName);
}

export function getCollegeSlug(college: Pick<CollegeData, "collegeName">) {
  return slugifySegment(college.collegeName);
}

export function getDormSlug(dorm: Pick<DormData, "dormName">) {
  return slugifySegment(dorm.dormName);
}

export { getDormRouteSlug } from "./route-slugs";

export function getEventSlug(event: Pick<EventData, "slug">) {
  return event.slug;
}
