import exifr from "exifr";

export interface PhotoMetadata {
  latitude: number | null;
  longitude: number | null;
  takenAt: Date | null;
}

const EMPTY_METADATA: PhotoMetadata = { latitude: null, longitude: null, takenAt: null };

// Reads GPS coordinates and the original capture time straight from the
// uploaded file's own EXIF tags — never trusted from the client, since a
// browser could send any lat/lng it wants in a form field. A photo with no
// GPS tag (location services were off, or it came from a gallery rather
// than the camera) simply has null coordinates; callers show it in the
// thumbnail grid but never plot it on the map.
export async function extractPhotoMetadata(filePath: string): Promise<PhotoMetadata> {
  try {
    const [gps, exif] = await Promise.all([
      exifr.gps(filePath),
      exifr.parse(filePath, { pick: ["DateTimeOriginal"] }),
    ]);
    return {
      latitude: gps?.latitude ?? null,
      longitude: gps?.longitude ?? null,
      takenAt: exif?.DateTimeOriginal ?? null,
    };
  } catch {
    return EMPTY_METADATA;
  }
}
