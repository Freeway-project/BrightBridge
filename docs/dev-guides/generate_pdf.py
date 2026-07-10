#!/usr/bin/env python3
import os
import re
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    KeepTogether, Preformatted
)
from reportlab.pdfgen import canvas

# Premium Color Palette (matching application styling)
PRIMARY_COLOR = colors.HexColor("#1e3a8a")     # Deep Blue
SECONDARY_COLOR = colors.HexColor("#0f766e")   # Teal
DARK_TEXT = colors.HexColor("#1e293b")         # Slate 800
LIGHT_BG = colors.HexColor("#f8fafc")          # Slate 50
BORDER_COLOR = colors.HexColor("#cbd5e1")      # Slate 300
CODE_BG = colors.HexColor("#f1f5f9")           # Slate 100
CODE_TEXT = colors.HexColor("#0f172a")         # Slate 900
HR_COLOR = colors.HexColor("#e2e8f0")          # Slate 200

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to calculate the total page count and draw running footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            super().showPage()
        super().save()

    def draw_page_elements(self, page_count):
        # Do not draw footer on first page if it is a title page
        if self._pageNumber == 1:
            return

        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b")) # Slate 500
        
        # Draw running header
        self.drawString(54, 750, "CourseBridge Developer Documentation")
        self.setStrokeColor(HR_COLOR)
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Draw running footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 40, footer_text)
        self.drawString(54, 40, "CONFIDENTIAL - INTERNAL DEVELOPMENT USE ONLY")
        self.line(54, 52, 558, 52)
        
        self.restoreState()


def parse_inline_markdown(text):
    """
    Converts markdown inline formatting to ReportLab HTML-like tags.
    """
    # Escapes xml-like characters first
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    
    # Extract backtick code snippets to avoid underscore/asterisk matching within them
    placeholders = []
    def code_repl(match):
        code_text = match.group(1)
        placeholders.append(f'<font face="Courier" color="#0f172a" size="9.5"><b>{code_text}</b></font>')
        return f":::CODE_TOKEN_{len(placeholders)-1}:::"
        
    text = re.sub(r'`(.*?)`', code_repl, text)
    
    # Bold **text** or __text__
    text = re.sub(r'\*\*(.*?)\*\*|__(.*?)__', r'<b>\1\2</b>', text)
    
    # Italic *text* or _text_
    text = re.sub(r'\*(.*?)\*|_(.*?)_', r'<i>\1\2</i>', text)
    
    # Links [label](url) -> keep label bold
    text = re.sub(r'\[(.*?)\]\((.*?)\)', r'<b>\1</b>', text)
    
    # Restore code snippet placeholders
    for i, replacement in enumerate(placeholders):
        text = text.replace(f":::CODE_TOKEN_{i}:::", replacement)
        
    return text


