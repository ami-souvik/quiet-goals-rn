import math
import struct
import zlib

def write_png(width, height, pixels, filename):
    def png_pack(png_tag, data):
        chunk_head = png_tag + data
        return struct.pack("!I", len(data)) + chunk_head + struct.pack("!I", 0xFFFFFFFF & zlib.crc32(chunk_head))

    raw_data = b""
    for y in range(height):
        raw_data += b"\0"  # No filter
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw_data += struct.pack("BBBB", r, g, b, a)

    compressed_data = zlib.compress(raw_data)
    
    with open(filename, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(png_pack(b"IHDR", struct.pack("!IIBBBBB", width, height, 8, 6, 0, 0, 0)))
        f.write(png_pack(b"IDAT", compressed_data))
        f.write(png_pack(b"IEND", b""))

def generate_icon(size, filename, is_adaptive=False):
    width, height = size, size
    pixels = [(255, 255, 255, 0)] * (width * height) # Transparent background default

    cx, cy = width // 2, height // 2
    
    # Adaptive icon needs a background layer usually provided by the OS if transparent, 
    # but we will make a solid white background for the adaptive foreground image if we want a logo,
    # or just the logo itself.
    # App design: Minimalist. White background, Black circle/text.
    
    # Fill Background (White)
    for y in range(height):
        for x in range(width):
            pixels[y * width + x] = (255, 255, 255, 255) # White solid

    # Draw Circle (Black)
    # Radius: 40% of size for icon, 25% for adaptive (to account for safe zone)
    radius = int(size * (0.25 if is_adaptive else 0.4))
    
    for y in range(height):
        for x in range(width):
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            
            # Anti-aliasing logic (simplified)
            if dist < radius - 1:
                # Inside circle - Black
                pixels[y * width + x] = (17, 17, 17, 255) # #111111
            elif dist < radius:
                # Edge
                alpha = int(255 * (radius - dist))
                # Blend with background (White)
                # 17*(alpha) + 255*(1-alpha)
                # This is tricky with flattened list, but let's just make it soft grey for edge
                pixels[y * width + x] = (100, 100, 100, 255)

    write_png(width, height, pixels, filename)
    print(f"Generated {filename}")

if __name__ == "__main__":
    generate_icon(1024, "assets/icon.png", is_adaptive=False)
    generate_icon(1024, "assets/adaptive-icon.png", is_adaptive=True)
    generate_icon(1024, "assets/splash-icon.png", is_adaptive=True)
