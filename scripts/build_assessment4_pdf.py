#!/usr/bin/env python3
"""Build the Assessment 4 submission in the plain format of the accepted sample."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Image, PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "bankers_algorithm.c"
OUT = ROOT / "output" / "pdf" / "24BCI0081_VL2026270104071_AST04_Completed.pdf"
SCREEN_DIR = ROOT / "tmp" / "pdfs"

BODY = ParagraphStyle("Body", fontName="Times-Roman", fontSize=10.2, leading=14.2,
                      spaceAfter=6, textColor=colors.black)
SMALL = ParagraphStyle("Small", fontName="Times-Roman", fontSize=9.1, leading=12.2,
                       spaceAfter=5, textColor=colors.black)
QUESTION = ParagraphStyle("Question", fontName="Times-Bold", fontSize=12, leading=15,
                          spaceAfter=8, textColor=colors.black)
TITLE = ParagraphStyle("Title", fontName="Times-Bold", fontSize=15, leading=19,
                       alignment=TA_CENTER, spaceAfter=8, textColor=colors.black)
CODE = ParagraphStyle("Code", fontName="Courier", fontSize=6.35, leading=7.15,
                      leftIndent=5, rightIndent=0, spaceAfter=4, textColor=colors.black)
CODE_LARGE = ParagraphStyle("CodeLarge", fontName="Courier", fontSize=7.35, leading=8.75,
                            leftIndent=5, rightIndent=0, spaceAfter=4, textColor=colors.black)
NOTE = ParagraphStyle("Note", fontName="Times-Italic", fontSize=8.6, leading=11,
                      textColor=colors.black)


def p(text, style=BODY):
    return Paragraph(text, style)


def source_chunk(start, end):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()[start - 1:end]
    return Preformatted("\n".join(f"{n:>3}  {line}" for n, line in enumerate(lines, start)), CODE)


def image(name, width=5.0 * inch):
    path = SCREEN_DIR / name
    aspect = 820 / 1100 if name.endswith("-crop.png") else 1073 / 1959
    return Image(str(path), width=width, height=width * aspect, hAlign="CENTER")


def on_page(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#333333"))
    canvas.setLineWidth(0.65)
    canvas.rect(34, 34, width - 68, height - 68, stroke=1, fill=0)
    canvas.setFont("Helvetica", 10)
    canvas.setFillColor(colors.black)
    canvas.drawString(50, height - 54, "Shreshth Mishra")
    canvas.drawString(50, height - 70, "24BCI0081")
    canvas.setFont("Helvetica", 9)
    canvas.drawString(50, 44, f"{doc.page} | Page")
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=55, rightMargin=55,
                            topMargin=88, bottomMargin=59,
                            title="Assessment-4 Operating Systems Lab", author="Shreshth Mishra")
    story = []

    # Page 1 - Exercise 1 and the shared matrix.
    story += [Spacer(1, 16), p("Assessment-4", TITLE), p("OPERATING SYSTEMS LAB", TITLE),
              Spacer(1, 8), p("Exercise:1", QUESTION),
              p("Develop a Banker's Algorithm simulator for 5 processes and 4 resource types.", BODY),
              p("The program receives the following sequence of requests and, for each request, checks Need, Available, tentative safety, and the final grant or rejection decision.", BODY),
              Preformatted("""Request sequence:
P1  (1,0,2,0)       P3  (0,1,0,1)       P0  (2,0,0,0)
P4  (0,1,1,1)       P2  (1,0,1,0)       P3  (1,0,0,0)""", CODE_LARGE),
              p("Initial data supplied in the question sheet:", BODY),
              Preformatted("""Process       Allocation       Maximum
P0            (1,0,1,0)        (3,2,2,1)
P1            (1,1,0,1)        (2,2,2,2)
P2            (1,0,2,1)        (4,1,3,2)
P3            (0,0,1,0)        (2,2,2,1)
P4            (0,1,0,1)        (1,2,1,2)""", CODE_LARGE),
              p("For Exercise 1, the question sheet does not state an Available vector. The fixed demonstration uses the explicit assumption Available = (3,3,2,2).", NOTE),
              PageBreak()]

    # Page 2 - Exercises 2 and 3.
    story += [p("Exercise:2", QUESTION),
              p("Banker's Algorithm with Dynamic Input", BODY),
              p("Write a program that accepts the number of processes, number of resource types, Allocation matrix, Maximum matrix, and Available vector. The program must calculate the Need matrix, determine the initial safe state and one safe sequence, accept a process request, check it, perform temporary allocation, run the safety algorithm, grant or roll back the request, and display updated matrices.", BODY),
              Spacer(1, 10), p("Exercise:3", QUESTION),
              p("Challenging Resource Request Problem", BODY),
              p("Consider Available = (2,1,3,2) with resource types A, B, C, and D. Using the same Allocation and Maximum matrices above, process the following requests:", BODY),
              Preformatted("""P2 -> (1,0,1,0)
P0 -> (0,1,0,1)
P4 -> (1,0,1,0)
P1 -> (0,1,1,0)""", CODE_LARGE),
              p("For every request, verify Need and Available, perform tentative allocation, execute the safety algorithm, grant or reject, update the system if granted, and display the safe sequence after every successful request.", BODY),
              p("Code used for all three exercises begins on the next page. The same safety and request functions are reused for both fixed and dynamic input.", NOTE),
              PageBreak()]

    # Pages 3-6 - complete source code.
    chunks = [(1, 90), (91, 180), (181, 270), (271, 352)]
    for page_index, (start, end) in enumerate(chunks, 1):
        story += [p("Code:" if page_index == 1 else "Code (continued):", QUESTION), source_chunk(start, end)]
        if page_index < len(chunks):
            story.append(PageBreak())

    # Page 7 - Exercise 1 evidence.
    story += [PageBreak(), p("Exercise:1 - Output", QUESTION),
              p("The fixed request sequence is executed using Available = (3,3,2,2). Requests P1, P3, and P0 are granted after safe tentative allocations; later requests are rejected when the currently available resources are insufficient.", BODY),
              image("ast4-ex1-crop.png", 5.10 * inch),
              Spacer(1, 6), p("Terminal output from the compiled C program. The output is filtered only to keep every request decision and safe sequence visible in one terminal capture.", NOTE),
              PageBreak()]

    # Page 8 - Exercise 2 evidence.
    story += [p("Exercise:2 - Output", QUESTION),
              p("Dynamic input test: 5 processes, 4 resource types, the matrices from the question sheet, Available = (3,3,2,2), process P1, and request (1,0,2,0). The program calculates Need, confirms the initial safe state, grants the request, and prints updated matrices.", BODY),
              image("ast4-ex2-crop.png", 5.10 * inch),
              Spacer(1, 6), p("Terminal input is supplied to the program through standard input; the displayed matrices are produced by the same executable shown in the code pages.", NOTE),
              PageBreak()]

    # Page 9 - Exercise 3 evidence.
    story += [p("Exercise:3 - Output", QUESTION),
              p("The challenge run uses Available = (2,1,3,2) and processes requests in the order P2, P0, P4, P1. P2 and P4 are granted after safe checks; P0 and P1 are rejected because their tentative allocations lead to an unsafe state.", BODY),
              image("ast4-ex3-crop.png", 5.10 * inch),
              Spacer(1, 6), p("Safe sequences are printed after each successful request, and rejected requests leave the state unchanged through rollback.", NOTE)]

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)


if __name__ == "__main__":
    build()