def parse_markdown_to_flowables(filepath, styles):
    """
    Reads a markdown file and compiles it into a list of ReportLab Flowables.
    """
    flowables = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    in_code_block = False
    skip_current_code_block = False
    code_content = []
    
    in_table = False
    table_headers = []
    table_rows = []
    
    in_list = False
    
    for line in lines:
        stripped = line.strip()
        
        # 1. Handle Code Blocks
        if stripped.startswith("```"):
            if in_code_block:
                # End of code block
                if not skip_current_code_block:
                    code_text = "".join(code_content).rstrip()
                    # Wrap preformatted code inside a light grey table with border
                    code_p = Preformatted(code_text, styles['CodeTextStyle'])
                    code_table = Table([[code_p]], colWidths=[504])
                    code_table.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
                        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
                        ('LEFTPADDING', (0,0), (-1,-1), 10),
                        ('RIGHTPADDING', (0,0), (-1,-1), 10),
                        ('TOPPADDING', (0,0), (-1,-1), 8),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                    ]))
                    flowables.append(code_table)
                    flowables.append(Spacer(1, 10))
                in_code_block = False
                skip_current_code_block = False
                code_content = []
            else:
                # Start of code block
                in_code_block = True
                if "mermaid" in stripped:
                    skip_current_code_block = True
            continue
            
        if in_code_block:
            if not skip_current_code_block:
                code_content.append(line)
            continue

        # 2. Skip Mermaid diagrams entirely (PDF builds have native textual/tabular architecture sheets)
        if stripped.startswith("flowchart") or stripped.startswith("stateDiagram") or stripped.startswith("erDiagram") or "PK" in stripped or "FK" in stripped or "||--" in stripped:
            continue
            
        # 3. Handle Tables
        if stripped.startswith("|"):
            in_table = True
            cols = [parse_inline_markdown(c.strip()) for c in stripped.split("|")[1:-1]]
            
            # Skip delimiter rows e.g. | --- | --- |
            if all(re.match(r'^:?-+:?$', c) for c in cols):
                continue
                
            if not table_headers:
                table_headers = cols
            else:
                table_rows.append(cols)
            continue
        elif in_table:
            # End of table block
            if table_headers:
                headers_p = [Paragraph(f"<b>{col}</b>", styles['TableHeaderText']) for col in table_headers]
                rows_p = []
                for r in table_rows:
                    row_p = [Paragraph(col, styles['NormalText']) for col in r]
                    rows_p.append(row_p)
                
                # Assemble ReportLab Table
                all_data = [headers_p] + rows_p
                
                # Dynamically set column widths
                num_cols = len(table_headers)
                col_width = 504 / num_cols
                
                t = Table(all_data, colWidths=[col_width] * num_cols)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
                    ('TOPPADDING', (0,0), (-1,-1), 6),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('LEFTPADDING', (0,0), (-1,-1), 8),
                    ('RIGHTPADDING', (0,0), (-1,-1), 8),
                    # Alternating row colors
                    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
                ]))
                flowables.append(t)
                flowables.append(Spacer(1, 12))
                
            table_headers = []
            table_rows = []
            in_table = False
            
        # 4. Handle Empty Lines
        if not stripped:
            if in_list:
                in_list = False
            continue
            
        # 5. Handle Headings
        if stripped.startswith("#"):
            match = re.match(r'^(#+)\s+(.*)$', stripped)
            if match:
                level = len(match.group(1))
                title = parse_inline_markdown(match.group(2))
                
                if level == 1:
                    # Draw a nice clean spacing or cover-like top section
                    flowables.append(Spacer(1, 15))
                    flowables.append(Paragraph(title, styles['H1']))
                    # Draw an accent line beneath major H1 tags
                    hr_table = Table([[""]], colWidths=[504])
                    hr_table.setStyle(TableStyle([
                        ('LINEBELOW', (0,0), (-1,-1), 1.5, PRIMARY_COLOR),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                        ('TOPPADDING', (0,0), (-1,-1), 0),
                    ]))
                    flowables.append(hr_table)
                    flowables.append(Spacer(1, 15))
                elif level == 2:
                    flowables.append(Spacer(1, 12))
                    flowables.append(Paragraph(title, styles['H2']))
                    flowables.append(Spacer(1, 8))
                elif level == 3:
                    flowables.append(Spacer(1, 10))
                    flowables.append(Paragraph(title, styles['H3']))
                    flowables.append(Spacer(1, 6))
            continue
            
        # 6. Handle Horizontal Rules
        if stripped == "---":
            hr_table = Table([[""]], colWidths=[504])
            hr_table.setStyle(TableStyle([
                ('LINEBELOW', (0,0), (-1,-1), 0.5, HR_COLOR),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
            ]))
            flowables.append(Spacer(1, 10))
            flowables.append(hr_table)
            flowables.append(Spacer(1, 15))
            continue
            
        # 7. Handle Bullet Points
        if stripped.startswith("- ") or stripped.startswith("* "):
            bullet_text = parse_inline_markdown(stripped[2:])
            p_style = styles['BulletText']
            flowables.append(Paragraph(f"&bull; {bullet_text}", p_style))
            flowables.append(Spacer(1, 4))
            in_list = True
            continue
            
        # 8. Handle Standard Paragraphs
        paragraph_text = parse_inline_markdown(stripped)
        flowables.append(Paragraph(paragraph_text, styles['Body']))
        flowables.append(Spacer(1, 8))
        
    return flowables


def build_pdf(md_filename, pdf_filename):
    """
    Builds the PDF using ReportLab templates.
    """
    print(f"Compiling {md_filename} -> {pdf_filename}...")
    
    # Establish stylesheet setup
    base_styles = getSampleStyleSheet()
    
    styles = {}
    
    styles['H1'] = ParagraphStyle(
        'CustomH1',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY_COLOR,
        spaceAfter=5
    )
    
    styles['H2'] = ParagraphStyle(
        'CustomH2',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=SECONDARY_COLOR,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    styles['H3'] = ParagraphStyle(
        'CustomH3',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=14,
        textColor=DARK_TEXT,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    
    styles['Body'] = ParagraphStyle(
        'CustomBody',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=DARK_TEXT
    )
    
    styles['BulletText'] = ParagraphStyle(
        'CustomBullet',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=DARK_TEXT,
        leftIndent=15,
        firstLineIndent=-10
    )
    
    styles['TableHeaderText'] = ParagraphStyle(
        'CustomTableHeader',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.white
    )
    
    styles['NormalText'] = ParagraphStyle(
        'CustomNormalText',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11.5,
        textColor=DARK_TEXT
    )
    
    styles['CodeTextStyle'] = ParagraphStyle(
        'CustomCodeStyle',
        parent=base_styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=CODE_TEXT
    )

    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=54,  # 0.75 in
        rightMargin=54,
        topMargin=72,   # 1.0 in
        bottomMargin=72
    )

    flowables = parse_markdown_to_flowables(md_filename, styles)
    
    # Build Document
    doc.build(flowables, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {pdf_filename}")


def main():
    # Setup working paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    architecture_md = os.path.join(script_dir, "architecture.md")
    architecture_pdf = os.path.join(script_dir, "architecture.pdf")
    
    credentials_md = os.path.join(script_dir, "credentials.md")
    credentials_pdf = os.path.join(script_dir, "credentials.pdf")
    
    # Build Guides
    if os.path.exists(architecture_md):
        build_pdf(architecture_md, architecture_pdf)
    else:
        print(f"Error: {architecture_md} not found.", file=sys.stderr)
        
    if os.path.exists(credentials_md):
        build_pdf(credentials_md, credentials_pdf)
    else:
        print(f"Error: {credentials_md} not found.", file=sys.stderr)


if __name__ == "__main__":
    main()
