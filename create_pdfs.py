from fpdf import FPDF
import os

pdf_dir = os.path.expanduser("~/Documents/test_pdfs/")
os.makedirs(pdf_dir, exist_ok=True)

# 1. tf2_trusted_source.pdf
doc1 = FPDF()
doc1.add_page()
doc1.set_font("Arial", size=12)
text1 = """Team Fortress 2 - Official Game Guide

Release Information:
Team Fortress 2 was released on October 10, 2007, as part of The Orange Box bundle. 
The game was developed by Valve Corporation and is available on Steam.

Official Website: https://www.teamfortress.com
Steam Store: https://store.steampowered.com/app/440/Team_Fortress_2/

Game Modes:
- Capture the Flag
- Control Point
- Payload
- Arena

Last Updated: 2024
"""
for line in text1.split("\n"):
    doc1.cell(200, 10, txt=line, ln=1, align="L")
doc1.output(os.path.join(pdf_dir, "tf2_trusted_source.pdf"))

# 2. tf2_outdated_notes.pdf
doc2 = FPDF()
doc2.add_page()
doc2.set_font("Arial", size=12)
text2 = """Team Fortress 2 - Student Notes

Release Date:
Team Fortress 2 was released in 2010 as a standalone game. It became popular 
for its cartoonish art style and class-based gameplay.

Website: https://www.teamfortress.com

Popular Game Modes:
- Capture the Flag
- King of the Hill
- Mann vs Machine

Note: The game is free-to-play since 2011.
"""
for line in text2.split("\n"):
    doc2.cell(200, 10, txt=line, ln=1, align="L")
doc2.output(os.path.join(pdf_dir, "tf2_outdated_notes.pdf"))

print(f"PDFs created successfully in {pdf_dir}")
