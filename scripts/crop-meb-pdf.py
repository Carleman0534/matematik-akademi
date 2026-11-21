import os
import pymupdf
import numpy as np
from PIL import Image

pdf_path = r'C:\Users\user\.gemini\antigravity\brain\925ae882-73e8-40c7-852e-1a45f8a44278\.user_uploaded\media_1795251025196_f7291c3e.pdf'
out_dir = r'c:\Users\user\OneDrive\Desktop\Ali Metin\public\uploads\questions\meb_lgs_64'
os.makedirs(out_dir, exist_ok=True)

# Also copy PDF to public/uploads/pdf/
pdf_out_dir = r'c:\Users\user\OneDrive\Desktop\Ali Metin\public\uploads\pdf'
os.makedirs(pdf_out_dir, exist_ok=True)
pdf_dest = os.path.join(pdf_out_dir, 'meb_lgs_64_ornek_sorular.pdf')
with open(pdf_path, 'rb') as f_in:
    with open(pdf_dest, 'wb') as f_out:
        f_out.write(f_in.read())
print(f'Copied PDF to: {pdf_dest}')

page_question_map = {
    1: [1, 2],
    2: [3, 4],
    3: [5],
    4: [6, 7],
    5: [8, 9],
    6: [10, 11],
    7: [12, 13],
    8: [14, 15],
    9: [16, 17],
    10: [18],
    11: [19],
    12: [20],
    13: [21],
    14: [22],
    15: [23],
    16: [24],
    17: [25],
    18: [26, 27],
    19: [28, 29],
    20: [30, 31, 32],
    21: [33, 34],
    22: [35, 36],
    23: [37, 38],
    24: [39],
    25: [40],
    26: [41, 42],
    27: [43, 44],
    28: [45, 46],
    29: [47],
    30: [48],
    31: [49, 50],
    32: [51],
    33: [52],
    34: [53, 54],
    35: [55, 56],
    36: [57, 58],
    37: [59, 60],
    38: [61, 62],
    39: [63, 64],
}

doc = pymupdf.open(pdf_path)
DPI = 180 # Clean, crisp 180 DPI

for page_idx in range(len(doc)):
    page_num = page_idx + 1
    page = doc[page_idx]
    q_list = page_question_map.get(page_num, [])
    
    # Render page to high-res image
    pix = page.get_pixmap(dpi=DPI)
    img_data = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    img_np = np.array(img_data)
    gray = np.mean(img_np, axis=2)

    # Frame bounds (ignore outer borders and bottom leaf page number)
    top_y = int(pix.height * 0.04) # around y=35pt in pixels
    bot_y = int(pix.height * 0.95) # above bottom page number leaf
    left_x = int(pix.width * 0.04)
    right_x = int(pix.width * 0.96)

    if len(q_list) == 1:
        # Full question occupies page
        q_num = q_list[0]
        crop_img = img_data.crop((left_x, top_y, right_x, bot_y))
        save_path = os.path.join(out_dir, f'q_{q_num}.png')
        crop_img.save(save_path, 'PNG', optimize=True)
        print(f'Page {page_num}: Saved Q{q_num} ({crop_img.width}x{crop_img.height})')

    elif len(q_list) == 2:
        q_num1, q_num2 = q_list[0], q_list[1]
        
        # Search for horizontal gap between 30% and 72%
        inner_gray = gray[top_y:bot_y, left_x:right_x]
        row_means = np.mean(inner_gray, axis=1)
        h = inner_gray.shape[0]

        # Find white bands where row_means > 252
        white_rows = row_means > 252
        white_bands = []
        in_band = False
        start = 0
        min_r = int(h * 0.32)
        max_r = int(h * 0.72)

        for r in range(min_r, max_r):
            if white_rows[r]:
                if not in_band:
                    in_band = True
                    start = r
            else:
                if in_band:
                    in_band = False
                    if r - start > 10:
                        white_bands.append((start, r, r - start))
        if in_band and max_r - start > 10:
            white_bands.append((start, max_r, max_r - start))

        if white_bands:
            # Pick largest white band
            best_band = max(white_bands, key=lambda x: x[2])
            split_y = top_y + (best_band[0] + best_band[1]) // 2
        else:
            split_y = top_y + int(h * 0.5)

        # Crop Question 1
        crop1 = img_data.crop((left_x, top_y, right_x, split_y))
        save1 = os.path.join(out_dir, f'q_{q_num1}.png')
        crop1.save(save1, 'PNG', optimize=True)

        # Crop Question 2
        crop2 = img_data.crop((left_x, split_y, right_x, bot_y))
        save2 = os.path.join(out_dir, f'q_{q_num2}.png')
        crop2.save(save2, 'PNG', optimize=True)

        print(f'Page {page_num}: Saved Q{q_num1} & Q{q_num2} (split at {split_y})')

    elif len(q_list) == 3:
        # Page 20 with 3 questions
        q1, q2, q3 = q_list[0], q_list[1], q_list[2]
        inner_gray = gray[top_y:bot_y, left_x:right_x]
        row_means = np.mean(inner_gray, axis=1)
        h = inner_gray.shape[0]
        white_rows = row_means > 252

        # Split 1 around 25% - 45%
        bands1 = []
        in_band = False
        start = 0
        for r in range(int(h * 0.22), int(h * 0.45)):
            if white_rows[r]:
                if not in_band: in_band = True; start = r
            else:
                if in_band: in_band = False; bands1.append((start, r, r - start))
        split1 = top_y + (max(bands1, key=lambda x: x[2])[0] + max(bands1, key=lambda x: x[2])[1]) // 2 if bands1 else top_y + int(h * 0.33)

        # Split 2 around 55% - 75%
        bands2 = []
        in_band = False
        start = 0
        for r in range(int(h * 0.55), int(h * 0.75)):
            if white_rows[r]:
                if not in_band: in_band = True; start = r
            else:
                if in_band: in_band = False; bands2.append((start, r, r - start))
        split2 = top_y + (max(bands2, key=lambda x: x[2])[0] + max(bands2, key=lambda x: x[2])[1]) // 2 if bands2 else top_y + int(h * 0.66)

        c1 = img_data.crop((left_x, top_y, right_x, split1))
        c1.save(os.path.join(out_dir, f'q_{q1}.png'), 'PNG', optimize=True)

        c2 = img_data.crop((left_x, split1, right_x, split2))
        c2.save(os.path.join(out_dir, f'q_{q2}.png'), 'PNG', optimize=True)

        c3 = img_data.crop((left_x, split2, right_x, bot_y))
        c3.save(os.path.join(out_dir, f'q_{q3}.png'), 'PNG', optimize=True)

        print(f'Page {page_num}: Saved Q{q1}, Q{q2}, Q{q3} (splits: {split1}, {split2})')

print('All 64 questions cropped successfully!')
