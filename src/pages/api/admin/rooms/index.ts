import type { APIRoute } from "astro";
import { R2_PUBLIC_URL } from "astro:env/server";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  parseEntityPhotoUrls,
  reconcileEntityPhotos,
} from "@lib/entity-photos";
import {
  createRoom,
  DuplicateNameError,
  findRoomMergeCandidate,
} from "@lib/services/admin-service";
import { resolvePhotoAttribution } from "@lib/services/entity-photo-service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const roomCode =
    typeof body.roomCode === "string" ? body.roomCode.trim() : "";
  if (!roomCode) {
    return json({ error: "Room code is required" }, 400);
  }

  const buildingId =
    body.buildingId === null || body.buildingId === undefined
      ? null
      : Number(body.buildingId);
  const collegeId =
    body.collegeId === null || body.collegeId === undefined
      ? null
      : Number(body.collegeId);
  const divisionId =
    body.divisionId === null || body.divisionId === undefined
      ? null
      : Number(body.divisionId);

  if (
    (buildingId !== null && !Number.isInteger(buildingId)) ||
    (collegeId !== null && !Number.isInteger(collegeId)) ||
    (divisionId !== null && !Number.isInteger(divisionId))
  ) {
    return json(
      { error: "Invalid building, college, or division selection" },
      400,
    );
  }

  const directions =
    typeof body.directions === "string" ? body.directions.trim() || null : null;

  const parsedPhotoUrls = parseEntityPhotoUrls(body.photoUrls, R2_PUBLIC_URL);
  if (!parsedPhotoUrls.ok) {
    return json({ error: parsedPhotoUrls.error }, 400);
  }

  try {
    const duplicate = await findRoomMergeCandidate(roomCode, 0);
    if (duplicate) {
      throw new DuplicateNameError("room", duplicate, roomCode);
    }

    const attribution = await resolvePhotoAttribution(
      auth.session.id,
      auth.session.displayName,
    );
    const photos = reconcileEntityPhotos(
      [],
      parsedPhotoUrls.photoUrls,
      attribution,
    );
    const room = await createRoom(
      { roomCode, directions, buildingId, collegeId, divisionId, photos },
      auth.editedBy,
    );
    if (!room) {
      return json({ error: "Failed to create room" }, 500);
    }
    return json({ success: true, room }, 201);
  } catch (err) {
    if (err instanceof DuplicateNameError) {
      return json(
        {
          error: err.message,
          code: "duplicate_name",
          entityType: err.entityType,
          mergeCandidate: err.candidate,
          attemptedName: err.attemptedName,
        },
        409,
      );
    }
    console.error("Failed to create room:", err);
    return json({ error: "Failed to create room" }, 500);
  }
};
