
import os
from PIL import Image, ImageDraw, ImageFont

def generate_splash():
    # Configuration
    CANVAS_SIZE = (2732, 2732)
    BG_COLOR = "#000000"  # Black
    LOGO_PATH = "app/assets/logo.png"
    OUTPUT_PATH = "app/assets/splash.png"
    TEXT = "Loading..."
    TEXT_COLOR = "#C0C0C0" # Silver/Light Grey
    
    # Calculate sizes
    # Target logo width: 30% of canvas width = ~820px
    TARGET_LOGO_WIDTH = int(CANVAS_SIZE[0] * 0.3)
    
    print(f"Generating splash screen...")
    print(f"Canvas: {CANVAS_SIZE}, BG: {BG_COLOR}")
    
    # Create background
    img = Image.new('RGB', CANVAS_SIZE, color=BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Load and Resize Logo
    if os.path.exists(LOGO_PATH):
        logo = Image.open(LOGO_PATH)
        # Calculate aspect ratio
        aspect_ratio = logo.height / logo.width
        new_height = int(TARGET_LOGO_WIDTH * aspect_ratio)
        
        logo = logo.resize((TARGET_LOGO_WIDTH, new_height), Image.Resampling.LANCZOS)
        
        # Center Logo
        # X: (Canvas Width - Logo Width) / 2
        # Y: (Canvas Height - Logo Height) / 2 - offset for text ?? 
        # Let's slight offset Y up to make room for text visually
        x_pos = (CANVAS_SIZE[0] - TARGET_LOGO_WIDTH) // 2
        y_pos = (CANVAS_SIZE[1] - new_height) // 2 - 100 
        
        # Paste logo (use alpha channel as mask if exists)
        if logo.mode == 'RGBA':
            img.paste(logo, (x_pos, y_pos), logo)
        else:
            img.paste(logo, (x_pos, y_pos))
        
        print(f"Logo placed at ({x_pos}, {y_pos}) size {logo.size}")
    else:
        print(f"Error: Logo not found at {LOGO_PATH}")
        return

    # Add Text
    # Try to load a font, fallback to default
    font = None
    try:
        # Try a standard font likely to be on Mac
        # Courier New or Ariel or Helvetica
        font_path = "/System/Library/Fonts/Helvetica.ttc"
        if not os.path.exists(font_path):
             font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
        
        if os.path.exists(font_path):
            font = ImageFont.truetype(font_path, 80) # Size 80
        else:
             print("Custom font not found, using default")
             font = ImageFont.load_default()
             # Default font is tiny, might not be visible. 
             # Let's hope for a TTF.
    except Exception as e:
        print(f"Font loading error: {e}")
        font = ImageFont.load_default()

    if font:
        # Calculate text position
        text_bbox = draw.textbbox((0, 0), TEXT, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        text_x = (CANVAS_SIZE[0] - text_width) // 2
        text_y = y_pos + new_height + 60 # 60px padding below logo
        
        draw.text((text_x, text_y), TEXT, fill=TEXT_COLOR, font=font)
        print(f"Text placed at ({text_x}, {text_y})")

    # Save
    img.save(OUTPUT_PATH)
    print(f"Saved splash to {OUTPUT_PATH}")
    
    # Also save as splash-dark.png just in case
    # img.save(OUTPUT_PATH.replace('splash.png', 'splash-dark.png'))

if __name__ == "__main__":
    generate_splash()
