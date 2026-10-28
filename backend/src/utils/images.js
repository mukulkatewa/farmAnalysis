import { HttpError } from "./errors.js";
export function validateImage(file) {
  if (!file) throw new HttpError(400, "Image file is required");
  const b = file.buffer;
  let width, height, mime;
  if (
    b.length >= 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    b.toString("ascii", 12, 16) === "IHDR"
  ) {
    width = b.readUInt32BE(16);
    height = b.readUInt32BE(20);
    mime = "image/png";
    let offset = 8,
      hasData = false,
      ended = false;
    while (offset + 12 <= b.length) {
      const length = b.readUInt32BE(offset),
        type = b.toString("ascii", offset + 4, offset + 8);
      if (offset + 12 + length > b.length) break;
      if (type === "IDAT" && length > 0) hasData = true;
      offset += 12 + length;
      if (type === "IEND") {
        ended = length === 0 && offset === b.length;
        break;
      }
    }
    if (!hasData || !ended) throw new HttpError(415, "Incomplete PNG image");
  } else if (
    b.length > 4 &&
    b[0] === 255 &&
    b[1] === 216 &&
    b.at(-2) === 255 &&
    b.at(-1) === 217
  ) {
    let i = 2;
    while (i + 8 < b.length) {
      if (b[i] !== 255) break;
      const marker = b[i + 1];
      i += 2;
      if (marker === 0xd9 || marker === 0xda) break;
      const len = b.readUInt16BE(i);
      if (len < 2 || i + len > b.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        height = b.readUInt16BE(i + 3);
        width = b.readUInt16BE(i + 5);
        mime = "image/jpeg";
        break;
      }
      i += len;
    }
  }
  if (!mime || !width || !height || width * height > 25000000)
    throw new HttpError(
      415,
      "Use a valid JPEG or PNG image under 25 megapixels",
    );
  return mime;
}
