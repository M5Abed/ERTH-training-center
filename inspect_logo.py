from PIL import Image
import collections

def analyze_image(path):
    img = Image.open(path)
    img = img.convert('RGBA')
    pixels = list(img.getdata())
    
    # Filter out transparent or near-transparent pixels
    non_transparent = [p for p in pixels if p[3] > 50]
    
    # Bucket colors to nearest 16 values to group similar shades
    bucketed = []
    for r, g, b, a in non_transparent:
        br = round(r / 16) * 16
        bg = round(g / 16) * 16
        bb = round(b / 16) * 16
        # clamp to 0-255
        br = min(255, max(0, br))
        bg = min(255, max(0, bg))
        bb = min(255, max(0, bb))
        bucketed.append((br, bg, bb))
        
    counter = collections.Counter(bucketed)
    print("Bucketed dominant colors:")
    for color, count in counter.most_common(15):
        hex_color = '#{:02x}{:02x}{:02x}'.format(color[0], color[1], color[2])
        percent = (count / len(non_transparent)) * 100
        print(f"Hex: {hex_color}, RGB: {color}, Count: {count}, Percent: {percent:.2f}%")

if __name__ == '__main__':
    analyze_image('frontend/public/logo.png')
